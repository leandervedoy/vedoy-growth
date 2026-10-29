import assert from "node:assert/strict";
import test from "node:test";
import { classifyLaunchRequest, isGrowthWorkspaceOpen, normalizeLaunchPath } from "../../lib/progress/launch.ts";

const decision = (pathname, options = {}) => classifyLaunchRequest({ pathname, ...options });

test("workspace opens only for the exact server flag true", () => {
  const original = process.env.GROWTH_WORKSPACE_OPEN;
  delete process.env.GROWTH_WORKSPACE_OPEN;
  try {
    for (const value of [undefined, "", "false", "TRUE", "True", "1", " true", "true "]) {
      assert.equal(isGrowthWorkspaceOpen(value), false, String(value));
    }
    assert.equal(isGrowthWorkspaceOpen("true"), true);
    assert.equal(decision("/studio", { workspaceOpen: true }).kind, "allow");
    assert.equal(decision("/api/workspace/notes", { method: "POST", workspaceOpen: true }).kind, "allow");
  } finally {
    if (original === undefined) delete process.env.GROWTH_WORKSPACE_OPEN;
    else process.env.GROWTH_WORKSPACE_OPEN = original;
  }
});

test("public pages and learning articles allow GET and HEAD only", () => {
  const paths = ["/", "/laer", "/laer/bedriftens-neste-steg", "/register", "/login", "/konto", "/personvern", "/under-utvikling", "/auth/callback"];
  for (const path of paths) {
    assert.equal(decision(path).kind, "allow", path);
    assert.equal(decision(path, { method: "HEAD" }).kind, "allow", path);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      assert.equal(decision(path, { method }).kind, "unavailable", `${method} ${path}`);
    }
  }
  assert.equal(decision("/laer/article/private").kind, "redirect");
});

test("only the explicitly launched REST endpoints are open", () => {
  for (const path of ["/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/session", "/api/launch/profile"]) {
    assert.equal(decision(path, { method: "POST" }).kind, "allow", path);
  }
  for (const path of ["/api/auth/login-extra", "/api/auth/callback", "/api/auth/register/admin", "/api/launch/profile/export", "/api/new-feature"]) {
    assert.equal(decision(path).kind, "unavailable", path);
  }
});

test("all existing workspace pages stay locked, including demos and public blog", () => {
  for (const path of [
    "/AI/chat", "/avvik", "/blog", "/blog/an-article", "/blog/admin", "/booking", "/calendar",
    "/connections", "/libraries", "/libraries/demo/booking", "/libraries/demo/calendar", "/module-builder",
    "/modules", "/onboarding", "/reports", "/settings/company", "/social", "/studio", "/team",
    "/downloads/vedoy-booking-demo.html", "/_next/data/build-id/studio.json",
  ]) {
    assert.deepEqual(decision(path), { kind: "redirect", location: "/under-utvikling" }, path);
  }
});

test("all existing non-auth APIs are unavailable before any handler executes", () => {
  for (const path of [
    "/api/ai/chat", "/api/blog", "/api/contact", "/api/google/analytics", "/api/google/search-console",
    "/api/google/setup", "/api/integrations/shopify/webhook", "/api/shopify", "/api/shopify/callback",
    "/api/shopify/connect", "/api/social", "/api/website-history", "/api/website-status",
    ...["bookings", "calendar", "connections", "export", "hours", "layout", "members", "notes", "profile"].map((name) => `/api/workspace/${name}`),
  ]) {
    for (const method of ["GET", "POST", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
      assert.equal(decision(path, { method }).kind, "unavailable", `${method} ${path}`);
    }
  }
});

test("Server Actions are rejected on public pages, REST and assets regardless of header case", () => {
  for (const path of ["/", "/login", "/api/auth/login", "/_next/static/chunks/app.js"]) {
    for (const name of ["Next-Action", "next-action", "NEXT-ACTION"]) {
      const headers = new Headers({ [name]: "action-id" });
      assert.deepEqual(decision(path, { method: "POST", headers }), { kind: "unavailable", reason: "server_actions_disabled" });
      assert.equal(decision(path, { headers, workspaceOpen: true }).kind, "unavailable");
    }
  }
});

test("canonicalization does not bypass the route boundary", () => {
  for (const path of ["//api///workspace/notes/", "/api%2fworkspace%2fnotes", "/api%252fworkspace%252fnotes", "/api\\workspace\\notes", "/API/workspace/notes"]) {
    assert.equal(decision(path).kind, "unavailable", path);
  }
  for (const path of ["/studio/", "//studio///", "/login/../studio", "/_next/static/../../studio"]) {
    assert.equal(decision(path).kind, "redirect", path);
  }
  assert.equal(normalizeLaunchPath("//laer///guide/"), "/laer/guide");
  assert.equal(decision("/login/").kind, "allow");
  assert.equal(decision("/Login").kind, "redirect");
  for (const path of ["/login%00", "/login%3fprivate", "/%ZZ", "https://example.com/login"]) {
    assert.equal(decision(path).kind, "unavailable", path);
  }
  for (const path of ["/blog/..%2flogin", "/blog/%2e%2e%2flogin", "/blog/%252e%252e%252flogin"]) {
    assert.equal(decision(path).kind, "unavailable", path);
  }
});

test("encoded dots cannot remap an old dynamic route to a public pathname", () => {
  for (const path of [
    "/login/%2e%2e/studio", "/blog/%2e%2e", "/blog/%252e%252e",
    "/blog/%252E%252E", "/blog/%25252e%25252e", "/blog/%2525252e%2525252e",
    "/blog/.%252e", "/blog/%252e.", "/%252e%252e/login", "/favicon%2eico",
  ]) {
    assert.equal(normalizeLaunchPath(path), null, path);
    assert.deepEqual(decision(path), { kind: "unavailable", reason: "invalid_path" }, path);
  }
});

test("query values never become redirect destinations", () => {
  for (const path of ["/studio?access_token=secret", "/api/shopify/callback?code=secret", "/studio?next=https://example.com"]) {
    const result = decision(path);
    assert.equal(JSON.stringify(result).includes("secret"), false);
    assert.equal(JSON.stringify(result).includes("example.com"), false);
  }
});

test("only known asset locations are exempt, with safe methods", () => {
  for (const path of ["/_next/static/chunks/app.js", "/_next/image", "/images/progress.jpg", "/fonts/body.woff2", "/logos/vedoy-logo-dark.png", "/favicon.ico", "/robots.txt"]) {
    assert.equal(decision(path).kind, "allow", path);
    assert.equal(decision(path, { method: "POST" }).kind, "unavailable", path);
  }
  assert.equal(decision("/private.json").kind, "redirect");
  assert.equal(decision("/_next/server/old-route").kind, "redirect");
});
