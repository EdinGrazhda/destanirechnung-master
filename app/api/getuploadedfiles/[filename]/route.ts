export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isRateLimited } from "@/utils/rateLimit";

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

  // Strip any directory traversal (e.g. ../../etc/passwd)
  const fileName = path.basename(rawFilename);
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

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="${fileName}"`,
    // Cache for 5 minutes — reduces repeated downloads on every page load
    "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
  });

  const fileStream = fs.createReadStream(filePath);
  return new NextResponse(fileStream as any, { headers });
}
