import { readFile, access, constants } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploaded");

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawFilename = searchParams.get("filename");

    if (!rawFilename) {
      return NextResponse.json(
        { message: "Filename is required" },
        { status: 400 },
      );
    }

    // Strip any directory traversal components
    const safeFilename = path.basename(rawFilename);
    const annotationFilename = `annotation_${safeFilename.replace(".pdf", ".png")}`;
    const annotationPath = path.join(UPLOAD_DIR, annotationFilename);

    // Ensure resolved path stays within upload directory
    if (!annotationPath.startsWith(UPLOAD_DIR + path.sep)) {
      return NextResponse.json({ hasAnnotations: false }, { status: 200 });
    }

    // Async existence check — does not block the event loop
    try {
      await access(annotationPath, constants.R_OK);
    } catch {
      return NextResponse.json({ hasAnnotations: false }, { status: 200 });
    }

    const annotationBuffer = await readFile(annotationPath);
    const base64 = annotationBuffer.toString("base64");

    return NextResponse.json(
      {
        hasAnnotations: true,
        annotationData: `data:image/png;base64,${base64}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error loading annotations:", error);
    return NextResponse.json(
      { message: "Error loading annotations", hasAnnotations: false },
      { status: 500 },
    );
  }
}
