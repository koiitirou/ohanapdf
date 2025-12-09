"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../Record.module.css";
import ModelSelector from "../../components/ModelSelector";
import { DEFAULT_MODEL } from "../../utils/modelConfig";

export default function RecordView() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading...</div>}>
      <RecordContent />
    </Suspense>
  );
}

function RecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const mode = searchParams.get("mode");
  const isGuest = mode === "guest" || !roomId;
  const effectiveRoomId = isGuest ? "guest" : roomId;

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  
  const [currentId, setCurrentId] = useState(null);
  const [result, setResult] = useState(null); // { summary, transcription, correctedSummary, audioUrl, status }
  
  const [history, setHistory] = useState([]);
  const [pollingId, setPollingId] = useState(null);

  // New State
  const [name, setName] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const fileInputRef = useRef(null);
  const targetId = searchParams.get("id");

  // Default name logic
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    setName(`${month}/${day} ${hour}:${minute}`);
  }, []);

  // Fetch history on mount (if not guest)
  useEffect(() => {
    if (!isGuest && roomId) {
      fetchHistory();
    }
  }, [roomId, isGuest]);

  // Handle deep link to specific ID
  useEffect(() => {
    if (targetId && effectiveRoomId) {
      const loadTarget = async (retryCount = 0) => {
        if (retryCount === 0) {
          setResult(null);
          setProcessing(true);
          setStatus("AIが音声を解析中です... (数分かかる場合があります)");
        }
        
        try {
          const res = await fetch("/api/record/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: effectiveRoomId, id: targetId }),
          });

          if (res.ok) {
            const data = await res.json();
            setResult(data);
            setCurrentId(data.id); // Set currentId for saving/deleting
            
            if (data.status === "processing") {
              setProcessing(true);
              setPollingId(targetId);
              setStatus("AIが音声を解析中です... (数分かかる場合があります)");
            } else if (data.status === "uploaded") {
              setStatus("AI処理を開始しています...");
              setProcessing(true);
              
              fetch("/api/record/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  roomId: effectiveRoomId,
                  batchId: targetId,
                  model: selectedModel // Use selected model (though deep link might not know it, default to 1.5)
                }),
              })
              .then(res => res.json())
              .then(processData => {
                if (processData.status === "processing") {
                  setPollingId(targetId);
                  setStatus("AIが音声を解析中です... (数分かかる場合があります)");
                } else {
                  setStatus("処理開始に失敗しました");
                  setProcessing(false);
                }
              })
              .catch(err => {
                console.error(err);
                setStatus("処理開始エラー");
                setProcessing(false);
              });

            } else {
              setStatus("");
              setProcessing(false);
            }
          } else {
            if (res.status === 404 && retryCount < 5) {
              console.log(`Record not found, retrying... (${retryCount + 1}/5)`);
              setTimeout(() => loadTarget(retryCount + 1), 2000);
              return;
            }
            setStatus(`指定された記録が見つかりませんでした (Room: ${effectiveRoomId}, ID: ${targetId})`);
            setProcessing(false);
          }
        } catch (error) {
          console.error(error);
          setStatus(`エラーが発生しました: ${error.message}`);
          setProcessing(false);
        }
      };
      loadTarget();
    }
  }, [targetId, effectiveRoomId]);

  // Polling effect
  useEffect(() => {
    let interval;
    if (pollingId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/record/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: effectiveRoomId, id: pollingId }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === "completed") {
              setResult(data);
              setProcessing(false);
              setPollingId(null);
              setStatus("完了しました");
              if (!isGuest) fetchHistory();
            } else if (data.status === "error") {
              setProcessing(false);
              setPollingId(null);
              setStatus(data.summary || "エラーが発生しました");
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [pollingId, effectiveRoomId, isGuest]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/record/history?roomId=${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/x-m4a" });
        // Create a File object from Blob
        const file = new File([audioBlob], "recording.m4a", { type: "audio/x-m4a" });
        setFiles([file]); // Set as the file to upload
        handleUpload([file]); // Auto upload
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("マイクへのアクセスが許可されていません");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async (filesToUpload = files) => {
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setStatus("アップロード中...");
    setResult(null);
    setCurrentId(null);

    try {
      const formData = new FormData();
      formData.append("roomId", effectiveRoomId);
      formData.append("name", name); // Send name
      filesToUpload.forEach((file) => {
        formData.append("files", file);
      });

      const uploadRes = await fetch("/api/record/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("アップロードに失敗しました");

      const uploadData = await uploadRes.json();
      const gcsUris = uploadData.files.map(f => f.gcsUri);
      const batchId = uploadData.batchId;

      setStatus("AI処理を開始しています...");
      setProcessing(true);

      const processRes = await fetch("/api/record/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gcsUris,
          roomId: effectiveRoomId,
          batchId,
          model: selectedModel // Send selected model
        }),
      });

      if (!processRes.ok) throw new Error("処理開始に失敗しました");

      const processData = await processRes.json();
      setCurrentId(processData.id);
      setPollingId(processData.id);
      setStatus("AIが音声を解析中です... (数分かかる場合があります)");

    } catch (error) {
      console.error(error);
      setStatus("エラー: " + error.message);
      setUploading(false);
      setProcessing(false);
    } finally {
      setUploading(false);
      setFiles([]); // Clear files after upload
    }
  };

  const handleHistoryClick = async (item) => {
    setCurrentId(item.id);
    setResult(null);
    setStatus("読み込み中...");
    
    try {
      const res = await fetch("/api/record/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: effectiveRoomId, id: item.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setStatus("");
      } else {
        setStatus("読み込みに失敗しました");
        alert("履歴の読み込みに失敗しました");
      }
    } catch (error) {
      console.error(error);
      setStatus("エラーが発生しました");
      alert("エラーが発生しました");
    }
  };

  // Scroll to result when it changes
  useEffect(() => {
    if (result) {
      setTimeout(() => {
        document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [result]);

  const handleSave = async () => {
    if (!currentId || isGuest) return;
    
    try {
      const res = await fetch("/api/record/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: effectiveRoomId,
          id: currentId,
          correctedSummary: result.correctedSummary
        }),
      });

      if (res.ok) {
        alert("保存しました");
        fetchHistory();
      }
    } catch (error) {
      alert("保存に失敗しました");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("本当に削除しますか？")) return;
    
    try {
      const res = await fetch("/api/record/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: effectiveRoomId, id }),
      });

      if (res.ok) {
        if (currentId === id) {
          setResult(null);
          setCurrentId(null);
        }
        fetchHistory();
      }
    } catch (error) {
      alert("削除に失敗しました");
    }
  };

  const handleCopy = async () => {
    if (!result?.summary) return;
    try {
      await navigator.clipboard.writeText(result.summary);
      alert("コピーしました");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Ohana Record</h1>
          {isGuest ? (
            <span className={styles.subtitle}>ゲストモード</span>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className={styles.subtitle}>Room: {roomId}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("URLをコピーしました");
                }}
                className={styles.shortcutLink}
              >
                URLをコピー
              </button>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.textInput}
            placeholder="会議名など"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>モデル</label>
          <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
        </div>

        {/* Main Recording Button */}
        <div className={styles.recordButtonContainer}>
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={uploading || processing}
              className={styles.recordButton}
              title="録音開始"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={styles.iconXLarge} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          ) : (
            <div className={`${styles.flexColumn} ${styles.flexCenter} relative w-full h-full`}>
              {/* Ripple Effect */}
              <div className={styles.ripple}></div>
              <div className={styles.pulse}></div>
              
              <button
                onClick={stopRecording}
                className={`${styles.recordButton} ${styles.recording}`}
                title="録音停止"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={styles.iconXLarge} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
              <div className="absolute -bottom-8 text-2xl font-mono font-bold text-red-500">
                {formatTime(recordingTime)}
              </div>
            </div>
          )}
        </div>

        <div className={styles.divider}>
          <div className={styles.dividerLine}></div>
          <span className={styles.dividerText}>または</span>
          <div className={styles.dividerLine}></div>
        </div>

        {/* File Upload Dropzone */}
        <input
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileChange}
          className={styles.hidden}
          id="file-upload"
          ref={fileInputRef}
        />
        <label 
          htmlFor="file-upload" 
          className={styles.fileDropzone}
          style={{ cursor: "pointer" }}
        >
          <div className={`${styles.flexColumn} ${styles.flexCenter} ${styles.gap2}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={styles.uploadIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className={`${styles.textSlate600} ${styles.fontMedium} text-sm`}>ファイルを選択</span>
          </div>
        </label>
        
        {files.length > 0 && (
          <div className={`mt-4 mb-4 ${styles.flexColumn} ${styles.gap2}`}>
            {files.map((f, i) => (
              <div key={i} className={`${styles.flexBetween} p-3 bg-slate-50 rounded-lg text-sm border border-slate-100`}>
                <span className={`truncate ${styles.fontMedium} ${styles.textSlate700}`}>{f.name}</span>
                <span className={`text-xs ${styles.textSlate400} flex-shrink-0 ml-2`}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => handleUpload(files)}
          disabled={files.length === 0 || uploading || processing}
          className={styles.submitButton}
        >
          {uploading ? "アップロード中..." : processing ? "AI処理中..." : "要約を作成"}
        </button>

        {status && (
          <div className={styles.statusMessage}>
            {status}
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div id="result-section" className={styles.resultSection}>
            <div className={styles.resultTitle}>
              <div>
                <h2>要約結果</h2>
                {result.name && <p className={`text-sm ${styles.textSlate500} font-normal`}>{result.name}</p>}
              </div>
              <div className="flex gap-2">
                {!isGuest && (
                  <button 
                    onClick={() => handleDelete(currentId)}
                    className={styles.submitButton}
                    style={{ width: "auto", padding: "0.5rem 1rem", backgroundColor: "#ef4444", fontSize: "0.875rem" }}
                    title="削除"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
            
            <div className={styles.sectionContainer}>
              <h3 className={styles.sectionTitle}>
                生成されたサマリー
                <button 
                  onClick={handleCopy}
                  className={styles.copyButton}
                  title="コピー"
                >
                  コピー
                </button>
              </h3>
              <div className={styles.summaryText}>
                {result.summary}
              </div>
            </div>

            <div className={styles.sectionContainer}>
              <h3 className={styles.sectionTitle}>修正・メモ</h3>
              <textarea
                className={styles.correctedSummaryTextarea}
                value={result.correctedSummary || ""}
                onChange={(e) => setResult({ ...result, correctedSummary: e.target.value })}
                placeholder="修正内容やメモを追記..."
              />
              
              <div className={`${styles.flexBetween} mt-4`}>
                <button 
                  onClick={() => {
                    const blob = new Blob([result.summary], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${result.name || "summary"}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className={styles.downloadLink}
                >
                  テキストをダウンロード
                </button>
                
                {!isGuest && (
                  <button 
                    onClick={handleSave} 
                    className={styles.saveButton}
                  >
                    保存
                  </button>
                )}
              </div>
            </div>

            {(result.transcription || result.audioUrl) && (
               <div className={styles.sectionContainer}>
                 <h3 className={styles.sectionTitle}>音声・文字起こし</h3>
                 
                 {result.audioUrl && (
                   <div className="mb-6">
                     <audio 
                       controls 
                       src={result.audioUrl} 
                       className={styles.audioPlayer}
                       onPlay={(e) => {
                         // Simple speed control via context menu usually, but let's add buttons
                       }}
                     />
                     <div className={`${styles.flexBetween} text-xs ${styles.textSlate500}`}>
                       <div className={`${styles.flexCenter} ${styles.gap2}`}>
                         <span className={styles.fontMedium}>速度:</span>
                         {[0.5, 1.0, 1.5, 2.0].map(speed => (
                           <button
                             key={speed}
                             onClick={(e) => {
                               const audio = e.target.closest('div').parentElement.previousElementSibling;
                               if (audio) audio.playbackRate = speed;
                             }}
                             className="px-2 py-1 bg-white rounded border border-slate-200 hover:border-sky-400 hover:text-sky-600 transition-colors"
                           >
                             x{speed}
                           </button>
                         ))}
                       </div>
                       <a href={result.audioUrl} download className={styles.downloadLink} style={{marginBottom: 0}}>
                         DL
                       </a>
                     </div>
                   </div>
                 )}

                 {result.transcription && (
                   <details className="group border border-slate-200 rounded-lg">
                     <summary className={`${styles.flexBetween} cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors`}>
                       <span className={`${styles.fontMedium} ${styles.textSlate700}`}>文字起こし全文</span>
                     </summary>
                     <div className={`p-4 pt-0 text-sm ${styles.textSlate600} whitespace-pre-wrap leading-relaxed border-t border-slate-100 mt-2`}>
                       {result.transcription}
                     </div>
                   </details>
                 )}
               </div>
            )}
          </div>
        )}

        {/* History Section */}
        {!isGuest && history.length > 0 && (
          <div className={styles.historySection}>
            <h2 className={styles.historyTitle}>履歴</h2>
            <ul className={styles.historyList}>
              {history.map((item) => (
                <li 
                  key={item.id} 
                  onClick={() => handleHistoryClick(item)}
                  className={`${styles.historyItem} ${currentId === item.id ? styles.selected : ''}`}
                >
                  <div className={styles.historyItemHeader}>
                    <div className="flex items-center gap-2">
                      <span className={styles.historyName}>{item.name || "名称未設定"}</span>
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        item.status === "completed" ? "bg-green-500" : "bg-yellow-400 animate-pulse"
                      }`}></span>
                    </div>
                    <div className={styles.historyDate}>
                      {new Date(item.timestamp).toLocaleString("ja-JP", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
