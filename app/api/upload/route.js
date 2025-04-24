import { writeFile } from "fs/promises";
import path from "path";
import { mkdir } from "fs";

export async function POST(req) {
  const data = await req.formData();
  const file = data.get("pdf");

  if (!file) {
    return new Response(
      JSON.stringify({ message: "ファイルが見つかりません" }),
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await new Promise((resolve, reject) => {
    mkdir(uploadDir, { recursive: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const filePath = path.join(uploadDir, file.name);
  await writeFile(filePath, buffer);

  return new Response(
    JSON.stringify({ message: `アップロード成功：${file.name}` }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
