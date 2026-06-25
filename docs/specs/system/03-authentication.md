# 03 — Authentication

## Purpose

Define the complete authentication system for SimpleSave. The system uses OTP-only authentication (no passwords). All three roles — Admin, Advisor, Client — authenticate through the same OTP flow, with role embedded in the session token. This spec covers OTP request and verification, session management, new-user detection, multi-role handling, lockout, audit logging, and all error states.

## Overview

SimpleSave has no password-based authentication. Users prove identity by receiving a one-time passcode (OTP) on a known channel (phone or email) and submitting it within a time window. On successful verification, the server issues a session token (JWT) that carries the user's role. Sessions expire after 24 hours of inactivity; each authenticated API call slides the timer forward.

Admin and Advisor accounts are provisioned only by an Admin — they cannot self-register. Client accounts are created automatically on first OTP verification for a phone/email not yet in the system.

---

## Interface / Contract

### OTP Request Endpoint

**POST** `/auth/otp/request`

**Request body:**

| Field     | Type   | Required | Description                            |
|-----------|--------|----------|----------------------------------------|
| `channel` | enum   | Yes      | `"phone"` or `"email"`                 |
| `value`   | string | Yes      | E.164 phone number or email address    |

**Response (success 200):**

```json
{
  "otp_request_id": "uuid",
  "channel": "phone",
  "expires_at": "ISO-8601 timestamp (10 minutes from now)",
  "masked_destination": "+972-***-****-34"
}
```

**Response (rate-limited 429):**

```json
{
  "error": "RATE_LIMITED",
  "retry_after_seconds": 3600
}
```

**Response (locked 403):**

```json
{
  "error": "ACCOUNT_LOCKED",
  "unlock_required": true
}
```

---

### OTP Verify Endpoint

**POST** `/auth/otp/verify`

**Request body:**

| Field            | Type   | Required | Description                         |
|------------------|--------|----------|-------------------------------------|
| `otp_request_id` | string | Yes      | UUID returned by the request step   |
| `otp_code`       | string | Yes      | 6-digit numeric string              |

**Response (success 200):**

```json
{
  "session_token": "JWT string",
  "role": "client | advisor | admin",
  "user_id": "uuid",
  "is_new_user": true
}
```

**Response (wrong OTP 401):**

```json
{
  "error": "INVALID_OTP",
  "attempts_remaining": 3
}
```

**Response (expired OTP 410):**

```json
{
  "error": "OTP_EXPIRED"
}
```

**Response (max attempts reached 403):**

```json
{
  "error": "ACCOUNT_LOCKED",
  "locked_at": "ISO-8601 timestamp"
}
```

---

### Session Refresh

Every authenticated API call checks the session token. If valid and the last activity was within the 24-hour window, the server updates `last_active_at` on the session record. The JWT expiry is not reissued on every call; instead the server maintains server-side session state and rejects tokens whose session `last_active_at` is older than 24 hours, regardless of JWT signature validity.

---

### Logout Endpoint

**POST** `/auth/logout`

**Headers:** `Authorization: Bearer <session_token>`

**Action:** Marks session as `invalidated = true` in the sessions table. The JWT itself is not revocable by signature, so server-side invalidation is mandatory.

**Response 204 No Content.**

---

## Full OTP Flow (Step by Step)

### Step 1 — Client Submits Channel + Identifier

The frontend displays a single input: "Enter your phone number or email address." The user types a value and taps "Send Code."

### Step 2 — Server Rate-Limit Check

Before generating an OTP, the server checks the `otp_requests` table:

- Count OTP requests for this `(channel, value)` pair in the last 60 minutes.
- If count ≥ 3 → return 429 RATE_LIMITED. Do not generate or send OTP.

### Step 3 — Account Lock Check

Check the `users` table for a record matching `(channel, value)`:

- If record exists and `locked_until > NOW()` → return 403 ACCOUNT_LOCKED.

### Step 4 — Generate OTP

- Generate a cryptographically random 6-digit numeric code (100000–999999).
- Compute `otp_hash = bcrypt(code, cost=10)` (or HMAC-SHA256 with a server secret — whichever is consistent with the implementation). Store hash, **never plaintext**.
- Set `expires_at = NOW() + 10 minutes`.
- Insert row into `otp_requests`: `{ id, channel, value, otp_hash, expires_at, attempt_count=0, used=false }`.

### Step 5 — Send OTP

