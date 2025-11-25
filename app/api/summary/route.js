import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs/promises";
import path from "path";
import os from "os";

// --- タイムアウト設定 ---
// Vercel Hobby(無料)プラン: 最大 60秒
// Vercel Pro(有料)プラン: 最大 300秒
export const maxDuration = 300;

// 動的な処理であることを明示
export const dynamic = "force-dynamic";

// 認証情報を環境変数から読み取り、一時ファイルに書き出してそのパスを返すヘルパー関数
async function setupCredentials() {
  const credentialsJsonString = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJsonString) {
    throw new Error(
      "GOOGLE_CREDENTIALS environment variable is not set. Please configure it in your deployment settings."
    );
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
    // 認証処理を実行
    tempCredFilePath = await setupCredentials();
    console.log("Credentials successfully set up.");

    const formData = await request.formData();
    const files = formData.getAll("files");
    const prompt = formData.get("prompt");
    const modelId = formData.get("model"); // フロントエンドから選択されたモデルIDを受け取る

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded." },
        { status: 400 }
      );
    }
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is missing." },
        { status: 400 }
      );
    }

    // デフォルトモデルのフォールバック
    const selectedModel = modelId || "gemini-2.5-pro";

    console.log(
      `Processing ${files.length} files for direct upload to Vertex AI using model: ${selectedModel}`
    );

    // --- Vertex AIへのリクエストパーツを作成 ---
    // 1. プロンプト（テキストパート）
    const textPart = { text: prompt };

    // 2. アップロードされたファイル（ファイルパート）
    const fileParts = await Promise.all(
      files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          inlineData: {
            mimeType: file.type,
            data: Buffer.from(buffer).toString("base64"),
          },
        };
      })
    );

    // --- Vertex AI Initialization ---
    const vertex_ai = new VertexAI({
      project: "api1-346604",
      location: "us-central1",
    });

    // --- Model Selection (Dynamic) ---
    const generativeModel = vertex_ai.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
      },
    });

    console.log(
      `Sending prompt and PDF files to Vertex AI (${selectedModel})...`
    );

    // --- Vertex AIへのリクエスト実行 ---
    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [textPart, ...fileParts] }],
    });

    const summary = result.response.candidates[0].content.parts[0].text;
    console.log("Successfully received summary from Vertex AI.");

    return NextResponse.json({ summary });
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
    // 処理終了後、作成した一時ファイルをクリーンアップする
    if (tempCredFilePath) {
      try {
        await fs.unlink(tempCredFilePath);
        console.log("Temporary credentials file deleted.");
      } catch (e) {
        console.error(
          `Failed to delete temporary credentials file: ${tempCredFilePath}`,
          e
        );
      }
    }
  }
}
