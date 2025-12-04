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
    if (!otp || otp.length !== 6) {
      setError("6桁の番号を入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/record/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "接続に失敗しました");
      }

      router.push(`/record/view?room=${data.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    router.push("/record/view?mode=guest");
  };

  return (
    <div className={styles.container}>
      <main className={`${styles.main} ${styles.landingCard}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Ohana Record</h1>
          <p className={styles.subtitle}>PCで録音結果を確認する</p>
        </div>

        <form onSubmit={handleConnect}>
          <div className={styles.otpInputGroup}>
            <label className={styles.otpLabel}>ワンタイムID (6桁)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className={styles.otpInput}
              placeholder="000000"
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className={styles.primaryButton}
          >
            {loading ? "接続中..." : "接続する"}
          </button>
        </form>

        <div className={styles.divider}>または</div>

        <button onClick={handleGuest} className={styles.guestButton}>
          ゲストとして利用 (履歴なし)
        </button>
      </main>
    </div>
  );
}
