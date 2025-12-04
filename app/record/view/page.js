"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../Record.module.css";

export default function RecordView() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
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

  const fileInputRef = useRef(null);

  // Fetch history on mount (if not guest)
  useEffect(() => {
    if (!isGuest && roomId) {
      fetchHistory();
    }
  }, [roomId, isGuest]);

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
              setStatus("エラーが発生しました");
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

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setStatus("アップロード中...");
    setResult(null);
    setCurrentId(null);

    try {
      const formData = new FormData();
      formData.append("roomId", effectiveRoomId);
      files.forEach((file) => {
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
          batchId
        }),
      });

      if (!processRes.ok) throw new Error("処理開始に失敗しました");

      const processData = await processRes.json();
      setCurrentId(processData.id);
      setPollingId(processData.id);
      setStatus("AIが音声を解析中です... (数分かかる場合があります)");

      // If guest, we might not be able to poll via history API if we strictly block guest access to history API
      // But my implementation of history POST allows retrieving by ID if we know it.
      // Wait, my history POST implementation checks file existence.
      // If guest, I saved metadata to null path?
      // Ah, in `process/route.js`: `const metadataPath = isGuest ? null : ...`
      // So for guest, we are NOT saving metadata.
      // This means polling will fail for guest because there is no metadata file to read status from.
      
      // FIX: For guest mode, we should probably save metadata to a temporary location or just return the result immediately?
      // But Vertex AI is async.
      // Let's modify `process/route.js` to save metadata even for guest, but maybe in a `guest` folder that is cleaned up?
      // Or just allow `roomId=guest` in the path.
      // My `process/route.js` logic: `const isGuest = !roomId || roomId === "guest";` -> `metadataPath = null`.
      // This is a bug in my plan vs implementation. I need to allow guest metadata for polling.
      // I will fix this by allowing `guest` roomId in `process/route.js` but filtering it out in `history` GET list.
      
    } catch (error) {
      console.error(error);
      setStatus("エラー: " + error.message);
      setUploading(false);
      setProcessing(false);
    } finally {
      setUploading(false);
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
      }
    } catch (error) {
      console.error(error);
    }
  };

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

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Ohana Record</h1>
          {isGuest ? (
            <span className="text-slate-500 text-sm">ゲストモード (履歴は保存されません)</span>
          ) : (
            <div className="flex flex-col items-center">
              <span className={styles.roomBadge}>Room: {roomId}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("URLをコピーしました");
                }}
                className="text-xs text-blue-500 hover:underline"
              >
                URLをコピー
              </button>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className={styles.uploadSection}>
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileChange}
            className={styles.fileInput}
            id="file-upload"
            ref={fileInputRef}
          />
          <label htmlFor="file-upload" className={styles.uploadLabel}>
            + 音声ファイルを選択 (複数可)
          </label>
          
          {files.length > 0 && (
            <ul className={styles.fileList}>
              {files.map((f, i) => (
                <li key={i} className={styles.fileItem}>
                  <span>{f.name}</span>
                  <span className="text-xs text-slate-400">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading || processing}
            className={styles.primaryButton}
            style={{ maxWidth: "200px", margin: "0 auto", display: "block" }}
          >
            {uploading ? "アップロード中..." : processing ? "AI処理中..." : "要約を作成"}
          </button>

          {status && <div className={styles.statusMessage}>{status}</div>}
        </div>

        {/* Result Section */}
        {result && (
          <div className={styles.resultSection}>
            <div className={styles.sectionTitle}>
              要約結果
              {!isGuest && (
                <button 
                  onClick={() => handleDelete(currentId)}
                  className={styles.deleteButton}
                  style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem", border: "none" }}
                >
                  削除
                </button>
              )}
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.summaryText}>{result.summary}</div>
            </div>

            <div className={styles.sectionTitle}>修正・メモ</div>
            <textarea
              className={styles.textarea}
              value={result.correctedSummary || ""}
              onChange={(e) => setResult({ ...result, correctedSummary: e.target.value })}
              placeholder="ここに修正内容やメモを追記できます..."
            />
            
            {!isGuest && (
              <div className="text-right">
                <button onClick={handleSave} className={styles.actionButton}>
                  保存する
                </button>
              </div>
            )}

            {result.transcription && (
               <details className="mt-8 border border-slate-200 rounded-lg">
                 <summary className="p-4 font-medium cursor-pointer hover:bg-slate-50 select-none text-slate-700">
                   文字起こし全文を表示
                 </summary>
                 <div className="p-4 pt-0 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-100">
                   {result.transcription}
                 </div>
               </details>
            )}
          </div>
        )}

        {/* History Section */}
        {!isGuest && history.length > 0 && (
          <div className={styles.historySection}>
            <h2 className={styles.sectionTitle}>履歴</h2>
            <ul className={styles.historyList}>
              {history.map((item) => (
                <li key={item.id} className={styles.historyItem} onClick={() => handleHistoryClick(item)}>
                  <div className={styles.historyMeta}>
                    <span className={styles.historyId}>ID: {item.id}</span>
                    <span className={styles.historyTime}>
                      {new Date(item.timestamp).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <span className={`${styles.historyStatus} ${styles[item.status]}`}>
                    {item.status === "completed" ? "完了" : "処理中"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
