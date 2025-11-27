import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files");

        if (!files || files.length === 0) {
            return NextResponse.json(
                { message: "ファイルがアップロードされていません" },
                { status: 400 }
            );
        }

        const storage = getGCSClient();
        const bucketName = process.env.GCS_BUCKET_NAME;
        if (!bucketName) {
            console.error("GCS_BUCKET_NAME environment variable is not set.");
            throw new Error("Server configuration error: GCS_BUCKET_NAME missing");
        }
        const bucket = storage.bucket(bucketName);
        const uploadedFiles = [];

        console.log(`Uploading ${files.length} files to GCS bucket: ${bucketName}`);

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const uploadPath = `upload/summary/${timestamp}_${safeName}`;
            const blob = bucket.file(uploadPath);

            const blobStream = blob.createWriteStream({
                resumable: false,
                contentType: file.type,
            });

            await new Promise((resolve, reject) => {
                blobStream.on("finish", resolve).on("error", reject).end(buffer);
            });

            uploadedFiles.push({
                name: file.name,
                mimeType: file.type,
                fileUri: `gs://${bucketName}/${uploadPath}`,
            });
        }

        return NextResponse.json(
            {
                message: "ファイルのアップロードに成功しました",
                uploadedFiles: uploadedFiles,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json(
            { message: "サーバー内部エラー", error: error.message },
            { status: 500 }
        );
    }
}
