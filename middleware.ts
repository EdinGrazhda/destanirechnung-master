import { NextResponse, NextRequest } from 'next/server';
import * as jose from "jose";
import isJwtError from './utils/isJwtError';


const JWT_SECRET_KEY="fMOUNpgSCBbF3evXVwJaPw4nI5TPokDVBMZwXTBVIQ803J8kfIhaNCXwps66wckpOZ2Ugnd3MDFifglwZUYGIqM1F9Dbf2oMPncAoJVHKSbfK0v5YoGeNRGajvQmVMX5iiiZbORpt3mMoooLF3MowNBg6p9BEVOrmbjOORrmS5dLw6H6YWZaF8VxCXGRdWjF0Ii6QquZsjW5sOjRxq9CzIpnv7vT8wQDGqKr7F708k9xdDmvG9sRyFwVKDQ7pztl";



// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  console.log("MIDDLEWAREE");

  const token = request.cookies.get("admin_auth_token");
  console.log(token);

  // Check if the auth_token cookie exists in the request
  if (!token) {
    console.log("redirect")
    return NextResponse.redirect(new URL('/', request.url));
  };
  
  // Verify JWT token. Pass to next route if valid, return response if JWT throws errors.
  try {

    // Get Verified Token
    const verified_token = await jose.jwtVerify(token.value, new TextEncoder().encode(JWT_SECRET_KEY));
    
    console.log("verified_token");
    console.log(verified_token);
    
    // Set user id to response headers so the route handler can access.
    const response = NextResponse.next();
    // response.headers.append("user_id", verified_token.payload.id!.toString());


    // Pass the response to the route handler
    return response;

  } catch (err) {

    if (!isJwtError(err)) {
      console.log(`Internal Server Error: ${err}`);
      return NextResponse.redirect(new URL("/?cause=InternalServerError", request.url));
    }

    if (err.name === "TokenExpiredError" || err.name === "JWTExpired") {
      // Token has expired.
      return NextResponse.redirect(new URL('/?cause=TokenExpiredError', request.url));
    } else if (err.name === "JWSSignatureVerificationFailed" || err.name === "JWSError") {
      // General JWT error (e.g., malformed token)
      return NextResponse.redirect(new URL('/?cause=JsonWebTokenError', request.url));
    } else {
      // Other un-handled JWT error
      console.log(`Un-Handled JWT Error: ${err}`);
      return NextResponse.redirect(new URL('/?cause=InternalServerError', request.url));
    }
    
  }
}
 
// The paths where the middleware runs.  
export const config = {
  matcher: ['/api/admin/:path*', "/admin/:path*"],
}