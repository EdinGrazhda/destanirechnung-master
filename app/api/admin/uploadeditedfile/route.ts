export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import dbConnect from "@/utils/dbConnect";
import { v4 as uuidv4 } from "uuid";
import Invoice from "@/models/Invoice";

const pump = promisify(pipeline);

const acceptedExtensions = ["png", "jpg", "jpeg", "pdf", "xls", "xlsx"];

export const POST = async (req: any, res: NextResponse) => {

    try{
        const formData = await req.formData();

        console.log(formData)


        const file = formData.getAll('files')[0];
        if (!file || !file.name) {
          return NextResponse.json({ message: "Please upload an invoice file!" }, { status: 400 });
        }
        const fileExtension = file.name.split(".").pop();
        let uploadedFileName = file.name;
        // Check if file extension is good
        if (!acceptedExtensions.includes(fileExtension)) {
          return NextResponse.json({message: "Only png, jpg, jpeg, pdf, xls and xlsx file formats are supported."}, { status: 400 });
        };

        // Check if the uploaded file exists as an invoice
        const foundInvoice = await Invoice.findOne({ fileName: uploadedFileName });
        console.log("HAHAH NICE");
        console.log(foundInvoice);

        if (!foundInvoice) {
          return NextResponse.json({ message: "There are no invoices with the given file" }, { status: 404 });
        }

        // Invoice Exists - save new file with the same name.
        // Save File
        // let invoiceSaveFile = `${uuidv4()}.${fileExtension}`
        const filePath = `./public/uploaded/${uploadedFileName}`;
        await pump(file.stream(), fs.createWriteStream(filePath));

        // File saved - update the status of the invoice to approved;
        foundInvoice.status = "approved";
        foundInvoice.markModified("status");
        await foundInvoice.save();



        return NextResponse.json({ Message: "Success" }, { status: 200 });
    }
    catch (e) {
        console.log(e);
        return NextResponse.json({ message: "Internal Server Error." }, {status: 500})
    }
}