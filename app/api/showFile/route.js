// app/api/showFile/route.js
import { Storage } from "@google-cloud/storage";
import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

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

    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
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
