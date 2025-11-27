import { NextResponse } from "next/server";
import { getGCSClient } from "../utils/gcsClient";

export async function POST(request) {
    try {
        const { files } = await request.json();

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json(
                { error: "ファイルメタデータが提供されていません" },
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
        const uploadUrls = [];

        console.log(`Generating signed URLs for ${files.length} files`);

        for (const file of files) {
            const { name, type } = file;

            if (!name || !type) {
                throw new Error("Each file must have 'name' and 'type' properties");
            }

            // Generate unique file path
            const timestamp = Date.now();
            const safeName = name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const uploadPath = `upload/summary/${timestamp}_${safeName}`;
            const fileBlob = bucket.file(uploadPath);

            // Generate signed URL for PUT operation (expires in 15 minutes)
            const [signedUrl] = await fileBlob.getSignedUrl({
                version: "v4",
                action: "write",
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType: type,
            });

            uploadUrls.push({
                uploadUrl: signedUrl,
                fileUri: `gs://${bucketName}/${uploadPath}`,
                fileName: name,
                mimeType: type,
            });
        }

        console.log(`Successfully generated ${uploadUrls.length} signed URLs`);

        return NextResponse.json(
            { uploadUrls },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error generating signed URLs:", error);
        return NextResponse.json(
            { error: error.message || "署名付きURLの生成に失敗しました" },
            { status: 500 }
        );
    }
}
