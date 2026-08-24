# Spring Financial Bank — Backend

Express + MongoDB API for the SFB banking simulation. Covers the full backend: authentication,
authorization, admin authentication, accounts, atomic peer-to-peer transfers, admin crediting,
profile management, and in-app notifications. Resend email delivery has a locked interface but
currently logs to the console in dev — wiring in the real Resend API call is the one remaining
step (see `email.service.js`).

## Stack

Node.js · Express 5 · MongoDB · Mongoose · JWT · bcrypt · express-validator · express-rate-limit
· helmet · cors · morgan

## Setup

```bash
npm install
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` instead of `cp` if needed.

Fill in `.env`:

- `MONGO_URI` — a MongoDB Atlas connection string (or local MongoDB for development)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET` — three **different**, long random strings. Never reuse one secret across token types — a leaked user-token secret should never be usable to forge an admin token.
- `RESEND_API_KEY` / `EMAIL_FROM` — leave blank for now; the email service logs to the console instead of sending until Resend is wired up in Phase 5.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` — see below.

### Generating the admin password hash

The spec's `.env` template stores `ADMIN_PASSWORD` as plain text. We deviate from that
intentionally: **`ADMIN_PASSWORD_HASH` stores a bcrypt hash instead of the plain password.**

Anyone who can read backend environment variables (a misconfigured logging tool, a support
engineer with dashboard access on Render, a leaked `.env` file) would otherwise see the real
admin password in plain text — and since there's only one admin account with full account-crediting
power, that's a bigger blast radius than a leaked hash, which is computationally infeasible to
reverse. This costs one extra setup step and doesn't change how anything else in the app works.

Generate the hash:

```bash
npm run seed:admin-hash
# Enter the admin password when prompted, then copy the output into .env
```

### Run

```bash
npm run dev     # nodemon, auto-restarts on file changes
npm start        # production
```

The API boots on `http://localhost:5000/api/v1` by default. `GET http://localhost:5000/health`
is available unauthenticated for uptime checks.

## Folder structure

```
src/
├── config/       # env.js (validated env loading), db.js (Mongoose connection)
├── models/       # User, Account, Transaction, Otp, AuditLog
├── services/     # business logic — auth, account, otp, admin, email
├── controllers/  # thin HTTP layer over services
├── routes/       # Express routers, one per resource
├── middleware/   # auth guards, rate limiters, error handling, validation
├── validators/   # express-validator chains
├── utils/        # AppError, catchAsync, apiResponse, token signing, id generators
├── app.js         # Express app config (security middleware, route mounting)
└── server.js      # entry point — connects DB, starts listening
```

## What's implemented

**Models:** User (hashed password + transaction PIN, login *and* PIN lockout fields), Account
(balance is the single source of truth), Transaction (ledger-entry-per-account, linked pairs for
transfers via `transferGroupId`), Otp (hashed, MongoDB TTL auto-expiry), AuditLog, Notification.

**Auth (`/api/v1/auth`):** register → verify-email (creates the account + issues tokens) →
login → refresh → logout, plus forgot-password / reset-password. Access tokens are short-lived
JWTs in the response body; refresh tokens are httpOnly cookies, rotated on every use, and
revoked server-side on logout or password reset.

**Accounts (`/api/v1/accounts`):** `GET /me`, `GET /balances`, `GET /lookup/:accountNumber`
(used by Send Money to validate a recipient before showing the transfer preview — returns only
name + status, never balance).

**Transactions (`/api/v1/transactions`):** `GET /` (with `?type=CREDIT|DEBIT|TRANSFER` filter),
`GET /:id`, `POST /transfer`. Transfers are atomic (MongoDB multi-document transaction), PIN-gated,
and only move funds in the account's base currency (USD) — see "Design notes" below.

**Profile (`/api/v1/profile`):** `GET /`, `PATCH /` — only `firstName`, `lastName`, `phone` are
writable; the update function ignores any other field in the request body outright, so account
number/balance/status can't be smuggled through this endpoint even by a malformed request.

**Notifications (`/api/v1/notifications`):** `GET /`, `PATCH /:id/read`.

**Admin (`/api/v1/admin`):** `/login`, `/logout`, `/me` (separate JWT secret from user sessions,
every login audit-logged), `GET /users` (with `?q=` search), `GET /users/:id` (profile + account
+ last 20 transactions), `PATCH /users/:id/status`, `POST /accounts/:id/credit`, `GET /transactions`,
`GET /audit-logs`.

**Security baked in:** bcrypt for passwords/PINs/OTPs, per-account login lockout (5 attempts /
15 min) *and* a separate transaction-PIN lockout (same threshold, independent counter — a wrong
password and a wrong PIN are different attack surfaces), rate limiting on login/OTP/admin-login/
transfer endpoints, helmet, CORS locked to `CLIENT_URL`, `express-mongo-sanitize`, request body
size limits, centralized error handling that never leaks internals in production.

## Design notes

- **Balance is authoritative only in `baseCurrency` (USD).** Transfers and admin credits are
  rejected with a clear validation error if the request's `currency` doesn't match the account's
  base currency. This isn't a shortcut — the project spec explicitly forbids currency conversion
  that "creates fake additional balances," and every account's base currency is USD, so allowing
  a transfer to claim it moved "100 EUR" would mean fabricating an exchange rate to decide how
  much USD that actually is. The frontend's currency selector remains a legitimate *display*
  convenience; real fund movement is USD-only until a real exchange-rate provider is integrated.
- **Transfers are atomic via MongoDB multi-document transactions**
  (`session.withTransaction`), not manual rollback logic. The sender's debit uses an
  atomic guarded update (`balance: { $gte: amount }` in the same operation as the `$inc`), which
  is what actually prevents two concurrent transfers from both passing a balance check that only
  one of them should pass — a real race condition manual code is easy to get wrong. This requires
  MongoDB to be a replica set; Atlas's free M0 tier already is one.
- **PIN verification happens before the database transaction opens.** A wrong PIN never touches
  the ledger, and the PIN's own lockout counter is checked and updated independently of login
  lockout.
- **Side effects (email, in-app notifications) run after the transaction commits,** using
  `Promise.allSettled` so a failed email can never roll back or block a completed transfer — per
  the project rule that email delivery and financial transactions are separate concerns.
- **Transaction is one ledger entry per account,** not one row per transfer — a transfer writes
  two linked documents (sender's DEBIT, recipient's CREDIT) sharing a `transferGroupId`. This
  keeps "view my history" a simple query per account.
- **Admin's account-credit endpoint is the only way money enters the system.** There's no
  code path anywhere that lets a user increase their own balance.

## Testing this phase

This sandbox's network can't reach MongoDB's binary-download servers, so the full request/response
cycle hasn't been tested against a live database yet. What has been verified:

- Every file passes `node --check` (no syntax errors)
- The full app — all models, services, controllers, and routes including the new transaction,
  profile, notification, and extended admin modules — boots cleanly with no import/wiring errors
  and reaches the DB connection step
- Env validation fails fast with a clear message if required vars are missing
- An unreachable Mongo URI fails cleanly rather than hanging or crashing
- `npm run seed:admin-hash` correctly produces a bcrypt hash

**Next step for you:** create a free MongoDB Atlas cluster (M0 tier — it's a replica set, which
the transfer logic requires), put its connection string in `MONGO_URI`, and run `npm run dev` —
then we can test the full register → verify-email → login → transfer → admin-credit flow against
a real database together.
#   b a n k - t e s t i n g - b a c k e n d  
 