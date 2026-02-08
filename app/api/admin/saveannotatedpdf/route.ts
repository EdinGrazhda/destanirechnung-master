import { writeFile, readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const annotationImage = formData.get("annotationImage") as File;
    const originalFilename = formData.get("originalFilename") as string;

    if (!annotationImage || !originalFilename) {
      return NextResponse.json(
        { message: "Fehlende erforderliche Felder" },
        { status: 400 },
      );
    }

    const annotationBuffer = Buffer.from(await annotationImage.arrayBuffer());

    const annotationFilename = `annotation_${originalFilename.replace(".pdf", ".png")}`;
    const annotationPath = path.join(
      process.cwd(),
      "public",
      "uploaded",
      annotationFilename,
    );

    await writeFile(annotationPath, annotationBuffer);

    return NextResponse.json(
      {
        message: "PDF mit Anmerkungen erfolgreich gespeichert",
        annotationFile: annotationFilename,
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