**Phone channel:** Dispatch to the configured SMS provider (Twilio / AWS SNS or equivalent). Message text:

> "קוד האימות שלך ב-SimpleSave: 123456. תקף ל-10 דקות."

**Email channel:** Dispatch via the email engine (see `07-email-engine.md`). Subject: `קוד האימות שלך ב-SimpleSave`. Body: OTP Verification template.

Log the dispatch attempt (success/failure) in `notification_log`.

### Step 6 — User Enters Code

Frontend shows a 6-digit input field. User types the code and submits.

### Step 7 — Server Verification

1. Look up `otp_requests` row by `otp_request_id`.
2. If row not found → return 404.
3. If `used = true` → return 410 OTP_EXPIRED (treat used codes as expired).
4. If `expires_at < NOW()` → return 410 OTP_EXPIRED.
5. Increment `attempt_count`.
6. If `attempt_count > 5` → lock the account (see Lockout section) → return 403 ACCOUNT_LOCKED.
7. Verify submitted code against stored `otp_hash` using the same hash function.
8. If hash mismatch → return 401 INVALID_OTP with `attempts_remaining = 5 − attempt_count`.
9. If hash matches → mark `used = true`, proceed to Step 8.

### Step 8 — New User vs Returning User

**Returning user:** Look up `users` table by `(channel, value)`.

- If found → load existing user record. Role is already assigned.

**New user (client self-registration):** If no user record exists:

- Only phone and email channels that arrive via the public-facing login page are eligible for auto-registration.
- Create `users` row: `{ id, role='client', phone/email, created_at, is_active=true }`.
- Set `is_new_user = true` in the response.

Admin and Advisor identifiers will already have user records (created by Admin). If a phone/email arrives at the verify step and no user exists AND the OTP was triggered from the admin panel → this path is handled by admin provisioning flow, not here.

### Step 9 — Issue Session Token

1. Create session record: `{ id, user_id, created_at, last_active_at=NOW(), invalidated=false }`.
2. Issue JWT:
   - `sub`: user_id
   - `role`: user.role
   - `session_id`: session.id
   - `iat`: now
   - `exp`: now + 48h (longer than inactivity window to avoid clock edge cases — server-side `last_active_at` check is authoritative for expiry)
3. Return session token to client.

---

## Session Management

### 24-Hour Inactivity Expiry

- On every authenticated API request, the middleware checks `session.last_active_at`.
- If `NOW() − last_active_at > 24 hours` → reject with 401 SESSION_EXPIRED, regardless of JWT `exp` field.
- If within window → update `last_active_at = NOW()` (sliding window).

### Concurrent Sessions

v1: Allow multiple concurrent sessions per user (e.g., mobile + desktop). Each session is independent. Logout only invalidates the session whose token was presented.

### Token Storage (Client Side)

The frontend must store the JWT in `httpOnly` cookies or secure memory (not `localStorage`). Guidance only — frontend implementation detail.

---

## Role Assignment and Multi-Role Handling

A single phone number or email address maps to exactly one user record and one role. There is no multi-role concept in v1.

- A phone number registered as an Advisor cannot be used to self-register as a Client.
- If an Admin tries to provision an Advisor using a phone/email already in the system as a Client, the admin panel must show a conflict error: "This identifier is already registered as a Client."
- Role is set at user creation time and is immutable except by a direct Admin action.

---

## Admin and Advisor Account Provisioning

Admin and Advisor accounts are created exclusively through the Admin panel:

1. Admin navigates to User Management → Add User.
2. Admin enters: name, role (Admin or Advisor), phone and/or email.
3. System creates `users` row with the specified role and `is_active=true`.
4. On the new Advisor's first login attempt, the OTP flow runs normally — returning-user path finds the pre-created record.

Self-registration via the public login page creates Client accounts only.

---

## Lockout

### Trigger

After 5 failed OTP attempts on the same `otp_request_id`, the system:

1. Sets `users.locked_until = NOW() + 30 minutes` (if a user record exists).
2. If no user record yet (very first OTP attempt by a new phone/email), stores a temporary lockout in `otp_lockouts` table keyed by `(channel, value)`.
3. Returns 403 ACCOUNT_LOCKED.

### Lockout Duration

30 minutes automatic lockout. After `locked_until` passes, the system automatically allows new OTP requests.

### Manual Unlock

Admin can unlock an account at any time:

