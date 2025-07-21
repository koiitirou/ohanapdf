import { VertexAI } from "@google-cloud/vertexai";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const PROMPT_TEMPLATE = `
# 命令書：診療情報提供書（紹介状）作成支援AI

あなたは、極めて優秀な臨床医AIアシスタントです。
これから入力される2つの自由記述欄「紹介状の内容」と「これまでの経過、サマリー」を精読し、必要な情報を抽出・整理して、一つの完成された紹介状本文を生成してください。

### 指示事項
1.  **文章の構成:** 【紹介状の内容】に記載された依頼事項を文章の核とし、【これまでの経過、サマリー】から得られる具体的な経緯や患者様の背景情報で肉付けをしてください。
2.  **挨拶文:** 入力情報から【患者様の居住地】を特定し、冒頭の挨拶文に組み込んでください。
3.  **本文作成:** 入力情報から【紹介の主訴・経緯】や【現在の症状・所見】を読み取り、本文の中心となる文章を作成してください。
4.  **全体の体裁:** 最終的な出力は、挨拶から結びの言葉まで含んだ、丁寧で滑らかな一通の文章にしてください。
5.  **スタイルとトーン:** 以下の【出力例】のスタイルとトーンを忠実に再現し、客観的な事実に基づいて、紹介先の医師に判断を委ねるような丁寧な表現を用いてください。

---
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

---
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

---
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
### 【本番】

#### 入力情報
【紹介状の内容（自由記載）】
{{content}}

【これまでの経過、サマリー】
{{summary}}

#### 生成結果
`;

// --- 認証情報を一時ファイルに書き出し、そのパスを返すヘルパー関数 ---
async function setupCredentials() {
  const credentialsJsonString = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJsonString) {
    throw new Error("GOOGLE_CREDENTIALS environment variable is not set.");
  }

  // Vercelなどのサーバーレス環境でも書き込み可能な一時ディレクトリにファイルを作成
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, `creds-${Date.now()}.json`);

  // ファイルに認証情報を書き込む
  await fs.writeFile(filePath, credentialsJsonString);

  // Googleのライブラリが標準で参照する環境変数に、作成したファイルのパスを設定
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;

  console.log(`Credentials file successfully created at: ${filePath}`);
  return filePath;
}

export async function POST(request) {
  let tempCredFilePath;
  try {
    // ★★★ 新しい認証処理を呼び出す ★★★
    tempCredFilePath = await setupCredentials();

    const { content, summary } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "「紹介状の内容」は必須です。" },
        { status: 400 }
      );
    }

    let finalPrompt = PROMPT_TEMPLATE.replace("{{content}}", content).replace(
      "{{summary}}",
      summary || "特記事項なし"
    );

    // ★★★ VertexAIの初期化方法を変更 ★★★
    // projectとlocationのみ指定。credentialsは環境変数から自動で読み込まれる
    const project = "api1-346604"; // プロジェクトIDを直接指定
    const location = "us-central1";
    const vertexAI = new VertexAI({ project, location });

    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });

    const result = await generativeModel.generateContent(finalPrompt);
    const response = result.response;
    const generatedText =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({ result: generatedText });
  } catch (error) {
    console.error("--- Full Error Trace ---", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  } finally {
    // 処理終了後、作成した一時ファイルを削除する
    if (tempCredFilePath) {
      try {
        await fs.unlink(tempCredFilePath);
        console.log(`Temporary credentials file deleted: ${tempCredFilePath}`);
      } catch (e) {
        console.error(
          `Failed to delete temporary credentials file: ${tempCredFilePath}`,
          e
        );
      }
    }
  }
}
