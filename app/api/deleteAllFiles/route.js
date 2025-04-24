// app/api/deleteAllFiles/route.js
import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function POST(request) {
  try {
    const storage = getGCSClient();
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
