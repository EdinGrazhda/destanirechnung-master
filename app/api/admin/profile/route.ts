import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { connectDB } from "@/utils/dbConnect";
import User from "@/models/User";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

export const GET = async (req: NextRequest) => {
  try {
    const token = req.cookies.get("admin_auth_token");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jose.jwtVerify(
      token.value,
      new TextEncoder().encode(JWT_SECRET_KEY),
    );

    await connectDB();
    const user = await User.findOne({ username: payload.username })
      .select("username email role")
      .lean();

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        username: user.username,
        email: user.email,
        role: user.role,
      },
      {
        headers: {
          // Private: only the browser caches this (not shared CDN).
          // Profile data rarely changes mid-session — 5 min is safe.
          "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
};
