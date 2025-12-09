import { NextResponse } from "next/server";
import { getGCSClient } from "../../utils/gcsClient";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const roomId = formData.get("roomId"); // 'guest' or UUID
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
      // Determine extension
      let extension = "m4a"; // Default
      if (file.name) {
        const match = file.name.match(/\.([^.]+)$/);
        if (match) extension = match[1];
      }

      // Generate unique filename
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
      const uploadPath = `record_uploads/${roomId}/${batchId}/${filename}`;
      const blob = bucket.file(uploadPath);

      const blobStream = blob.createWriteStream();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await new Promise((resolve, reject) => {
        blobStream.on("finish", resolve).on("error", reject).end(buffer);
      });

      // Generate signed URL for playback (valid for 1 hour)
      const [audioUrl] = await blob.getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000,
      });

      uploadedFiles.push({
        gcsUri: `gs://ohpdf/${uploadPath}`,
        audioUrl: audioUrl,
        filename: file.name
      });
    }

    // Save initial metadata
    const metadataPath = `record/metadata/${roomId}/${batchId}.json`;
    const metadata = {
      id: batchId,
      roomId,
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
