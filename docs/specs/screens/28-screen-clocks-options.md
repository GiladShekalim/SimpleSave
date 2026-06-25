# Screen 28 — Clocks / Mortgage Mix Options

## Purpose

Display the 5 computed mortgage mix options ("clocks") to the client after they complete the questionnaire. This is the most important client-facing output screen. Each clock represents a distinct risk/cost profile. The client reviews the options, may drill into details, and selects one to proceed.

---

## Who Sees This / Access

- Any visitor who has completed the 10-step questionnaire (including OTP verification)
- Logged-in clients can return to this screen from the personal area "My Applications" section
- Advisors can preview a client's clocks from the advisor dashboard

---

## Layout Overview

Full-width grid of up to 5 clock cards (5-column desktop, 2-column tablet, 1-column mobile). Cards are ordered Clock 1–5 left to right. Below the grid, a fixed-position or sticky "Select this Mix" footer may appear on mobile when a card is focused.

A slide-in detail panel (or full-screen modal on mobile) opens to the right of (or over) the grid when the user clicks "פירוט" on any card.

---

## Sections / Components

### Clock Card (repeated for each configured clock, 1–5)

Each card renders the following elements top to bottom:

| Element | Details |
|---|---|
| Clock number label | Small text label "שעון 1" / "שעון 2" etc., top-left corner |
| "Within range" badge | **"✓ בטווח הרצוי"** badge, shown only IF the clock's initial monthly payment falls within the client's desired min–max payment range entered in the wizard (Q10). Green background. Hidden if out of range. |
| Risk level indicator | Speedometer graphic (SVG) with needle position. Needle angle maps: Low = left quarter, Medium = center, High = right quarter. Text label below needle: **נמוך** (Low) / **בינוני** (Medium) / **גבוה** (High). |
| KPI 1 | **"החזר חודשי התחלתי"** / Initial Monthly Payment — large numeric display in NIS (₪ prefix). This is the sum of all tracks' initial monthly payments for month 1. |
| KPI 2 | **"סה״כ תשלומים"** / Total Payments over full term — NIS. Sum of all payments (principal + interest + CPI) across all tracks for the full loan term. |
| KPI 3 | **"תשלומי ריבית והצמדה"** / Total Interest + CPI Payments — NIS. Excludes principal repayment. |
| Drill-down button | **"פירוט"** / Details — secondary button, opens the detail panel (see below) for this specific clock |
| Select button | **"בחר שעון"** / Select this Mix — primary CTA button (see Button rules below) |

