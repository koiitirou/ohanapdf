import formidable from "formidable";
import { promises as fs } from "fs";

export const config = {
  api: {
    bodyParser: false, // formidableが処理するため、Next.jsのbodyParserを無効化
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    const form = new formidable.IncomingForm();

    try {
      await new Promise((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error("ファイルアップロードエラー:", err);
            reject({
              statusCode: 500,
              message: "ファイルのアップロードに失敗しました。",
            });
            return;
          }

          const pdfFile = files.pdfFile?.[0];

          if (!pdfFile) {
            reject({
              statusCode: 400,
              message: "PDFファイルが選択されていません。",
            });
            return;
          }

          const oldPath = pdfFile.filepath;
          const newPath = `/tmp/${pdfFile.originalFilename}`; // 例: /tmpディレクトリに保存
          await fs.rename(oldPath, newPath);

          console.log("ファイルが保存されました:", newPath);

          res
            .status(200)
            .json({
              message: "PDFファイルのアップロードと保存に成功しました。",
            });
          resolve();
        });
      });
    } catch (error) {
      console.error("API処理エラー:", error);
      res
        .status(error.statusCode || 500)
        .json({ error: error.message || "サーバーエラーが発生しました。" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
