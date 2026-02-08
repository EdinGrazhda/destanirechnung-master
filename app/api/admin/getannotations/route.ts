import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { message: "Filename is required" },
        { status: 400 },
      );
    }

    const annotationFilename = `annotation_${filename.replace(".pdf", ".png")}`;
    const annotationPath = path.join(
      process.cwd(),
      "public",
      "uploaded",
      annotationFilename,
    );

    if (!fs.existsSync(annotationPath)) {
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
