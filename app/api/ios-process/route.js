import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";
import { VertexAI } from "@google-cloud/vertexai";
import { generatePrompt } from "../../utils/phonePrompt";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name") || new Date().toLocaleString("ja-JP");
    const password = formData.get("password") || "";

    if (!file) {
      return NextResponse.json(
        { message: "ファイルがアップロードされていません" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { message: "パスワードは4文字以上で入力してください" },
        { status: 400 }
      );
    }

    // 1. Upload to GCS
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

    // 2. Process with Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "asia-northeast1",
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp", // Use a fast model for shortcuts
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
                mimeType: file.type || "audio/x-m4a", // Default to m4a if unknown
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

    // 3. Save Metadata
    const metadata = {
      id,
      name,
      password,
      timestamp: Date.now(),
      audioPath: uploadPath,
      summary: summaryText,
      transcription: transcriptionText,
      correctedSummary: "", // Initialize empty
    };

    const metadataFile = bucket.file(metadataPath);
    await metadataFile.save(JSON.stringify(metadata), {
      contentType: "application/json",
    });

    return NextResponse.json(
      {
        message: "処理が完了しました",
        id: id,
        summary: summaryText,
        transcription: transcriptionText,
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
