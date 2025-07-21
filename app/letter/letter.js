"use client";

import { useState, FormEvent } from "react";
import styles from "./Letter.module.css"; // CSSモジュールをインポート

const DEFAULT_PROMPT_TEMPLATE = `
# 役割設定
あなたは、極めて優秀で経験豊富な日本の臨床医AIアシスタントです。提供された断片的な臨床情報を元に、日本の医療現場でそのまま使える、丁寧で過不足のない「診療情報提供書（紹介状）」の本文を作成します。

---
# 処理フロー
あなたは以下のステップで思考し、最終的な文章を生成します。
1.  **情報抽出:** 入力された「紹介状の内容」と「これまでの経過、サマリー」から、以下の要素をすべて抽出・整理します。
    * 【患者様の居住地】
    * 【紹介の主訴・経緯】
    * 【現在の症状・所見】
    * 【関連する既往歴や背景】
    * 【紹介の目的】(精査、加療、方針相談など)
2.  **構成案作成:** 抽出した情報を元に、以下の構成で文章全体の骨子を組み立てます。
    * 挨拶文（居住地情報を含む）
    * 本文（主訴・経緯・所見を時系列に沿って記述）
    * 結びの言葉
3.  **文章生成:** 構成案に基づき、後述の「#出力ルール」と「#出力例」を厳密に守って、自然で滑らかな日本語の文章を生成します。

---
# 出力ルール
以下のルールを厳密に守って文章を生成してください。

## 1. 挨拶文のルール
* 必ず「いつもお世話になっております。」または「平素より大変お世話になっております。」から始めてください。
* 抽出した【患者様の居住地】を使い、「現在患者様は、{居住地}にご入居されており当院にて訪問診療しております。」という形式の文章を続けてください。

## 2. 本文作成のルール
* 抽出した【紹介の主訴・経緯】と【現在の症状・所見】を客観的な事実として、時系列に沿って記述してください。
* 複雑な医学的アセスメント（臨床的評価）は行わず、事実の記述に徹してください。
* 抽出した【関連する既往歴や背景】を、文脈上自然な形で補足情報として加えてください。

## 3. 結びの言葉のルール
* 抽出した【紹介の目的】を反映させ、「〜のため、ご紹介させていただきました。」「〜をお願いしたく紹介させて頂きました。」といった形で本文を締めくくってください。
* 最後に必ず「ご多忙とは存じますが何卒宜しくお願い申し上げます。」や「貴院におかれましては、大変多忙とは存じますが、ご高診のほど何卒宜しくお願い致します。」といった丁寧な結びの言葉で文章を終えてください。

---
# 【★★ 追記事項・カスタムルールはここに記述してください ★★】
#
# ※このセクションに記載された指示は、上記のルールよりも優先されます。
# (例1) もし入力情報に「至急」や「緊急」という単語が含まれる場合、文章のトーンをより切迫したものに調整してください。
# (例2) もし紹介目的が「緩和ケア」の場合、結びの言葉を「患者様が安らかな時間を過ごせるよう、先生方のお力添えを賜りたく存じます。」というニュアンスに変更してください。
#
# (ここに新しいルールを自由に追加できます)
#

---
# 出力例
### 【出力例1】
#### (入力情報の例)
* **紹介状の内容:** 本日転倒し、左頭部を打撲。右股関節痛の訴えあり。高齢のため念のため精査希望。
* **これまでの経過、サマリー:** 介護付き有料老人ホーム「テスト」に入居中。

#### (生成結果の例)
いつもお世話になっております。現在患者様は、介護付き有料老人ホーム「テスト」にご入居
されており当院にて訪問診療しております。
上記患者様ですが、本日転倒し、左頭部を打撲されました。外傷、自覚症状等はございませんが、
御高齢でもあり、念のため精査加療をお願いしたく紹介させていただきました。また、転倒時より右
股関節痛を訴えております。こちらについても御高診をお願いできますでしょうか。
ご多忙とは存じますが、何卒よろしくお願い申し上げます。

### 【出力例2】
#### (入力情報の例)
* **紹介状の内容:** 右鼠径ヘルニアあり。著明な痛みはないが、ヘルニア門が小さく嵌頓リスクを考慮。今後の方針相談をしたい。
* **これまでの経過、サマリー:** テスト２に入居中の99歳。

#### (生成結果の例)
いつもお世話になっております。現在患者様は介護付き有料老人ホーム「テスト２」
にご入居されており当院にて訪問診療しております。
以前よりお世話になっております上記患者様ですが、右鼠径ヘルニアを認めております。明らかな
疼痛等自覚症状は認めておりませんがヘルニア門が小さく今後嵌頓等の可能性も考慮されます。99
歳と超高齢でもあり今後の方針等含め御高診御加療をお願いしたく紹介させて頂きました。
ご多忙とは存じますが何卒宜しくお願い申し上げます。

### 【出力例3】
#### (入力情報の例)
* **紹介状の内容:** 胸部しこり部分に赤みが増してきたため、再度受診を勧めたい。
* **これまでの経過、サマリー:** 有料老人ホーム「テスト３」在住。右乳がん術後で、貴院フォロー後に当院でアナスト処方継続中。R4.5に腫瘍マーカー上昇したが本人は受診希望せず。

#### (生成結果の例)
平素より大変お世話になっております。現在患者様は、有料老人ホーム「テスト３」にご入居さ
れており当院にて訪問診療しております。
上記患者様ですが、右乳がん術後、貴院にてお世話になっていた方です。施設入居後、当院でアナスト処方継続、定期採血でフォローさせていただいております。
R4.5月、腫瘍マーカー上昇ありご家族様と受診について相談しましたが、ご本人様の自覚症状がな
い為受診希望はされず。引き続き当院で採血フォローとさせていただいておりました。
今回、胸部しこり部分に赤みが増してきており、再度受診をお勧めしました。
貴院におかれましては、大変多忙とは存じますが、ご高診のほど何卒宜しくお願い致します。

---
# 本番入力
【紹介状の内容（自由記載）】
{{content}}

【これまでの経過、サマリー】
{{summary}}

#### 生成結果
`;

