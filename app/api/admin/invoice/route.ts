export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import dbConnect from "@/utils/dbConnect";
import { v4 as uuidv4 } from "uuid";
import Invoice from "@/models/Invoice";
import InvoiceIDManager from "@/models/InvoiceIDManager";

const pump = promisify(pipeline);

const acceptedExtensions = ["png", "jpg", "jpeg", "pdf", "xls", "xlsx"];

export const POST = async (req: any, res: NextResponse) => {
  try {
    const formData = await req.formData();

    console.log(formData);

    // Expand form text input data
    const company = formData.get("company");
    const customID = formData.get("customID");
    const price = formData.get("price");

    // Validate form text inputs
    if (
      !company ||
      company.length <= 0 ||
      !customID ||
      customID.length <= 0 ||
      !price ||
      price.length <= 0
    ) {
      return NextResponse.json(
        { message: "Please fill the form!" },
        { status: 400 },
      );
    }

    const file = formData.getAll("files")[0];
    if (!file || !file.name) {
      return NextResponse.json(
        { message: "Please upload an invoice file!" },
        { status: 400 },
      );
    }
    const fileExtension = file.name.split(".").pop();
    // Check if file extension is good
    if (!acceptedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        {
          message:
            "Only png, jpg, jpeg, pdf, xls and xlsx file formats are supported.",
        },
        { status: 400 },
      );
    }

    // Save File
    let invoiceSaveFile = `${uuidv4()}.${fileExtension}`;
    const filePath = `./public/uploaded/${invoiceSaveFile}`;
    await pump(file.stream(), fs.createWriteStream(filePath));

    await dbConnect();

    // Get the current InvoiceIDManager value and add 1 to it, to be used as the textId of the new invoice.
    // const currentInvoiceIDManager = await InvoiceIDManager.findOne({});

    // let newInvoiceIdNumber = `INV-${String(currentInvoiceIDManager.idNumber + 1).padStart(8, '0')}`;
    // console.log(newInvoiceIdNumber);

    // Make sure the given customID does NOT already exist!

    const foundWithCustomIDInvoice = await Invoice.findOne({
      textId: customID,
    });
    console.log(foundWithCustomIDInvoice);
    if (
      foundWithCustomIDInvoice !== null &&
      foundWithCustomIDInvoice !== undefined
    ) {
      return NextResponse.json(
        { message: "An invoice with this ID already exists!" },
        { status: 409 },
      );
    }

    // File saved - save invoice to DB

    const newSavedInvoice = await Invoice.create({
      fileName: invoiceSaveFile,
      textId: customID,
      company: company,
      price: price,
      status: "pending",
      createdOn: new Date().toISOString(),
    });

    // User saved - update the InvoiceIDManager idNumber by increasing it by one;
    // currentInvoiceIDManager.idNumber = currentInvoiceIDManager.idNumber + 1;
    // currentInvoiceIDManager.markModified("idNumber");
    // await currentInvoiceIDManager.save();

    return NextResponse.json(
      { Message: "Success", newSavedInvoice: newSavedInvoice },
      { status: 200 },
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};

export const GET = async (req: NextRequest, res: NextResponse) => {
  const { searchParams } = new URL(req.url);
  const invoiceStatus = searchParams.get("invoiceStatus");

  await dbConnect();

  if (invoiceStatus === "dashboard") {
    const invoicesPageStr = searchParams.get("invoicesPage");
    const invoicesPage = Number(invoicesPageStr);

    const page =
      Number.isInteger(invoicesPage) && invoicesPage > 0 ? invoicesPage : 1;

    const pageSize = 5;

    const foundInvoices = await Invoice.find({})
      .sort({ createdOn: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    return NextResponse.json(
      { message: "Success", foundInvoices: foundInvoices },
      { status: 200 },
    );
  } else if (invoiceStatus === "paid" || invoiceStatus === "all") {
    const filteringMonthYearOptionParam = searchParams.get(
      "filteringMonthYearOptionParam",
    );
    console.log(filteringMonthYearOptionParam);

    let dateFilter = {};

    if (
      filteringMonthYearOptionParam &&
      filteringMonthYearOptionParam !== "all"
    ) {
      const [yearStr, monthStr] = filteringMonthYearOptionParam.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      if (!isNaN(year) && !isNaN(month)) {
        const start = `${yearStr}-${monthStr.padStart(2, "0")}-01T00:00:00.000Z`;

        // Get next month
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00.000Z`;

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
    });

    return NextResponse.json(
      { message: "Success", foundInvoices },
      { status: 200 },
    );
  } else {
    const foundInvoices = await Invoice.find(
      invoiceStatus === "all" ? {} : { status: invoiceStatus },
    );
    return NextResponse.json(
      { message: "Success", foundInvoices: foundInvoices },
      { status: 200 },
    );
  }
};

export const PUT = async (req: NextRequest, res: NextResponse) => {
  const { invoiceId, newStatus } = await req.json();

  await dbConnect();
  const foundInvoice = await Invoice.findOne({ _id: invoiceId });

  foundInvoice.status = newStatus;
  foundInvoice.markModified("status");
  await foundInvoice.save();

  return NextResponse.json({ message: "Success" }, { status: 200 });
};

export const DELETE = async (req: NextRequest, res: NextResponse) => {
  const { invoiceId } = await req.json();

  await dbConnect();
  const deletedInvoice = await Invoice.findOneAndDelete({ _id: invoiceId });

  return NextResponse.json({ message: "Success" }, { status: 200 });
};
