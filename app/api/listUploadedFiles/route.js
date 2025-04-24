import { Storage } from "@google-cloud/storage";
import fs from "fs";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const credentialsPath = process.env.GCS_CREDENTIALS_JSON;
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: credentials,
    });

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const [files] = await bucket.getFiles({ prefix: "upload/" }); // 'upload/' プレフィックスを指定

    const fileNames = files.map((file) => file.name.replace("upload/", "")); // プレフィックスを削除

    return NextResponse.json({ files: fileNames }, { status: 200 });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
