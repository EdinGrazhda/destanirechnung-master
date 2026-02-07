export const dynamic = 'force-dynamic';
import Invoice from "@/models/Invoice";
import dbConnect from "@/utils/dbConnect";
import { NextRequest, NextResponse } from "next/server";


export const GET = async (req: NextRequest, res: NextResponse) => {

    const { searchParams } = new URL(req.url);
    const invoiceStatus = searchParams.get("invoiceStatus");


    await dbConnect();


    const filter = invoiceStatus === "all" ? {} : { status: invoiceStatus };
    const foundInvoices = await Invoice.find(filter);

    // Extract month-year combos from createdOn
    const monthYearSet = new Set();

    foundInvoices.forEach((invoice) => {
        const date = new Date(invoice.createdOn);
        const month = date.getMonth(); // 0-indexed
        const year = date.getFullYear();

        const key = `${year}-${String(month + 1).padStart(2, "0")}`; // e.g. "2025-09"
        monthYearSet.add(key);
    });

    const monthYearOptions = Array.from(monthYearSet).sort().reverse(); // newest first

    return NextResponse.json(
        { message: "Success", monthYearOptions },
        { status: 200 }
    );
}