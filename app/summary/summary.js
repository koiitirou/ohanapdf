"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./summary.module.css";

// デフォルトのプロンプトをコンポーネント内に定義
const DEFAULT_PROMPT = `# 命令書

あなたは、経験豊富な臨床アシスタントです。提供された複数のOCR化された医療関連ファイル（診療情報提供書、看護サマリー、処方箋、FAX連絡票など）を専門家の視点で横断的に読み解き、下記の【サマリーフォーマット】と【書式・思考ルール】に従って、実践的で質の高い「初診時サマリー」を完璧に作成してください。

# 前提条件

* あなたは単なる情報抽出係ではなく、文書間の関連性を読み解き、臨床的な文脈を理解して情報を統合・要約する能力を持ちます。
* **【最重要】矛盾する情報がある場合は、必ず日付が新しい文書の情報を正としてください。**（例：古い紹介状で屯用薬でも、新しい入院サマリーで定期薬になっていれば、定期薬として記載する）
* 情報が文書から見つけられない項目は、空欄にするか「不明」と記載します。

# 実行手順

1.  **基本情報の特定**:
    * 患者の氏名、生年月日を特定します。初診日に基づいて年齢を計算します。
    * FAX連絡票の宛先（To）や紹介状の宛名から、新しい担当医と施設名・部屋番号を特定します。
    * FAX連絡票やサマリーから、体験入居日や本入居日を特定します。

2.  **最重要管理事項（★）の策定**:
    * 全文書から、生命や処置に直結する最重要事項（例：アレルギー、左腕処置禁など）を抽出します。
    * 体重管理や食事制限など、日常的な看護ケアで特に注意すべき具体的な計画（閾値や対応策を含む）を統合し、簡潔に要約して記載します。

3.  **傷病名の網羅的リストアップ**:
    * 診療情報提供書、看護サマリー、救急対応シートなど、全文書の「病名」「既往歴」「持病」から傷病名を全て抽出し、重複を除いてリスト化します。

4.  **処方内容の完全な再構成**:
    * **情報の優先順位**: 処方情報が複数の文書で異なる場合（例：定期薬か屯用薬か）、**前提条件に従い、必ず日付が最も新しい文書の指示を正としてください。**
    * **処方の分類**: 紹介元の前医から引き継ぐ継続処方は\`【初診時処方内容】\`に記載します。患者が並行して通院している他の専門医からの処方は\`【他院処方】\`に記載します。
    * **処方のグルーピングと改行**: 用法が同一の薬剤を一つのグループにまとめ、番号を付けてリスト化します。グループの用法は、**必ずグループ最後の薬剤と同じ行に続けて記載**してください。**絶対に改行してはいけません。**
      (悪い例):
      薬A 1錠
      薬B 1錠
      分1 朝食後
      (良い例):
      薬A 1錠
      薬B 1錠 分1 朝食後
    * 処方日、処方日数、処方の経緯が分かれば記載します。
    * **【書式・思考ルール1, 3】** に従い、薬剤情報を正確にフォーマットします。
    * 屯用薬は「屯」のセクションに記載します。

5.  **既往歴の時系列作成**:
    * 全文書から手術歴や疾患発症の情報を抽出します。
    * **年号の統一**: 既往歴の年号は、**全て西暦に変換**して統一します。（例：平成21年 → 2009年）
    * **記載順**: 発症時期が不明なものは「時期不詳」としてまとめ、判明しているものは時系列に沿って並べます。
    * **【書式・思考ルール2, 4】** に従って記載します。

6.  **現病歴・経緯の物語的要約**:
    * 複数の診療情報提供書や看護サマリーの内容を統合し、疾患の発症から現在に至るまでの治療の大きな流れを、一つの連続した物語として「現病歴」に要約します。
    * 生活背景から施設入居に至った社会的な経緯を「初診までの経緯」にまとめます。

7.  **プロブレム別「記録」の作成**:
    * 主要な傷病名を「#」付きの見出しにします。
    * 各見出しの下に、関連する情報（発症経緯、主要な検査結果、治療方針など）を複数の文書から集約し、箇条書きで簡潔に要約します。

8.  **ADL・補足情報の集約**:
    * 「その他」セクションに、キーパーソン情報や、看護サマリーから読み取れるADLの具体的な状況を箇条書きで記載します。

# 書式・思考ルール

1.  **【薬剤名の表記】**: 薬剤がジェネリック名で記載されている場合、先発品名を調べて補完し、**\`先発品名(ジェネリック名) 用量 錠数\`** の形式で記載すること。
2.  **【既往歴の表記】**: 個別の既往歴は **\`西暦年　病院名　内容\`** の形式で、全角スペースで区切って記載すること。
    * 文書から診断や手術に直接関連する病院名が特定できる場合は、**必ずその病院名を記載する**。
    * 明確な記述はないが、一貫したフォローアップ情報などから**関連性が強く推測される場合**は、「（明和病院と推測）」のように**推測であることを明記**した上で病院名を記載しても良い。
    * 関連性が不明、または他の専門機関が示唆される場合は、病院名を記載しないこと。
    * コロン（：）や助詞（「にて」等）は使用しない。
3.  **【処方内容の改行】**: 処方内容を記載する際、薬剤名、用量、錠数、用法は改行せず、一行にまとめて記載すること。
4.  **【関連性の原則】**: ある病院がある疾患で記載されていても、別の疾患と明確に関連付けられていない限り、その病院を別の疾患の担当として紐付けないこと。文書に明記されている関連性のみを記載する。

# サマリーフォーマット

[患者氏名]　 [生年月日]([元号])　[年齢]歳　初診）[初診日]　入居日）[入居日]
ADL)　
　　　　　　　　　　　　　　　　　　　　
【感染症】[感染症情報]　【アレルギー】[アレルギー情報]
　　　　　　　　　　　　　　　　　　　　　　　　　　　
≪担当医：[担当医名]≫　（[施設名・部屋番号]）

★[クリティカルな注意事項や管理計画を記載]
★[上記に続く注意事項や管理計画を記載]

【屯】
[屯用薬があれば記載]
　　　　　　　　　　　
【傷病名】
[抽出した傷病名を列挙]

【受診希望病院】

【初診時処方内容】
[紹介元の前医から引き継ぐ処方を記載]

【他科受診】
[他科のフォローアップ情報を記載]
　
【他院処方】
[並行してかかっている他科の処方を記載]

【日常生活自立度】
障害高齢者の日常生活自立度：[ランク] / 認知症高齢者の日常生活自立度：[ランク]
　　
【既往歴】
[指定の書式で時系列に記載]
　
【現病歴】
[物語的に要約した内容を記載]

【初診までの経緯】
[社会的背景を含めて要約した内容を記載]

【記録】
#[プロブレム1]
[関連情報を集約して箇条書きで記載]
#[プロブレム2]
[関連情報を集約して箇条書きで記載]

【初診後経過】

【予防接種】
インフルエンザワクチン：　　　
肺炎球菌ワクチン：
コロナワクチン：　　　　　　　　　　　　　　　　　　　
　
【その他】
[キーパーソン情報やADLの詳細などを記載]`;

