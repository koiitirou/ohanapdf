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
