# Screen 29 — Registration / OTP Verification

## Purpose

Create a new client account via OTP verification, then collect consent to terms and privacy policy, then route the newly registered client to tier selection. Also serves as the login screen for returning clients (same OTP flow, different heading).

This screen is a 3-step chain: 2a (OTP entry) → 2b (terms acceptance) → 2c (tier selection or return to clocks).

---

## Who Sees This / Access

- Unauthenticated visitors who click "בחר שעון" (Select Mix) on the clocks screen
- Unauthenticated visitors who click "אזור אישי" (Personal Area) anywhere on the site
- Returning clients who are logged out — routed to the same screen with a "Welcome back" heading

---

## Layout Overview

Single-column centered card layout (max-width 480px, centered on page). Background: site background with subtle gradient or illustration.

Progress indicator at top: 3 dots (Step 1: OTP, Step 2: Terms, Step 3: Getting started), highlighting current step.

---

## Sections / Components

---

### Screen 2a — OTP Entry (הרשמה / Create Your Account)

**Header:**
- Title: **"הרשמה"** / Create Your Account
- Returning client variant title: **"ברוך השוב"** / Welcome Back
- Subtitle: "הזינו פרטי התחברות כדי להמשיך" / Enter your login details to continue

**Channel selector:**
- Tab toggle: **"טלפון"** (Phone) | **"אימייל"** (Email)
- Default selected: Phone
- Switching tabs clears the input field and resets the OTP state

**Phone input (shown when Phone tab active):**

| Field | **מספר טלפון** / Phone Number |
|---|---|
| Type | Tel input |
| Required | Yes |
| Format | Israeli mobile: 05X-XXXXXXX. Accepts with or without leading zero. Normalizes to +972 5X XXXXXXX internally. Country code +972 shown as a fixed prefix or flag selector. |
| Validation | Must match regex `^05[0-9]{8}$` (after stripping leading zero/country code) |
| Error | "מספר הטלפון אינו תקין" / Invalid phone number format |

**Email input (shown when Email tab active):**

| Field | **כתובת אימייל** / Email Address |
|---|---|
| Type | Email input |
| Required | Yes |
| Validation | Standard email format (RFC 5322) |
| Error | "כתובת האימייל אינה תקינה" / Invalid email format |

**"Send Code" button (שלח קוד):**
- Enabled only when input is valid
- On click: POST to `/api/auth/otp/send` with channel + identifier
- Shows loading spinner while in-flight
- On success: button transitions to a 60-second countdown display: **"שלח שוב בעוד 60 שניות"** (countdown ticks down; at 0, button label reverts to "שלח שוב" / Resend, re-enabled)
- On failure: shows error message (see error states)

**OTP input field:**
- Appears below "Send Code" button after OTP is sent (hidden before)
- Layout: 6 individual single-digit boxes, auto-advance focus on input, auto-paste from clipboard
- Accepts only numeric characters (0–9)
- Label: **"קוד אימות"** / Verification Code

**"Verify" button (אמת):**
- Enabled only when all 6 digits entered
- On click: POST to `/api/auth/otp/verify`
- On success: advances to Screen 2b (terms)
- On failure: see error states

**Error states:**

| Error | Display |
|---|---|
| Invalid input format (before send) | Inline field error below input |
| OTP send failed (network/server) | Toast error: "שגיאה בשליחת הקוד. אנא נסה שוב." |
| Wrong OTP entered | Inline error below OTP field: "הקוד שהזנת שגוי. נותרות X ניסיונות." (X = remaining attempts, starting from 3) |
| OTP expired (>5 min) | Inline error: "הקוד פג תוקף. לחצו שלח שוב." Resend link enabled. |
| Account locked (0 attempts remaining) | Replaces entire form with: "החשבון ננעל זמנית. אנא פנו לתמיכה." Contact support link. |

**Already-registered logic:**
- If the submitted phone/email already exists in DB → server returns `{"status": "existing_user"}` → client does NOT show an error; instead, heading changes to "ברוך השוב" and the flow continues identically (OTP sent, verified, then skips Screen 2b and goes directly to personal area hub since terms were already accepted on prior registration).

