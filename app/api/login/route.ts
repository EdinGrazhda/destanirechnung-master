import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { connectDB } from "@/utils/dbConnect";
import User from "@/models/User";
import * as jwt from "jsonwebtoken";
import { isRateLimited } from "@/utils/rateLimit";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY environment variable is not defined");
}

export const POST = async (req: NextRequest, res: NextResponse) => {
  // Rate limit: 10 login attempts per minute per IP (brute-force protection)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip, 10, 60_000)) {
    return NextResponse.json(
      { message: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  // Get the request data
  const { username, password } = await req.json();

  // Make sure the data exists
  if (!username || !password) {
    return NextResponse.json(
      { message: "Please fill out the login form." },
      { status: 400 },
    );
  }

  // Create connection to DB
  await connectDB();

  // Get user with the matching username address from the database
  const foundUser = await User.findOne({ username: username });

  // Check if the user exists
  if (!foundUser) {
    return NextResponse.json(
      { message: "The entered username doesn't exist." },
      { status: 404 },
    );
  }

  // Validate password
  const isPasswordValid = await bcryptjs.compare(password, foundUser.password);
  if (!isPasswordValid) {
    // if (foundUser.password !== password) {
    return NextResponse.json({ message: "Invalid password." }, { status: 401 });
  }

  // Only admin users can log into the admin area.
  if (foundUser.role !== "admin") {
    return NextResponse.json(
      { message: "Access denied. Admin role required." },
      { status: 403 },
    );
  }

  // Data valid, create jwt;
  // Create JWT for admin authorization. 1 hour access.
  const admin_auth_token = jwt.sign(
    { username: username, role: foundUser.role },
    JWT_SECRET_KEY!,
    {
      expiresIn: "168h",
    },
  );

  // Set secure cookie attributes
  const cookieOptions = [
    `admin_auth_token=${admin_auth_token}`, // Cookie value
    "HttpOnly", // Makes the cookie inaccessible to client-side JS
    "Path=/", // Cookie is valid within the entire website
    "SameSite=Strict", // CORS / CSRF absolutely shall not happen
  ];

  // Include 'Secure' attribute if in production (HTTPS)
  if (process.env.NODE_ENV === "production") cookieOptions.push("Secure");

  return NextResponse.json(
    {
      message: "success",
      userId: foundUser._id,
      username: foundUser.username,
      email: foundUser.email,
      role: foundUser.role,
    },
    {
      status: 200,
      headers: { "Set-Cookie": cookieOptions.join("; ") }, // Join cookie options with semicolon
    },
  );
};
