export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";


export const GET = async (req: NextRequest, res: NextResponse) => {
  // Set secure cookie attributes
  const cookieOptions = [
    `admin_auth_token=`,  // Cookie value
    'HttpOnly',                              // Makes the cookie inaccessible to client-side JS
    'Path=/',                                // Cookie is valid within the entire website
    'SameSite=Strict',                       // CORS / CSRF absolutely shall not happen
  ];

  // Include 'Secure' attribute if in production (HTTPS)
  if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

  return NextResponse.json({message: "success"}, {
    status: 200,
    headers: { 'Set-Cookie': cookieOptions.join('; ')} // Join cookie options with semicolon
  });
  
}