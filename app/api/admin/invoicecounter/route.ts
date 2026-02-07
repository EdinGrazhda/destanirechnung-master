export const dynamic = 'force-dynamic';
import Invoice from "@/models/Invoice";
import dbConnect from "@/utils/dbConnect";
import { NextRequest, NextResponse } from "next/server";


export const GET = async (req: NextRequest, res: NextResponse) => {

    const { searchParams } = new URL(req.url);
    const invoiceStatus = searchParams.get("invoiceStatus");


    await dbConnect();
    const allInvoicesCount = (await Invoice.find({})).length;
    const approvedInvoicesCount = (await Invoice.find({status: "approved"})).length;
    const pendingInvoicesCount = (await Invoice.find({status: "pending"})).length;

    return NextResponse.json({
        message: "Success",
        allInvoicesCount: allInvoicesCount,
        approvedInvoicesCount: approvedInvoicesCount,
        pendingInvoicesCount: pendingInvoicesCount
    }, { status: 200 });
}