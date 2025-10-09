"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./discharge.module.css"; // 対応するCSSモジュールをインポート

// ユーザーからの指示で更新された、退院時サマリー用のデフォルトプロンプト
const DEFAULT_PROMPT = `あなたは医療事務アシスタントです。提供された一連の診療情報提供書、看護サマリー、薬剤情報提供書などのPDFファイルの内容を精読し、以下の【指示】と【出力形式】に寸分違わず従って「退院時サマリー」を日本語で作成してください。

【指示】

■ 入院歴の形式:
文書から一連の入院歴を時系列で抽出し、以下の形式を厳密に守って記載してください。
- 一行目: 先頭に全角の黒丸「・」を付け、最初の入院について [期間] [医療機関名] ：[入院目的] の形式で記載します。
- 二行目以降: 行頭を全角スペース1文字でインデント（字下げ）し、転院、一時退院、再入院などの経過を時系列で記載します。各行には必ず期間を記載してください。期間の形式は、開始日と終了日が同じ年の場合は「YYYY.M.D～M.D」のように終了日の年を省略し、年をまたぐ場合は「YYYY.M.D～YYYY.M.D」としてください。
- 最終行: 最後の入院期間、退院元の医療機関名、そして全角コロン「：」に続けて最終診断名を記載してください。

■ 退院時処方の形式:
- 見出し: (退院時処方)に続けて、処方日数を記載してください。（例: (退院時処方)14日分処方）
- 薬剤リスト:
  - 用法（例：朝食後）が同一の薬剤を一つのグループにまとめ、番号を付けてリスト化してください。
  - ジェネリック医薬品の場合は、可能な限り「先発品名(ジェネリック名)」の形式で記載してください。ジェネリック名は半角カタカナまたは英数字で、括弧との間にスペースは入れないでください。（例: パリエット(ﾗﾍﾞﾌﾟﾗｿﾞｰﾙNa)錠10mg）
  - グループ内の各薬剤は改行して記載します。2行目以降は全角スペース1文字でインデントしてください。
  - [薬剤名]と[1回量][単位]の間は、右端が揃うように全角スペースで調整してください。
  - グループの用法（例: 分1朝食後）は、グループ最後の薬剤の最後に続けて記載してください。
    （例）
    5. パリエット(ﾗﾍﾞﾌﾟﾗｿﾞｰﾙNa)錠10㎎　 1錠
    　 バクタミニ配合錠20㎎　　　　　　 2錠 分1朝食後
- 屯用薬: 定期内服薬の下に「屯用」という見出しを設け、同様に記載してください。

■ 処方に関する注記の形式:
- 処方元: 処方薬の由来（例: 1～4は当院処方 5,6は〇〇病院処方）を一行で記載してください。行頭に記号は不要です。
- 入院中の変更点: 上記の下の行に、必ず全角の「※」を行頭に付け、入院中の薬剤変更（増減量、中止、頓用への変更など）に関する注記を簡潔に記載してください。

■ インスリン指示の形式:
- (インスリン指示)という見出しを設けてください。
- 薬剤名と、変更後の単位を記載してください。
- 変更があった場合は、変更前の単位を括弧書きで必ず追記してください。（例: 朝2昼1夕1(朝3昼2夕2から変更)）

■ 次回受診日の形式:
- 次回：の後に日付のみを記載し、最後に全角スペースを1つ入れてください。

■ 備考（経過サマリー）の形式:
- (備考)という見出しを設けてください。
- 内容は改行をせず、一つの連続した文章として、発症から退院までの臨床経過を時系列で簡潔に要約してください。`;