**Color coding by risk level:**
- Low risk: green border (2px solid #22c55e), green accent on speedometer needle and KPI 1 label
- Medium risk: yellow/amber border (#f59e0b), amber needle
- High risk: red border (#ef4444), red needle

**Card selected state:** if the client has previously selected this clock, display a prominent **"✓ נבחר"** (Selected) badge (blue ribbon, top-right corner) and apply a blue highlight border. All other clock cards display a greyed-out "not selected" visual treatment (opacity 0.6, grayscale filter on KPI area).

---

### Detail Drill-Down Panel

Triggered by "פירוט" button. Opens as a slide-in panel from the right on desktop (width 480px), or a full-screen bottom-sheet modal on mobile.

Panel header: Clock number + risk label. Close button (X) top-right.

The panel contains 4 tabs:

#### Tab 1 — Monthly Payments Chart (גרף תשלומים חודשיים)

- Library: Chart.js (stacked bar chart)
- X-axis: years (1 to max term years)
- Y-axis: NIS amount
- Stack layers per bar:
  1. Principal portion (blue)
  2. Interest portion (orange)
  3. CPI adjustment portion (light grey)
- Hover tooltip: shows exact NIS values for each stack layer for the hovered year
- Legend below chart

#### Tab 2 — Cumulative Chart (גרף מצטבר)

- Library: Chart.js (multi-line chart)
- Two lines:
  1. Cumulative principal paid (blue solid line)
  2. Cumulative interest + CPI paid (orange dashed line)
- X-axis: years
- Y-axis: NIS
- Crosshair on hover showing values at that year

#### Tab 3 — Track Breakdown Table (פירוט מסלולים)

Table with one row per track in this clock's mix. Columns:

| Column | Content |
|---|---|
| # | Track number |
| סוג / Type | Fixed (Kvua), Variable (Meshaneh), Prime |
| תקופה / Period | Years (e.g. "20 שנה") |
| ריבית / Rate | % per year |
| הצמדה / CPI-linked | Yes (כן) / No (לא) |
| סוג פירעון / Amortization | Shpitzer (שפיצר) / Equal Principal (קרן שווה) |
| % מהתמהיל / % of Mix | e.g. "40%" |
| החזר ראשוני / Initial Monthly | NIS — monthly payment for this track alone in month 1 |
| סה״כ תשלום / Total Payment | NIS — total paid over this track's full term |

Footer row: totals — sum of % (must equal 100%), sum of initial monthly, sum of total payment.

#### Tab 4 — Summary (סיכום)

Read-only summary cards:

| Field | Value |
|---|---|
| סכום ההלוואה / Total Loan | NIS |
| סה״כ תשלומים / Total Payments | NIS |
| סה״כ ריבית + הצמדה / Total Interest + CPI | NIS |
| ריבית אפקטיבית שנתית / Effective Annual Rate | % (weighted average across all tracks) |
| תשלום חודשי מקסימלי שלי / My payment cap | NIS (40% of net income − fixed expenses, calculated from wizard answers) |
| האם בתקציב? / Within budget? | Green "✓ כן" if initial monthly ≤ 40% cap, Red "✗ חורג" if exceeds |

**"בחר שעון זה"** / Select this Mix button — identical behavior to the card-level button (see Buttons section). Present both at top and bottom of detail panel.

---

## Buttons

### "בחר שעון" / Select this Mix (on card and in detail panel)

| Scenario | Behavior |
|---|---|
| Client not registered (no account) | Show registration prompt overlay (slide-up sheet): "To save your selection and continue, create a free account." Primary CTA = "הרשמה" / Register → navigates to 29-screen-registration.md |
| Client registered, no tier selected | Show tier selection prompt overlay: "To proceed with this mix, please select a service plan." Primary CTA = "בחר תכנית" / Choose Plan → navigates to 46-screen-tier-selection-pricing.md |
| Client registered with any tier | Show inline confirmation dialog: "Confirm selection of Clock [N]? This will set your mortgage mix and advance your application." Confirm / Cancel buttons. On Confirm: sets application status to TIER_SELECTED (if not already set), stores selected clock ID, highlights selected card, disables selection on all other cards |
| Client already has a selected clock (same) | Button label changes to "✓ נבחר" and is disabled |
| Client already has a selected clock (different one) | Confirmation dialog includes: "This will replace your previously selected mix." |

### "פירוט" / Detail button (per card)

- Always enabled (when card is visible)
- Opens the detail drill-down panel for that clock

---

## States

### Clocks not yet calculated

Admin has not configured any mortgage mixes.

Display: full-width info box, no clock cards rendered.
Message: "בדיקת תצורת המערכת. נסה שוב מאוחר יותר." / "System configuration in progress. Please check back later."

### Partial clocks available

Some clocks have rates not configured (e.g. a variable track has no rate set).

Display: only fully-configured clocks are shown. If only 3 of 5 are configured, show 3 cards. No placeholder cards for missing slots.

### Loading state

Clocks are being computed on the server (async).

Display: 5 skeleton card placeholders (grey shimmer animation). "מחשב תמהילים..." / "Calculating mixes..." label above grid.

### Error state

Server returned an error computing clocks.

Display: error banner at top. "לא הצלחנו לחשב את האפשרויות שלך. אנא נסה שוב." / "We couldn't calculate your options. Please try again." Retry button.

### No tier — after clicking Select

Tier selection overlay/prompt appears inline (does not navigate away from clocks page). Client can dismiss the overlay and continue viewing clocks.

---

## Navigation

**Incoming paths:**
- Questionnaire wizard, step 10 → OTP verification → redirects here (first time)
- Personal area sidebar / "My Applications" section → clicking an application's "View Mixes" → navigates here
- Deep link (e.g. from advisor notification): `/app/clocks?app_id=<id>`

**Outgoing paths:**
- "בחר שעון" (unregistered): → 29-screen-registration.md
- "בחר שעון" (registered, no tier): → 46-screen-tier-selection-pricing.md
- "בחר שעון" (registered with tier, confirmed): → 30-screen-personal-area-hub.md
- Back / logo: → home / landing page
- Detail panel close: → returns to clock grid (same page)
