export const dynamic = "force-dynamic";
import Invoice from "@/models/Invoice";
import { connectDB } from "@/utils/dbConnect";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, res: NextResponse) => {
  await connectDB();

  const [allInvoicesCount, approvedInvoicesCount, pendingInvoicesCount, paidInvoicesCount] =
    await Promise.all([
      Invoice.countDocuments({}),
      Invoice.countDocuments({ status: "approved" }),
      Invoice.countDocuments({ status: "pending" }),
      Invoice.countDocuments({ status: "paid" }),
    ]);

  return NextResponse.json(
    {
      message: "Success",
      allInvoicesCount,
      approvedInvoicesCount,
      pendingInvoicesCount,
      paidInvoicesCount,
    },
    { status: 200 },
  );
};
