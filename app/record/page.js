"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Record.module.css";

export default function RecordLanding() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/record/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/record/view?room=${data.roomId}`);
      } else {
        const data = await res.json();
        setError(data.error || "接続に失敗しました");
      }
    } catch (err) {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    router.push("/record/view?mode=guest");
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Ohana Record</h1>
          <p className={styles.subtitle}>PCで録音結果を確認する</p>
        </div>

        <form onSubmit={handleConnect}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>ワンタイムID (4桁)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              className={styles.otpInput}
              placeholder="0000"
              autoComplete="one-time-code"
            />
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 4}
            className={styles.submitButton}
          >
            {loading ? "接続中..." : "接続する"}
          </button>
        </form>

        <div className={styles.divider}>
          <div className={styles.dividerLine}></div>
          <span className={styles.dividerText}>または</span>
          <div className={styles.dividerLine}></div>
        </div>

        <button 
          onClick={handleGuest} 
          className={styles.guestButton}
        >
          ゲストとして利用 (履歴なし)
        </button>
      </main>
    </div>
  );
}
