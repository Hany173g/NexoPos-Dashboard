export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/dashboard/:path*", "/licenses/:path*", "/api/licenses/:path*"],
}
