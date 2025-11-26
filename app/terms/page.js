"use client";

import React from "react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", fontFamily: "sans-serif", lineHeight: "1.6", color: "#333" }}>
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#0070f3", fontSize: "0.9rem" }}>
          &larr; トップページに戻る
        </Link>
        <h1 style={{ fontSize: "1.5rem", marginTop: "1rem", color: "#d32f2f" }}>【社外秘】業務支援AIツール利用ガイドライン</h1>
      </header>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", borderBottom: "2px solid #0070f3", paddingBottom: "0.5rem", marginBottom: "1rem" }}>1. はじめに：本ツールの取り扱いについて</h2>
        <p>
          本ツールは、当組織の業務効率化のために独自に開発・導入されたものです。 本ツールの存在、およびURLは<strong>「完全社外秘」</strong>です。 家族や友人を含め、<strong>組織外部の人間には絶対に口外しない</strong>でください。
        </p>
        <p>
          現在は便宜上、外部ネットワークからもアクセス可能となっていますが、あくまで社内業務専用です。<br />
          <span style={{ fontSize: "0.9rem", color: "#666" }}>※近い将来、セキュリティ強化のため社内ネットワークおよび指定のVPN接続端末以外からはアクセスできなくなる予定です。今のうちから「社内基幹システムの一部」として認識し、厳重に取り扱ってください。</span>
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", borderBottom: "2px solid #0070f3", paddingBottom: "0.5rem", marginBottom: "1rem" }}>2. セキュリティと「責任共有モデル」</h2>
        <p>
          本ツールは、エンタープライズ向けの高度なセキュリティ基盤（国内リージョンのGoogle Cloud / Vertex AI）上で動作します。 入力されたデータはAIの学習には一切使用されず、処理後は即座に破棄される設定となっています。
        </p>
        <p>
          しかし、いくらシステムが堅牢でも、運用方法が誤っていれば情報は漏洩します。これを<strong>「責任共有モデル」</strong>と呼びます。
        </p>
        <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "1rem 0" }}>
          <li style={{ marginBottom: "0.5rem" }}>🛡️ <strong>システムの責任</strong>: データを安全に処理する（クラウド基盤と管理者の責任）</li>
          <li>👤 <strong>運用の責任</strong>: データを適切に扱い、外部に漏らさない（利用する社員全員の責任）</li>
        </ul>
        <p>皆さんはこの「運用の責任」を担っています。以下のルールを厳守してください。</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", borderBottom: "2px solid #0070f3", paddingBottom: "0.5rem", marginBottom: "1rem" }}>3. 利用における絶対ルール</h2>
        <ol style={{ paddingLeft: "1.5rem" }}>
          <li style={{ marginBottom: "0.5rem" }}><strong>ブラウザ完結・保存禁止</strong><br />結果はブラウザ画面にのみ表示されます。業務終了後は必ずブラウザ（タブ）を閉じてください。</li>
          <li style={{ marginBottom: "0.5rem" }}><strong>転載・送信の禁止</strong><br />生成されたテキストをメール、LINE、個人用クラウドなど、指定の基幹システム以外の場所に転送・保存することは厳禁です。</li>
          <li><strong>ダブルチェック</strong><br />AIは事実と異なる回答を生成することがあります。必ず原典となる資料と照らし合わせ、最終的な責任は使用者が持ってください。</li>
        </ol>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", borderBottom: "2px solid #0070f3", paddingBottom: "0.5rem", marginBottom: "1rem" }}>4. 業務上の責任とAIの特性（ハルシネーション）について</h2>
        <p>
          AIは非常に優秀ですが、<strong>「もっともらしい虚偽（ハルシネーション）」</strong>を出力する可能性があります。AIの回答を鵜呑みにせず、以下の点には細心の注意を払ってください。
        </p>
        <div style={{ backgroundColor: "#f9f9f9", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
          <h3 style={{ fontSize: "1rem", color: "#2e7d32", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>✅</span> 必ず人間がダブルチェックを行うこと
          </h3>
          <p style={{ margin: "0.5rem 0 1rem" }}>AIが生成した文章はあくまで「下書き」です。最終的な公式記録への記載責任は、操作した担当者にあります。</p>

          <h3 style={{ fontSize: "1rem", color: "#2e7d32", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>✅</span> 特に注意すべき項目（以下の間違いは業務上致命的です）
          </h3>
          <p style={{ margin: "0.5rem 0" }}>数値や事実は、必ず元のPDF資料と照らし合わせて指差し確認してください。</p>
          <ul style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
            <li><strong>日付・期間</strong>: 「3日前」等の相対表現が、誤った日付に変換されていないか。</li>
            <li><strong>専門用語・数値</strong>: 単位（mg/ml等）や桁数、専門的な名称に間違いがないか。</li>
            <li><strong>属性・方向</strong>: 左右、正負、対象の属性などが逆転していないか。</li>
            <li><strong>否定・肯定</strong>: 「〜なし」「対象外」が「〜あり」「対象」になっていないか。</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", borderBottom: "2px solid #0070f3", paddingBottom: "0.5rem", marginBottom: "1rem" }}>5. コストと利用マナーについて</h2>
        <p>
          本ツールのAIエンジンは、使用量に応じた従量課金制です。 決して高額ではありませんが、塵も積もれば山となります。無駄遣いは避けてください。
        </p>
        <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "1rem 0" }}>
          <li>・ 目安コスト:</li>
          <li style={{ paddingLeft: "1rem" }}>o テキスト要約：1回 約 0.1〜0.5 円</li>
          <li style={{ paddingLeft: "1rem" }}>o PDF解析：1回 約 1〜5 円</li>
          <li style={{ paddingLeft: "1rem" }}>o 部署全体での月間想定予算：約 数百〜数千 円</li>
        </ul>
        <p>
          業務に必要な利用をためらう必要はありませんが、「不要な再生成を繰り返す」などの無駄な利用は控えてください。
        </p>
        <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "4px", marginTop: "1rem", fontSize: "0.9rem" }}>
          <strong>【利用状況の確認について】</strong><br />
          不正利用や過度な利用を防ぐため、「どの端末から、どれくらいアクセスがあったか」は、必要があれば管理者側でログを確認することができます。 節度を持って活用してください。
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", borderBottom: "2px solid #0070f3", paddingBottom: "0.5rem", marginBottom: "1rem" }}>6. 今後の展望と本ツールの位置づけ</h2>
        <p>
          これからの数年の間に、OSや電子ソフト自体にAIが標準搭載される未来が確実にやってきます。そうなれば、本ツールのような機能は標準実装され、陳腐化するでしょう。
        </p>
        <p style={{ marginTop: "1rem" }}>
          本ツールは、そうした便利な機能が一般的になるまでの<strong>「つなぎのツール」</strong>です。
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.2rem", borderBottom: "2px solid #0070f3", paddingBottom: "0.5rem", marginBottom: "1rem" }}>7. 導入にあたるお願い</h2>
        <p>
          本ツールを安全に使いこなすには、皆さんの持つ専門的な知識と実務経験が欠かせません。 効率化によって生まれた時間は、顧客対応や関係各所との連携、そしてご自身の負担軽減に充ててください。
        </p>
      </section>
      
      <footer style={{ marginTop: "3rem", borderTop: "1px solid #eee", paddingTop: "1rem", textAlign: "center" }}>
         <Link href="/" style={{ textDecoration: "none", color: "#0070f3" }}>
          トップページに戻る
        </Link>
      </footer>
    </div>
  );
}
