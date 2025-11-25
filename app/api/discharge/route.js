// /app/api/discharge/route.js

import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * 環境変数から読み取ったGoogle Cloudの認証情報を
 * 一時的なJSONファイルに書き出し、そのパスを環境変数に設定するヘルパー関数。
 * @returns {Promise<string>} 作成された一時ファイルのパス
 */
async function setupCredentials() {
  // Vercelの環境変数などから認証情報のJSON文字列を読み込む
  const credentialsJsonString = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJsonString) {
    throw new Error(
      "環境変数 'GOOGLE_CREDENTIALS' が設定されていません。デプロイ設定を確認してください。"
    );
  }

  // 一時ディレクトリにユニークな名前でファイルを作成
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, `creds-${Date.now()}.json`);
  await fs.writeFile(filePath, credentialsJsonString);

  // Vertex AI SDKがこのファイルを自動で読み込むように環境変数を設定
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  console.log("一時的な認証ファイルが正常にセットアップされました。");
  return filePath;
}

/**
 * POSTリクエストを処理するRoute Handler
 * @param {Request} request - Next.jsのRequestオブジェクト
 * @returns {Promise<NextResponse>} - Next.jsのResponseオブジェクト
 */
export async function POST(request) {
  let tempCredFilePath; // 一時ファイルのパスを保持する変数

  try {
    // 1. 認証処理
    // 処理の最初に認証情報をセットアップする
    tempCredFilePath = await setupCredentials();

    // 2. リクエストデータの解析
    const formData = await request.formData();
    const files = formData.getAll("files");
    const prompt = formData.get("prompt");
    const model = formData.get("model"); // Get model from formData

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "ファイルがアップロードされていません。" },
        { status: 400 }
      );
    }

    const project = "api1-346604";
    const location = "us-central1";
    const vertexAI = new VertexAI({ project, location });

    const generativeModel = vertexAI.getGenerativeModel({
      model: model || "gemini-2.5-pro",
      generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.2,
        topP: 0.95,
      },
    });

    console.log(
      `受け取ったファイル数: ${files.length}件。Vertex AIへのマルチモーダルリクエストを準備します...`
    );

    // 3. Vertex AIへのリクエストパーツを作成
    // 3-1. プロンプト（テキストパート）
    const textPart = { text: prompt };

    // 3-2. アップロードされたPDFファイル（ファイルパート）
    // 各ファイルを読み込み、Base64エンコードしてAIに渡せる形式に変換
    const fileParts = await Promise.all(
      files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          inlineData: {
            mimeType: file.type, // 'application/pdf'など
            data: Buffer.from(buffer).toString("base64"),
          },
        };
      })
    );

    // 5. モデルの選択
    // PDFなどのファイル内容を直接読み取れるマルチモーダルモデルを指定
    // const model = "gemini-2.5-pro"; // Removed duplicate declaration

    // generativeModel is already initialized above with the correct model
    // We don't need to re-initialize it here.
    // However, the previous initialization didn't have the vertex_ai instance which is created in step 4.
    // Wait, step 4 creates 'vertex_ai' but step 2 created 'vertexAI'.
    // The code is a bit messy. Let's clean it up.

    // Re-using the vertexAI instance created earlier.
    // The generativeModel was already created in step 2 (lines 64-71).
    // But wait, the original code had two initializations?
    // Line 62: const vertexAI = new VertexAI(...)
    // Line 64: const generativeModel = vertexAI.getGenerativeModel(...)
    // Line 96: const vertex_ai = new VertexAI(...)
    // Line 105: const generativeModel = vertex_ai.getGenerativeModel(...)
    
    // I should consolidate this.
    
    // Let's just use the 'generativeModel' created at line 64.
    // And remove the second initialization.
    
    console.log("プロンプトとPDFファイルをVertex AIに送信しています...");

    // 6. Vertex AIへのリクエスト実行
    // テキストパートとファイルパートをまとめて送信
    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [textPart, ...fileParts] }],
    });

    // レスポンスの構造を安全にチェック
    const summary =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      console.error(
        "Vertex AIからのレスポンス形式が予期せぬものです:",
        result.response
      );
      throw new Error("AIからの有効な応答がありませんでした。");
    }

    console.log("Vertex AIからサマリーを正常に受信しました。");

    // 7. 成功レスポンスを返す
    return NextResponse.json({ summary });
  } catch (error) {
    // 8. エラー処理
    console.error("--- APIルートでエラーが発生しました ---", error);
    // エラーインスタンスかどうかでメッセージを出し分ける
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました。";

    return NextResponse.json(
      { error: `サマリー生成中にエラーが発生しました: ${errorMessage}` },
      { status: 500 }
    );
  } finally {
    // 9. クリーンアップ処理
    // 処理が成功しても失敗しても、作成した一時ファイルを必ず削除する
    if (tempCredFilePath) {
      try {
        await fs.unlink(tempCredFilePath);
        console.log("一時的な認証ファイルを削除しました。");
      } catch (e) {
        console.error(
          `一時的な認証ファイルの削除に失敗しました: ${tempCredFilePath}`,
          e
        );
      }
    }
  }
}
