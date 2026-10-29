import { NextResponse, type NextRequest } from "next/server";
import {
  classifyLaunchRequest,
  isGrowthWorkspaceOpen,
  WORKSPACE_RETRY_AFTER_SECONDS,
  WORKSPACE_UNAVAILABLE_MESSAGE,
} from "@/lib/progress/launch";

export function middleware(request: NextRequest) {
  const decision = classifyLaunchRequest({
    pathname: request.nextUrl.pathname,
    method: request.method,
    headers: request.headers,
    workspaceOpen: isGrowthWorkspaceOpen(),
  });

  if (decision.kind === "allow") return NextResponse.next();

  if (decision.kind === "unavailable") {
    return NextResponse.json(
      { error: WORKSPACE_UNAVAILABLE_MESSAGE, code: "WORKSPACE_UNAVAILABLE" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(WORKSPACE_RETRY_AFTER_SECONDS),
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  // Build a fresh URL so OAuth codes, tokens and arbitrary query values are dropped.
  const destination = new URL(decision.location, request.url);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

// Include API routes, prefetch/RSC requests and paths with extensions.
export const config = { matcher: ["/:path*"] };
