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
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
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
    } else if (file.type === "audio/x-m4a" || file.type === "audio/mp4") {
      id = Date.now().toString();
      uploadPath = `phone/${id}.m4a`;
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

    return NextResponse.json(
      {
        message: "ファイルのアップロードに成功しました",
        fileUrl: `gs://${process.env.GCS_BUCKET_NAME}/${uploadPath}`,
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
