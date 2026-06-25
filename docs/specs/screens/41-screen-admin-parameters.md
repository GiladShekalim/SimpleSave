# 41 — Admin System Parameters

## Purpose
Allows the Admin to update the economic parameters that drive all mortgage calculations: CPI forecast, prime rate, and variable rate anchors. Changing any parameter triggers a background recalculation for all in-progress applications. Regulatory limits (financing ratios, payment cap, max age) are displayed read-only for reference.

## Role Access
Admin only.

## Route
`/admin/parameters`  (tab within the Admin shell at `/admin`)

---

## Layout

Dark theme (inherits admin shell). RTL.

**Page structure:**
1. Admin tab bar (Parameters tab active)
2. Two-column layout (60% / 40%):
   - Right column (60%): Editable Parameters Form
   - Left column (40%): Regulatory Limits (read-only reference) + Change Log table

---

## Fields / Components

### Editable Parameters Form

**Section title:** "פרמטרים לחישוב"

All fields are read-only by default. A single "ערוך" button at the top-right of the form activates edit mode for all fields simultaneously.

#### CPI Annual Forecast

| Field | Name | Type | Default | Validation |
|---|---|---|---|---|
| צפי מדד שנתי (%) | `cpi_annual_forecast` | Decimal input (2dp) | 3.00 | Required. Min 0.0, max 20.0. Warn if > 8%: "צפי מדד גבוה מהרגיל — האם אתה בטוח?" |

**Usage note (display-only below field):** "ערך זה משמש לחישוב הצמדה בכל מסלולי הצמדה למדד. עדכון ישפיע על כל הבקשות הפעילות."

#### Prime Rate

| Field | Name | Type | Default | Validation |
|---|---|---|---|---|
| ריבית פריים (%) | `prime_rate` | Decimal input (2dp) | Current BoI rate + 1.5% | Required. Min 0.0, max 20.0. |

**Usage note:** "ריבית הפריים = ריבית בנק ישראל + מרווח קבוע (כרגע 1.5%). יש לעדכן את ריבית הפריים כולה."

**Sync note:** Same field as shown in screen 40 (Interest Rates → Prime section). Last-write-wins.

#### Variable Rate Anchors

Two sub-fields, one per change interval:

| Field | Name | Type | Default | Validation |
|---|---|---|---|---|
| עוגן ריבית משתנה 3Y (%) | `variable_anchor_3y` | Decimal input (2dp) | As configured | Required. Min 0.01, max 20.0. |
| עוגן ריבית משתנה 5Y (%) | `variable_anchor_5y` | Decimal input (2dp) | As configured | Required. Min 0.01, max 20.0. |

**Usage note:** "ריבית משתנה = עוגן + מרווח (מוגדר בתמהיל). עוגן נפוץ: ריבית אג"ח ממשלתי לתקופה המקבילה."

---

### Regulatory Limits (Read-Only Reference Panel)

**Section title:** "גבולות רגולטוריים (לעיון בלבד)"

Not editable. Values come from hardcoded constants that mirror the regulatory config in `01-architecture-overview.md`.

| Parameter | Value | Applies To |
|---|---|---|
| מקסימום מימון — נכס יחיד | 75% | Primary residence loans |
| מקסימום מימון — נכס נוסף | 50% | Additional property loans |
| מקסימום מימון — כל מטרה | 50% מינוס משכנתא קיימת | All-purpose loans |
| מקסימום מימון — שיפור דיור | 70% | Home improvement |
| מקסימום מימון — מחיר למשתכן | 90% (מינימום הון עצמי ₪100,000) | Price-for-residents program |
| יחס החזר מקסימלי | 40% מהכנסה נטו | All loan types |
| גיל מקסימלי לסיום הלוואה | 85 שנים | All borrowers |
| הון עצמי מינימלי — מחיר למשתכן | ₪100,000 | Price-for-residents program |

A small info icon (ⓘ) next to the section title shows tooltip: "ערכים אלה נקבעים ברגולציה של בנק ישראל ואינם ניתנים לעריכה."

---

### Change Log Table

**Section title:** "היסטוריית שינויים"

Located in the right column below the regulatory panel, or below the form on small screens.

Shows last 10 parameter changes, sorted by `changed_at` DESC.

| Column | Source | Format |
|---|---|---|
| תאריך ושעה | `ParameterChangeLog.changed_at` | `DD/MM/YYYY HH:mm` |
| שדה | `ParameterChangeLog.parameter_name` | Hebrew label (e.g., "צפי מדד שנתי") |
| לפני | `ParameterChangeLog.old_value` | Numeric with % suffix |
| אחרי | `ParameterChangeLog.new_value` | Numeric with % suffix |
| שונה ע"י | `ParameterChangeLog.changed_by_name` | Admin display name |

Pagination: shows 10 rows; "הצג עוד" loads next 10.

---

### Form Controls

| Button | Placement | Precondition | Action |
|---|---|---|---|
| "ערוך" | Top-right of Parameters Form | Always visible in read-only mode | Activates edit mode; button replaced by "שמור" + "ביטול" |
| "שמור" | Bottom of form in edit mode | All fields valid | Opens confirmation dialog |
| "ביטול" | Bottom of form in edit mode | Edit mode active | Reverts all changes; returns to read-only mode |

