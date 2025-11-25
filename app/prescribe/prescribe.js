"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./summary.module.css";

import ModelSelector from "../components/ModelSelector";

// プロンプト定義（変更なし）
const PRESCRIPTION_CHECK_PROMPT = `# 命令書

あなたは、処方監査を専門とする超高精度な臨床アシスタントAIです。提供されたOCR化されたPDFファイル（新しい処方箋）と、テキスト（前回の処方箋）を分析し、下記の【出力フォーマット】と【実行手順】に従って、処方内容を完璧に要約・比較してください。

# 前提条件

* **最重要**: あなたのタスクは、**新しい処方箋（PDF）の内容を、【出力フォーマット】に従って正確に書き出す**ことです。
* 前回処方（テキスト）が提供された場合は、**変更点を見つけるための比較対象**および**出力形式の参考**として使用します。
* PDFから抽出した情報が絶対的な正です。

# 出力フォーマット

以下の形式を寸分違わず厳密に守って出力してください。

1.  **ヘッダー行**:
    * \`YYYY.M.D　[クリニック名]　[日数]日分処方[変更の有無]　次回:[次回情報]\` の形式で1行で記載します。
    * 日付、クリニック名、処方日数、次回情報はPDFから抽出します。
    * **【重要】変更の有無は、薬剤の用法・用量・種類に変更があった場合のみ「変更あり」**と記載します。処方日数や粉砕指示のみの変更は「変更なし」と扱います。

2.  **薬剤リスト（定期処方）**:
    * **このリストには定期処方の薬剤のみを記載してください。屯用薬は含めないでください。**
    * **グループ化**: **用法（例：分1 昼食後）が同一の薬剤を一つのグループ**とし、番号を付けてリスト化します。
    * **インデント**: グループ内で2剤目以降の薬剤のインデントは、以下のルールに従います。
        * **【最重要】前回処方がある場合**: 前回処方テキストに記載されているインデント（行頭のスペース）を**完全に継承し、寸分違わず正確に再現**してください。
        * **前回処方がない場合**: 行頭を**全角スペース1文字**でインデントします。
    * **【最重要】薬剤名の表記**: 
        * 処方箋に記載の薬剤が一般名（例: ミルタザピン）の場合、その代表的な**商品名**（例: リフレックス）を特定し、必ず **\`商品名（一般名）\`** の形式で記載してください。一般名のカタカナ部分は**必ず半角**にしてください。（例: \`リフレックス（ﾐﾙﾀｻﾞﾋﾟﾝ）\`）
        * **【OCRの揺らぎ補正】**: PDFからのOCR結果が不正確な場合（例：「イーシ・ドバー」）、前回処方テキストの表記（例：「イーシ・ドパール」）や、あなたの持つ一般的な医薬品知識を参考に、最も正確だと思われる正式名称（例：「イーシー・ドパール配合錠」）で出力してください。OCRのわずかな誤字は、前回処方や一般知識に基づいて積極的に補正すること。
    * **桁揃えと全体の幅**: \`[1回量][単位]\`の部分は、各行で右端が揃うように**全角スペース**で調整してください。全体の幅は以下のルールに従ってください。
        * **前回処方がある場合**: 前回処方テキストの各行の最大横幅を基準とし、それを超えないようにスペースの数を厳密に調整してください。
        * **前回処方がない場合**: 全角文字を2、半角文字を1としてカウントし、各行の合計幅が**およそ50**になるように、薬剤名と用量表示の間のスペース数を調整してください。
    * **用法記載**: グループの用法は、**グループ最後の薬剤と同じ行の最後に続けて記載**してください。

3.  **頓用薬リスト**:
    * もし頓用薬があれば、定期処方リストの**直下の行に改行を入れずに**、**\`【頓用】\`** という見出しを設けてください。
    * その下に、**番号を付けずに**頓用薬をリスト化します。
    * 表記、桁揃え、インデントのルールは上記の薬剤リストと同じです。
    * 用法の部分には、「不眠時」や「不穏時」などの指示内容を記載してください。

4.  **差分注記**:
    * 薬剤の用法・用量・種類に変更があった場合のみ、薬剤リスト（屯用薬があればその下）の最後に改行し、必ず**全角の「※」**を行頭に付け、**全ての変更内容を1行にまとめて記載**します。
    * **複数の変更点がある場合は、読点「、」で区切ってください。**
    * **形式**: \`※YYYY.M.D [変更点1]、[変更点2]\`
    * (例): \`※2025.4.24 デパケンR 10mg→100mg、クービビック 中止\`

---
*(出力例)*
*2025.4.24　町田クリニック　21日分処方変更あり*
*1.デパケンR（ﾊﾞﾙﾌﾟﾛ酸ﾅﾄﾘｳﾑ）錠100㎎　　　 1錠　分1　夕食後*
*2.デエビゴ（ﾚﾝﾎﾞﾚｷｻﾝﾄ）錠10㎎　　　　　　 1錠*
*　ルネスタ（ｴｽｿﾞﾋﾟｸﾛﾝ）錠1㎎　　　　　　　 1錠　分1　就寝直前*
*【頓用】*
*ワイパックス（ﾛﾗｾﾞﾊﾟﾑ）錠0.5㎎　　　　　 0.5錠　不眠時、不穏時*
*※2025.4.24 デパケンR 10mg→100mg、クービビック 中止、デエビゴ 追加、ルネスタ 追加、ワイパックス 追加*
---

# 実行手順

1.  **新規処方内容の完全な抽出**: PDFから患者氏名、交付年月日、処方日数、薬剤、規格、用法・用量をAI-OCR機能で正確に抽出します。処方薬が「定期」か「頓用」かを区別します。

2.  **【最重要】前回処方との比較（差分検出）**:
    * もし前回処方のテキストが入力されていれば、新規処方内容と比較し、**以下の薬剤に関する変更点のみ**を「変更」として特定します。
        * **用量変更**: 同じ薬剤の用量（例: 1.25錠 → 1.5錠）が変わった。
        * **薬剤の追加**: 新たにリストに加わった薬剤。
        * **薬剤の中止**: 前回はあったが、今回はリストにない薬剤。
        * **用法変更**: 服用タイミングなどが変わった。
    * **【注意】処方日数の変更、粉砕指示の追加・削除などは、薬剤自体の変更ではないため「変更なし」として扱い、差分注記に記載しないでください。**

3.  **出力生成**:
    * **前回処方がある場合**: 
        * 手順2で薬剤の変更を検出した場合、ヘッダーを「変更あり」とし、【出力フォーマット】に従って差分注記を追加します。
        * 手順2で薬剤の変更がなかった場合、ヘッダーを「変更なし」とし、差分注記は記載しません。
    * **前回処方がない場合**: 比較は不要です。PDFから抽出した新規処方内容を、【出力フォーマット】に厳密に従って出力してください。`;

