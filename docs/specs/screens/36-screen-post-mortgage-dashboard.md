# Screen 36 — Post-Mortgage Dashboard (My Mortgage Tab)

## Purpose

Provide a comprehensive, data-rich view of the client's active mortgage after all collaterals are approved and the mortgage is live. Displays current status, remaining balances, track breakdown, amortization schedule, drawdown timeline, and alerts. Updated monthly by admin.

---

## Who Sees This / Access

- Authenticated clients (any tier that has reached ACTIVE_MORTGAGE)
- **Locked** until lifecycle status = ACTIVE_MORTGAGE
- Advisors can view the same dashboard in the client detail panel (read-only)
- Admin can enter / update mortgage data via the admin panel

---

## Layout Overview

Full-width content area. From top to bottom:
1. Header KPI cards (4 cards in a horizontal row)
2. Section A — Mix Visualization (chart + legend)
3. Section B — Current Status (monthly update cards)
4. Section C — Track Details Table
5. Section D — Amortization Schedule (collapsible)
6. Section E — Drawdown Timeline
7. Alerts / Notifications section

---

## Sections / Components

### Header KPI Cards

4 cards in a horizontal row (2×2 grid on mobile):

| Card | Hebrew Label | Value |
|---|---|---|
| Original Loan Amount | סכום הלוואה מקורי | NIS (from mortgage agreement) |
| Mortgage Start Date | תאריך תחילת המשכנתא | DD/MM/YYYY |
| Mortgage End Date | תאריך סיום המשכנתא | DD/MM/YYYY |
| Number of Tracks | מספר מסלולים בתמהיל | Integer (1–10) |

---

### Section A — Mix Visualization (חזותיות התמהיל)

**Pie / Donut chart:**

