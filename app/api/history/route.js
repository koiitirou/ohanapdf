import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function GET(request) {
  try {
    const storage = getGCSClient();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    
    // List files in phone/metadata/
    const [files] = await bucket.getFiles({ prefix: "phone/metadata/" });

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const historyList = await Promise.all(
      files.map(async (file) => {
        try {
          const [content] = await file.download();
          const metadata = JSON.parse(content.toString());
          
          // Filter out items older than 24 hours - REMOVED per user request
          // if (now - metadata.timestamp > ONE_DAY_MS) {
          //   return null;
          // }

          // Return only necessary info for the list
          return {
            id: metadata.id,
            name: metadata.name,
            timestamp: metadata.timestamp,
            hasPassword: !!metadata.password,
          };
        } catch (e) {
          console.error(`Error reading metadata file ${file.name}:`, e);
          return null;
        }
      })
    );

    // Filter out nulls, sort by timestamp desc, and limit to 10
    const sortedList = historyList
      .filter((item) => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return NextResponse.json({ history: sortedList });
  } catch (error) {
    console.error("Error listing history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { id, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const storage = getGCSClient();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const metadataPath = `phone/metadata/${id}.json`;
    const file = bucket.file(metadataPath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const [content] = await file.download();
    const metadata = JSON.parse(content.toString());

    // Verify password
    if (metadata.password && metadata.password !== password) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Generate signed URL for audio file (valid for 1 hour)
    const audioFile = bucket.file(metadata.audioPath);
    const [audioUrl] = await audioFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    return NextResponse.json({
      summary: metadata.summary,
      transcription: metadata.transcription,
      correctedSummary: metadata.correctedSummary,
      audioUrl: audioUrl,
    });
  } catch (error) {
    console.error("Error retrieving history item:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { id, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const storage = getGCSClient();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const metadataPath = `phone/metadata/${id}.json`;
    const file = bucket.file(metadataPath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const [content] = await file.download();
    const metadata = JSON.parse(content.toString());

    // Verify password
    if (metadata.password && metadata.password !== password) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Delete metadata and audio file
    await file.delete();
    
    const audioFile = bucket.file(metadata.audioPath);
    const [audioExists] = await audioFile.exists();
    if (audioExists) {
      await audioFile.delete();
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting history item:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