export default function PrescriptionCheckerPage() {
  const [files, setFiles] = useState([]);
  const [previousPrescription, setPreviousPrescription] = useState("");
  const [resultText, setResultText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(PRESCRIPTION_CHECK_PROMPT);
  const [copyButtonText, setCopyButtonText] = useState("結果をコピー");

  // ★初期値を「Pro (高精度)」に変更
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");

  const [isDragActive, setIsDragActive] = useState(false);
  const resultRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (resultText || error) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [resultText, error]);

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
      if (resultText) setResultText("");
    },
    [resultText]
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
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else if (e.type === "dragleave") setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (fileName) => {
    setFiles(files.filter((file) => file.name !== fileName));
    setResultText("");
    setError("");
  };

  const onZoneClick = () => fileInputRef.current?.click();

  const handleClear = () => {
    setFiles([]);
    setPreviousPrescription("");
    setResultText("");
    setError("");
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("PDFファイルを1つ以上選択してください。");
      return;
    }
    setIsLoading(true);
    setError("");
    setResultText("");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("prompt", prompt);
    formData.append("previous_prescription", previousPrescription);
    formData.append("model", selectedModel);

    try {
      const response = await fetch("/api/prescribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `サーバーエラー: ${response.status}`
        );
      }
      const data = await response.json();
      setResultText(data.summary);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard
      .writeText(resultText)
      .then(() => {
        setCopyButtonText("コピーしました！");
        setTimeout(() => setCopyButtonText("結果をコピー"), 2000);
      })
      .catch((err) => console.error("Copy failed: ", err));
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>レシピチェッカー</h1>
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
            >
              クリア
            </button>
          </div>
          <p className={styles.subtitle}>
            新しいレシピ(PDF)と前回のレシピ内容(テキスト)から変更点を検出します。
          </p>
        </header>

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
                {isDragActive
                  ? "ファイルをドロップ"
                  : "新規レシピ (PDF) を選択"}
              </span>
              <p className={styles.uploadHint}>
                ドラッグ＆ドロップまたはクリック
              </p>
            </label>
          </div>

          {files.length > 0 && (
            <div className={styles.fileListContainer}>
              <div className={styles.fileListHeader}>
                <p className={styles.fileListTitle}>
                  選択中のPDF ({files.length}件):
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
                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className={styles.removeFileButton}
                      aria-label={`${file.name}を削除`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.promptEditorSection}>
            <label
              htmlFor="previous-prescription"
              className={styles.promptEditorSummary}
              style={{ display: "block", marginBottom: "0.75rem" }}
            >
              前回レシピ（もしあれば）
            </label>
            <textarea
              id="previous-prescription"
              className={styles.promptEditorTextarea}
              value={previousPrescription}
              onChange={(e) => setPreviousPrescription(e.target.value)}
              rows={8}
              placeholder="前回のレシピ内容を貼り付けてください"
            />
          </div>

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

          {/* ★モデル選択セクション（配置変更：生成ボタンの直上） */}
          <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />

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
                "差分を検出して生成"
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
          {resultText && (
            <div className={styles.summaryResult}>
              <h2 className={styles.summaryTitle}>生成された処方内容</h2>
              <div className={styles.summaryContent}>
                <button onClick={handleCopy} className={styles.copyButton}>
                  {copyButtonText}
                </button>
                <pre className={styles.summaryPre}>{resultText}</pre>
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
  );
}
