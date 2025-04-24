import { Storage } from "@google-cloud/storage";
import fs from "fs";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const credentialsPath = process.env.GCS_CREDENTIALS_JSON;
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: credentials,
    });

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

    const [files] = await bucket.getFiles({ prefix: "upload/" });

    const deletePromises = files.map((file) => file.delete());
    await Promise.all(deletePromises);

    return NextResponse.json(
      { message: "All files in /upload deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting all files:", error);
    return NextResponse.json(
      { error: `Failed to delete all files: ${error.message}` },
      { status: 500 }
    );
  }
}
