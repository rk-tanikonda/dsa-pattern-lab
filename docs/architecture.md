# Application architecture

## Identity and paid access

Public homepage/pricing → Supabase account → Stripe Checkout → verified webhook → membership → learning workspace.

Next.js verifies the current user on the server. Both the learning layout and each page invoke the shared access layer; partial navigation cannot bypass the check. APIs independently verify identity and membership. Anonymous identities are rejected. Billing remains accessible to unpaid users; administrators are explicit server-side UUIDs, with no free learning bypass.

The lesson catalog is imported only by server components. Its authenticated layout passes the data to client learning components. Public JavaScript bundles contain types and interactive code, not lesson JSON. Supabase RLS requires both ownership and a current paid entitlement for progress/notes. The Go API also re-verifies identity and calls the same database entitlement function; its catalog is private.

## Learning and execution

Browser → Next.js `/api/lab/*` → private Go `/v1/*` → Supabase.

A run follows Next.js → Go `prepare` (validate input and atomically reserve quota) → ephemeral Vercel Sandbox (deny outbound network) → Go `complete` (evaluate outputs and save progress). Only the trusted Next.js service should be able to call Go's prepare/complete endpoints; Vercel routes public traffic to the web service. Configure equivalent ingress restrictions if hosting elsewhere.

Bodies are bounded to 128 KiB, code to 64 KB, notes to 32 KB. Mutations require a matching Origin. Languages are allowlisted. The sandbox receives inputs and source, not expected answers or credentials. Go's Two Sum checker accepts either valid index order. `record_run` preserves prior solved status when a later run fails. Progress is private learning data, not an anti-cheating certificate.

Shared Postgres quotas limit each paid member to 5 runs/minute, 50/day, and 500/calendar month (UTC). User-scoped advisory locks prevent concurrent reservations exceeding limits. Go additionally limits authenticated API traffic to 120 requests/minute per process.

## Billing and usage

Stripe SDK calls are server-only. Checkout accepts a plan identifier, never a client-supplied amount or customer ID. It validates the configured Stripe price against the displayed INR plan, persists customer ownership, serializes checkout requests in Postgres, and reuses open sessions. Portal sessions use the authenticated user's stored customer mapping.

Webhooks verify the signature on the raw request body, re-fetch current subscription state, and update entitlements through a service-role-only RPC. Positive paid invoices, recognized prices, active status, and unexpired periods are all required. Trials and free invoices do not unlock access. Event ordering and subscription identity protect against delayed cancellation events. Failed persistence returns non-2xx for retry. Refunds require an operator cancellation workflow; refunds alone do not automatically revoke access.

Usage events include client-reported learning page views and contain account ID, action/resource, time, outcome, and duration. They exclude source code and note text. Next.js records API attempts before executing learning operations; database functions/triggers record reserved runs, saves, and sign-ins. Members see only their own usage. The cross-account admin report requires both a server administrator allowlist and a service-role-only SQL function.

## UI

DM Sans, Manrope, neutral surfaces, and indigo/lavender accents support light, dark, and system themes. The existing handwritten editor font is retained. The app includes the learning path, searchable library, hints, three-language editor, explicit saves, notebook/export, progress, billing, and usage. CodeMirror loads on demand. Theme preferences use localStorage; source and notes remain in editor memory until saved. Unsaved edits prompt before navigation. Mobile navigation, focus styling, status announcements, and reduced-motion preferences are preserved.
