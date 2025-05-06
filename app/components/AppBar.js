// app/components/AppBar.js
import React from "react";
import Link from "next/link";
import styles from "./AppBar.module.css"; // AppBar用のCSSモジュール (任意)

const AppBar = () => {
  return (
    <header className={styles.appBar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoLink}>
          <h1 className={styles.logo}>PDF処理</h1>
        </Link>
        <nav>
          {/* 必要に応じて他のナビゲーションリンクもここに追加できます */}
          <Link href="/" className={styles.navLink}>
            トップへ
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default AppBar;
