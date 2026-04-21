import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";
import validateEmail from "@/utils/validateEmail";

export const POST = async (req: NextRequest) => {
  try {
    const { username, email, password, role } = await req.json();

    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedPassword = String(password || "").trim();
    const normalizedRole = String(role || "user")
      .trim()
      .toLowerCase();

    if (
      !normalizedUsername ||
      !normalizedEmail ||
      !normalizedPassword ||
      !normalizedRole
    ) {
      return NextResponse.json(
        { message: "Please fill out all user fields." },
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

    if (!["admin", "user"].includes(normalizedRole)) {
      return NextResponse.json(
        { message: "Role must be either admin or user." },
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

    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
    });

    return NextResponse.json(
      {
        message: "User created successfully.",
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      },
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