---

### Save Confirmation Dialog

Triggered when admin clicks "שמור" in edit mode.

**Dialog title:** "עדכון פרמטרים"

**Dialog body:**
> "עדכון הפרמטרים יחשב מחדש את X בקשות המשכנתא הפעילות.  
> שינויים שבוצעו:  
> - [list of changed fields with old → new values]  
> האם להמשיך?"

Where `X` is fetched live from the API.

**Buttons:**
- "אישור ועדכון" — writes to `SystemParameter` table; creates `ParameterChangeLog` entry per changed field; emits `PARAMETERS_UPDATED` event; triggers background recalculation; shows toast
- "ביטול" — closes dialog; edit mode remains open

**Post-save toast:** "הפרמטרים עודכנו. חישוב מחדש החל עבור X בקשות."

---

## Actions

| Action | Precondition | Outcome | Error State |
|---|---|---|---|
| Click "ערוך" | Read-only mode | Form becomes editable | — |
| Edit any parameter field | Edit mode | Local state update | Invalid value: red border, inline error |
| Click "שמור" | Edit mode, all fields valid | Confirmation dialog opens | If any field invalid: save button disabled, fields highlighted red |
| Confirm in dialog | — | DB write; change log entries; recalculation triggered; edit mode exits | Network error: toast "שגיאה בשמירה. נסה שוב." |
| Click "ביטול" (form) | Edit mode | All changes reverted | — |
| Click "ביטול" (dialog) | Dialog open | Dialog closes; edit mode persists | — |

---

## Conditional Logic

- **CPI > 8%:** Non-blocking warning displayed inline below the `cpi_annual_forecast` field: "⚠ צפי מדד גבוה מהרגיל. וודא שהנתון עדכני." Admin can still save.

- **CPI = 0:** Allowed (zero inflation scenario). No warning.

- **Prime rate change:** Also updates `SystemParameter.prime_rate` which is referenced by the prime section in screen 40 (Interest Rates). Both screens display the same value.

- **No changes made:** If admin clicks "שמור" with no edits, show toast "לא בוצעו שינויים." and close edit mode without DB write or recalculation.

- **Recalculation already running:** Save still proceeds; recalculation job queues the new parameters to apply after the current job completes. Toast: "פרמטרים נשמרו. הם יחולו בסיום החישוב הנוכחי."

- **Change log display:** Each parameter has its own Hebrew label mapping:
  - `cpi_annual_forecast` → "צפי מדד שנתי"
  - `prime_rate` → "ריבית פריים"
  - `variable_anchor_3y` → "עוגן משתנה 3 שנים"
  - `variable_anchor_5y` → "עוגן משתנה 5 שנים"

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Admin sets CPI to 0% | Allowed. CPI-linked tracks will not grow. No error or warning. |
| Admin sets prime rate to 0% | Allowed (hypothetical scenario). Warning shown: "ריבית פריים 0% — האם הנתון נכון?" Non-blocking. |
| Admin edits parameters while recalculation from a previous save is running | Save proceeds; parameters saved to DB immediately; recalculation uses the latest saved values when it runs |
| Concurrent admin sessions both editing parameters | On second save: conflict detected via `updated_at` check. Error: "הפרמטרים עודכנו ע"י מנהל אחר. אנא רענן את הדף ובדוק את הערכים." |
| No active applications at time of save | Save proceeds normally; recalculation job runs but processes 0 records. Toast still shows success. |
| Change log is empty (first save) | Change log table shows "לא בוצעו שינויים עדיין" placeholder |
| Admin refreshes page mid-edit | All unsaved edits are lost. Browser shows native "leave page?" dialog on refresh. |
| Network timeout during save | Toast: "פסק הזמן עבר. אנא נסה שוב." Edit mode remains open with all field values preserved. |

---

## Audit Log

| Action | `action_type` | `entity_type` | `before_value` | `after_value` |
|---|---|---|---|---|
| CPI updated | `PARAMETER_UPDATED` | `SystemParameter` | `{cpi_annual_forecast: old}` | `{cpi_annual_forecast: new}` |
| Prime rate updated | `PARAMETER_UPDATED` | `SystemParameter` | `{prime_rate: old}` | `{prime_rate: new}` |
| Variable anchor 3Y updated | `PARAMETER_UPDATED` | `SystemParameter` | `{variable_anchor_3y: old}` | `{variable_anchor_3y: new}` |
| Variable anchor 5Y updated | `PARAMETER_UPDATED` | `SystemParameter` | `{variable_anchor_5y: old}` | `{variable_anchor_5y: new}` |
| Recalculation triggered | `RECALCULATION_TRIGGERED` | `System` | `null` | `{reason: "PARAMETERS_UPDATED", affected_count: N}` |

All entries include `actor_id`, `actor_role=ADMIN`, `timestamp`, `ip_address`, `notes` (free text from dialog if provided).
