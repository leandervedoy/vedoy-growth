# Vedoy Sales - Growth module

Status: development only. Not enabled for customers.

## Integration
Use existing Vedoy Studio customer register and service catalog as source of truth; avoid duplicate customer and price records. Growth is Next.js and Supabase. Implement tenant-scoped RLS and server-side authorization.

## Roles
- Admin: invite/approve sellers, campaigns, qualified meetings, signed deals, payout review, course.
- Seller: assigned leads, approved catalog and scripts, call log, meeting proposals, bonus ledger.
- Growth customer: own campaigns and results, never other organizations or seller payroll.

## Training (max 20 minutes)
0-4 min: Approved services (websites, ecommerce, hosting, booking, automation, CRM, AI, design); never invent pricing.
4-8 min: Identify relevant businesses and actual pain points.
8-13 min: Respectful B2B calling, identify caller and Vedoy, ask questions, no exaggerated claims.
13-17 min: Objections and do-not-contact handling.
17-20 min: Qualified meeting booking and follow-up.
Five-question quiz: goal of call; handling refusal; where prices come from; who closes deals; when signed-deal bonus applies. Require admin approval before lead access.

## Compensation
NOK 100 gross for an admin-verified qualified meeting accepted by a business.
NOK 1000 additional gross for an attributable signed customer agreement.
Example: 10 approved meetings and 3 signed deals = NOK 4000 gross.
Ledger states: pending, approved, rejected, paid. Paid only after actual payroll. Audit every adjustment. Define cancellation, duplicate, attribution, and dispute rules in written agreement.

## Proposed optional Growth offers (not live)
Growth Sales: NOK 299/month, CRM pipeline and meeting management.
Sales Pro: NOK 799/month, training and phone integration; call usage separate.
Sales Network: managed appointment setting priced per agreement, after legal review.

## Implementation and release gates
- Inspect current Studio customer/service schema and integrations.
- Add database migrations, org RLS, protected UI routes, server validations and immutable audit history.
- Connect Vedoy Phone API when credentials exist; no pretend telephony or automatic dialing.
- Check Norwegian B2B marketing/privacy and employment/payroll obligations.
- Verify tenant isolation, duplicate bonus prevention, payment transitions, and end-to-end booking.
- No public registration or billing activation until reviewed.
