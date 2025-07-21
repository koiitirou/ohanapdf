import { VertexAI } from "@google-cloud/vertexai";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

// 認証情報を一時ファイルに書き出し、そのパスを返すヘルパー関数
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

  return filePath;
}

export async function POST(request) {
  let tempCredFilePath;
  try {
    tempCredFilePath = await setupCredentials();

    // フロントエンドから 'content', 'summary', 'prompt' を受け取る
    const { content, summary, prompt } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "「紹介状の内容」は必須です。" },
        { status: 400 }
      );
    }
    // プロンプトが空でないかもチェック
    if (!prompt) {
      return NextResponse.json(
        { error: "プロンプトが空です。" },
        { status: 400 }
      );
    }

    // 受け取ったプロンプトを使って最終的なプロンプトを組み立てる
    let finalPrompt = prompt
      .replace("{{content}}", content)
      .replace("{{summary}}", summary || "特記事項なし");

    const project = "api1-346604";
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
      } catch (e) {
        console.error(
          `Failed to delete temporary credentials file: ${tempCredFilePath}`,
          e
        );
      }
    }
  }
}
