import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs/promises";
import path from "path";
import os from "os";

// --- タイムアウト設定 ---
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// 認証情報ヘルパー関数
async function setupCredentials() {
  const credentialsJsonString = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJsonString) {
    throw new Error("GOOGLE_CREDENTIALS environment variable is not set.");
  }
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, `creds-${Date.now()}.json`);
  await fs.writeFile(filePath, credentialsJsonString);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  return filePath;
}

export async function POST(request) {
  let tempCredFilePath;
  try {
    tempCredFilePath = await setupCredentials();

    // ★modelパラメータも受け取る
    const { content, summary, prompt, model } = await request.json();

    if (!content || !prompt) {
      return NextResponse.json(
        { error: "必須項目が不足しています。" },
        { status: 400 }
      );
    }

    // デフォルトモデルのフォールバック
    const selectedModel = model || "gemini-2.5-pro";

    let finalPrompt = prompt
      .replace("{{content}}", content)
      .replace("{{summary}}", summary || "特記事項なし");

    // --- サジェスト機能のための出力形式指示 ---
    const instruction = `
    ---
    # 出力形式
    あなたは以下のJSON形式で回答を生成してください。本文と、それに対する臨床的に重要な追加情報の提案を**3つまで**含めてください。提案は、本文に自然に組み込めるような具体的な指示にしてください。
    
    \`\`\`json
    {
      "result": "（ここに生成された紹介状の本文）",
      "suggestions": [
        "（提案1）",
        "（提案2）",
        "（提案3）"
      ]
    }
    \`\`\`
    `;
    finalPrompt += instruction;

    console.log(
      `Generating letter with suggestions using model: ${selectedModel}`
    );

    const project = "api1-346604";
    const location = "us-central1";
    const vertexAI = new VertexAI({ project, location });

    const generativeModel = vertexAI.getGenerativeModel({
      model: selectedModel,
      // JSONモードを有効にする設定
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.2,
      },
    });

    const result = await generativeModel.generateContent(finalPrompt);
    const response = result.response;
    const generatedText =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // AIが生成したJSON文字列をパースする
    const parsedResponse = JSON.parse(generatedText);

    // パースしたオブジェクトをフロントエンドに返す
    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("--- Full Error Trace ---", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  } finally {
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
