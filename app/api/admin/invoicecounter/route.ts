import Invoice from "@/models/Invoice";
import { connectDB } from "@/utils/dbConnect";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    await connectDB();

    const groupedCounts = await Invoice.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    let allInvoicesCount = 0;
    let approvedInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    let paidInvoicesCount = 0;

    for (const row of groupedCounts as Array<{ _id: string; count: number }>) {
      const count = Number(row.count) || 0;
      allInvoicesCount += count;

      if (row._id === "approved") approvedInvoicesCount = count;
      if (row._id === "pending") pendingInvoicesCount = count;
      if (row._id === "paid") paidInvoicesCount = count;
    }

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
          // Browser caches counts for 60 s; serves stale for up to 120 s while revalidating.
          // Stops the dashboard from hitting MongoDB on every re-render.
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
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
