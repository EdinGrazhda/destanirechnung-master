import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";
import * as jwt from "jsonwebtoken"



// Important Data
// const ADMIN_EMAIL = "arva@admin.com";
// const ADMIN_PASSWORD = "arva123";


const JWT_SECRET_KEY="fMOUNpgSCBbF3evXVwJaPw4nI5TPokDVBMZwXTBVIQ803J8kfIhaNCXwps66wckpOZ2Ugnd3MDFifglwZUYGIqM1F9Dbf2oMPncAoJVHKSbfK0v5YoGeNRGajvQmVMX5iiiZbORpt3mMoooLF3MowNBg6p9BEVOrmbjOORrmS5dLw6H6YWZaF8VxCXGRdWjF0Ii6QquZsjW5sOjRxq9CzIpnv7vT8wQDGqKr7F708k9xdDmvG9sRyFwVKDQ7pztl";



export const POST = async (req: NextRequest, res: NextResponse) => {

  // Get the request data
  const {
    username, password
  } = await req.json();

  // Make sure the data exists
  if (!username || !password) {
    return NextResponse.json({message: "Please fill out the login form."}, {status: 400});
  }

  
  // Create connection to DB
  await dbConnect();


  // Get user with the matching username address from the database
  const foundUser = await User.findOne({username: username});
  console.log(foundUser);

  // Check if the user exists
  if (!foundUser) {
    return NextResponse.json({message: "The entered username doesn't exist."}, {status: 404});
  };

  // Validate password
  if (foundUser.password !== password) {
    return NextResponse.json({message: "Invalid password."}, {status: 401});
  };

  // Data valid, create jwt;
  // Create JWT for admin authorization. 1 hour access.
  const admin_auth_token = jwt.sign({username: username}, JWT_SECRET_KEY!, { expiresIn: '168h' })

  // Set secure cookie attributes
  const cookieOptions = [
    `admin_auth_token=${admin_auth_token}`,  // Cookie value
    'HttpOnly',                              // Makes the cookie inaccessible to client-side JS
    'Path=/',                                // Cookie is valid within the entire website
    'SameSite=Strict',                       // CORS / CSRF absolutely shall not happen
  ];

  // Include 'Secure' attribute if in production (HTTPS)
  if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

  return NextResponse.json({message: "success", userId: foundUser._id, username: foundUser.name, email: foundUser.email, role: foundUser.role}, {
    status: 200,
    headers: { 'Set-Cookie': cookieOptions.join('; ')} // Join cookie options with semicolon
  });

};