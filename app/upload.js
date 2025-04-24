"use client";

import { useState } from "react";

export default function UploadPDF() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("ファイルを選択してください。");
      return;
    }

    const formData = new FormData();
    formData.append("pdfFile", selectedFile);

    try {
      const response = await fetch("./api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        alert("PDFのアップロードに成功しました！");
        console.log("サーバーからの応答:", data);
        // ここで加工後のPDFへのリンクを表示したり、次のステップに進む処理を記述できます。
      } else {
        alert(`PDFのアップロードに失敗しました: ${data.error}`);
      }
    } catch (error) {
      console.error("アップロードエラー:", error);
      alert("アップロード中にエラーが発生しました。");
    }
  };

  return (
    <div>
      <h1>PDFアップロード</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!selectedFile}>
        アップロード
      </button>
      {selectedFile && <p>選択中のファイル: {selectedFile.name}</p>}
    </div>
  );
}
