import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs/promises";
import path from "path";
import os from "os";

// --- Timeout Settings ---
export const maxDuration = 300;
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
  const filePath = path.join(tempDir, `creds-${Date.now()}.json`);
  await fs.writeFile(filePath, credentialsJsonString);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  return filePath;
}

export async function POST(request) {
  let tempCredFilePath;
  try {
    tempCredFilePath = await setupCredentials();
    
    const { gcsUri, prompt } = await request.json();

    if (!gcsUri) {
      return NextResponse.json({ error: "No GCS URI provided" }, { status: 400 });
    }

    const vertex_ai = new VertexAI({
      project: "api1-346604",
      location: "us-central1",
    });

    const generativeModel = vertex_ai.getGenerativeModel({
      model: "gemini-2.5-flash", // Using 1.5 Pro for multimodal capabilities
      generationConfig: {
        maxOutputTokens: 8192,
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
      text: prompt || "Please summarize this audio.",
    };

    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [filePart, textPart] }],
    });

    const responseText = result.response.candidates[0].content.parts[0].text;

    return NextResponse.json({ result: responseText });

  } catch (error) {
    console.error("Error processing audio:", error);
    // Log detailed error from Vertex AI if available
    if (error.response) {
      console.error("Vertex AI Error Response:", JSON.stringify(error.response, null, 2));
    }
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    if (tempCredFilePath) {
      try {
        await fs.unlink(tempCredFilePath);
      } catch (e) {
        console.error("Failed to delete temp creds:", e);
      }
    }
  }
}
