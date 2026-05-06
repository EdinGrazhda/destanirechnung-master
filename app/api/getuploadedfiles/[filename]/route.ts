import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { isSafeUploadedFilename } from "@/utils/uploadedFilename";

const uploadedDir = path.join(process.cwd(), "public", "uploaded");

const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

async function resolveRequestedFile(
  rawFilename: string,
): Promise<
  | {
      ok: true;
      filename: string;
      normalizedFilePath: string;
      fileStat: Awaited<ReturnType<typeof fs.stat>>;
    }
  | { ok: false; response: NextResponse }
> {
  const filename = (() => {
    try {
      return decodeURIComponent(rawFilename);
    } catch {
      return rawFilename;
    }
  })();

  if (!isSafeUploadedFilename(filename)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid filename." },
        { status: 400 },
      ),
    };
  }

  const filePath = path.join(uploadedDir, filename);
  const normalizedUploadedDir = path.resolve(uploadedDir);
  const normalizedFilePath = path.resolve(filePath);

  if (!normalizedFilePath.startsWith(normalizedUploadedDir)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid file path." },
        { status: 400 },
      ),
    };
  }

  try {
    const fileStat = await fs.stat(normalizedFilePath);
    return { ok: true, filename, normalizedFilePath, fileStat };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "File not found." },
        { status: 404 },
      ),
    };
  }
}

export async function HEAD(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await context.params;
  const resolved = await resolveRequestedFile(rawFilename);

  if (!resolved.ok) {
    return resolved.response;
  }

  const ext = path.extname(resolved.filename).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(resolved.fileStat.size),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename: rawFilename } = await context.params;
    const resolved = await resolveRequestedFile(rawFilename);

    if (!resolved.ok) {
      return resolved.response;
    }

    const { filename, normalizedFilePath, fileStat } = resolved;

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
