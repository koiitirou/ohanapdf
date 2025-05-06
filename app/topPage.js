// app/topPage.js
"use client"; // Linkコンポーネントを使用するため、Client Componentとします

import React from "react";
import Link from "next/link"; // Next.jsのLinkコンポーネントをインポート
import styles from "./TopPage.module.css"; // 簡単なスタイル用 (任意)

const TopPage = () => {
  return (
    <div className={styles.container}>
      {/* <h1 className={styles.title}>PDF処理</h1> */}
      <p className={styles.description}>利用機能を選択</p>

      <nav>
        <ul className={styles.linkList}>
          <li>
            {/* シンプル版 (Text-to-ZIP) へのリンク */}
            <Link href="/simple" className={styles.link}>
              <h2>並び替え &rarr;</h2>
              {/* <p>入力したテキストをZIPファイルで直接ダウンロードします。</p> */}
            </Link>
          </li>

          <li>
            {/* 日付フィルタリング版 へのリンク */}
            <Link href="/prescription" className={styles.link}>
              <h2>最古日フィルター &rarr;</h2>
              {/* <p>
                PDFのみをアップロードし、各IDの最も古い処方日のページのみを含むPDFを直接ダウンロードします。
              </p>
              <p>(旧: pdfProcess.js)</p> */}
            </Link>
          </li>
          <li>
            {/* フル機能版 (GCS経由) へのリンク */}
            <Link href="/full" className={styles.link}>
              <h2>並び替え（Excelあり） &rarr;</h2>
              {/* <p>
                PDFとTXTを処理し、全結果（縦横PDF、分割PDF、Excel）を含むZIPをCloud
                Storage経由でダウンロードします。
              </p>
              <p>(旧: cloudProcess.js)</p> */}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default TopPage;