const Letter = () => {
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_TEMPLATE);
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("");
    setError("");
    setCopySuccess(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, summary, prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIリクエストに失敗しました。");
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // 2秒後にメッセージをリセット
      },
      (err) => {
        console.error("クリップボードへのコピーに失敗しました。", err);
        alert("コピーに失敗しました。");
      }
    );
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>診療情報提供書 作成支援</h1>
        </div>

        <div className={styles.formWrapper}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="content" className={styles.label}>
                診療情報提供書の内容（含めたい内容を自由記載）:
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="例：本日転倒し、右股関節痛の訴えあり。精査加療をお願いします。"
                required
                className={styles.textarea}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="summary" className={styles.label}>
                これまでの経過・サマリー（断片的な情報でよい）:
              </label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="例：既往に大腿骨骨折あり。普段は杖歩行レベル。"
                className={styles.textarea}
              />
            </div>

            <details className={styles.details}>
              <summary className={styles.summary}>プロンプトを編集する</summary>
              <div className={styles.promptEditor}>
                <label htmlFor="prompt" className={styles.label}>
                  AIへの指示（プロンプト）:
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className={styles.promptTextarea}
                />
              </div>
            </details>

            <button
              type="submit"
              disabled={isLoading}
              className={styles.button}
            >
              {isLoading ? "生成中..." : "診療情報提供書を生成"}
            </button>
          </form>
        </div>

        {error && (
          <div className={styles.error}>
            <p>
              <strong>エラー:</strong> {error}
            </p>
          </div>
        )}

        {result && (
          <div className={styles.resultWrapper}>
            <h2 className={styles.resultHeader}>生成結果</h2>
            <div className={styles.resultPreContainer}>
              <pre className={styles.resultPre}>{result}</pre>
              <button
                onClick={handleCopy}
                className={`${styles.copyButton} ${
                  copySuccess ? styles.copyButtonSuccess : ""
                }`}
              >
                {copySuccess ? "コピー成功！" : "コピー"}
              </button>
            </div>
            <p className={styles.disclaimer}>
              ※本文章はAIによって生成されたものです。必ず内容を確認・修正した上でご使用ください。
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Letter;
