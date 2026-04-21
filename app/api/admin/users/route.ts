export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";

export const GET = async (req: NextRequest) => {
  try {
    await dbConnect();
    const users = await User.find({}).select("-password");

    return NextResponse.json({ message: "Success", users }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return NextResponse.json(
        { message: "Please provide userId and newRole." },
        { status: 400 },
      );
    }

    if (!["admin", "user"].includes(newRole)) {
      return NextResponse.json(
        { message: "Role must be either admin or user." },
        { status: 400 },
      );
    }

    await dbConnect();
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "User role updated successfully.", user: updatedUser },
      { status: 200 },
    );
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};
