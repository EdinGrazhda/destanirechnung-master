export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

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

    try {
      await fs.access(normalizedFilePath);
    } catch {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(normalizedFilePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
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
