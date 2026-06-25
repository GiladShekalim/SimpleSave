# Screen 35 — Collaterals Tab

## Purpose

Track post-signing collateral requirements imposed by the selected bank after mortgage signing. The advisor manages collateral items (add, update status). The client views the checklist in read-only mode and tracks progress toward COLLATERALS_COMPLETE status, which triggers ACTIVE_MORTGAGE.

---

## Who Sees This / Access

- Authenticated clients (any tier, including no tier)
- **Locked** until lifecycle status = MORTGAGE_SIGNED
- Client view is read-only — clients cannot create or edit items
- Advisors have full edit access in the client detail view in the advisor dashboard
- Client with no tier: same lock applies (lifecycle-based, not tier-based)

---

## Layout Overview

Content area from top to bottom:
1. Locked overlay (if status < MORTGAGE_SIGNED) — replaces everything below
2. Section header with progress indicator
3. Collateral item list (checklist)
4. Completion success state (after COLLATERALS_COMPLETE)

---

## Sections / Components

### Progress Indicator

Shown below the section title header.

| Element | Details |
|---|---|
| Text | "X מתוך Y בטחונות הושלמו" / "X of Y collaterals complete" |
| Progress bar | Fill = X / Y × 100%, same color scheme as Documents tab |
| Color | Red < 50%, Amber 50–99%, Green = 100% |

---

### Collateral Item Row (Client View)

Read-only list. Each row:

| Element | Details |
|---|---|
| Description | Hebrew text of the collateral requirement (entered by advisor). E.g. "ביטוח חיים — נדרש לחתום על טופס הצהרת בריאות" |
| Status badge | see Status badge values below |
| ⓘ Info button | Shown IF advisor added a tooltip explanation. On click: popover with advisory note. |

**Status badge values:**

| Status | Hebrew Label | Visual |
|---|---|---|
| PENDING | ממתין | Grey badge |
| SUBMITTED | הוגש | Blue badge |
| APPROVED | אושר | Green badge |

No action buttons for client — entirely read-only.

---

### Collateral Item Row (Advisor View)

Rendered in the advisor's client detail panel for this application. Identical to client row plus:

| Element | Details |
|---|---|
| Edit status button | Dropdown or segmented control to change status: Pending → Submitted → Approved (one-directional; advisor can also revert) |
| Edit description button | Opens inline text editor for the description |
| Add tooltip button | Opens text input to add/edit the optional client-facing explanation |
| Delete button | "מחק" / Delete — visible and enabled only when status = PENDING. Confirmation dialog before delete. |

**"+ הוסף בטחון" / "Add Collateral" button (Advisor only):**

Shown at the bottom of the collateral list in advisor view.

On click: opens a dialog with:
- Description field (Hebrew text, required, max 200 chars)
- Initial status selector (default: Pending)
- Optional tooltip explanation field
- Save / Cancel buttons

---

### Completion Auto-Trigger

When all collateral items have status = APPROVED:
- Server-side: lifecycle status updates COLLATERALS_COMPLETE → then immediately ACTIVE_MORTGAGE
- Client receives in-app notification: "כל הבטחונות הושלמו — המשכנתא שלך פעילה!"
- Tab content transforms to "completed archive" read-only state (see Completion state below)
- My Mortgage tab (36) becomes unlocked

---

## Buttons

### Client-facing

No interactive buttons on collateral rows (read-only).

### Advisor-facing (in advisor dashboard)

| Button | Action | Conditions |
|---|---|---|
| Status change control | Updates item status | Always enabled per item |
| ערוך תיאור / Edit Description | Opens inline editor | Always enabled per item |
| הוסף הסבר / Add Tooltip | Opens popover text input | Always enabled per item |
| מחק / Delete | Removes item after confirmation | Enabled only when status = PENDING |
| + הוסף בטחון / Add Collateral | Opens add-item dialog | Always enabled in advisor view |

---

## States

### Locked (before MORTGAGE_SIGNED)

Full content area replaced by padlock overlay.

| Element | Content |
|---|---|
| Padlock icon | Large, centered |
| Message | "השלימו את שלבי התהליך הקודמים כדי לפתוח את שלב הבטחונות" / "Complete previous process steps to unlock the collaterals stage" |
| Sub-text | "שלב זה נפתח לאחר חתימת חוזה המשכנתא" / "This stage opens after mortgage signing" |

No CTA button — lifecycle is controlled by advisor, not client action.

---

### Active — No Items Yet

Advisor has not yet added any collateral items.

| Element | Content |
|---|---|
| Illustration | Empty-state illustration |
| Message | "היועץ שלך יוסיף כאן את הבטחונות הנדרשים." / "Your advisor will add the required collaterals here." |
| Progress indicator | "0 מתוך 0 בטחונות" |

---

### Active — Items Present

Standard checklist rendering. Items can be in any mix of PENDING / SUBMITTED / APPROVED statuses.

---

### Completion State (COLLATERALS_COMPLETE / ACTIVE_MORTGAGE)

Entire tab transforms:
- Progress bar turns fully green with checkmark: "✓ כל הבטחונות הושלמו"
- Success banner (green): "המשכנתא שלך פעילה! כל הבטחונות אושרו בהצלחה." / "Your mortgage is now active! All collaterals have been approved."
- All items show green "Approved" badges
- No edit controls visible (fully archived, read-only even for advisor)
- CTA at bottom: "עבור ללוח המחוונים שלי" / "Go to My Mortgage Dashboard" → My Mortgage tab (36-screen-post-mortgage-dashboard.md)

---

## Navigation

**Incoming paths:**
- 30-screen-personal-area-hub.md → Collaterals tab click (only accessible after MORTGAGE_SIGNED)

**Outgoing paths:**
- "Go to My Mortgage Dashboard" CTA (completion state) → 36-screen-post-mortgage-dashboard.md
- No other outgoing navigation from this tab
