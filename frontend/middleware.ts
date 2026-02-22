import { NextRequest, NextResponse } from "next/server";

// Protect /dashboard — redirect to / if sessionStorage flag isn't set.
// Because middleware runs on the server (no sessionStorage access), we use
// a lightweight cookie written by the client instead.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const auth = req.cookies.get("db_auth");
    if (auth?.value !== "1") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
