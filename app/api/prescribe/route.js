import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs/promises";
import path from "path";
import os from "os";

// 認証情報を環境変数から読み取り、一時ファイルに書き出してそのパスを返すヘルパー関数
async function setupCredentials() {
  const credentialsJsonString = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJsonString) {
    throw new Error(
      "GOOGLE_CREDENTIALS 環境変数が設定されていません。デプロイ設定を確認してください。"
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
    const mainPrompt = formData.get("prompt");
    // ★★★ フロントエンドから「前回の処方箋」テキストを受け取る ★★★
    const previousPrescription = formData.get("previous_prescription");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "PDFファイルがアップロードされていません。" },
        { status: 400 }
      );
    }
    if (!mainPrompt) {
      return NextResponse.json(
        { error: "プロンプトがありません。" },
        { status: 400 }
      );
    }

    console.log(
      `Processing ${files.length} files and previous prescription data...`
    );

    // --- Vertex AIへのリクエストパーツを作成 ---
    // 1. プロンプトと前回処方箋を結合したテキストパートを作成
    let combinedPrompt = mainPrompt;
    if (previousPrescription) {
      combinedPrompt +=
        "\n\n# 前回の処方箋 (比較対象テキスト)\n\n" + previousPrescription;
    } else {
      combinedPrompt += "\n\n# 前回の処方箋 (比較対象テキスト)\n\nなし";
    }
    const textPart = { text: combinedPrompt };

    // 2. アップロードされたPDFファイル（ファイルパート）
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

    // --- Vertex AIの初期化 ---
    const vertex_ai = new VertexAI({
      project: "api1-346604", // あなたのプロジェクトID
      location: "us-central1",
    });

    // --- モデルの選択 ---
    const model = "gemini-2.5-flash"; // マルチモーダル対応のモデル

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1, // 処方箋のような正確性が求められるタスクでは低めに設定
        topP: 0.95,
      },
    });

    console.log(
      "Sending prompt and files to Vertex AI for prescription analysis..."
    );

    // --- Vertex AIへのリクエスト実行 ---
    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [textPart, ...fileParts] }],
    });

    // レスポンスの存在を安全にチェック
    const responseText =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("AIから有効な応答がありませんでした。");
    }

    console.log("Successfully received response from Vertex AI.");

    // ★★★ フロントエンドの 'summary' キーに合わせて返す ★★★
    return NextResponse.json({ summary: responseText });
  } catch (error) {
    console.error("--- Full Error Trace ---", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    // 処理終了後、作成した一時ファイルをクリーンアップ
    if (tempCredFilePath) {
      try {
        await fs.unlink(tempCredFilePath);
        console.log("Temporary credentials file deleted.");
      } catch (e) {
        console.error("Failed to delete temporary credentials file:", e);
      }
    }
  }
}
