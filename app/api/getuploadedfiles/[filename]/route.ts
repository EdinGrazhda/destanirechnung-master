export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { isRateLimited } from "@/utils/rateLimit";
import { PDFDocument } from "pdf-lib";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploaded");

const ALLOWED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "pdf",
  "xls",
  "xlsx",
]);

const contentTypeMap: Record<string, string> = {
  svg: "image/svg+xml",
  ico: "image/x-icon",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

type MergedPdfCacheEntry = {
  fingerprint: string;
  bytes: Buffer;
  createdAt: number;
};

// Keep the merged-PDF cache small: large PDFs with embedded PNG annotations
// can be 5–20 MB each. 5 entries × 20 MB = 100 MB worst case, safe on a VPS.
const MERGED_PDF_CACHE_TTL_MS = 2 * 60 * 1000;
const MERGED_PDF_CACHE_MAX_ENTRIES = 5;

const mergedPdfCache =
  (
    globalThis as typeof globalThis & {
      __mergedPdfCache?: Map<string, MergedPdfCacheEntry>;
    }
  ).__mergedPdfCache ?? new Map<string, MergedPdfCacheEntry>();

(
  globalThis as typeof globalThis & {
    __mergedPdfCache?: Map<string, MergedPdfCacheEntry>;
  }
).__mergedPdfCache = mergedPdfCache;

function pruneMergedPdfCache(now: number) {
  for (const [key, value] of mergedPdfCache.entries()) {
    if (now - value.createdAt > MERGED_PDF_CACHE_TTL_MS) {
      mergedPdfCache.delete(key);
    }
  }

  while (mergedPdfCache.size > MERGED_PDF_CACHE_MAX_ENTRIES) {
    const oldestKey = mergedPdfCache.keys().next().value;
    if (!oldestKey) break;
    mergedPdfCache.delete(oldestKey);
  }
}

async function collectAnnotationFiles(safeBase: string) {
  const allUploadFiles = await fs.promises.readdir(UPLOAD_DIR);
  const perPagePattern = new RegExp(
    `^annotation_${safeBase}_p\\d+\\.png$`,
    "i",
  );
  const legacyName = `annotation_${safeBase}.png`;

  return allUploadFiles
    .filter((file) => perPagePattern.test(file) || file === legacyName)
    .sort((a, b) => a.localeCompare(b));
}

function buildFingerprint(
  sourceStat: fs.Stats,
  annotationStats: Array<{ file: string; stat: fs.Stats }>,
) {
  return [
    `${sourceStat.mtimeMs}:${sourceStat.size}`,
    ...annotationStats.map(
      ({ file, stat }) => `${file}:${stat.mtimeMs}:${stat.size}`,
    ),
  ].join("|");
}

function toPageNumber(file: string, safeBase: string) {
  const match = file.match(
    new RegExp(`^annotation_${safeBase}_p(\\d+)\\.png$`, "i"),
  );
  return match ? Number.parseInt(match[1], 10) : null;
}

function pdfResponse(fileName: string, bytes: Buffer, cacheControl: string) {
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${fileName}"`,
    "Cache-Control": cacheControl,
  });

  return new NextResponse(new Uint8Array(bytes), { headers });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } },
) {
  // Rate limit: 60 requests per minute per IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip, 60, 60_000)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const rawFilename = params.filename;

  if (!rawFilename) {
    return new NextResponse("Filename must be specified", { status: 400 });
  }

  // Decode first (handles values like uploaded%2Ffile.pdf), then strip path parts.
  const decodedFilename = (() => {
    try {
      return decodeURIComponent(rawFilename);
    } catch {
      return rawFilename;
    }
  })();

  // Strip any directory traversal (e.g. ../../etc/passwd)
  const fileName = path.basename(decodedFilename);
  const fileExtension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
    return new NextResponse("File type not allowed", { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, fileName);

  // Safety net: ensure resolved path is still inside the upload directory
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  // Async existence check — does not block the event loop
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }

  const contentType =
    contentTypeMap[fileExtension] ?? "application/octet-stream";
  const rawMode = req.nextUrl.searchParams.get("raw") === "1";

  if (fileExtension === "pdf" && !rawMode) {
    const safeBase = fileName.replace(/\.pdf$/i, "");
    try {
      const sourceStat = await fs.promises.stat(filePath);
      const annotationFiles = await collectAnnotationFiles(safeBase);

      // Fast path: if there are no annotations, skip expensive PDF merge.
      if (annotationFiles.length === 0) {
        const originalPdf = await fs.promises.readFile(filePath);
        return pdfResponse(
          fileName,
          originalPdf,
          "public, max-age=300, stale-while-revalidate=60",
        );
      }

      const annotationStats = (
        await Promise.all(
          annotationFiles.map(async (file) => {
            const annotationPath = path.join(UPLOAD_DIR, file);
            if (!annotationPath.startsWith(UPLOAD_DIR + path.sep)) {
              return null;
            }

            try {
              const stat = await fs.promises.stat(annotationPath);
              return { file, stat };
            } catch {
              return null;
            }
          }),
        )
      ).filter((value): value is { file: string; stat: fs.Stats } =>
        Boolean(value),
      );

      const fingerprint = buildFingerprint(sourceStat, annotationStats);
      const cacheKey = fileName;
      const now = Date.now();

      pruneMergedPdfCache(now);

      const cached = mergedPdfCache.get(cacheKey);
      if (cached && cached.fingerprint === fingerprint) {
        cached.createdAt = now;
        mergedPdfCache.delete(cacheKey);
        mergedPdfCache.set(cacheKey, cached);
        return pdfResponse(
          fileName,
          cached.bytes,
          "public, max-age=60, stale-while-revalidate=60",
        );
      }

      const pdfBuffer = await fs.promises.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();

      for (const { file } of annotationStats) {
        const annotationPath = path.join(UPLOAD_DIR, file);
        const annotationBuffer = await fs.promises.readFile(annotationPath);
        const annotationImage = await pdfDoc.embedPng(annotationBuffer);

        const pageNumber = toPageNumber(file, safeBase);
        const page = pageNumber ? pages[pageNumber - 1] : pages[0];

        if (!page) continue;

        page.drawImage(annotationImage, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight(),
        });
      }

      const mergedBuffer = Buffer.from(await pdfDoc.save());
      mergedPdfCache.set(cacheKey, {
        fingerprint,
        bytes: mergedBuffer,
        createdAt: now,
      });

      return pdfResponse(
        fileName,
        mergedBuffer,
        "public, max-age=60, stale-while-revalidate=60",
      );
    } catch {
      // Fallback to original PDF if merge fails
    }
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="${fileName}"`,
    // Cache for 5 minutes — reduces repeated downloads on every page load
    "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
  });

  const fileStream = fs.createReadStream(filePath);
  return new NextResponse(Readable.toWeb(fileStream) as ReadableStream, {
    headers,
  });
}
