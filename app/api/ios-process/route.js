import fs from "fs/promises";
import path from "path";
import os from "os";
import { NextResponse, after } from "next/server"; // Import after
import { getGCSClient } from "../utils/gcsClient";
import { VertexAI } from "@google-cloud/vertexai";
import { generatePrompt } from "../../utils/phonePrompt";

// Helper to setup credentials from env var
async function setupCredentials() {
  const credentialsJsonString = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJsonString) {
    throw new Error(
      "GOOGLE_CREDENTIALS environment variable is not set."
    );
  }

  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, `creds-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);
  await fs.writeFile(filePath, credentialsJsonString);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  return filePath;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Debug logging
    console.log("iOS Process Request Keys:", [...formData.keys()]);

    const file = formData.get("file") || formData.get("File");
    const name = formData.get("name") || formData.get("Name") || new Date().toLocaleString("ja-JP");
    const password = formData.get("password") || formData.get("Password") || "";

    // Debug logging for file
    console.log("File type:", typeof file);
    if (file) {
      console.log("File name:", file.name);
      console.log("File size:", file.size);
      console.log("File constructor:", file.constructor.name);
    }

    if (!file) {
      return NextResponse.json(
        { message: "ファイルがアップロードされていません" },
        { status: 400 }
      );
    }

    if (typeof file === "string") {
      return NextResponse.json(
        { message: "ファイルがテキストとして送信されています。ショートカットの設定で「ファイル」または「メディア」を選択してください。" },
        { status: 400 }
      );
    }

    if (typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { message: "無効なファイル形式です。ファイルオブジェクトではありません。" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { message: "パスワードは4文字以上で入力してください" },
        { status: 400 }
      );
    }

    // 1. Upload to GCS (Synchronous part)
    const storage = getGCSClient();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    
    let extension = "m4a"; // Default
    if (file.type === "audio/mpeg") extension = "mp3";
    else if (file.type === "audio/wav") extension = "wav";
    else if (file.type === "audio/ogg") extension = "ogg";
    else if (file.type === "audio/flac") extension = "flac";
    else if (file.name) {
      const match = file.name.match(/\.([^.]+)$/);
      if (match) extension = match[1];
    }

    const id = Date.now().toString();
    const uploadPath = `phone/${id}.${extension}`;
    const metadataPath = `phone/metadata/${id}.json`;
    const blob = bucket.file(uploadPath);

    const blobStream = blob.createWriteStream();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await new Promise((resolve, reject) => {
      blobStream.on("finish", resolve).on("error", reject).end(buffer);
    });

    const gcsUri = `gs://${process.env.GCS_BUCKET_NAME}/${uploadPath}`;

    // 2. Save Initial Metadata (Processing status)
    const initialMetadata = {
      id,
      name,
      password,
      timestamp: Date.now(),
      audioPath: uploadPath,
      summary: "処理中...", // Indicate processing
      transcription: "",
      correctedSummary: "",
      status: "processing"
    };

    const metadataFile = bucket.file(metadataPath);
    await metadataFile.save(JSON.stringify(initialMetadata), {
      contentType: "application/json",
    });

    // 3. Schedule Background Processing
    after(async () => {
      let tempCredFilePath;
      try {
        console.log(`[Background] Starting processing for ${id}`);
        tempCredFilePath = await setupCredentials();

        // Process with Vertex AI
        const vertexAI = new VertexAI({
          project: "api1-346604",
          location: process.env.GOOGLE_CLOUD_LOCATION || "asia-northeast1",
        });

        const generativeModel = vertexAI.getGenerativeModel({
          model: "gemini-2.5-pro",
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 1,
            topP: 0.95,
          },
        });

        const prompt = generatePrompt();

        const req = {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  fileData: {
                    mimeType: file.type || "audio/x-m4a",
                    fileUri: gcsUri,
                  },
                },
              ],
            },
          ],
        };

        const result = await generativeModel.generateContent(req);
        const response = await result.response;
        const fullResult = response.candidates[0].content.parts[0].text;

        // Split result and transcription
        const parts = fullResult.split("--TRANSCRIPTION--");
        const summaryText = parts[0].trim();
        let transcriptionText = parts.length > 1 ? parts[1].trim() : "";

        // Post-process transcription
        transcriptionText = transcriptionText.replace(/([^\n])(\s*(?:施設|クリニック|Aさん|Bさん|[^\s]+?)[：:])/g, '$1\n$2');

        // Update Metadata with Result
        const finalMetadata = {
          ...initialMetadata,
          summary: summaryText,
          transcription: transcriptionText,
          status: "completed"
        };

        await metadataFile.save(JSON.stringify(finalMetadata), {
          contentType: "application/json",
        });
        
        console.log(`[Background] Completed processing for ${id}`);

      } catch (error) {
        console.error(`[Background] Error processing ${id}:`, error);
        // Optionally update metadata to show error
        const errorMetadata = {
          ...initialMetadata,
          summary: `エラー: ${error.message}`, // Save actual error message
          status: "error"
        };
        await metadataFile.save(JSON.stringify(errorMetadata), {
          contentType: "application/json",
        });
      } finally {
        if (tempCredFilePath) {
          try {
            await fs.unlink(tempCredFilePath);
          } catch (e) {
            console.error("Failed to delete temp creds:", e);
          }
        }
      }
    });

    return NextResponse.json(
      {
        message: "アップロード完了。バックグラウンドで処理を開始しました。",
        id: id,
        status: "processing"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("iOS Process Error:", error);
    return NextResponse.json(
      { message: "エラーが発生しました", error: error.message },
      { status: 500 }
    );
  }
}
