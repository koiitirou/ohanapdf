"use client";


import { useState, useEffect } from "react";
import styles from "./Phone.module.css";
import { MODEL_OPTIONS, DEFAULT_MODEL } from "../utils/modelConfig";
import ModelSelector from "../components/ModelSelector";
import { generatePrompt } from "../utils/phonePrompt";

export default function Phone() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [resultTitle, setResultTitle] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [historyPassword, setHistoryPassword] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const [transcription, setTranscription] = useState("");
  const [correctedSummary, setCorrectedSummary] = useState("");
  const [currentId, setCurrentId] = useState(null);

  // Set default name on mount
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    setName(`${month}/${day} ${hour}:${minute}`);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult("");
      setAudioUrl("");
      setStatus("");
      setResultTitle("");
      setTranscription("");
      setCorrectedSummary("");
      setCurrentId(null);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) {
      alert("ファイルを選択してください。");
      return;
    }

    if (password.length < 4) {
      alert("パスワードは4文字以上で入力してください。");
      return;
    }

    setLoading(true);
    setResult("");
    setAudioUrl("");
    setStatus("ファイルをアップロード中...");
    setCopied(false);
    setResultTitle("");
    setTranscription("");
    setCorrectedSummary("");
    setCurrentId(null);

    try {
      // 1. Upload to GCS with metadata
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("password", password);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || "アップロードに失敗しました");
      }

      const uploadData = await uploadRes.json();
      const gcsUri = uploadData.fileUrl; 
      const id = uploadData.id;
      setAudioUrl(uploadData.audioUrl); // Set audio URL immediately

      setStatus("AIで処理中...");

      // 2. Process with Vertex AI (Async)
      const processRes = await fetch("/api/process-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gcsUri: gcsUri,
          prompt: generatePrompt(),
          model: selectedModel,
          id: id,
          name: name,
          password: password
        }),
      });

      if (!processRes.ok) {
        const errorData = await processRes.json();
        throw new Error(errorData.error || "処理開始に失敗しました");
      }

      setStatus("バックグラウンドで処理を開始しました。履歴を確認してください。");
      setResult("処理中... (履歴から確認できます)");
      setTranscription("");
      setCorrectedSummary("");
      setCurrentId(id);
      
      // Refresh history to show the new item
      fetchHistory();

    } catch (error) {
      console.error(error);
      setStatus("エラー: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleHistoryClick = (item) => {
    if (selectedHistoryId === item.id) {
      setSelectedHistoryId(null); // Toggle off
    } else {
      setSelectedHistoryId(item.id);
      setHistoryPassword(""); // Reset password input
    }
  };

  const handleHistoryUnlock = async (id) => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: historyPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "パスワードが間違っています");
        return;
      }

      const data = await res.json();
      setResult(data.summary);
      setTranscription(data.transcription || "");
      setCorrectedSummary(data.correctedSummary || "");
      setAudioUrl(data.audioUrl);
      setCurrentId(id);
      
      // Find name from history list
      const item = history.find(h => h.id === id);
      if (item) {
        setResultTitle(item.name);
      }

      // Scroll to result
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveCorrections = async () => {
    if (!currentId) return;
    
    try {
      const res = await fetch("/api/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: currentId, 
          summary: result, // Keep original summary or update it? The request implies saving "corrected summary".
          // I will save the corrected summary as 'correctedSummary' and keep 'summary' as is, or update 'summary' too?
          // The prompt says "修正後のサマリーをコピペして、保存する... 修正後のサマリー、が残るようになる"
          // I'll save it as correctedSummary.
          transcription,
          correctedSummary 
        }),
      });

      if (res.ok) {
        alert("修正内容を保存しました");
        fetchHistory(); // Refresh history to reflect changes if needed
      } else {
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("Error saving corrections:", error);
      alert("エラーが発生しました");
    }
  };

  const handleHistoryDelete = async (id) => {
    if (!confirm("本当に削除しますか？")) return;
    
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: historyPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "パスワードが間違っています");
        return;
      }

      alert("削除しました");
      setResult("");
      setResultTitle("");
      setAudioUrl("");
      setSelectedHistoryId(null);
      fetchHistory();
      
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setHistoryLoading(false);
    }
  };

  const getRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString("ja-JP", { month: 'numeric', day: 'numeric' });

    if (diff < minute) {
      return "たった今";
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}時間前 (${timeString})`;
    } else {
      return `${dateString} ${timeString}`;
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>音声処理デモ</h1>
        </div>
        
        {/* Input Fields */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>名前 (任意)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.textInput}
            placeholder="会議名など"
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>パスワード (必須・4文字以上)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.textInput}
            placeholder="パスワードを入力してください"
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>モデル選択</label>
          <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
        </div>

        <div className={styles.fileDropzone}>
          <label className="block mb-4 font-medium text-slate-700">音声ファイルを選択</label>
          <input
            type="file"
            accept=".m4a,.mp3,.wav,.ogg,.flac,audio/mp4,audio/x-m4a,audio/mpeg,audio/wav,audio/ogg,audio/flac"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
        </div>

        <button
          onClick={handleUploadAndProcess}
          disabled={!file || password.length < 4 || loading}
          className={styles.submitButton}
        >
          {loading ? "処理中..." : "アップロードして処理開始"}
        </button>

        {status && (
          <div className={styles.statusMessage}>
            {status}
          </div>
        )}

        {/* Result Section */}
        {(result || audioUrl) && (
          <div className={styles.resultSection}>
            <h2 className={styles.resultTitle}>
              結果: {resultTitle && <span className="text-base font-normal text-slate-500 ml-2">{resultTitle}</span>}
            </h2>
            <div className={styles.resultContent}>
              {/* Audio player moved to Transcription section */}
              
              {/* 1. Generated Summary Section */}
              {result && (
                <div className={styles.sectionContainer}>
                  <h3 className={styles.sectionTitle}>生成されたサマリー</h3>
                  <div className={styles.resultContent}>
                    <button 
                      onClick={handleCopy} 
                      className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                    >
                      {copied ? "コピーしました！" : "結果をコピー"}
                    </button>
                    <div className={styles.summaryText}>{result}</div>
                  </div>
                </div>
              )}

              {/* 2. Corrected Summary Section */}
              <div className={styles.sectionContainer}>
                <h3 className={styles.sectionTitle}>修正後のサマリー (デバッグ用)</h3>
                <textarea
                  value={correctedSummary}
                  onChange={(e) => setCorrectedSummary(e.target.value)}
                  className={styles.correctedSummaryTextarea}
                  placeholder="ここに修正後のサマリーを入力..."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleSaveCorrections}
                    disabled={!currentId}
                    className={styles.saveButton}
                  >
                    修正を保存
                  </button>
                </div>
              </div>

              {/* 3. Audio & Transcription Section */}
              {(transcription || audioUrl) && (
                <div className={styles.sectionContainer}>
                  <h3 className={styles.sectionTitle}>音声・文字起こし (全文)</h3>
                  {audioUrl && (
                    <div className="mb-4">
                      <audio controls src={audioUrl} className={styles.audioPlayer}>
                        Your browser does not support the audio element.
                      </audio>
                      <a href={audioUrl} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>
                        音声をダウンロード
                      </a>
                    </div>
                  )}
                  {transcription && (
                    <details className="border border-slate-200 rounded-lg">
                      <summary className="p-4 font-medium cursor-pointer hover:bg-slate-50 select-none">
                        クリックして表示
                      </summary>
                      <div className="p-4 pt-0 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-100">
                        {transcription}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Section */}
        <div className={styles.historySection}>
          <h2 className={styles.historyTitle}>履歴</h2>
          {history.length === 0 ? (
            <p className="text-slate-500 text-center">履歴はありません</p>
          ) : (
            <ul className={styles.historyList}>
              {history.map((item, index) => (
                <li 
                  key={item.id} 
                  className={`${styles.historyItem} ${selectedHistoryId === item.id ? styles.selected : ''}`}
                >
                  <div 
                    className={styles.historyItemHeader}
                    onClick={() => handleHistoryClick(item)}
                  >
                    <span className={styles.historyName}>
                      <span className="mr-2 text-slate-400 font-normal">{index + 1}.</span>
                      {item.name}
                    </span>
                    <span className={styles.historyDate}>
                      {getRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  
                  {selectedHistoryId === item.id && (
                    <div className={styles.passwordPrompt}>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder={item.hasPassword ? "パスワードを入力" : "パスワードなし"}
                          value={historyPassword}
                          onChange={(e) => setHistoryPassword(e.target.value)}
                          className={styles.textInput}
                          style={{ flex: 1 }}
                        />
                        <button
                          onClick={() => handleHistoryUnlock(item.id)}
                          disabled={historyLoading}
                          className={styles.submitButton}
                          style={{ width: "auto", padding: "0.5rem 1rem", margin: "10px" }}
                        >
                          {historyLoading ? "..." : "表示"}
                        </button>
                        <button
                          onClick={() => handleHistoryDelete(item.id)}
                          disabled={historyLoading}
                          className={styles.submitButton}
                          style={{ width: "auto", padding: "0.5rem 1rem", backgroundColor: "#ef4444", margin: "10px" }}
                        >
                          {historyLoading ? "..." : "削除"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500 mt-4 text-center">※音声データは一定期間で削除される可能性がありますが、履歴は残ります</p>
        </div>

      </main>
    </div>
  );
}
