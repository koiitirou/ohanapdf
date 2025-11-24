"use client";

import { useState } from "react";

export default function Phone() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setLoading(true);
    setResult("");
    setStatus("Uploading file...");

    try {
      // 1. Upload to GCS
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadRes.json();
      const gcsUri = uploadData.fileUrl; // Expecting gs:// URI

      setStatus("Processing with Vertex AI...");

      // 2. Process with Vertex AI
      const processRes = await fetch("/api/process-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gcsUri: gcsUri,
          prompt: "Please provide a 'Hello World' style summary of this audio.",
        }),
      });

      if (!processRes.ok) {
        const errorData = await processRes.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const processData = await processRes.json();
      setResult(processData.result);
      setStatus("Done!");

    } catch (error) {
      console.error(error);
      setStatus("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audio Processing Demo</h1>
      
      <div className="mb-6 p-6 border rounded-lg shadow-sm bg-white">
        <label className="block mb-2 font-medium">Select .m4a Audio File</label>
        <input
          type="file"
          accept=".m4a,audio/mp4,audio/x-m4a"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      <button
        onClick={handleUploadAndProcess}
        disabled={!file || loading}
        className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors
          ${!file || loading 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {loading ? "Processing..." : "Upload and Process"}
      </button>

      {status && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          {status}
        </div>
      )}

      {result && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">Result:</h2>
          <div className="p-4 bg-gray-50 rounded-lg border whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
