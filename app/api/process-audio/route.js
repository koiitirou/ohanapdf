import { NextResponse, unstable_after } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { getGCSClient } from "../utils/gcsClient";
import fs from "fs/promises";
import path from "path";
import os from "os";

// --- Timeout Settings ---
export const maxDuration = 300; // Keep high timeout just in case, though response is fast
export const dynamic = "force-dynamic";

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
    const { gcsUri, prompt, model, id, name, password } = await request.json();

    if (!gcsUri) {
      return NextResponse.json(
        { error: "GCS URI is required" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    // 1. Save Initial Metadata (Processing status)
    const storage = getGCSClient();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const metadataPath = `phone/metadata/${id}.json`;
    
    // Extract extension from gcsUri for audioPath
    // gcsUri: gs://bucket/phone/id.ext
    const match = gcsUri.match(/\/phone\/([^/]+)$/);
    const audioPath = match ? `phone/${match[1]}` : `phone/${id}.m4a`;

    const initialMetadata = {
      id,
      name: name || new Date().toLocaleString("ja-JP"),
      password: password || "",
      timestamp: Date.now(),
      audioPath: audioPath,
      summary: "処理中...",
      transcription: "",
      correctedSummary: "",
      status: "processing"
    };

    const metadataFile = bucket.file(metadataPath);
    await metadataFile.save(JSON.stringify(initialMetadata), {
      contentType: "application/json",
    });

    // 2. Schedule Background Processing
    unstable_after(async () => {
      let tempCredFilePath;
      try {
        console.log(`[Background] Starting processing for ${id}`);
        tempCredFilePath = await setupCredentials();

        const vertex_ai = new VertexAI({
          project: "api1-346604",
          location: "asia-northeast1",
        });

        const generativeModel = vertex_ai.getGenerativeModel({
          model: model || "gemini-2.5-flash-lite",
          generationConfig: {
            maxOutputTokens: 16384,
            temperature: 0.2,
            topP: 0.95,
            topK: 40,
          },
        });

        const filePart = {
          fileData: {
            fileUri: gcsUri,
            mimeType: "audio/x-m4a", // Assuming m4a based on requirements
          },
        };

        const textPart = {
          text: prompt || "あなたは常に日本語で回答するAIです。会話の内容を要約して。",
        };

        const result = await generativeModel.generateContent({
          contents: [{ role: "user", parts: [filePart, textPart] }],
        });

        const fullResult = result.response.candidates[0].content.parts[0].text;

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
          summary: "処理中にエラーが発生しました",
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

    return NextResponse.json({ 
      message: "処理を開始しました",
      id: id,
      status: "processing"
    });

  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      { error: error.message || "サーバー内部エラー" },
      { status: 500 }
    );
  }
}
