// app/api/listUploadedFiles/route.js
import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function GET(request) {
  try {
    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
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
