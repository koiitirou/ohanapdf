"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./summary.module.css";

// --- 定数定義 ---

const ADMISSION_PROMPT = `# 命令書

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
    * 全文書から、生命や処置に直結する最重要事項（例：アレルギー、薬剤禁忌、処置など）を抽出します。
    * 体重管理や食事制限など、日常的な看護ケアで特に注意すべき具体的な計画（閾値や対応策を含む）を統合し、簡潔に要約して記載します。

3.  **傷病名の網羅的リストアップ**:
    * 診療情報提供書、看護サマリー、救急対応シートなど、全文書の「病名」「既往歴」「持病」から傷病名を全て抽出し、重複を除いてリスト化します。

4.  **処方内容の完全な再構成**:
    * **情報の優先順位**: 処方情報が複数の文書で異なる場合（例：定期薬か屯用薬か）、**前提条件に従い、必ず日付が最も新しい文書の指示を正としてください。**
    * **処方の分類**: 紹介元の前医から引き継ぐ継続処方は\`【初診時処方内容】\`に記載します。患者が並行して通院している他の専門医からの処方は\`【他院処方】\`に記載します。
    * **処方のグルーピングと改行**: 用法が同一の薬剤を一つのグループにまとめ、番号を付けてリスト化します。グループの用法は、**必ずグループ最後の薬剤と同じ行に続けて記載**してください。**絶対に改行してはいけません。**
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
    * 各見出しの下に、関連する情報を複数の文書から集約し、箇条書きで簡潔に要約します。
    * **特に、各傷病名に対応する薬剤名、直近の関連する検査結果（日付と値を含む）、および特記事項（禁忌情報、治療方針など）は、必ず記載してください。**

8.  **ADL・補足情報の集約**:
    * 「その他」セクションに、キーパーソン情報や、看護サマリーから読み取れるADLの具体的な状況を箇条書きで記載します。

# 書式・思考ルール

1.  **【薬剤名の表記】**: 薬剤がジェネリック名で記載されている場合、先発品名を調べて補完し、**\`先発品名(ジェネリック名) 用量 錠数\`** の形式で記載すること。
    * ジェネリック医薬品名のカタカナ部分は必ず半角で記載する。（例：ｱﾄﾞﾅ）
2.  **【既往歴の表記】**: 個別の既往歴は **\`西暦年　病院名　内容\`** の形式で、全角スペースで区切って記載すること。
    * 文書から診断や手術に直接関連する病院名が特定できる場合は、**必ずその病院名を記載する**。
    * 明確な記述はないが、一貫したフォローアップ情報などから**関連性が強く推測される場合**は、「（明和病院と推測）」のように**推測であることを明記**した上で病院名を記載しても良い。
    * 関連性が不明、または他の専門機関が示唆される場合は、病院名を記載しないこと。
    * コロン（：）や助詞（「にて」等）は使用しない。
3.  **【処方内容の改行】**: 処方内容を記載する際、薬剤名、用量、錠数、用法は改行せず、一行にまとめて記載すること。
4.  **【関連性の原則】**: ある病院がある疾患で記載されていても、別の疾患と明確に関連付けられていない限り、その病院を別の疾患の担当として紐付けないこと。文書に明記されている関連性のみを記載する。
5.  **【用法の原則】**: 用法は、[1回量]錠/包/g等 分[1日回数][服用タイミング]の形式を厳守し、グループ最後の薬剤の最後に続けて記載してください。（例: 2錠 分2 朝夕食後）
（正しい記載例）
  5. パリエット(ﾗﾍﾞﾌﾟﾗｿﾞｰﾙNa)錠10㎎　 1錠
  　 バクタミニ配合錠20㎎　　　　　　 2錠 分1 朝食後
  6. アマリール(ｸﾞﾘﾒﾋﾟﾘﾄﾞ)錠1mg　　　  2錠 分2 朝夕食後

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
#[プロブレ-ム2]
[関連情報を集約して箇条書きで記載]

【初診後経過】

【予防接種】
インフルエンザワクチン：　　　
肺炎球菌ワクチン：
コロナワクチン：　　　　　　　　　　　　　　　　　　　
　
【その他】
[キーパーソン情報やADLの詳細などを記載]`;

