"use client";


import { useState, useEffect } from "react";
import styles from "./Phone.module.css";

export default function Phone() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  
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

  // Set default name on mount
  useEffect(() => {
    setName(new Date().toLocaleString("ja-JP"));
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
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) {
      alert("ファイルを選択してください。");
      return;
    }

    if (!password) {
      alert("パスワードを入力してください。");
      return;
    }

    setLoading(true);
    setResult("");
    setAudioUrl("");
    setStatus("ファイルをアップロード中...");
    setCopied(false);
    setResultTitle("");

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

      setStatus("AIで処理中...");

      // 2. Process with Vertex AI
      const processRes = await fetch("/api/process-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gcsUri: gcsUri,
          prompt: "あなたは常に日本語で回答するAIです。会話の内容を要約して。",
        }),
      });

      if (!processRes.ok) {
        const errorData = await processRes.json();
        throw new Error(errorData.error || "処理に失敗しました");
      }

      const processData = await processRes.json();
      const summaryResult = processData.result;
      
      setResult(summaryResult);
      setResultTitle(name); // Set title for fresh result
      setStatus("完了！");

      // 3. Save result to metadata
      await fetch("/api/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, summary: summaryResult }),
      });

      // Refresh history
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
      setAudioUrl(data.audioUrl);
      
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
          <label className={styles.label}>パスワード (必須)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.textInput}
            placeholder="パスワードを入力してください"
          />
        </div>

        <div className={styles.fileDropzone}>
          <label className="block mb-4 font-medium text-slate-700">.m4a音声ファイルを選択</label>
          <input
            type="file"
            accept=".m4a,audio/mp4,audio/x-m4a"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
        </div>

        <button
          onClick={handleUploadAndProcess}
          disabled={!file || !password || loading}
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
              {audioUrl && (
                <audio controls src={audioUrl} className={styles.audioPlayer}>
                  Your browser does not support the audio element.
                </audio>
              )}
              
              {result && (
                <>
                  <button 
                    onClick={handleCopy} 
                    className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                  >
                    {copied ? "コピーしました！" : "結果をコピー"}
                  </button>
                  {result}
                </>
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
                      {new Date(item.timestamp).toLocaleString("ja-JP")}
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
          <p className="text-xs text-red-500 mt-4 text-center">※履歴とデータは24時間後に自動的に削除されます</p>
        </div>

      </main>
    </div>
  );
}
