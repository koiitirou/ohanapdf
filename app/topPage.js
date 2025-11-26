// app/topPage.js
"use client"; // Linkコンポーネントを使用するため、Client Componentとします

import React from "react";
import Link from "next/link"; // Next.jsのLinkコンポーネントをインポート
import styles from "./TopPage.module.css"; // 簡単なスタイル用 (任意)

const TopPage = () => {
  return (
    <div className={styles.container}>
      {/* <h1 className={styles.title}>PDF処理</h1> */}
      
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <Link href="/terms" style={{ 
          display: "inline-block", 
          padding: "1rem 2rem", 
          backgroundColor: "#ffebee", 
          color: "#d32f2f", 
          border: "2px solid #d32f2f", 
          borderRadius: "8px", 
          textDecoration: "none", 
          fontWeight: "bold",
          fontSize: "1.1rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          ⚠️ 利用規定（必ずお読みください） &rarr;
        </Link>
      </div>

      <p className={styles.description}>利用機能を選択</p>

      <nav>
        <ul className={styles.linkList}>

          <li>
            {/* シンプル版 (Text-to-ZIP) へのリンク */}
            <Link href="/simple" className={styles.link}>
              <h2>PDF並び替え &rarr;</h2>
              {/* <p>入力したテキストをZIPファイルで直接ダウンロードします。</p> */}
            </Link>
          </li>
          <li>
            {/* フル機能版 (GCS経由) へのリンク */}
            <Link href="/checker" className={styles.link}>
              <h2>PDFチェッカー（記録確認用） &rarr;</h2>
              {/* <p>
                PDFとTXTを処理し、全結果（縦横PDF、分割PDF、Excel）を含むZIPをCloud
                Storage経由でダウンロードします。
              </p>
              <p>(旧: cloudProcess.js)</p> */}
            </Link>
          </li>
          <li>
            {/* フル機能版 (GCS経由) へのリンク */}
            <Link href="/letter" className={styles.link}>
              <h2>レター作成 &rarr;</h2>
              {/* <p>
                PDFとTXTを処理し、全結果（縦横PDF、分割PDF、Excel）を含むZIPをCloud
                Storage経由でダウンロードします。
              </p>
              <p>(旧: cloudProcess.js)</p> */}
            </Link>
          </li>
          <li>
            <Link href="/summary" className={styles.link}>
              <h2>サマリー作成 &rarr;</h2>
            </Link>
          </li>
          {/* <li>
            <Link href="/discharge" className={styles.link}>
              <h2 style={{ color: "grey", fontSize: "1em" }}>
                退院時サマリー &rarr;
              </h2>
            </Link>
          </li> */}
          <li>
            <Link href="/prescribe" className={styles.link}>
              <h2>レシピチェッカー（差分確認） &rarr;</h2>
            </Link>
          </li>
          <li>
            {/* 日付フィルタリング版 へのリンク */}
            <Link href="/prescription" className={styles.link}>
              <h2 style={{ color: "grey", fontSize: "1em" }}>
                最古日フィルター &rarr;
              </h2>
              {/* <p>
                PDFのみをアップロードし、各IDの最も古い処方日のページのみを含むPDFを直接ダウンロードします。
              </p>
              <p>(旧: pdfProcess.js)</p> */}
            </Link>
          </li>

        </ul>
      </nav>
    </div>
  );
};

export default TopPage;
