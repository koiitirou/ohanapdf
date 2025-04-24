import { Storage } from "@google-cloud/storage";
import fs from "fs";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    const credentialsPath = process.env.GCS_CREDENTIALS_JSON;
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: credentials,
    });

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const sourceFile = bucket.file(`upload/${filename}`);

    const now = new Date();
    const newFilename = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}-${now
      .getHours()
      .toString()
      .padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}-${now
      .getSeconds()
      .toString()
      .padStart(2, "0")}.pdf`;
    const destinationFile = bucket.file(`ohana/${newFilename}`);

    await sourceFile.copy(destinationFile);

    return NextResponse.json(
      { message: `File ${filename} copied to ohana/${newFilename}` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error copying file:", error);
    return NextResponse.json(
      { error: `Failed to copy file: ${error.message}` },
      { status: 500 }
    );
  }
}
