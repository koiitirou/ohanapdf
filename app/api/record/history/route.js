import { NextResponse } from "next/server";
import { getGCSClient } from "../../utils/gcsClient";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId || roomId === "guest") {
      return NextResponse.json({ history: [] });
    }

    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
    
    // List files in record/metadata/{roomId}/
    const [files] = await bucket.getFiles({ prefix: `record/metadata/${roomId}/` });

    const historyList = await Promise.all(
      files.map(async (file) => {
        try {
          const [content] = await file.download();
          const metadata = JSON.parse(content.toString());
          
          return {
            id: metadata.id,
            timestamp: metadata.timestamp,
            summary: metadata.summary, // Include summary preview if needed
            status: metadata.status
          };
        } catch (e) {
          return null;
        }
      })
    );

    const sortedList = historyList
      .filter((item) => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ history: sortedList });
  } catch (error) {
    console.error("Error listing history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { roomId, id } = await request.json();

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

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error retrieving history item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { roomId, id } = await request.json();

    if (!roomId || !id) {
      return NextResponse.json({ error: "RoomID and ID are required" }, { status: 400 });
    }

    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
    const metadataPath = `record/metadata/${roomId}/${id}.json`;
    const file = bucket.file(metadataPath);

    const [exists] = await file.exists();
    if (exists) {
        // Get metadata to find audio files to delete
        const [content] = await file.download();
        const metadata = JSON.parse(content.toString());
        
        // Delete metadata
        await file.delete();

        // Delete associated audio files if possible?
        // The audio files are in `record_uploads/{roomId}/{batchId}/...`
        // We have `gcsUris` in metadata.
        if (metadata.gcsUris && Array.isArray(metadata.gcsUris)) {
            for (const uri of metadata.gcsUris) {
                // uri: gs://ohpdf/record_uploads/...
                const path = uri.replace("gs://ohpdf/", "");
                try {
                    await bucket.file(path).delete();
                } catch (e) {
                    console.warn(`Failed to delete audio file ${path}:`, e);
                }
            }
        }
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting history item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
