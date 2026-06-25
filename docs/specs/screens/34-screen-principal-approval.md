# Screen 34 — Principal Approval Tab

## Purpose

Display the status of the application's submission to participating banks for principal approval (אישור עקרוני). Show each bank's response (pending, approved, rejected) with approval details. Enable the client to select one bank to proceed with after receiving approvals.

---

## Who Sees This / Access

- Authenticated clients with any tier (Tier 1, 2, or 3)
- **Locked** until lifecycle status = DOCUMENTS_APPROVED (all required documents approved by advisor)
- **Locked** for clients with no tier
- Advisors can edit all bank response fields and approval details in the advisor client detail view

---

## Layout Overview

Content area structure from top to bottom:
1. Authorization letter prompt banner (conditional)
2. Advisor notes section
3. Bank grid (responsive: 3-column desktop, 2-column tablet, 1-column mobile)
4. Selection confirmation footer (appears after a bank is selected)

---

## Sections / Components

### Authorization Letter Prompt Banner

**Visibility:** Shown at the very top IF lifecycle status < AUTHORIZATION_SIGNED (authorization letters have not yet all been uploaded).

Banner style: amber/warning.

Content: "לפני שנוכל להגיש לבנקים, יש לחתום ולהעלות את ייפויי הכוח." / "Before we can submit to banks, please sign and upload your authorization letters."

CTA: "עברו למסמכים" / "Go to Documents" link → navigates to Documents tab (33-screen-documents.md), scrolls to auth letters section.

---

### Advisor Notes Section

**Visibility:** Always shown (even if empty). Rendered below the banner, above the bank grid.

| Element | Details |
|---|---|
| Section title | "הערות היועץ" / Advisor Notes |
| Content | Text block (HTML-rendered, supports line breaks). Written by advisor in their dashboard. |
| Empty state | "טרם הוספו הערות" / "No notes added yet" in grey italic |
| Advisor name + timestamp | Below the notes text, small grey text: "[Advisor name] · [date]" |

---

### Bank Grid

One card per bank that is participating in the application. Participating banks are set by the advisor (not client-controlled).

**Bank card — base layout:**

| Element | Details |
|---|---|
| Bank logo | Large (80×80px), centered at top of card |
| Bank name | Hebrew (e.g. "בנק לאומי") |
| Status badge | See status badge values below |

**Status badge values:**

| Status | Hebrew Label | Visual |
|---|---|---|
| PENDING | ממתין | Grey badge |
| APPROVED | אושר | Green badge, prominent |
| REJECTED | נדחה | Red badge |

**Approved card — additional content:**

When status = APPROVED, the card expands to show approval details (entered by advisor):

| Field | Hebrew Label | Content |
|---|---|---|
| Approved Loan Amount | סכום מאושר | NIS value, large text |
| Offered Interest Rate | ריבית מוצעת | % per year (or "See advisor for details" if not entered) |
| Approval Conditions Summary | תנאים מיוחדים | Short text (optional, entered by advisor) |
| Approval Expiry Date | תוקף האישור | Date — shown if advisor entered it |

**"Best Offer" badge:**

On the card with the best terms (as computed by the system — admin-configurable metric: highest approved amount OR lowest rate):

Displayed as a ribbon or corner badge: **"הצעה הטובה ביותר"** / "Best Offer" — yellow/gold color.

The "best offer" is computed after all bank responses are entered. If only one bank approved, it automatically receives the badge.

**"בחר בנק זה" / Select this Bank button:**

- Shown only on APPROVED bank cards
- Disabled after any bank has been selected (one selection locks all cards)
- Primary button style

---

### Bank Selection Flow

When client clicks "בחר בנק זה" on an approved bank card:

1. **Confirmation dialog appears (modal overlay):**
   - Title: "אישור בחירת בנק" / Confirm Bank Selection
   - Body: "האם אתה בטוח שברצונך להמשיך עם [שם הבנק]? האישורים מהבנקים האחרים לא יהיו פעילים יותר." / "Are you sure you want to proceed with [Bank Name]? Other bank approvals will no longer be active."
   - Two buttons: "אשר" / Confirm (primary) | "בטל" / Cancel (secondary)

