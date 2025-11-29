"use client";


import { useState, useEffect } from "react";
import styles from "./Phone.module.css";
import { MODEL_OPTIONS, DEFAULT_MODEL } from "../utils/modelConfig";
import ModelSelector from "../components/ModelSelector";

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

      // 2. Process with Vertex AI
      const processRes = await fetch("/api/process-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gcsUri: gcsUri,
          prompt: `あなたは訪問診療クリニックの熟練した医療事務スタッフです。
提供される「有料老人ホームとクリニック間の電話会話テキスト（または音声文字起こし）」をもとに、医師や看護師への申し送り用の簡潔な要約テキストを作成してください。

# 入力情報
- ファイルの題名：これが「施設名」に該当します。
- テキスト内容：着信時間、発信者（看護師等）、会話内容が含まれています。

# 出力フォーマットのルール
1. **ヘッダー**: 1行目にファイルの題名（施設名）と患者名（カタカナ）を記載する。ただし、複数名の場合は患者名ではなく「3名」のように人数を記載する。
2. **メタ情報**: 2行目に「着信時間」と「相手の名前（職種）」を記載する。
3. **患者セクション**:
   - 会話に出てくる患者ごとにセクションを分ける。
   - 患者名は必ず「カタカナ」で記載する。
   - 挨拶、社交辞令、個人的な感情（「〜と思う」「怖い」などの主観）は極力削除し、医療的な事実と相談内容のみを抽出する。
4. **バイタルサイン**:
   - 報告がある場合は必ず以下の形式に統一する（順序も維持）。
     \`BP[収縮期]/[拡張期]　KT[体温]℃　P[脈拍]　SPO2-[数値]％\`
5. **食事摂取量**:
   - 報告がある場合は \`[主食割]/[副食割]　主食/副食\` の形式、または簡潔に記載する。
6. **指示・結び**:
   - クリニック側からの指示や決定事項で文章を締めくくること。
   - 文末表現の例：「〜に注意して経過観察を指示」「〜に対しカロナール200mg 2錠内服指示」「〜について医師に相談する」「〜であり救急搬送を指示」「〜とする」
7. **文字起こし**:
7. **文字起こし**:
   - 出力の最後に \`--TRANSCRIPTION--\` という区切り線を入れ、その下に会話の全文（文字起こし）を出力する。話者分離（Aさん: ... Bさん: ...）も行い、**必ず発言者ごとに改行を入れること**。連続した段落として出力しないこと。

# 出力例（Few-shot）

入力: （ファイル名：施設A_1123.txt）
「もしもし、お世話になっております。施設Aの田中です。今10時半なんですけど、ヤマダハナコ様について相談で...（中略）...それからサトウヨシコ様なんですけど、以前の足の指の腫れがまた...（中略）...あとタナカタロウ様、朝熱高かったんですけど...」

出力:
施設A　3名

10:30　田中NS
ヤマダ ハナコ様
その後嘔吐はないが、飲水に関して執着あり水中毒の様な感じ。
BP119/76　KT36.6℃　P81　SPO2-97％
医師より飲水制限があれば本人に伝え制限できるため指示希望。
まずは1回量を100～200ml程度に抑えて提供いただく。
制限としては2Lまでなら可。
嘔吐で居室対応中だったが、隔離解除とする。

サトウ ヨシコ様
左第2足趾に以前と同様に腫れ・発赤・痛みあり。
アズノールガーゼで保護中。前回はゲンタシン軟膏塗布していたがそちらの方がいいか相談あり。傷はなし。
休み明けまでアズノールガーゼで対応いただく。

タナカ タロウ様
朝KT38.5℃だった。朝食後薬にカロナール400㎎あり内服済み。
その後再検でKT37.3℃まで解熱。グレースビット内服中。
経過観察とする。

--TRANSCRIPTION--
施設A 田中: もしもし、お世話になっております。施設Aの田中です。
クリニック 受付: はい、お世話になっております。
施設A 田中: 今10時半なんですけど、ヤマダハナコ様について相談で...（中略）...それからサトウヨシコ様なんですけど、以前の足の指の腫れがまた...（中略）...あとタナカタロウ様、朝熱高かったんですけど...

---

入力: （ファイル名：施設B_1124.txt）
「夜分にすみません、0時40分です。施設Bのナガタニです。スズキサチコ様についてご報告が...（中略）...」

出力:
施設B　スズキ サチコ様

0:40　ナガタニNS
スズキ サチコ様
嘔吐は落ち着いてるが9時にKT37.8℃　P85　BP144/60　SPO2-94％
先ほど息子様から電話あり、息子様インフルエンザ陽性だったと連絡あり。
朝食は1割程度、水分200ml程度摂取され内服は可能。
対応について相談あり。
本日16時頃に抗原検査依頼。

--TRANSCRIPTION--
施設B ナガタニ: 夜分にすみません、0時40分です。施設Bのナガタニです。
クリニック 医師: はい、どうされましたか？
施設B ナガタニ: スズキサチコ様についてご報告が...

---

入力: （ファイル名：施設C_1125.txt）
「お疲れ様です、11時14分です。施設Cの山本です。タカハシカズコ様の件で...（中略）...」

出力:
施設C　タカハシ カズコ様

11:14　山本NS
タカハシ カズコ様
往診時エコーで便貯留あり。昨夜ラキソベロン5滴使用も反応便なし。
今朝お白湯注入後、腹壁張りあり、胃瘻挿入部のガーゼが挟めないくらい張っていた。
その後メイン注入開始後腹痛訴えあり。トイレ誘導も排便なし。
その後多量に嘔吐。注入がほとんど出てしまったくらいの量だった。
BP132/75　KT35.8℃　P107　SPO2-98％
嘔吐後は腹痛・腹部の張りも軽減している。対応について相談あり。
レシカルボン座薬で排便積極的に促していただく。

--TRANSCRIPTION--
施設C 山本: お疲れ様です、11時14分です。施設Cの山本です。
クリニック 受付: お疲れ様です。
施設C 山本: タカハシカズコ様の件で...

---

# 今回の入力テキスト
（ここにテキストを入力してください）`,
          model: selectedModel,
        }),
      });

      if (!processRes.ok) {
        const errorData = await processRes.json();
        throw new Error(errorData.error || "処理に失敗しました");
      }

      const processData = await processRes.json();
      const fullResult = processData.result;
      
      // Split result and transcription
      const parts = fullResult.split("--TRANSCRIPTION--");
      const summaryText = parts[0].trim();
      let transcriptionText = parts.length > 1 ? parts[1].trim() : "";

      // Post-process transcription to ensure line breaks
      // Look for patterns like "Name:" or "Name：" that are NOT at the start of a line
      transcriptionText = transcriptionText.replace(/([^\n])(\s*(?:施設|クリニック|Aさん|Bさん|[^\s]+?)[：:])/g, '$1\n$2');

      setResult(summaryText);
      setTranscription(transcriptionText);
      setCorrectedSummary(""); // Initialize corrected summary as empty
      setResultTitle(name); // Set title for fresh result
      setCurrentId(id);
      setStatus("完了！");

      // 3. Save result to metadata
      await fetch("/api/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          summary: summaryText,
          transcription: transcriptionText,
          correctedSummary: "" // Save as empty initially
        }),
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

    if (diff < minute) {
      return "たった今";
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}時間前`;
    } else {
      return "1日前";
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
