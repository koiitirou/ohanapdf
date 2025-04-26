import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

async function getFirstLinesOfPdf(pdfDoc) {
  const firstLines = [];
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    const page = pdfDoc.getPage(i);
    console.log(
      `[/api/process-pdf/getFirstLinesOfPdf] ページ ${i + 1} の処理を開始`
    );
    try {
      const text = await page.extractText();
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      const firstLine = lines[0] || "";
      firstLines.push(firstLine);
      console.log(
        `[/api/process-pdf/getFirstLinesOfPdf] ページ ${
          i + 1
        } の最初の行: "${firstLine}"`
      );
    } catch (error) {
      console.error(
        `[/api/process-pdf/getFirstLinesOfPdf] ページ ${
          i + 1
        } のテキスト抽出エラー:`,
        error
      );
      firstLines.push("");
    }
    console.log(
      `[/api/process-pdf/getFirstLinesOfPdf] ページ ${i + 1} の処理を完了`
    );
  }
  return firstLines;
}

function parseFile1(text) {
  console.log("[/api/process-pdf/parseFile1] file1 の解析を開始");
  const patientIds = text
    .split("\n")
    .filter((line) => line.trim().startsWith("(") && line.includes(")"))
    .map((line) => line.substring(line.indexOf("(") + 1, line.indexOf(")")))
    .map((id) => id.trim())
    .filter((id) => !isNaN(parseInt(id)));
  console.log(
    "[/api/process-pdf/parseFile1] 抽出された患者IDの順序:",
    patientIds
  );
  console.log("[/api/process-pdf/parseFile1] file1 の解析を完了");
  return patientIds;
}

function extractPatientIdsFromLines(lines) {
  console.log(
    "[/api/process-pdf/extractPatientIdsFromLines] 行からの患者ID抽出を開始:",
    lines
  );
  const patientIds = lines
    .map((line) => {
      const match = line.match(/\((\d+)\)/);
      return match ? match[1] : null;
    })
    .filter((id) => id !== null);
  console.log(
    "[/api/process-pdf/extractPatientIdsFromLines] 抽出された患者ID:",
    patientIds
  );
  console.log(
    "[/api/process-pdf/extractPatientIdsFromLines] 行からの患者ID抽出を完了"
  );
  return patientIds;
}

export async function POST(request) {
  console.log("[/api/process-pdf] POST リクエスト受信");
  try {
    const formData = await request.formData();
    const file1 = formData.get("file1");
    const pdfFiles = formData.getAll("pdfs");

    if (!file1 || !pdfFiles.length) {
      console.log(
        "[/api/process-pdf] PDFファイルまたはテキストファイルが選択されていません"
      );
      return NextResponse.json(
        { error: "PDFファイルとテキストファイルを選択してください。" },
        { status: 400 }
      );
    }

    const file1Text = await file1.text();
    const patientIdOrder = parseFile1(file1Text);

    const pdfDocuments = [];
    const pdfPageIdMap = new Map();

    for (const pdfFile of pdfFiles) {
      console.log(`[/api/process-pdf] PDFファイル処理開始: ${pdfFile.name}`);
      try {
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDocuments.push({ name: pdfFile.name, doc: pdfDoc });
        const pageFirstLines = await getFirstLinesOfPdf(pdfDoc);
        const pdfPatientIds = extractPatientIdsFromLines(pageFirstLines);

        const pageIdMap = {};
        pdfPatientIds.forEach((id, index) => {
          if (id) {
            pageIdMap[index] = id;
          }
        });
        pdfPageIdMap.set(pdfFile.name, pageIdMap);
        console.log(
          `[/api/process-pdf] ${pdfFile.name} の患者IDマップ:`,
          pageIdMap
        );
      } catch (error) {
        console.error(
          `[/api/process-pdf] PDFファイルの読み込みまたは処理に失敗しました (${pdfFile.name}):`,
          error
        );
        return NextResponse.json(
          {
            error: `PDFファイルの読み込みまたは処理に失敗しました: ${error.message}`,
          },
          { status: 500 }
        );
      }
    }

    const mergedPdf = await PDFDocument.create();
    const copiedPages = [];
    const processedPages = new Set();

    console.log("[/api/process-pdf] PDFの並び替え処理を開始");
    for (const patientId of patientIdOrder) {
      console.log(`[/api/process-pdf] 患者ID "${patientId}" を検索`);
      for (const pdfInfo of pdfDocuments) {
        const pageMap = pdfPageIdMap.get(pdfInfo.name);
        if (pageMap) {
          for (const [pageIndexStr, pdfPatientId] of Object.entries(pageMap)) {
            const pageIndex = parseInt(pageIndexStr);
            const pageKey = `${pdfInfo.name}-${pageIndex}`;
            if (pdfPatientId === patientId && !processedPages.has(pageKey)) {
              try {
                const copiedPage = await mergedPdf.copyPages(pdfInfo.doc, [
                  pageIndex,
                ]);
                copiedPages.push(copiedPage[0]);
                processedPages.add(pageKey);
                console.log(
                  `[/api/process-pdf] ページコピー成功: ${pdfInfo.name} - ページ ${pageIndex}, 患者ID: ${patientId}`
                );
                break; // 一致するIDを見つけたら、そのPDFの検索を中断
              } catch (error) {
                console.error(
                  `[/api/process-pdf] PDFページのコピー中にエラーが発生しました (${pdfInfo.name} - ページ ${pageIndex}):`,
                  error
                );
                return NextResponse.json(
                  {
                    error: `PDFページのコピー中にエラーが発生しました: ${error.message}`,
                  },
                  { status: 500 }
                );
              }
            }
          }
        }
      }
    }
    console.log("[/api/process-pdf] PDFの並び替え処理を完了");

    const mergedPdfBytes = await mergedPdf.save();
    console.log("[/api/process-pdf] PDF結合完了");

    return new NextResponse(mergedPdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="sorted_report.pdf"',
      },
    });
  } catch (error) {
    console.error("[/api/process-pdf] PDF処理全体のエラー:", error);
    return NextResponse.json(
      { error: `PDF処理に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};
