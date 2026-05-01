import Invoice from "@/models/Invoice";
import { connectDB } from "@/utils/dbConnect";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    await connectDB();

    const [
      allInvoicesCount,
      approvedInvoicesCount,
      pendingInvoicesCount,
      paidInvoicesCount,
    ] = await Promise.all([
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
      {
        status: 200,
        headers: {
          // Browser caches counts for 30 s; serves stale for up to 60 s while revalidating.
          // Stops the dashboard from hitting MongoDB on every re-render.
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Invoice counter error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
};
