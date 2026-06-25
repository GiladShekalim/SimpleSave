# Screen 46 — Tier Selection and Pricing

## Purpose

Present the three service tiers to the client, clearly communicate pricing and included features, and capture the client's tier choice. No payment gateway in v1 — selection triggers a "we'll contact you" flow with admin manually activating the tier after off-system payment.

---

## Who Sees This / Access

- New clients after OTP registration + terms acceptance (Path B: came from "Personal Area" / direct registration)
- Returning clients who click an "Upgrade your plan" button anywhere in the app
- Clients who explicitly navigate back to this screen
- Clients on no tier who click "Skip for now" are NOT shown this screen again unless they click an upgrade prompt

---

## Layout Overview

**Desktop:** 3 tier cards displayed side by side in a horizontal row. Cards of equal width. Maximum page width = 1100px, centered.

**Tablet:** 3 cards side by side if space permits, otherwise stacked 2+1.

**Mobile:** Cards stacked vertically, one per row, full width.

Below cards: "דלג לעת עתה" / "Skip for now" link (centered, small text link).

---

## Sections / Components

### Page Header

| Element | Content |
|---|---|
| Title | "בחרו את רמת השירות המתאימה לכם" / "Choose the service level that suits you" |
| Subtitle | "כל התכניות כוללות גישה לחמשת שעוני המשכנתא שלכם." / "All plans include access to your 5 mortgage mix options." |

---

### Tier Cards

One card per tier. Per card layout (top to bottom):

#### 1. Tier badge / recommended indicator

- Tier 2 card: "מומלץ" / "Recommended" badge (solid color ribbon, admin-configurable which tier is recommended)
- Tier 1 card: no badge by default
- Tier 3 card: "פרמיום" / "Premium" label (optional styling)

#### 2. Tier name (Hebrew)

| Tier | Hebrew Name | Translation |
|---|---|---|
| Tier 1 | תמהיל + הוצאת אישורים | Mix + Principal Approval |
| Tier 2 | ליווי אינטרנטי | Online Guidance |
| Tier 3 | יועץ אישי | Personal Advisor |

#### 3. Price display

- Fetched dynamically from SystemParameter table in admin panel
- Display format: "₪[amount]" (e.g. "₪1,990")
- Sub-label: admin-configurable pricing label (e.g. "תשלום חד פעמי" / "One-time payment")
- If price is configured as "contact us": show "צרו קשר למחיר" / "Contact us for pricing" instead of numeric value
- Loading state: skeleton shimmer on price display while fetching

#### 4. Feature checklist

Bulleted list of features per tier. Checkmark (✓) for included, X for not included. Strikethrough text on excluded items.

**Tier 1 features:**

| Feature | Included |
|---|---|
| 5 אפשרויות תמהיל משכנתא / 5 mortgage mix options | ✅ |
| אזור אישי + העלאת מסמכים / Personal area + document upload | ✅ |
| הגשת בקשה לאישור עקרוני / Principal approval submission | ✅ |
| הודעות ליועץ / Advisor messaging | ❌ |
| תיאום יעדים עם יועץ / Calendar booking with advisor | ❌ |
| בדיקת מסמכים על ידי יועץ / Advisor document review | ❌ |
| ניהול הצעות בנקים / Bank bid management by advisor | ❌ |

**Tier 2 features:**

| Feature | Included |
|---|---|
| כל מה שבתכנית 1 / Everything in Tier 1 | ✅ |
| יועץ ייעודי (דרך הודעות) / Dedicated advisor (via messages) | ✅ |
| בדיקת מסמכים על ידי יועץ / Advisor reviews your documents | ✅ |
| ניהול הצעות בנקים על ידי יועץ / Bank bid management by advisor | ✅ |
| פגישות פנים אל פנים / In-person meetings / calendar | ❌ |

**Tier 3 features:**

