import { NextResponse, NextRequest } from "next/server";
import * as jose from "jose";
import isJwtError from "./utils/isJwtError";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY environment variable is not defined");
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_auth_token");
  const pathname = request.nextUrl.pathname;
  const isAdminApiRequest = pathname.startsWith("/api/admin/");
  const isAdminPageRequest = pathname.startsWith("/admin");
  const isApiRequest = pathname.startsWith("/api/");

  // This app does not use Next.js server actions. Reject any action-like request
  // or page-level mutation before it reaches the App Router runtime.
  if (request.headers.has("next-action")) {
    return new NextResponse("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD, OPTIONS",
      },
    });
  }

  if (!isApiRequest && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return new NextResponse("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD, OPTIONS",
      },
    });
  }

  if (!isAdminApiRequest && !isAdminPageRequest) {
    return NextResponse.next();
  }

  const unauthorizedResponse = (message: string, status: number) => {
    if (isAdminApiRequest) {
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.redirect(new URL("/", request.url));
  };

  // Check if the auth_token cookie exists in the request
  if (!token) {
    return unauthorizedResponse("Unauthorized", 401);
  }

  // Verify JWT token. Pass to next route if valid, return response if JWT throws errors.
  try {
    // Get Verified Token
    const verified_token = await jose.jwtVerify(
      token.value,
      new TextEncoder().encode(JWT_SECRET_KEY),
    );

    const role =
      typeof verified_token.payload.role === "string"
        ? verified_token.payload.role
        : "";

    if (role !== "admin") {
      if (isAdminApiRequest) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      return NextResponse.redirect(new URL("/?cause=Forbidden", request.url));
    }

    // Set user id to response headers so the route handler can access.
    const response = NextResponse.next();
    // response.headers.append("user_id", verified_token.payload.id!.toString());

    // Pass the response to the route handler
    return response;
  } catch (err) {
    if (!isJwtError(err)) {
      if (isAdminApiRequest) {
        return NextResponse.json(
          { message: "Internal Server Error" },
          { status: 500 },
        );
      }

      return NextResponse.redirect(
        new URL("/?cause=InternalServerError", request.url),
      );
    }

    if (err.name === "TokenExpiredError" || err.name === "JWTExpired") {
      // Token has expired.
      if (isAdminApiRequest) {
        return NextResponse.json({ message: "Token expired" }, { status: 401 });
      }

      return NextResponse.redirect(
        new URL("/?cause=TokenExpiredError", request.url),
      );
    } else if (
      err.name === "JWSSignatureVerificationFailed" ||
      err.name === "JWSError"
    ) {
      // General JWT error (e.g., malformed token)
      if (isAdminApiRequest) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
      }

      return NextResponse.redirect(
        new URL("/?cause=JsonWebTokenError", request.url),
      );
    } else {
      // Other un-handled JWT error
      if (isAdminApiRequest) {
        return NextResponse.json(
          { message: "Internal Server Error" },
          { status: 500 },
        );
      }

      return NextResponse.redirect(
        new URL("/?cause=InternalServerError", request.url),
      );
    }
  }
}

// The paths where the middleware runs.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
