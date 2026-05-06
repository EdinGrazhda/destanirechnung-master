import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";

const uploadedDir = path.join(process.cwd(), "public", "uploaded");

const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function isValidFilename(filename: string) {
  if (!filename) return false;
  if (filename === "let") return false;
  if (filename === "undefined" || filename === "null") return false;
  if (filename.includes("..")) return false;
  if (filename.includes("/")) return false;
  if (filename.includes("\\")) return false;
  if (filename.trim().length === 0) return false;

  const ext = path.extname(filename).toLowerCase();
  return Object.keys(mimeTypes).includes(ext);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await context.params;

    if (!isValidFilename(filename)) {
      return NextResponse.json(
        { message: "Invalid filename." },
        { status: 400 },
      );
    }

    const filePath = path.join(uploadedDir, filename);

    const normalizedUploadedDir = path.resolve(uploadedDir);
    const normalizedFilePath = path.resolve(filePath);

    if (!normalizedFilePath.startsWith(normalizedUploadedDir)) {
      return NextResponse.json(
        { message: "Invalid file path." },
        { status: 400 },
      );
    }

    let fileStat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      fileStat = await fs.stat(normalizedFilePath);
    } catch {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    // ETag based on mtime + size — stable, cheap to compute.
    const etag = `"${fileStat.mtimeMs.toString(36)}-${fileStat.size.toString(36)}"`;
    const lastModified = fileStat.mtime.toUTCString();

    // Honour conditional requests so repeat loads return 304 (no body transfer).
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");
    if (
      ifNoneMatch === etag ||
      (ifModifiedSince && new Date(ifModifiedSince) >= fileStat.mtime)
    ) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    // Stream the file — never load the whole PDF into memory at once.
    const nodeStream = createReadStream(normalizedFilePath);
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
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        ETag: etag,
        "Last-Modified": lastModified,
      },
    });
  } catch (error) {
    console.error("Get uploaded file error:", error);

    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
}
