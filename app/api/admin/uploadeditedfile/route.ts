export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { connectDB } from "@/utils/dbConnect";
import Invoice from "@/models/Invoice";
import { isSafeUploadedFilename } from "@/utils/uploadedFilename";

const pump = promisify(pipeline);
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploaded");
const acceptedExtensions = ["png", "jpg", "jpeg", "pdf", "xls", "xlsx"];

export const POST = async (req: any, res: NextResponse) => {
  try {
    const formData = await req.formData();

    const file = formData.getAll("files")[0];
    if (!file || !file.name) {
      return NextResponse.json(
        { message: "Please upload an invoice file!" },
        { status: 400 },
      );
    }
    // Sanitize: strip any directory components from the filename
    const uploadedFileName = path.basename(file.name);
    const fileExtension =
      uploadedFileName.split(".").pop()?.toLowerCase() ?? "";
    if (
      !isSafeUploadedFilename(uploadedFileName) ||
      !acceptedExtensions.includes(fileExtension)
    ) {
      return NextResponse.json(
        {
          message:
            "Only png, jpg, jpeg, pdf, xls and xlsx file formats are supported.",
        },
        { status: 400 },
      );
    }

    // Check if the uploaded file exists as an invoice
    await connectDB();
    const foundInvoice = await Invoice.findOne({ fileName: uploadedFileName });

    if (!foundInvoice) {
      return NextResponse.json(
        { message: "There are no invoices with the given file" },
        { status: 404 },
      );
    }

    // Invoice Exists - save new file with the same name.
    const filePath = path.join(UPLOAD_DIR, uploadedFileName);
    await pump(file.stream(), fs.createWriteStream(filePath));

    // File saved - update the status of the invoice to approved;
    foundInvoice.status = "approved";
    foundInvoice.markModified("status");
    await foundInvoice.save();

    return NextResponse.json({ Message: "Success" }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};
