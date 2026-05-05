import { readFile, access, constants } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploaded");

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawFilename = searchParams.get("filename");
    const pageCountParam = searchParams.get("pages");

    if (!rawFilename) {
      return NextResponse.json(
        { message: "Filename is required" },
        { status: 400 },
      );
    }

    // Decode first (handles values like uploaded%2Ffile.pdf), then normalize.
    const decodedFilename = (() => {
      try {
        return decodeURIComponent(rawFilename);
      } catch {
        return rawFilename;
      }
    })();

    // Strip any directory traversal components
    const safeFilename = path.basename(decodedFilename);
    const safeBase = safeFilename.replace(/\.pdf$/i, "");
    const requestedPageCount = Number(pageCountParam);
    const hasValidPageCount =
      Number.isInteger(requestedPageCount) && requestedPageCount > 0;

    const pages: Record<string, string> = {};

    if (hasValidPageCount) {
      for (let i = 1; i <= requestedPageCount; i += 1) {
        const annotationPath = path.join(
          UPLOAD_DIR,
          `annotation_${safeBase}_p${i}.png`,
        );
        if (!annotationPath.startsWith(UPLOAD_DIR + path.sep)) continue;

        try {
          await access(annotationPath, constants.R_OK);
          const annotationBuffer = await readFile(annotationPath);
          pages[String(i)] =
            `data:image/png;base64,${annotationBuffer.toString("base64")}`;
        } catch {
          // Ignore missing page annotations
        }
      }
    } else {
      const files = await fs.readdir(UPLOAD_DIR);

      for (const file of files) {
        const match = file.match(
          new RegExp(`^annotation_${safeBase}_p(\\d+)\\.png$`, "i"),
        );
        if (!match) continue;

        const page = match[1];
        const annotationPath = path.join(UPLOAD_DIR, file);

        if (!annotationPath.startsWith(UPLOAD_DIR + path.sep)) continue;

        try {
          await access(annotationPath, constants.R_OK);
          const annotationBuffer = await readFile(annotationPath);
          pages[page] =
            `data:image/png;base64,${annotationBuffer.toString("base64")}`;
        } catch {
          // Ignore unreadable files and continue
        }
      }
    }

    // Backward compatibility for older single-file annotation format.
    if (Object.keys(pages).length === 0) {
      const legacyName = `annotation_${safeFilename.replace(/\.pdf$/i, ".png")}`;
      const legacyPath = path.join(UPLOAD_DIR, legacyName);
      if (legacyPath.startsWith(UPLOAD_DIR + path.sep)) {
        try {
          await access(legacyPath, constants.R_OK);
          const annotationBuffer = await readFile(legacyPath);
          pages["1"] =
            `data:image/png;base64,${annotationBuffer.toString("base64")}`;
        } catch {
          // No legacy annotation found
        }
      }
    }

    return NextResponse.json(
      {
        hasAnnotations: Object.keys(pages).length > 0,
        pages,
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
