import { Storage } from "@google-cloud/storage";
import fs from "fs";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { message: "Filename is required" },
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
    const file = bucket.file(`upload/${filename}`); // 'upload/' プレフィックスを付与

    // 署名付き URL の生成オプション
    const options = {
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15分後に有効期限切れ (調整可能)
    };

    const [url] = await file.getSignedUrl(options);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { message: "Failed to generate download URL", error: error.message },
      { status: 500 }
    );
  }
}
