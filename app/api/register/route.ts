import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";
import validateEmail from "@/utils/validateEmail";

export const POST = async (req: NextRequest) => {
  try {
    const { username, email, password } = await req.json();

    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedPassword = String(password || "").trim();

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { message: "Please fill out the register form." },
        { status: 400 },
      );
    }

    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (normalizedPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must contain at least 6 characters." },
        { status: 400 },
      );
    }

    await dbConnect();

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Username or email already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcryptjs.hash(normalizedPassword, 10);

    await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    return NextResponse.json(
      { message: "User created successfully." },
      { status: 201 },
    );
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
};
