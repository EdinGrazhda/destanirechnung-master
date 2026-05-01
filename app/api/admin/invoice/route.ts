export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { connectDB } from "@/utils/dbConnect";
import { v4 as uuidv4 } from "uuid";
import Invoice from "@/models/Invoice";

const pump = promisify(pipeline);

const acceptedExtensions = ["png", "jpg", "jpeg", "pdf", "xls", "xlsx"];
const uploadDir = path.join(process.cwd(), "public", "uploaded");

function getSafePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getSafeLimit(value: string | null) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) return 20;
  return Math.min(limit, 100);
}

export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();

    const company = formData.get("company");
    const customID = formData.get("customID");
    const price = formData.get("price");

    if (
      typeof company !== "string" ||
      company.trim().length === 0 ||
      typeof customID !== "string" ||
      customID.trim().length === 0 ||
      typeof price !== "string" ||
      price.trim().length === 0
    ) {
      return NextResponse.json(
        { message: "Please fill the form!" },
        { status: 400 },
      );
    }

    const file = formData.getAll("files")[0];

    if (!(file instanceof File) || !file.name) {
      return NextResponse.json(
        { message: "Please upload an invoice file!" },
        { status: 400 },
      );
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (!fileExtension || !acceptedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        {
          message:
            "Only png, jpg, jpeg, pdf, xls and xlsx file formats are supported.",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const foundWithCustomIDInvoice = await Invoice.findOne({
      textId: customID.trim(),
    }).lean();

    if (foundWithCustomIDInvoice) {
      return NextResponse.json(
        { message: "An invoice with this ID already exists!" },
        { status: 409 },
      );
    }

    await fs.promises.mkdir(uploadDir, { recursive: true });

    const invoiceSaveFile = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadDir, invoiceSaveFile);

    await pump(
      file.stream() as unknown as NodeJS.ReadableStream,
      fs.createWriteStream(filePath),
    );

    const newSavedInvoice = await Invoice.create({
      fileName: invoiceSaveFile,
      textId: customID.trim(),
      company: company.trim(),
      price: price.trim(),
      status: "pending",
      createdOn: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Success", newSavedInvoice },
      { status: 200 },
    );
  } catch (error) {
    console.error("Invoice POST error:", error);

    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceStatus = searchParams.get("invoiceStatus");

    await connectDB();

    if (invoiceStatus === "dashboard") {
      const page = getSafePage(searchParams.get("invoicesPage"));
      const pageSize = 5;

      const foundInvoices = await Invoice.find({})
        .sort({ createdOn: -1 })
        .skip(pageSize * (page - 1))
        .limit(pageSize)
        .lean();

      return NextResponse.json(
        { message: "Success", foundInvoices },
        { status: 200 },
      );
    }

    if (invoiceStatus === "paid" || invoiceStatus === "all") {
      const filteringMonthYearOptionParam = searchParams.get(
        "filteringMonthYearOptionParam",
      );

      const page = getSafePage(searchParams.get("page"));
      const limit = getSafeLimit(searchParams.get("limit"));

      let dateFilter = {};

      if (
        filteringMonthYearOptionParam &&
        filteringMonthYearOptionParam !== "all"
      ) {
        const [yearStr, monthStr] = filteringMonthYearOptionParam.split("-");
        const year = Number.parseInt(yearStr, 10);
        const month = Number.parseInt(monthStr, 10);

        if (!Number.isNaN(year) && !Number.isNaN(month)) {
          const start = `${yearStr}-${monthStr.padStart(2, "0")}-01T00:00:00.000Z`;

          const nextMonth = month === 12 ? 1 : month + 1;
          const nextYear = month === 12 ? year + 1 : year;
          const end = `${nextYear}-${String(nextMonth).padStart(
            2,
            "0",
          )}-01T00:00:00.000Z`;

          dateFilter = {
            createdOn: {
              $gte: start,
              $lt: end,
            },
          };
        }
      }

      const statusFilter =
        invoiceStatus === "all" ? {} : { status: invoiceStatus };

      const foundInvoices = await Invoice.find({
        ...statusFilter,
        ...dateFilter,
      })
        .sort({ createdOn: -1 })
        .skip(limit * (page - 1))
        .limit(limit)
        .lean();

      return NextResponse.json(
        { message: "Success", foundInvoices },
        { status: 200 },
      );
    }

    const foundInvoices = await Invoice.find(
      invoiceStatus === "all" ? {} : { status: invoiceStatus },
    )
      .sort({ createdOn: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(
      { message: "Success", foundInvoices },
      { status: 200 },
    );
  } catch (error) {
    console.error("Invoice GET error:", error);

    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    const { invoiceId, newStatus } = await req.json();

    if (!invoiceId || !newStatus) {
      return NextResponse.json(
        { message: "Missing invoiceId or newStatus." },
        { status: 400 },
      );
    }

    await connectDB();

    const foundInvoice = await Invoice.findOne({ _id: invoiceId });

    if (!foundInvoice) {
      return NextResponse.json(
        { message: "Invoice not found." },
        { status: 404 },
      );
    }

    foundInvoice.status = newStatus;
    foundInvoice.markModified("status");
    await foundInvoice.save();

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error("Invoice PUT error:", error);

    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { message: "Missing invoiceId." },
        { status: 400 },
      );
    }

    await connectDB();

    const deletedInvoice = await Invoice.findOneAndDelete({ _id: invoiceId });

    if (!deletedInvoice) {
      return NextResponse.json(
        { message: "Invoice not found." },
        { status: 404 },
      );
    }

    if (deletedInvoice.fileName) {
      const filePath = path.join(uploadDir, deletedInvoice.fileName);

      try {
        await fs.promises.unlink(filePath);
      } catch {
        // File may already be missing. Do not fail the API response.
      }
    }

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error("Invoice DELETE error:", error);

    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};