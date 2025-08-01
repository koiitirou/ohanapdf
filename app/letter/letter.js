"use client";

import { useState } from "react";
import styles from "./Letter.module.css";

// ✨ 省略されていた定数定義をここに追加
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
2.  **事前方針の確認と提案:** 入力内容に「看取り」「DNAR」「急変時対応」「今後の相談」といった、終末期医療や事前の方針決定に関する情報が含まれていないか確認します。もし関連する情報があれば、その内容を本文に含めることを提案するサジェストを作成します。（例：「ご家族とDNARの方針であることを追記しますか？」）
3.  **構成案作成:** 抽出した情報を元に、以下の構成で文章全体の骨子を組み立てます。
    * 挨拶文（居住地情報を含む）
    * 本文（主訴・経緯・所見を時系列に沿って記述）
    * 結びの言葉
4.  **文章生成:** 構成案に基づき、後述の「#出力ルール」と「#出力例」を厳密に守って、自然で滑らかな日本語の文章を生成します。

---
# 出力ルール
以下のルールを厳密に守って文章を生成してください。

## 1. 全体的な最重要ルール
* **【プライバシー保護】 個人情報（氏名、住所、電話番号、ID番号など）は絶対に出力しないでください。患者名は「上記患者様」、施設名は入力された情報のみを使用してください。**
* **【文体】 文体は「です・ます」調を基本とし、簡潔な丁寧語を使用してください。過度な敬語（例：「〜でございます」「〜致しました」「〜お願い申し上げます」）は避け、「〜があります」「〜を認めます」「〜しました」「〜お願いします」といった客観的で明確な表現を優先してください。**

## 2. 挨拶文のルール
* 必ず「いつもお世話になっております。」または「平素より大変お世話になっております。」から始めてください。
* 抽出した【患者様の居住地】を使い、「現在患者様は、{居住地}にご入居されており当院にて訪問診療しております。」という形式の文章を続けてください。

## 3. 本文作成のルール
* 抽出した【紹介の主訴・経緯】と【現在の症状・所見】を客観的な事実として、時系列に沿って記述してください。
* 複雑な医学的アセスメント（臨床的評価）は行わず、事実の記述に徹してください。

## 4. 結びの言葉のルール
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
いつもお世話になっております。現在患者様は、介護付き有料老人ホーム「テスト」に入居されており当院にて訪問診療しております。
上記患者様ですが、本日転倒し、左頭部を打撲しました。外傷や自覚症状はありませんが、ご高齢でもあり、念のため精査加療をお願いしたく紹介させていただきました。また、転倒時より右股関節痛の訴えがあります。こちらについてもご高診をお願いできますでしょうか。
ご多忙とは存じますが、何卒よろしくお願い申し上げます。

### 【出力例2】
#### (入力情報の例)
* **紹介状の内容:** 右鼠径ヘルニアあり。著明な痛みはないが、ヘルニア門が小さく嵌頓リスクを考慮。今後の方針相談をしたい。
* **これまでの経過、サマリー:** テスト２に入居中の99歳。看取りの方針で家族と合意済み。

#### (生成結果の例)
いつもお世話になっております。現在患者様は介護付き有料老人ホーム「テスト２」にご入居されており当院にて訪問診療しております。
以前よりお世話になっております上記患者様ですが、右鼠径ヘルニアを認めます。明らかな疼痛などの自覚症状はありませんが、ヘルニア門が小さく今後嵌頓などの可能性も考慮されます。99歳と超高齢でもあり今後の方針などを含めご高診、ご加療をお願いしたく紹介させて頂きました。
ご多忙とは存じますが何卒宜しくお願い申し上げます。

### 【出力例3】
#### (入力情報の例)
* **紹介状の内容:** 胸部しこり部分に赤みが増してきたため、再度受診を勧めたい。
* **これまでの経過、サマリー:** 有料老人ホーム「テスト３」在住。右乳がん術後で、貴院フォロー後に当院でアナスト処方継続中。R4.5に腫瘍マーカー上昇したが本人は受診希望せず。

#### (生成結果の例)
平素より大変お世話になっております。現在患者様は、有料老人ホーム「テスト３」にご入居されており当院にて訪問診療しております。
上記患者様は右乳がん術後、貴院にてお世話になっていた方です。施設入居後、当院でアナストロゾールの処方を継続し、定期採血でフォローしておりました。
R4.5月、腫瘍マーカーの上昇がありご家族様と受診について相談しましたが、ご本人様の自覚症状がない為受診を希望されませんでした。引き続き当院で採血フォローとしておりましたが、今回、胸部しこり部分に赤みが増してきたため、再度受診をお勧めしました。
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
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_TEMPLATE); // これでエラーが解消されます
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [additionalRequest, setAdditionalRequest] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("");
    setError("");
    setCopySuccess(false);
    setSuggestions([]);
    setAdditionalRequest("");
    setSelectedSuggestions([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, summary, prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIリクエストに失敗しました。");
      }

      const data = await response.json();
      setResult(data.result);
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
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
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error("クリップボードへのコピーに失敗しました。", err);
        alert("コピーに失敗しました。");
      }
    );
  };

  const handleToggleSuggestion = (suggestion) => {
    setSelectedSuggestions((prev) =>
      prev.includes(suggestion)
        ? prev.filter((item) => item !== suggestion)
        : [...prev, suggestion]
    );
  };

  const handleBulkRefine = async () => {
    const combinedRefinements = [
      ...selectedSuggestions,
      additionalRequest,
    ].filter(Boolean);

    if (combinedRefinements.length === 0) {
      alert("修正内容を1つ以上選択または入力してください。");
      return;
    }

    const refinementText =
      "以下の点を反映して文章を修正してください：\n- " +
      combinedRefinements.join("\n- ");

    setIsRefining(true);
    setError("");

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: result,
          refinement: refinementText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "修正リクエストに失敗しました。");
      }

      const data = await response.json();
      setResult(data.result);
      setSuggestions([]);
      setAdditionalRequest("");
      setSelectedSuggestions([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefining(false);
    }
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

            <div className={styles.refinementSection}>
              {isLoading || isRefining ? (
                <p>{isRefining ? "修正中..." : ""}</p>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    // Letter.js ファイル内の該当箇所を修正

                    <div className={styles.suggestionButtonsContainer}>
                      {" "}
                      {/* ✨ ボタンを囲むコンテナを追加 */}
                      {suggestions.map((suggestion, index) => {
                        const isSelected =
                          selectedSuggestions.includes(suggestion);
                        return (
                          <button
                            key={index}
                            className={`${styles.suggestionButton} ${
                              isSelected ? styles.suggestionButtonSelected : ""
                            }`}
                            onClick={() => handleToggleSuggestion(suggestion)}
                          >
                            {/* ✨ isSelectedがtrueの時にチェックマークを表示 */}
                            {isSelected ? "✅ " : ""}
                            {suggestion}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className={styles.freeFormRefine}>
                    <label htmlFor="additionalRequest" className={styles.label}>
                      その他、追加・修正したい点を自由に入力:
                    </label>
                    <textarea
                      id="additionalRequest"
                      value={additionalRequest}
                      onChange={(e) => setAdditionalRequest(e.target.value)}
                      placeholder="例：既往歴として高血圧があることを追記してください。"
                      className={styles.textarea}
                    />
                  </div>

                  <button
                    onClick={handleBulkRefine}
                    disabled={
                      selectedSuggestions.length === 0 && !additionalRequest
                    }
                    className={styles.button}
                    style={{ marginTop: "20px", width: "100%" }}
                  >
                    選択した内容で再生成する
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Letter;