export default function DischargeSummaryPage() {
  // --- State Hooks ---
  const [files, setFiles] = useState([]);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [copyButtonText, setCopyButtonText] = useState("結果をコピー");
  const resultRef = useRef(null);

  // --- Effects ---
  // 結果が表示されたら、その位置まで自動でスクロールする
  useEffect(() => {
    if (summary || error) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [summary, error]);

  // --- Event Handlers ---
  // ファイルが選択されたときの処理
  const handleFileChange = (e) => {
    // 複数のファイルが選択されても良いようにFileListをArrayに変換
    setFiles(Array.from(e.target.files));
    // ファイルが変更されたら、以前の結果をクリア
    setSummary("");
    setError("");
  };

  // 結果をクリップボードにコピーする処理
  const handleCopy = () => {
    if (!summary) return;
    const textArea = document.createElement("textarea");
    textArea.value = summary;
    // スタイルを適用して画面外に隠す
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopyButtonText("コピーしました！");
      setTimeout(() => setCopyButtonText("結果をコピー"), 2000); // 2秒後にボタンのテキストを戻す
    } catch (err) {
      console.error("Failed to copy: ", err);
      setCopyButtonText("コピーに失敗");
      setTimeout(() => setCopyButtonText("結果をコピー"), 2000);
    }
    document.body.removeChild(textArea);
  };

  // フォームが送信されたときの処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("PDFファイルを1つ以上選択してください。");
      return;
    }
    if (!prompt.trim()) {
      setError("プロンプトを入力してください。");
      return;
    }
    setIsLoading(true);
    setError("");
    setSummary("");
    setCopyButtonText("結果をコピー");

    // FormDataオブジェクトを作成して、ファイルとプロンプトを追加
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("prompt", prompt);

    try {
      // バックエンドのAPIにPOSTリクエストを送信
      const response = await fetch("/api/discharge", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        // サーバーからのエラーレスポンスを処理
        throw new Error(data.error || "サーバーでエラーが発生しました。");
      }
      setSummary(data.summary);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.contentWrapper}>
          <div className={styles.header}>
            <h1 className={styles.title}>退院時サマリー生成AI</h1>
            <p className={styles.subtitle}>
              複数の医療関連PDFをアップロードすると、AIが退院時サマリーを自動作成します。
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label htmlFor="file-upload" className={styles.fileUploadLabel}>
                ファイルアップロード
              </label>
              <div className={styles.dropzone}>
                <div className={styles.dropzoneContent}>
                  <svg
                    className={styles.uploadIcon}
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4V12a4 4 0 014-4h12l4-4h12a4 4 0 014 4v4m-8 4l-4-4m0 0l-4 4m4-4v12"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className={styles.uploadText}>
                    <label
                      htmlFor="file-upload"
                      className={styles.uploadButtonLabel}
                    >
                      <span>ファイルを選択</span>
                      <input
                        id="file-upload"
                        name="files"
                        type="file"
                        multiple
                        accept=".pdf"
                        className={styles.srOnly}
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">またはドラッグ＆ドロップ</p>
                  </div>
                  <p className={styles.uploadHint}>PDFファイルのみ対応</p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className={styles.fileListContainer}>
                <h3 className={styles.fileListTitle}>選択中のファイル:</h3>
                <ul className={styles.fileList}>
                  {files.map((file) => (
                    <li key={file.name} className={styles.fileListItem}>
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <details className={styles.details}>
                <summary className={styles.summary}>
                  プロンプトを編集する
                </summary>
                <div className={styles.promptEditorContainer}>
                  <textarea
                    className={styles.promptTextarea}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={15}
                    aria-label="AIへの指示プロンプト"
                  />
                </div>
              </details>
            </div>

            <div className={styles.submitContainer}>
              <button
                type="submit"
                disabled={isLoading || files.length === 0}
                className={styles.submitButton}
              >
                {isLoading ? (
                  <>
                    <svg
                      className={styles.loadingSpinner}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    生成中...
                  </>
                ) : (
                  "サマリーを生成"
                )}
              </button>
            </div>
          </form>

          <div ref={resultRef} className={styles.resultContainer}>
            {error && (
              <div className={styles.errorBox}>
                <div className={styles.errorContent}>
                  <div className={styles.errorIconContainer}>
                    <svg
                      className={styles.errorIcon}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className={styles.errorTitle}>エラーが発生しました</p>
                    <p className={styles.errorMessage}>{error}</p>
                  </div>
                </div>
              </div>
            )}
            {summary && (
              <div className={styles.summaryResult}>
                <div className={styles.summaryHeader}>
                  <h2 className={styles.summaryResultTitle}>
                    生成されたサマリー
                  </h2>
                  <button onClick={handleCopy} className={styles.copyButton}>
                    {copyButtonText}
                  </button>
                </div>
                <div className={styles.summaryContent}>
                  <pre className={styles.summaryPre}>{summary}</pre>
                </div>
                <div className={styles.disclaimer}>
                  <p>
                    <strong>【ご注意】</strong>{" "}
                    この内容はAIによって自動生成されたものです。必ず元の資料と照合し、内容の正確性を確認してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