export default function SummaryPage() {
  const [files, setFiles] = useState([]);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [copyButtonText, setCopyButtonText] = useState("結果をコピー");
  const resultRef = useRef(null);

  useEffect(() => {
    if (summary || error) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [summary, error]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setSummary("");
    setError("");
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard
      .writeText(summary)
      .then(() => {
        setCopyButtonText("コピーしました！");
        setTimeout(() => setCopyButtonText("結果をコピー"), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        setCopyButtonText("コピーに失敗");
        setTimeout(() => setCopyButtonText("結果をコピー"), 2000);
      });
  };

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

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("prompt", prompt);

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
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

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>初診時サマリー生成AI</h1>
          <p className={styles.subtitle}>
            複数の医療関連PDFをアップロードすると、AIが初診時サマリーを作成します。
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.fileDropzone}>
            <label htmlFor="file-upload" className={styles.fileLabel}>
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
              <span className={styles.uploadText}>ファイルを選択</span>
              <p className={styles.uploadHint}>
                PDFファイルをドラッグ＆ドロップまたはクリック
              </p>
            </label>
            <input
              id="file-upload"
              name="files"
              type="file"
              multiple
              accept=".pdf"
              className={styles.srOnly}
              onChange={handleFileChange}
            />
          </div>

          {files.length > 0 && (
            <div className={styles.fileListContainer}>
              <p className={styles.fileListTitle}>選択中のファイル:</p>
              <ul className={styles.fileList}>
                {files.map((file) => (
                  <li key={file.name}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.promptEditorSection}>
            <details>
              <summary className={styles.promptEditorSummary}>
                プロンプトを編集する
              </summary>
              <textarea
                className={styles.promptEditorTextarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={15}
              />
            </details>
          </div>

          <div className={styles.submitButtonContainer}>
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

        <div ref={resultRef}>
          {error && (
            <div className={styles.errorBox}>
              <p className={styles.errorTitle}>エラー</p>
              <p>{error}</p>
            </div>
          )}
          {summary && (
            <div className={styles.summaryResult}>
              <h2 className={styles.summaryTitle}>生成されたサマリー</h2>
              <div className={styles.summaryContent}>
                <button onClick={handleCopy} className={styles.copyButton}>
                  {copyButtonText}
                </button>
                <pre className={styles.summaryPre}>{summary}</pre>
              </div>
              <div className={styles.disclaimer}>
                <p>
                  <strong>【ご注意】</strong>
                  この内容はAIによって自動生成されたものです。必ず元の資料と照合し、内容の正確性を確認してください。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
