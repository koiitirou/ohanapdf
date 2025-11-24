// app/api/upload/route.js
import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    const storage = getGCSClient();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    let blob;
    let uploadPath;

    if (file.type === "application/pdf") {
      uploadPath = `upload/p50.pdf`;
      blob = bucket.file(uploadPath);
    } else if (file.type === "text/plain") {
      uploadPath = `upload/file1.txt`;
      blob = bucket.file(uploadPath);
    } else if (file.type === "audio/x-m4a" || file.type === "audio/mp4") {
      // Use a timestamp to avoid overwriting and ensure uniqueness if needed, 
      // but for this specific request, a fixed or simple name might be fine. 
      // Let's use a simple name for now as per the pattern, but maybe with a timestamp to be safe?
      // The existing pattern uses fixed names (p50.pdf, file1.txt). 
      // Let's stick to a simple name for testing as requested "helloworld" style.
      uploadPath = `upload/audio-${Date.now()}.m4a`;
      blob = bucket.file(uploadPath);
    } else {
      return NextResponse.json(
        { message: "Unsupported file type" },
        { status: 400 }
      );
    }

    const blobStream = blob.createWriteStream();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await new Promise((resolve, reject) => {
      blobStream.on("finish", resolve).on("error", reject).end(buffer);
    });

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        fileUrl: `gs://${process.env.GCS_BUCKET_NAME}/${uploadPath}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
