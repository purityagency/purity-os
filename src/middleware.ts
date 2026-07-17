import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAdmin = token?.role === "ADMIN"
    const pathname = req.nextUrl.pathname

    if (pathname.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL(isAuth ? "/dashboard" : "/login", req.url))
    }

    if (pathname.startsWith("/dashboard") && !isAuth) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => {
        // Only trigger `middleware` logic if the path matches our protected routes
        // For /admin and /dashboard, returning true delegates the check to the middleware function above.
        return true
      },
    },
    pages: {
      signIn: "/login",
    }
  }
)

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"]
}
