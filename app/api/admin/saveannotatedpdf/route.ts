import { readdir, unlink, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const originalFilename = formData.get("originalFilename") as string;

    if (!originalFilename) {
      return NextResponse.json(
        { message: "Fehlende erforderliche Felder" },
        { status: 400 },
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploaded");
    const decodedFilename = (() => {
      try {
        return decodeURIComponent(originalFilename);
      } catch {
        return originalFilename;
      }
    })();
    const safeFilename = path.basename(decodedFilename);
    const safeBase = safeFilename.replace(/\.pdf$/i, "");
    const clearAll = formData.get("clearAll") === "1";

    if (clearAll) {
      const files = await readdir(uploadDir);
      await Promise.all(
        files
          .filter((f) => {
            const perPage =
              f.startsWith(`annotation_${safeBase}_p`) && f.endsWith(".png");
            const legacy = f === `annotation_${safeBase}.png`;
            return perPage || legacy;
          })
          .map((f) => unlink(path.join(uploadDir, f)).catch(() => undefined)),
      );
    }

    let savedCount = 0;
    const writeTasks: Promise<void>[] = [];

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("annotationPage_")) continue;
      if (!(value instanceof File)) continue;

      const page = key.replace("annotationPage_", "").trim();
      if (!/^\d+$/.test(page)) continue;

      const annotationFilename = `annotation_${safeBase}_p${page}.png`;
      const annotationPath = path.join(uploadDir, annotationFilename);
      writeTasks.push(
        value
          .arrayBuffer()
          .then((arr) => writeFile(annotationPath, Buffer.from(arr))),
      );
    }

    if (writeTasks.length > 0) {
      await Promise.all(writeTasks);
      savedCount = writeTasks.length;
    }

    // Backward compatibility: if client still sends single annotationImage,
    // save it as page 1.
    if (savedCount === 0) {
      const legacyAnnotation = formData.get("annotationImage");
      if (legacyAnnotation instanceof File) {
        const buffer = Buffer.from(await legacyAnnotation.arrayBuffer());
        const annotationFilename = `annotation_${safeBase}_p1.png`;
        const annotationPath = path.join(uploadDir, annotationFilename);
        await writeFile(annotationPath, buffer);
        savedCount = 1;
      }
    }

    if (savedCount === 0 && !clearAll) {
      return NextResponse.json(
        { message: "Keine Anmerkungen zum Speichern gefunden" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: clearAll
          ? "Anmerkungen erfolgreich gelöscht"
          : "PDF mit Anmerkungen erfolgreich gespeichert",
        savedPages: savedCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving annotated PDF:", error);
    return NextResponse.json(
      { message: "Fehler beim Speichern des PDFs" },
      { status: 500 },
    );
  }
}