2. **On Confirm:**
   - Lifecycle status updated to BANK_SELECTED (server-side)
   - Selected bank's card: large blue "✓ נבחר" / "Selected" badge applied, card border becomes blue
   - All other bank cards: visual dimming (opacity 0.5, grayscale filter on logo)
   - "Select" button disabled on all cards
   - Advisor notified (system notification): "Client [name] selected [bank name]"
   - Client notified: toast "בחרת בבנק [שם הבנק]. היועץ שלך יצור קשר לשלב הבא." / "You selected [Bank Name]. Your advisor will contact you for the next step."

3. **On Cancel:**
   - Dialog closes, no changes

---

## Buttons

| Button | Location | Action | Enabled Condition |
|---|---|---|---|
| בחר בנק זה / Select this Bank | Per approved bank card | Opens selection confirmation dialog | Enabled only on APPROVED cards when no bank yet selected |
| אשר / Confirm | Selection dialog | Executes bank selection | Always enabled in dialog |
| בטל / Cancel | Selection dialog | Closes dialog with no changes | Always enabled in dialog |
| עברו למסמכים / Go to Documents | Auth letter banner (conditional) | Navigates to Documents tab | Shown only when authorization letters not yet signed |

---

## States

### Locked (docs not yet approved OR no tier)

Full content area replaced by padlock overlay.

- If no tier: "שדרגו את התכנית שלכם לגישה לאישורים עקרוניים" + "שדרג עכשיו" button → tier selection
- If docs not approved: "השלימו את אישור המסמכים כדי לפתוח שלב זה" + "עברו למסמכים" button → Documents tab

---

### All Pending — No Responses Yet

Bank grid shows all cards in PENDING (grey) state.

Info banner below auth letter prompt:

"הבקשה שלך הוגשה לבנקים. נעדכן אותך כאשר נקבל תשובות." / "Your application has been submitted to banks. We will notify you when banks respond."

Animation: subtle pulsing animation on each pending card to indicate "in progress."

---

### Partial Responses

Mix of APPROVED, PENDING, and REJECTED cards. No special banner — grid speaks for itself. "Select" button appears only on APPROVED cards.

---

### All Rejected

All bank cards show REJECTED (red) status.

Alert banner (red/error style) at top of grid:

"לצערנו, כל הבנקים לא אישרו את הבקשה בשלב זה. פנו ליועץ שלכם לבירור אפשרויות." / "Unfortunately, no banks approved your application at this time. Please contact your advisor to explore options."

Contact advisor CTA: links to Messages tab (37-screen-advisor-messages.md) or shows advisor phone number.

---

### Bank Selected

Selected bank card shows "✓ נבחר" badge prominently. Other cards are dimmed. No more selection buttons visible.

A confirmation summary card below the grid:

"בחרת ב[שם הבנק]. היועץ שלך יפנה אליך לתיאום המשך התהליך." / "You selected [Bank Name]. Your advisor will contact you to coordinate next steps."

---

### Real-time updates

Bank card statuses should update:
- On page load (fresh fetch)
- Via polling every 60 seconds (or WebSocket push if implemented in v1)
- Manual "Refresh" icon button available at top-right of bank grid

---

## Navigation

**Incoming paths:**
- 30-screen-personal-area-hub.md → Principal Approval tab click
- 33-screen-documents.md → "Next Step" button
- Alert banner from hub header

**Outgoing paths:**
- "Go to Documents" banner → 33-screen-documents.md
- After BANK_SELECTED: client continues to MORTGAGE_SIGNED stage (offline, coordinated by advisor)
- "Upgrade Now" (locked state) → 46-screen-tier-selection-pricing.md
- Advisor contact CTA (all-rejected state) → 37-screen-advisor-messages.md
