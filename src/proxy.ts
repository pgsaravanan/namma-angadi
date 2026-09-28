import { NextResponse, type NextRequest } from "next/server";
import { resolveHost } from "@/lib/host";

export function proxy(request: NextRequest) {
  const target = resolveHost(request.headers.get("host") ?? "", process.env.ROOT_DOMAIN ?? "localhost:3000");
  const { pathname } = request.nextUrl;

  if (target.kind === "platform") {
    return pathname.startsWith("/s/") ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/s/${encodeURIComponent(target.key)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt)$).*)"],
};
