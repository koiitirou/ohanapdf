import { Storage } from "@google-cloud/storage";
import fs from "fs";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    const credentialsPath = process.env.GCS_KEY_PATH;
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: credentials,
    });

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const file = bucket.file(`upload/${filename}`);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: `File ${filename} not found` },
        { status: 404 }
      );
    }

    const fileStream = file.createReadStream();
    let contentType = "application/octet-stream"; // デフォルト

    if (filename.endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (filename.endsWith(".txt")) {
      contentType = "text/plain; charset=utf-8"; // UTF-8 を明示的に指定
    }

    return new NextResponse(fileStream, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("Error showing file:", error);
    return NextResponse.json(
      { error: `Failed to show file: ${error.message}` },
      { status: 500 }
    );
  }
}
