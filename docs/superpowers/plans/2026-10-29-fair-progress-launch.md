# Fair Progress Launch Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for integration and verification. Independent page/database work is delegated under the session's multi-agent instructions.

**Goal:** Ship a useful public learning website with a closed workspace and consent-aware account implementation.

**Architecture:** Next.js server-rendered learning pages and client account forms call bounded JSON endpoints. Supabase Auth owns identity; a launch profile and immutable consent history are isolated by RLS. A fail-closed route/action guard protects unfinished features.

**Tech Stack:** Next.js 15.5.28, React 18, TypeScript, CSS Modules, Supabase Postgres/Auth, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-29-fair-progress-design.md`

## Global Constraints

- No payment, no AI chat, no fake statistics, no automatic email/SMS campaigns.
- Both notification choices default to false; neither is required to register.
- Backend configuration stays server-side; no credentials in source, tests, logs or documents.
- Do not provision the quoted USD 10/month database without explicit approval.
- Existing workspace remains closed by default, including APIs and server actions.

## Review Focus

- Direct URLs, alternate methods and server actions must not bypass the launch gate.
- A string such as `"false"` must not become an affirmative consent.
- SMS selection requires a valid international number; withdrawing SMS removes it from the active notification profile. Prior consent history and Auth metadata remain until account deletion.
- Network, duplicate account and email-confirmation states must not imply a completed login or saved preferences.
- Session expiry and cross-user database operations must fail safely.

### Task 1: Public learning site and release gate

Files: `components/progress/landing.tsx`, `components/progress/progress.module.css`, `lib/progress/lessons.ts`, `app/laer/**`, `lib/progress/launch.ts`, `middleware.ts`, `app/actions/avvik.ts`.

- [x] Implement six useful lessons and responsive, accessible navigation.
- [x] Write route/action tests covering allowlist, unsafe methods, traversal and closed workspace.
- [x] Implement fail-closed routing and explicit server-action guard.
- [x] Verify tests and rendered routes.

### Task 2: Account, validation and notification preferences

Files: `lib/progress/validation.ts`, `lib/progress/auth.ts`, `components/progress/account-forms.tsx`, `app/register/page.tsx`, `app/login/page.tsx`, `app/konto/page.tsx`, `app/auth/callback/page.tsx`, `app/api/auth/**`, `app/api/launch/profile/route.ts`, portable Supabase migration and SQL tests.

Interfaces: JSON registration accepts displayName, organizationName, organizationKind, email, password, emailUpdates:boolean, smsUpdates:boolean, phone:string, privacyAccepted:true. Profile PATCH omits email/password. Session cookies are HTTP-only. Missing backend produces 503 and an honest visible message.

- [x] Write validation tests for both/no channels, invalid types, missing SMS number and data minimization.
- [x] Implement bounded JSON handlers, same-origin checks, Auth registration/login/session, profile GET/PATCH.
- [x] Implement registration, confirmation and account forms with independent unchecked choices.
- [x] Prepare DB migration and owner isolation/immutable history tests; run only on an authorized target.
- [x] Verify missing-backend and error states, without contacting real recipients.

### Task 3: Integration and delivery

Files: `app/page.tsx`, `app/layout.tsx`, `app/under-utvikling/page.tsx`, `app/personvern/page.tsx`, `.env.example`, `README.md`, package/lockfiles and delivery record.

- [x] Replace public root with new learning landing and preserve legacy workspace under closed route.
- [x] Build with Next.js 15.5.28; fix compatibility errors exposed by build.
- [x] Run focused tests, build, static-demo browser/mobile checks and independent review. Hosted Auth browser verification remains pending activation.
- [ ] Commit to a feature branch and publish a Vercel launch preview/production page with workspace closed.
- [ ] Report verified URL, repository change and remaining database/provider approval accurately.

## Execution record

User explicitly requested immediate implementation; no additional design confirmation is needed. New database spend remains an unapproved external commitment. No messaging is sent to others during implementation.

### Verified implementation

Production build and TypeScript passed. Validation/gate tests: 19/19. Isolated HTTP scenarios: 21/21. PGlite migration/RLS/consent/erasure checks passed. Independent review found and fixed callback login-CSRF and double-encoded path normalization. Actual SMTP and hosted Auth remain unconfigured and untested.

Vercel project creation was rejected with HTTP403; its CLI had no credentials. Publication is blocked on project-creation access. No database or messaging service was purchased or activated.

The offline HTML demo was visually inspected on desktop and in a 390 px mobile frame; learning navigation, lesson content and disabled unchecked consent fields were confirmed. Final delivery includes the runnable Next.js source and this reviewable demo.