| Feature | Included |
|---|---|
| כל מה שבתכנית 2 / Everything in Tier 2 | ✅ |
| הזמנת פגישות ביומן / Calendar booking with advisor | ✅ |
| פגישות אישיות (פנים אל פנים או מרחוק) / Personal sessions | ✅ |
| יועץ בחתימת המשכנתא / Advisor present at mortgage signing | ✅ |

#### 5. CTA button

- Label: "בחר תכנית" / "Choose This Plan" (on each card)
- Style: outlined for Tier 1 and Tier 3, filled primary for Tier 2 (the recommended tier)

---

### On "Choose This Plan" Click — v1 Flow

No payment gateway. The following inline response replaces the button on the clicked card:

1. Button shows loading spinner briefly
2. Card shows success state:
   - Checkmark icon
   - Text: "תודה שבחרת ב[שם התכנית]! צוות SimpleSave יצור אתך קשר להשלמת ההרשמה. בינתיים תוכלו להמשיך לחקור את האזור האישי שלכם."
   / "Thank you for choosing [Tier Name]! The SimpleSave team will contact you to complete your registration. In the meantime, you can continue exploring your personal area."
3. After 3 seconds (or on user click anywhere): navigate to personal area hub (30-screen-personal-area-hub.md)
4. Server stores `pending_tier_selection = [tier_id]` on the client record
5. Admin is notified (dashboard alert): "Client [name] selected [Tier name] — pending payment"

---

### "Skip for now" Link

Below the tier cards. Text link (no button style): "דלג לעת עתה" / "Skip for now — continue without selecting a plan"

On click:
- No tier stored
- Navigate to personal area hub
- Client enters with no tier (clocks + personal details only accessible)

---

### Already-Selected Tier State

If client returns to this screen and already has an active tier:
- Their current tier card: blue "התכנית הנוכחית שלך" / "Your Current Plan" badge
- CTA button replaced by disabled "התכנית הפעילה שלך" / "Active Plan" label
- Other higher-tier cards: "שדרג ל[שם תכנית]" / "Upgrade to [Tier Name]" CTA (primary style)
- Downgrade: lower-tier cards show no CTA (cannot downgrade in v1)

---

## Buttons

| Button | Location | Action | Conditions |
|---|---|---|---|
| "בחר תכנית" / Choose This Plan | Per tier card | Triggers v1 pending selection flow | Always enabled (one per card) |
| "שדרג ל..." / Upgrade to... | Per higher tier card (returning client) | Triggers same flow for upgrade | Shown only for tiers higher than current |
| "דלג לעת עתה" / Skip | Below cards | Navigates to personal area hub | Always shown; hidden if client already has a tier |

---

## States

### Default (3 cards, no tier selected)

Standard layout as described.

### Loading (fetching prices from server)

- All 3 tier cards show skeleton shimmer on the price area
- Feature lists and CTA buttons remain visible (pre-rendered statically)
- Price area label: "טוען מחירים..." / "Loading prices..."

### Error loading prices

- Price area replaced with: "לתמחור, צרו קשר" / "Contact us for pricing"
- All other card content remains
- No retry button needed (static content sufficient for tier selection)

### Selection in progress (after clicking CTA)

- Clicked card's button shows loading spinner
- Other cards: CTAs temporarily disabled
- Duration: max 3 seconds, then advance to personal area

### Currently-selected tier (returning client)

- Current tier card highlighted with "Your Current Plan" badge and distinct border
- Upgrade CTAs on higher tiers

---

## Navigation

**Incoming paths:**
- 29-screen-registration.md → Screen 2c Path B (new client, "Personal Area" flow)
- Any "Upgrade your plan" / "שדרג עכשיו" button from personal area tabs
- Any locked tab overlay "Upgrade" button
- Direct URL `/app/tier-selection`

**Outgoing paths:**
- After tier selection (any tier): → 30-screen-personal-area-hub.md
- "Skip for now": → 30-screen-personal-area-hub.md (no tier)
- Logo / back navigation: → home / landing page (with confirmation if navigating away from registration flow)
