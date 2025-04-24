"use client";

import { useState, useEffect } from "react";

export default function UploadPage() {
  const [pdfFile, setPdfFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploadedPdfs, setUploadedPdfs] = useState([]);
  const [uploadedTxts, setUploadedTxts] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const handlePdfFileChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  const handleTxtFileChange = (e) => {
    setTxtFile(e.target.files[0]);
  };

  const handlePdfSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) return;

    const formData = new FormData();
    formData.append("file", pdfFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setMessage(data.message);
    fetchUploadedFiles();
  };

  const handleTxtSubmit = async (e) => {
    e.preventDefault();
    if (!txtFile) return;

    const formData = new FormData();
    formData.append("file", txtFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setMessage(data.message);
    fetchUploadedFiles();
  };

  const fetchUploadedFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/listUploadedFiles");
      if (res.ok) {
        const data = await res.json();
        const pdfs = data.files.filter((file) => file.endsWith(".pdf"));
        const txts = data.files.filter((file) => file.endsWith(".txt"));
        setUploadedPdfs(pdfs);
        setUploadedTxts(txts);
      } else {
        console.error("Failed to fetch uploaded files");
        setMessage("Failed to fetch uploaded files.");
      }
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
      setMessage("Error fetching uploaded files.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const deleteAllFiles = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all files in /upload? This action cannot be undone."
      )
    ) {
      setDeletingAll(true);
      try {
        const res = await fetch("/api/deleteAllFiles", {
          method: "POST",
        });

        if (res.ok) {
          const data = await res.json();
          setMessage(data.message);
          fetchUploadedFiles();
        } else {
          const errorData = await res.json();
          setMessage(
            `Failed to delete all files: ${errorData.error || "Unknown error"}`
          );
        }
      } catch (error) {
        console.error("Error deleting all files:", error);
        setMessage(`Error deleting all files: ${error.message}`);
      } finally {
        setDeletingAll(false);
      }
    }
  };

  const showFileContent = (filename) => {
    window.open(`/api/showFile?filename=${filename}`, "_blank");
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  return (
    <div>
      <h1>Upload Files</h1>
      <div>
        <h2>Upload PDF</h2>
        <form onSubmit={handlePdfSubmit}>
          <input type="file" accept=".pdf" onChange={handlePdfFileChange} />
          <button type="submit">Upload PDF</button>
        </form>
      </div>
      <div>
        <h2>Upload TXT</h2>
        <form onSubmit={handleTxtSubmit}>
          <input type="file" accept=".txt" onChange={handleTxtFileChange} />
          <button type="submit">Upload TXT</button>
        </form>
      </div>

      <button onClick={deleteAllFiles} disabled={deletingAll}>
        {deletingAll ? "Deleting..." : "Delete All"}
      </button>

      <h2>Uploaded PDFs</h2>
      {loadingFiles ? (
        <p>Loading files...</p>
      ) : uploadedPdfs.length > 0 ? (
        <ul>
          {uploadedPdfs.map((filename) => (
            <li key={filename}>
              {filename}
              <button onClick={() => showFileContent(filename)}>Show</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No PDF files uploaded yet.</p>
      )}

      <h2>Uploaded TXT Files</h2>
      {loadingFiles ? (
        <p>Loading files...</p>
      ) : uploadedTxts.length > 0 ? (
        <ul>
          {uploadedTxts.map((filename) => (
            <li key={filename}>
              {filename}
              <button onClick={() => showFileContent(filename)}>Show</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No TXT files uploaded yet.</p>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}
