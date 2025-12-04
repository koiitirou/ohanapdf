import { NextResponse, after } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { getGCSClient } from "../../utils/gcsClient";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function setupCredentials() {
  const credentialsJsonString = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJsonString) {
    throw new Error("GOOGLE_CREDENTIALS environment variable is not set.");
  }
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, `creds-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);
  await fs.writeFile(filePath, credentialsJsonString);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  return filePath;
}

export async function POST(request) {
  try {
    const { gcsUris, roomId, prompt, batchId } = await request.json();

    if (!gcsUris || !Array.isArray(gcsUris) || gcsUris.length === 0) {
      return NextResponse.json({ error: "GCS URIs are required" }, { status: 400 });
    }

    const id = batchId || Date.now().toString();
    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
    
    // Save metadata for both room and guest (guest metadata allows polling but won't be listed in history)
    const effectiveRoomId = roomId || "guest";
    const metadataPath = `record/metadata/${effectiveRoomId}/${id}.json`;

    const initialMetadata = {
      id,
      roomId,
      timestamp: Date.now(),
      gcsUris,
      summary: "処理中...",
      transcription: "",
      correctedSummary: "",
      status: "processing"
    };

    if (metadataPath) {
      const metadataFile = bucket.file(metadataPath);
      await metadataFile.save(JSON.stringify(initialMetadata), {
        contentType: "application/json",
      });
    }

    after(async () => {
      let tempCredFilePath;
      try {
        console.log(`[Record] Starting processing for ${id}`);
        tempCredFilePath = await setupCredentials();

        const vertex_ai = new VertexAI({
          project: "api1-346604",
          location: "asia-northeast1",
        });

        const generativeModel = vertex_ai.getGenerativeModel({
          model: "gemini-2.5-pro",
          generationConfig: {
            maxOutputTokens: 16384,
            temperature: 0.2,
            topP: 0.95,
            topK: 40,
          },
        });

        // Prepare parts for all files
        const parts = [];
        for (const uri of gcsUris) {
          parts.push({
            fileData: {
              fileUri: uri,
              mimeType: "audio/x-m4a", // Assuming m4a/mp4 compatible
            },
          });
        }

        const textPart = {
          text: prompt || "提供された複数の音声ファイルは、同一の文脈を持つ断片データです。これらを統合し、時系列や文脈を整理した上で、一つの完全な要約を作成してください。また、--TRANSCRIPTION-- という区切り文字の後に、可能な限り詳細な文字起こしを含めてください。",
        };
        parts.push(textPart);

        const result = await generativeModel.generateContent({
          contents: [{ role: "user", parts: parts }],
        });

        const fullResult = result.response.candidates[0].content.parts[0].text;
        const resultParts = fullResult.split("--TRANSCRIPTION--");
        const summaryText = resultParts[0].trim();
        let transcriptionText = resultParts.length > 1 ? resultParts[1].trim() : "";
        
        transcriptionText = transcriptionText.replace(/([^\n])(\s*(?:施設|クリニック|Aさん|Bさん|[^\s]+?)[：:])/g, '$1\n$2');

        if (metadataPath) {
            const metadataFile = bucket.file(metadataPath);
            // Re-read to ensure we don't overwrite concurrent updates (though unlikely here)
            // For simplicity, just overwrite with new status
            const finalMetadata = {
                ...initialMetadata,
                summary: summaryText,
                transcription: transcriptionText,
                status: "completed"
            };
            await metadataFile.save(JSON.stringify(finalMetadata), {
                contentType: "application/json",
            });
        }

        console.log(`[Record] Completed processing for ${id}`);

      } catch (error) {
        console.error(`[Record] Error processing ${id}:`, error);
        if (metadataPath) {
             const metadataFile = bucket.file(metadataPath);
             const errorMetadata = {
                ...initialMetadata,
                summary: "処理中にエラーが発生しました",
                status: "error"
             };
             await metadataFile.save(JSON.stringify(errorMetadata), {
                contentType: "application/json",
             });
        }
      } finally {
        if (tempCredFilePath) {
          try { await fs.unlink(tempCredFilePath); } catch (e) {}
        }
      }
    });

    return NextResponse.json({ 
      message: "Processing started",
      id: id,
      status: "processing"
    });

  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
