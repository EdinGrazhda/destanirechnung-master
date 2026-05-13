import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { isSafePdfFilename } from "@/utils/uploadedFilename";

const uploadedDir = path.join(process.cwd(), "public", "uploaded");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawPdf = searchParams.get("pdf");

  if (!rawPdf) {
    return NextResponse.json(
      { message: "Kein Dateiname angegeben." },
      { status: 400 },
    );
  }

  // path.basename strips any directory components — prevents path traversal.
  const safeFileName = path.basename(rawPdf);

  if (!isSafePdfFilename(safeFileName)) {
    return NextResponse.json(
      { message: "Ungültiger Dateiname." },
      { status: 400 },
    );
  }

  const filePath = path.join(uploadedDir, safeFileName);

  // Double-check resolved path stays within uploadedDir.
  const normalizedDir = path.resolve(uploadedDir);
  const normalizedFile = path.resolve(filePath);
  if (
    !normalizedFile.startsWith(normalizedDir + path.sep) &&
    normalizedFile !== normalizedDir
  ) {
    return NextResponse.json(
      { message: "Ungültiger Dateipfad." },
      { status: 400 },
    );
  }

  if (!fs.existsSync(normalizedFile)) {
    return NextResponse.json(
      { message: "Die PDF-Datei wurde im Upload-Ordner nicht gefunden." },
      { status: 404 },
    );
  }

  try {
    const stat = fs.statSync(normalizedFile);
    const nodeStream = fs.createReadStream(normalizedFile);

    const readableStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: string | Buffer) =>
          controller.enqueue(
            new Uint8Array(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
          ),
        );
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("getUploaded error:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
