import { NextResponse } from "next/server";
import { getGCSClient } from "../../utils/gcsClient";

export async function POST(request) {
  try {
    const { roomId, id, correctedSummary } = await request.json();

    if (!roomId || !id) {
      return NextResponse.json({ error: "RoomID and ID are required" }, { status: 400 });
    }

    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
    const metadataPath = `record/metadata/${roomId}/${id}.json`;
    const file = bucket.file(metadataPath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const [content] = await file.download();
    const metadata = JSON.parse(content.toString());

    const updatedMetadata = {
      ...metadata,
      correctedSummary: correctedSummary
    };

    await file.save(JSON.stringify(updatedMetadata), {
      contentType: "application/json",
    });

    return NextResponse.json({ message: "Saved successfully" });

  } catch (error) {
    console.error("Error saving result:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
