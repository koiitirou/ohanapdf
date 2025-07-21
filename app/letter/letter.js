"use client";

import { useState } from "react";

const Letter = () => {
  // フォームの入力値を管理するstateを2つに変更
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");

  // AIからの生成結果、ローディング状態、エラーを管理するstate
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // フォーム送信時の処理
  const handleSubmit = async (e) => {
    e.preventDefault(); // ページの再読み込みを防止
    setIsLoading(true);
    setResult("");
    setError("");

    try {
      // バックエンドのAPIにリクエストを送信 (送信するデータを変更)
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, summary }), // 2つの入力値を送信
      });

      // エラーハンドリング
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIリクエストに失敗しました。");
      }

      // 成功した場合、結果をstateに保存
      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      // 処理が成功・失敗に関わらずローディングを終了
      setIsLoading(false);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>診療情報提供書 自動生成システム</h1>

      <form onSubmit={handleSubmit}>
        {/* 入力フォームを2つに変更 */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="content">紹介状の内容（自由記載）:</label>
          <br />
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="例：本日転倒し、右股関節痛の訴えあり。精査加療をお願いします。"
            required
            style={{ width: "100%", padding: "0.5rem", minHeight: "100px" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="summary">これまでの経過、サマリー:</label>
          <br />
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="例：既往に大腿骨骨折あり。普段は杖歩行レベル。"
            style={{ width: "100%", padding: "0.5rem", minHeight: "100px" }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{ padding: "0.75rem 1.5rem", cursor: "pointer" }}
        >
          {isLoading ? "生成中..." : "紹介状を生成"}
        </button>
      </form>

      {/* エラーが発生した場合に表示 */}
      {error && (
        <div style={{ marginTop: "1.5rem", color: "red" }}>
          <p>
            <strong>エラー:</strong> {error}
          </p>
        </div>
      )}

      {/* 生成結果が表示された場合に表示 */}
      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2>生成結果</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              backgroundColor: "#f4f4f4",
              padding: "1rem",
              border: "1px solid #ddd",
            }}
          >
            {result}
          </pre>
        </div>
      )}
    </main>
  );
};

export default Letter;
