import { Storage } from "@google-cloud/storage";
import { NextResponse } from "next/server";
import fs from "fs";

export async function GET(request) {
  try {
    let credentials;

    if (process.env.NODE_ENV === "production") {
      // Vercel 環境
      const credentialsString = process.env.GCS_CREDENTIALS_JSON;
      if (!credentialsString) {
        console.error(
          "GCS_CREDENTIALS_JSON environment variable not set in production."
        );
        return NextResponse.json(
          { error: "GCS credentials not configured in production" },
          { status: 500 }
        );
      }
      credentials = JSON.parse(credentialsString);
    } else {
      // ローカル開発環境
      const credentialsPath = process.env.GCS_KEY_PATH;
      if (!credentialsPath) {
        console.error("GCS_KEY_PATH environment variable not set locally.");
        return NextResponse.json(
          { error: "GCS credentials not configured locally" },
          { status: 500 }
        );
      }
      credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    }

    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: credentials,
    });

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const [files] = await bucket.getFiles({ prefix: "upload/" });

    const fileNames = files.map((file) => file.name.replace("upload/", ""));

    return NextResponse.json({ files: fileNames }, { status: 200 });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