const DISCHARGE_PROMPT = `あなたは医療事務アシスタントです。提供された一連の診療情報提供書、看護サマリー、薬剤情報提供書などのPDFファイルの内容を精読し、以下の【指示】と【出力形式】に寸分違わず従って「退院時サマリー」を日本語で作成してください。

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

// ★モデルの選択肢定義
const MODELS = [
  { id: "gemini-2.5-pro", label: "Pro (高精度)" },
  { id: "gemini-2.5-flash", label: "Flash (標準)" },
  { id: "gemini-2.5-flash-lite", label: "Flash Lite (高速)" },
];

export default function SummaryPage() {
  // State
  const [summaryType, setSummaryType] = useState("admission");
  const [files, setFiles] = useState([]);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(ADMISSION_PROMPT);
  const [copyButtonText, setCopyButtonText] = useState("結果をコピー");
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ★モデル選択State（初期値: 2.5-pro）
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");

  // Refs
  const resultRef = useRef(null);
  const fileInputRef = useRef(null);

  // Effects
  useEffect(() => {
    if (summary || error) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [summary, error]);

  // Handlers
  const handleTypeChange = (type) => {
    setSummaryType(type);
    if (type === "admission") {
      setPrompt(ADMISSION_PROMPT);
    } else {
      setPrompt(DISCHARGE_PROMPT);
    }
    setSummary("");
    setError("");
  };

  const handleFiles = useCallback(
    (selectedFiles) => {
      const pdfFiles = Array.from(selectedFiles).filter(
        (file) => file.type === "application/pdf"
      );
      if (pdfFiles.length === 0) {
        setError("PDFファイルのみアップロードできます。");
        return;
      }
      setFiles((prevFiles) => {
        const newFiles = pdfFiles.filter(
          (newFile) =>
            !prevFiles.some((prevFile) => prevFile.name === newFile.name)
        );
        return [...prevFiles, ...newFiles];
      });
      setError("");
      if (summary) {
        setSummary("");
      }
    },
    [summary]
  );

  const handleFileChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = null;
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const removeFile = (fileName) => {
    setFiles(files.filter((file) => file.name !== fileName));
    setSummary("");
    setError("");
  };

  const onZoneClick = () => {
    fileInputRef.current?.click();
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
      });
  };

  const handleClear = () => {
    setFiles([]);
    setSummary("");
    setError("");
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  // プレビューを表示する処理
  const handlePreview = (file) => {
    const fileUrl = URL.createObjectURL(file);
    setPreviewUrl(fileUrl);
    setIsPreviewOpen(true);
  };

  // プレビューを閉じる処理
  const closePreview = () => {
    setIsPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl); // メモリ解放
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("PDFファイルを1つ以上選択してください。");
      return;
    }
    setIsLoading(true);
    setError("");
    setSummary("");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("prompt", prompt);
    formData.append("model", selectedModel); // ★選択されたモデルIDを送信

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        body: formData,
      });

      if (response.status === 413) {
        throw new Error(
          "容量を超過しました。アップロードするファイルの合計サイズを小さくしてください。"
        );
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "サーバーで予期しないエラーが発生しました。"
        );
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pageTitle =
    summaryType === "admission"
      ? "初診時サマリー生成AI"
      : "退院時サマリー生成AI";

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>{pageTitle}</h1>
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
            >
              クリア
            </button>
          </div>
          <p className={styles.subtitle}>
            複数の医療関連PDFをアップロードすると、AIがサマリーを作成します。
          </p>
        </div>

        {/* サマリータイプ切り替え */}
        <div className={styles.toggleContainer}>
          <button
            onClick={() => handleTypeChange("admission")}
            className={`${styles.toggleButton} ${
              summaryType === "admission" ? styles.active : ""
            }`}
          >
            初診時サマリー
          </button>
          <button
            onClick={() => handleTypeChange("discharge")}
            className={`${styles.toggleButton} ${
              summaryType === "discharge" ? styles.active : ""
            }`}
          >
            退院時サマリー
          </button>
        </div>

        {/* ★モデル切り替え（タイプ選択の下、ファイル選択の上） */}
        <div
          className={styles.toggleContainer}
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem" }}
        >
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`${styles.toggleButton} ${
                selectedModel === m.id ? styles.active : ""
              }`}
              style={{ fontSize: "0.9rem", padding: "0.4rem 1rem" }}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className={styles.fileDropzone}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              id="file-upload"
              name="files"
              type="file"
              multiple
              accept=".pdf"
              className={styles.srOnly}
              onChange={handleFileChange}
            />
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
              <span className={styles.uploadText}>
                {isDragActive ? "ファイルをドロップ" : "ファイルを選択"}
              </span>
              <p className={styles.uploadHint}>
                PDFをドラッグ＆ドロップまたはクリック
              </p>
            </label>
          </div>

          {files.length > 0 && (
            <div className={styles.fileListContainer}>
              <div className={styles.fileListHeader}>
                <p className={styles.fileListTitle}>
                  選択中のファイル ({files.length}件):
                </p>
                <button
                  type="button"
                  onClick={onZoneClick}
                  className={styles.addFileButton}
                >
                  ＋ ファイルを追加
                </button>
              </div>
              <ul className={styles.fileList}>
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className={styles.fileListItem}
                  >
                    <span>{file.name}</span>
                    <div className={styles.fileListActions}>
                      <button
                        type="button"
                        onClick={() => handlePreview(file)}
                        className={styles.previewButton}
                      >
                        プレビュー
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className={styles.removeFileButton}
                        aria-label={`${file.name}を削除`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
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
              ) : summary ? (
                "現在のファイルで再生成"
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
                  <strong>【ご注意】</strong>{" "}
                  この内容はAIによって自動生成されたものです。必ず元の資料と照合し、内容の正確性を確認してください。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* PDFプレビューモーダル */}
      {isPreviewOpen && previewUrl && (
        <div className={styles.modalOverlay} onClick={closePreview}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>PDFプレビュー</h3>
              <button onClick={closePreview} className={styles.closeButton}>
                &times;
              </button>
            </div>
            <object
              data={previewUrl}
              type="application/pdf"
              className={styles.pdfObject}
            >
              <p>
                お使いのブラウザはPDFの表示をサポートしていません。
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  こちらからダウンロード
                </a>
                してください。
              </p>
            </object>
          </div>
        </div>
      )}
    </div>
  );
}
