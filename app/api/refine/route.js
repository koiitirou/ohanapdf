import { VertexAI } from "@google-cloud/vertexai";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

// 認証情報ヘルパー関数 (generateからコピー)
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
    // フロントエンドから 'currentText'と'refinement'を受け取る
    const { currentText, refinement } = await request.json();

    if (!currentText || !refinement) {
      return NextResponse.json(
        { error: "必須項目が不足しています。" },
        { status: 400 }
      );
    }

    // 文章修正用のプロンプトを組み立てる
    const finalPrompt = `
# 指示
あなたは優秀な臨床医AIアシスタントです。以下の「現在の文章」を、「修正指示」に基づいて自然に修正・追記し、完成した文章のみを出力してください。元の文章の丁寧なトーンは維持してください。

---
# 現在の文章
${currentText}

---
# 修正指示
${refinement}

---
# 修正後の文章
`;

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

    // 修正後の文章を result として返す
    return NextResponse.json({ result: generatedText });
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