- Admin panel → Client/User record → "Unlock Account" action.
- Clears `locked_until`, resets any `otp_lockouts` rows for that identifier.
- Audit log entry: `ADMIN_UNLOCK`, admin user_id, target user_id, timestamp.

### Lockout Scope

Lockout applies to the user/identifier, not the device. A locked phone number cannot receive a new OTP from any device until unlocked.

---

## Security Controls

| Control | Specification |
|---|---|
| Transport | HTTPS / TLS 1.3 only. HTTP requests redirected to HTTPS. |
| OTP storage | Hash stored (bcrypt or HMAC-SHA256), never plaintext |
| Rate limiting | Max 3 OTP requests per (channel, value) per 60-minute rolling window |
| Attempt limit | Max 5 verify attempts per OTP request before lockout |
| OTP expiry | 10 minutes from generation |
| Session expiry | 24 hours inactivity (server-side sliding window) |
| JWT signing | RS256 or HS256 with ≥256-bit secret; alg embedded in header |
| Session invalidation | Server-side flag; JWT alone is not sufficient |
| Audit logging | Every attempt (success and failure) written to AuditLog |
| OTP code entropy | 6 digits = 10^6 space; combined with 5-attempt lockout = sufficient for 10-minute window |

---

## Audit Logging

Every authentication event is written to the `audit_log` table with the following fields:

| Field | Value |
|---|---|
| `event_type` | `OTP_REQUESTED`, `OTP_VERIFIED`, `OTP_FAILED`, `OTP_EXPIRED`, `ACCOUNT_LOCKED`, `ADMIN_UNLOCK`, `LOGOUT`, `SESSION_EXPIRED` |
| `actor_user_id` | User ID if known, null if new user not yet created |
| `target_identifier` | Masked phone/email (last 2 digits visible) |
| `channel` | `phone` or `email` |
| `ip_address` | Client IP |
| `user_agent` | Browser/device user agent |
| `created_at` | Timestamp |
| `metadata` | JSONB — e.g., `{ "attempts_remaining": 3, "otp_request_id": "..." }` |

---

## Error Handling

| Error Code | HTTP Status | Cause | Client Action |
|---|---|---|---|
| `INVALID_OTP` | 401 | Wrong code entered | Show attempts remaining, allow retry |
| `OTP_EXPIRED` | 410 | Code older than 10 min or already used | Prompt user to request a new code |
| `ACCOUNT_LOCKED` | 403 | 5 failed attempts | Show "account locked, contact support" |
| `RATE_LIMITED` | 429 | >3 OTP requests in 60 min | Show countdown to next allowed request |
| `SESSION_EXPIRED` | 401 | 24h inactivity elapsed | Redirect to login |
| `OTP_REQUEST_NOT_FOUND` | 404 | Invalid otp_request_id submitted | Generic error, restart flow |
| `UNSUPPORTED_CHANNEL` | 400 | Channel not `phone` or `email` | Input validation — should not reach server |
| `INVALID_IDENTIFIER_FORMAT` | 400 | Malformed phone/email | Frontend validation + server-side |

---

## Edge Cases

- **User has both phone and email on file:** Each is treated as the same user. OTP can be sent to either channel. The session returned will be the same user regardless of which channel is used.
- **Concurrent OTP requests:** A user may have multiple active `otp_request` rows simultaneously (e.g., refreshed page, different device). Each is valid independently. Using one does not invalidate the others, but the attempt counter is per-row.
- **Admin account OTP on non-public channel:** Admins can use the same login page; the OTP flow is identical. Role is determined by the user record, not the login path.
- **Clock skew:** The server is authoritative for all timestamps. Client-side clocks are not trusted.
- **SMS delivery failure:** The OTP row is created and the dispatch is attempted. If the SMS provider returns an error, the notification_log records the failure. The user may request a new OTP (subject to rate limit). The failed-dispatch event is surfaced in the admin notification failure log.
- **Email OTP to a spam folder:** Not preventable by the system. v1 mitigation: prompt user to check spam in the UI message.

---

## Dependencies

- `users` table (user records with role, phone, email, locked_until)
- `sessions` table (session_id, user_id, last_active_at, invalidated)
- `otp_requests` table (id, channel, value, otp_hash, expires_at, attempt_count, used)
- `otp_lockouts` table (channel, value, locked_until) — for pre-registration lockouts
- `audit_log` table (all authentication events)
- SMS provider integration (see notification system spec)
- Email engine (see `07-email-engine.md`)
- Notification system (see `04-notification-system.md`)