**"Back" link:**
- Below the form: "← חזרה" — navigates back to the previous page (clocks screen or home)

---

### Screen 2b — Terms Acceptance (תנאי שימוש)

**Header:**
- Title: **"תנאי שימוש ומדיניות פרטיות"** / Terms of Use and Privacy Policy

**Terms text:**
- Scrollable container (max-height: 40vh, overflow-y: scroll), Hebrew text of full terms of service
- Content managed in CMS / admin panel (not hardcoded)
- Scroll indicator: "גלול למטה לקרוא את כל התנאים" / Scroll down to read all terms (shown until user has scrolled to bottom)

**Checkboxes:**

| Field | **קראתי ואני מסכים/ה לתנאי השימוש** / I have read and agree to the Terms of Use |
|---|---|
| Type | Checkbox |
| Required | Yes (must be checked to enable "Continue") |
| Validation | Cannot be submitted unchecked |

| Field | **אני מסכים/ה למדיניות הפרטיות ולעיבוד הנתונים** / I consent to the privacy policy and data processing |
|---|---|
| Type | Checkbox with inline link |
| Required | Yes |
| Link text | "מדיניות פרטיות" → opens privacy policy in a new tab or modal |
| Validation | Cannot be submitted unchecked |

**"Continue" button (המשך):**
- Enabled ONLY when both checkboxes are checked
- On click: records consent timestamp + IP + user agent to audit log → navigates to Screen 2c

**"Decline" link:**
- Text link below button: "דחה ואל תרשם" / Decline and cancel
- On click: confirmation dialog "Are you sure? Your session will end and you will not be registered."
- On confirm: clears OTP session, navigates to home page

---

### Screen 2c — Tier Selection Router

Not a standalone screen — a routing decision immediately after Screen 2b:

**Path A — Client came from "בחר שעון" button (clock selection flow):**
- Do NOT navigate to 46-screen-tier-selection-pricing.md (full page)
- Instead, render an inline **simplified tier prompt** within the registration flow card:
  - Title: "איזה שירות מתאים לך?" / Which service level suits you?
  - 3 compact tier cards (name, price, 2-line summary each)
  - "Select" CTA per card → stores tier selection (pending admin activation) → navigates to personal area hub (30-screen-personal-area-hub.md)
  - "דלג לעת עתה" / Skip for now link → navigates to personal area hub without tier

**Path B — Client came from "Personal Area" button (direct login/register):**
- Navigate to 46-screen-tier-selection-pricing.md (full tier selection page)

---

## States

| State | Display |
|---|---|
| Loading (OTP send in progress) | Button shows spinner, input disabled |
| Loading (OTP verify in progress) | "Verify" button shows spinner, OTP inputs disabled |
| OTP sent successfully | Success toast "קוד נשלח!" fades in. OTP input revealed. Countdown started. |
| OTP verified | Brief "✓ אומת בהצלחה" success flash → auto-navigate to Screen 2b after 500ms |
| Terms scrolled to bottom | Scroll indicator hidden. Checkboxes highlighted with subtle pulse animation to draw attention. |
| Both checkboxes checked | "Continue" button transitions from disabled (grey) to enabled (primary color) |

---

## Navigation

**Incoming paths:**
- 28-screen-clocks-options.md → "בחר שעון" (unregistered)
- Site header "אזור אישי" button → (unauthenticated)
- Email/SMS link containing OTP (magic link fallback, if implemented)

**Outgoing paths:**
- Screen 2a success → Screen 2b
- Screen 2b "Continue" → Screen 2c router
- Screen 2c Path A (with tier) → 30-screen-personal-area-hub.md
- Screen 2c Path A (skip) → 30-screen-personal-area-hub.md (no tier)
- Screen 2c Path B → 46-screen-tier-selection-pricing.md
- "Back" link → previous page (browser history -1)
- "Decline" → home / landing page
- Returning client (existing user) → skips Screen 2b → 30-screen-personal-area-hub.md
