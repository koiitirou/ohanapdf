// app/api/upload/route.js
import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") || new Date().toLocaleString("ja-JP");
    const password = formData.get("password") || "";
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { message: "ファイルがアップロードされていません" },
        { status: 400 }
      );
    }

    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
    let blob;
    let uploadPath;
    let metadataPath;
    let id;

    if (file.type === "application/pdf") {
      uploadPath = `upload/p50.pdf`;
      blob = bucket.file(uploadPath);
    } else if (file.type === "text/plain") {
      uploadPath = `upload/file1.txt`;
      blob = bucket.file(uploadPath);
    } else if (
      file.type === "audio/x-m4a" || 
      file.type === "audio/mp4" || 
      file.type === "audio/mpeg" || 
      file.type === "audio/wav" || 
      file.type === "audio/ogg" || 
      file.type === "audio/flac"
    ) {
      id = Date.now().toString();
      // Determine file extension from MIME type or filename
      let extension = "m4a";
      if (file.type === "audio/mpeg") extension = "mp3";
      else if (file.type === "audio/wav") extension = "wav";
      else if (file.type === "audio/ogg") extension = "ogg";
      else if (file.type === "audio/flac") extension = "flac";
      else if (file.name) {
        const match = file.name.match(/\.([^.]+)$/);
        if (match) extension = match[1];
      }
      uploadPath = `phone/${id}.${extension}`;
      metadataPath = `phone/metadata/${id}.json`;
      blob = bucket.file(uploadPath);
    } else {
      return NextResponse.json(
        { message: "サポートされていないファイル形式です" },
        { status: 400 }
      );
    }

    const blobStream = blob.createWriteStream();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await new Promise((resolve, reject) => {
      blobStream.on("finish", resolve).on("error", reject).end(buffer);
    });

    // Save metadata if it's an audio upload
    if (metadataPath) {
      const metadata = {
        id,
        name,
        password,
        timestamp: Date.now(),
        audioPath: uploadPath,
        summary: "", // Initial empty summary
      };
      const metadataFile = bucket.file(metadataPath);
      await metadataFile.save(JSON.stringify(metadata), {
        contentType: "application/json",
      });
    }

    // Generate signed URL for immediate playback (valid for 1 hour)
    const [audioUrl] = await blob.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    return NextResponse.json(
      {
        message: "ファイルのアップロードに成功しました",
        fileUrl: `gs://ohpdf/${uploadPath}`,
        audioUrl: audioUrl, // Return signed URL
        id: id, // Return ID for subsequent calls
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { message: "サーバー内部エラー", error: error.message },
      { status: 500 }
    );
  }
}
