import { NextResponse } from "next/server";
import { getGCSClient } from "../../utils/gcsClient";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const roomId = formData.get("roomId"); // 'guest' or UUID
    const name = formData.get("name") || ""; // Optional name
    const files = formData.getAll("files");

    if (!roomId || files.length === 0) {
      return NextResponse.json(
        { message: "RoomID and files are required" },
        { status: 400 }
      );
    }

    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");
    const batchId = Date.now().toString();
    const uploadedFiles = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = file.name;
      // Use batchId as folder name to group files
      const gcsPath = `record_uploads/${roomId}/${batchId}/${batchId}-${Math.random().toString(36).substring(7)}.m4a`;
      const gcsFile = bucket.file(gcsPath);

      await gcsFile.save(buffer, {
        contentType: file.type || "audio/x-m4a",
      });

      const [url] = await gcsFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60, // 1 hour
      });

      uploadedFiles.push({
        gcsUri: `gs://ohpdf/${gcsPath}`,
        audioUrl: url,
        filename: filename
      });
    }

    // Save initial metadata
    const metadataPath = `record/metadata/${roomId}/${batchId}.json`;
    
    // Default name logic: if no name provided, use current date/time
    let displayName = name;
    if (!displayName) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        displayName = `${month}/${day} ${hour}:${minute}`;
        
        // If uploaded from iPhone (often just "audio"), maybe append filename? 
        // But user asked for "12/9 20:10 チャームプレミア御影との通話" style.
        // If user provides name, use it. If not, use date.
    }

    const metadata = {
      id: batchId,
      roomId,
      name: displayName,
      timestamp: Date.now(),
      gcsUris: uploadedFiles.map(f => f.gcsUri),
      summary: "アップロード完了",
      transcription: "",
      correctedSummary: "",
      status: "uploaded"
    };

    const metadataFile = bucket.file(metadataPath);
    await metadataFile.save(JSON.stringify(metadata), {
      contentType: "application/json",
    });

    return NextResponse.json(
      {
        message: "Upload successful",
        files: uploadedFiles,
        batchId: batchId
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}
