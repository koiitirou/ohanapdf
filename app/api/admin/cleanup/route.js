import { NextResponse } from "next/server";
import { getGCSClient } from "../../utils/gcsClient";

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (password !== "3639") {
      return NextResponse.json(
        { error: "パスワードが間違っています" },
        { status: 401 }
      );
    }

    const storage = getGCSClient();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

    // Delete all files with prefix "phone/"
    const [files] = await bucket.getFiles({ prefix: "phone/" });

    if (files.length === 0) {
      return NextResponse.json(
        { message: "削除対象のファイルはありませんでした" },
        { status: 200 }
      );
    }

    const deletePromises = files.map((file) => file.delete());
    await Promise.all(deletePromises);

    return NextResponse.json(
      { message: `合計${files.length}個のファイルを削除しました` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting files:", error);
    return NextResponse.json(
      { error: `削除に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }
}