- One slice per track in the mortgage mix
- Slice size = that track's percentage of total loan (% of mix)
- Colors: Fixed/Kvua = blue (#3b82f6), Variable/Meshaneh = orange (#f97316), Prime = green (#22c55e)
- Chart library: Chart.js or Recharts
- Click on slice: highlights that track row in Section C
- On hover: tooltip showing track type, %, NIS amount for that track

**Legend (below or to the right of chart):**

One row per track:
- Color swatch
- Track type (Hebrew: קבועה / משתנה / פריים)
- Percentage of mix
- Period (years)
- Interest rate (%)
- CPI-linked: כן / לא

---

### Section B — Current Status (סטטוס נוכחי)

A grid of status cards, updated monthly by admin. 6 cards:

| Hebrew Label | English | Value |
|---|---|---|
| יתרת קרן | Remaining Principal | NIS |
| ריבית ששולמה עד כה | Interest Paid to Date | NIS |
| הצמדה עד כה | CPI Adjustment to Date | NIS |
| תשלומים שנותרו | Remaining Payments | e.g. "204 מתוך 228 תשלומים שולמו" |
| סכום ששולם עד כה | Total Paid to Date | NIS |

**Monthly update badge:**

Below the status grid:
- IF admin has run the monthly update for the current month: green badge "עודכן לחודש [Month Year]" / "Updated for [Month Year]"
- IF not yet updated: grey badge "ממתין לעדכון חודשי" / "Awaiting monthly update"

---

### Section C — Track Details Table (פירוט מסלולים)

Full-width table. One row per track.

| Column | Hebrew | Content |
|---|---|---|
| # | מס' | Track number |
| Type | סוג | קבועה (Fixed) / משתנה (Variable) / פריים (Prime) |
| Period | תקופה | X שנים (years) |
| Original Amount | סכום מקורי | NIS |
| Current Balance | יתרת קרן | NIS (current, from monthly update) |
| Monthly Payment | תשלום חודשי | NIS (current month) |
| Rate | ריבית | % per year |
| CPI-linked | הצמדה | כן / לא |
| Amortization Type | סוג פירעון | שפיצר / קרן שווה |

Table is scrollable horizontally on mobile.

---

### Section D — Amortization Schedule (לוח סילוקין)

Collapsible section (collapsed by default). "הצג לוח סילוקין" / "Show Amortization Schedule" expand button.

When expanded: paginated table.

**Pagination:** 24 rows per page (2 years). Navigation: Prev / Next page buttons, page number indicator.

| Column | Hebrew | Content |
|---|---|---|
| Month | חודש | Sequential number + date (MM/YYYY) |
| Principal Payment | קרן | NIS |
| Interest Payment | ריבית | NIS |
| CPI Adjustment | הצמדה | NIS |
| Total Payment | סה"כ תשלום | NIS |
| Remaining Balance | יתרת קרן | NIS (after this payment) |

**Row highlighting:**
- Current month row: bold + blue background highlight
- Completed months: grey text
- Future months: normal text

**Export button:** "ייצא לאקסל" / "Export to Excel" — exports full amortization schedule as .xlsx download.

---

### Section E — Drawdown Timeline (ציר משיכות)

Visual timeline displayed as a vertical list of events (or horizontal scrollable timeline on desktop).

Each drawdown event row:

| Element | Details |
|---|---|
| Date | DD/MM/YYYY |
| Amount | NIS |
| Status icon | Checkmark (✓) for completed drawdowns, Clock icon (🕐) for future scheduled drawdowns |
| Label | "בוצע" (Completed) or "מתוכנן" (Scheduled) |

**Future drawdown alert:**

For each future drawdown scheduled within the next 30 days: amber alert row above the drawdown item: "תזכורת: משיכה של ₪[amount] מתוכננת ל-[date] — 3 ימים לפני מועד המשיכה תשלח התראה."

**Admin-entered:** drawdown dates and amounts are entered by admin/advisor. If no drawdowns have been entered: "לא הוזנו מועדי משיכה. פנו ליועץ לפרטים." / "No drawdown dates entered. Contact your advisor for details."

---

### Alerts / Notifications Section (התראות)

Shown below drawdown timeline.

List of received alerts. Each alert item:

| Element | Details |
|---|---|
| Date | DD/MM/YYYY |
| Alert type icon | e.g. info (ℹ️), warning (⚠️) |
| Message | Hebrew text of alert. Examples: "שיעור הריבית המשתנה שלך עודכן ל-[X]%" / "מדד המחירים לצרכן עודכן ל-[X]%" |
| Action link | Optional — "לפרטים נוספים" → relevant section or external resource |

Alert types handled:
- Interest rate change (for variable tracks)
- CPI index update
- Refinancing recommendation (v2 placeholder — shown if admin manually triggers)

Empty state: "אין התראות כרגע" / "No alerts at this time."

---

## Buttons

| Button | Location | Action | Conditions |
|---|---|---|---|
| "הצג לוח סילוקין" / Show Amortization Schedule | Section D header | Expands collapsible | Always enabled |
| "סתר לוח סילוקין" / Hide | Section D (when expanded) | Collapses | When section is expanded |
| ייצא לאקסל / Export to Excel | Section D (when expanded) | Downloads .xlsx | Enabled when data is loaded |
| Prev / Next (pagination) | Section D table | Navigate pages | Enabled/disabled based on current page |

---

## States

### Locked (before ACTIVE_MORTGAGE)

Full content area replaced by padlock overlay.

| Element | Content |
|---|---|
| Padlock icon | Large, centered |
| Message | "לוח המחוונים של המשכנתא שלך יופיע כאן לאחר השלמת התהליך." / "Your mortgage dashboard will appear here after your mortgage is finalized." |

---

### Active — Missing Data

Advisor/admin has set ACTIVE_MORTGAGE status but hasn't entered final mortgage terms yet.

| Element | Content |
|---|---|
| Header KPIs | Shown as "–" placeholders |
| Info banner | "פרטי המשכנתא הסופיים ממתינים להזנה על ידי היועץ. נעדכן אותך בהקדם." / "Final mortgage details pending entry by your advisor. We'll update you soon." |
| All sections | Shown with empty/placeholder states |

---

### Active — Full Data

Standard full dashboard as described. Monthly update badge shows current update status.

---

### No Drawdowns Entered

Section E shows empty state message (as noted above).

---

## Navigation

**Incoming paths:**
- 30-screen-personal-area-hub.md → My Mortgage tab click (unlocked only after ACTIVE_MORTGAGE)
- 35-screen-collaterals.md → "Go to My Mortgage Dashboard" CTA (completion state)

**Outgoing paths:**
- Export to Excel → browser file download
- Alert action links → internal sections or external resources
- No tab-level outbound navigation
