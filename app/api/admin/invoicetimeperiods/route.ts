export const dynamic = "force-dynamic";
import Invoice from "@/models/Invoice";
import { connectDB } from "@/utils/dbConnect";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, res: NextResponse) => {
  const { searchParams } = new URL(req.url);
  const invoiceStatus = searchParams.get("invoiceStatus");

  await connectDB();

  // Use aggregation to extract month-year combos directly in MongoDB.
  // This avoids loading the entire collection into Node.js memory.
  const matchStage =
    invoiceStatus && invoiceStatus !== "all"
      ? [{ $match: { status: invoiceStatus } }]
      : [];

  const results = await Invoice.aggregate([
    ...matchStage,
    { $project: { yearMonth: { $substr: ["$createdOn", 0, 7] } } },
    { $group: { _id: "$yearMonth" } },
    { $sort: { _id: -1 } },
  ]);

  const monthYearOptions = results
    .map((r: { _id: string }) => r._id)
    .filter(Boolean);

  return NextResponse.json(
    { message: "Success", monthYearOptions },
    { status: 200 },
  );
};
