import { readFile } from "fs/promises";
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

    if (decodedFilename === "undefined" || decodedFilename === "null") {
      return NextResponse.json(
        { message: "Invalid filename" },
        { status: 400 },
      );
    }

    // Strip any directory traversal components
    const safeFilename = path.basename(decodedFilename);
    const safeBase = safeFilename.replace(/\.pdf$/i, "");
    const requestedPageCount = Number(pageCountParam);
    const hasValidPageCount =
      Number.isInteger(requestedPageCount) && requestedPageCount > 0;

    const pages: Record<string, string> = {};

    if (hasValidPageCount) {
      const readTasks = Array.from({ length: requestedPageCount }, (_, idx) => {
        const i = idx + 1;
        return (async () => {
          const annotationPath = path.join(
            UPLOAD_DIR,
            `annotation_${safeBase}_p${i}.png`,
          );
          if (!annotationPath.startsWith(UPLOAD_DIR + path.sep)) return;

          try {
            const annotationBuffer = await readFile(annotationPath);
            pages[String(i)] =
              `data:image/png;base64,${annotationBuffer.toString("base64")}`;
          } catch {
            // Ignore missing page annotations
          }
        })();
      });

      await Promise.all(readTasks);
    } else {
      const files = await fs.readdir(UPLOAD_DIR);

      const filePattern = new RegExp(`^annotation_${safeBase}_p(\\d+)\\.png$`, "i");
      const readTasks = files.map(async (file) => {
        const match = file.match(filePattern);
        if (!match) return;

        const page = match[1];
        const annotationPath = path.join(UPLOAD_DIR, file);
        if (!annotationPath.startsWith(UPLOAD_DIR + path.sep)) return;

        try {
          const annotationBuffer = await readFile(annotationPath);
          pages[page] =
            `data:image/png;base64,${annotationBuffer.toString("base64")}`;
        } catch {
          // Ignore unreadable files and continue
        }
      });

      await Promise.all(readTasks);
    }

    // Backward compatibility for older single-file annotation format.
    if (Object.keys(pages).length === 0) {
      const legacyName = `annotation_${safeFilename.replace(/\.pdf$/i, ".png")}`;
      const legacyPath = path.join(UPLOAD_DIR, legacyName);
      if (legacyPath.startsWith(UPLOAD_DIR + path.sep)) {
        try {
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
      {
        status: 200,
        headers: {
          // Must always return the freshest saved annotations.
          // Any browser/proxy caching here causes "save succeeded but reopen shows old marks".
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Error loading annotations:", error);
    return NextResponse.json(
      { message: "Error loading annotations", hasAnnotations: false },
      { status: 500 },
    );
  }
}
