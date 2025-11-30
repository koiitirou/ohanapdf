import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function POST(request) {
  try {
    const { id, summary, transcription, correctedSummary } = await request.json();

    if (!id || !summary) {
      return NextResponse.json(
        { error: "ID and summary are required" },
        { status: 400 }
      );
    }

    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
    const metadataPath = `phone/metadata/${id}.json`;
    const file = bucket.file(metadataPath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: "Metadata file not found" },
        { status: 404 }
      );
    }

    // Read existing metadata
    const [content] = await file.download();
    const metadata = JSON.parse(content.toString());

    // Update fields
    metadata.summary = summary;
    if (transcription !== undefined) metadata.transcription = transcription;
    if (correctedSummary !== undefined) metadata.correctedSummary = correctedSummary;

    // Save back to GCS
    await file.save(JSON.stringify(metadata), {
      contentType: "application/json",
    });

    return NextResponse.json({ message: "Result saved successfully" });
  } catch (error) {
    console.error("Error saving result:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
