# 40 — Admin Interest Rates

## Purpose
Allows the Admin to set the market interest rates used by the calculation engine for each track type, CPI linkage, and loan term range. Separate tables exist for housing loans (דיור) and all-purpose loans (כל מטרה). Saving any table triggers a background recalculation for all active applications.

## Role Access
Admin only.

## Route
`/admin/interest-rates`  (tab within the Admin shell at `/admin`)

---

## Layout

Dark theme (inherits admin shell). RTL.

**Page structure:**
1. Admin tab bar (Interest Rates tab active)
2. Page header: "ריביות שוק" title + last updated timestamp per table
3. Two table groups side by side:
   - Right panel (50%): "ריביות דיור" (housing)
   - Left panel (50%): "ריביות כל מטרה" (all-purpose)
4. Each panel contains multiple rate tables (one per track type + CPI combination)
5. Prime rate section at bottom of each panel (single-row)

On screens narrower than 1024px, panels stack vertically (right panel on top).

---

## Fields / Components

### Rate Tables — Structure (applies to both housing and all-purpose panels)

Each rate table covers one combination of `(interest_type, cpi_linked)`. The tables within each panel are:

| Table | `interest_type` | `cpi_linked` | Table label (Hebrew) |
|---|---|---|---|
| 1 | קבועה | true | ריבית קבועה צמודה מדד |
| 2 | קבועה | false | ריבית קבועה לא צמודה |
| 3 | משתנה כל 3 שנים | false | ריבית משתנה 3Y לא צמודה |
| 4 | משתנה כל 3 שנים | true | ריבית משתנה 3Y צמודה מדד |
| 5 | משתנה כל 5 שנים | false | ריבית משתנה 5Y לא צמודה |
| 6 | משתנה כל 5 שנים | true | ריבית משתנה 5Y צמודה מדד |

(Prime has its own section — see below.)

### Term Range Rows (within each rate table)

| Row label | `term_min` (years) | `term_max` (years) |
|---|---|---|
| 4–10 שנים | 4 | 10 |
| 11–15 שנים | 11 | 15 |
| 16–20 שנים | 16 | 20 |
| 21–25 שנים | 21 | 25 |
| 26–30 שנים | 26 | 30 |

**Columns per row:**

| Column | Field | Type | Validation |
|---|---|---|---|
| טווח תקופה | `term_range_label` | Display text | Read-only |
| ריבית (%) | `rate` | Decimal input (2dp) | Required. Min 0.01, max 25.0. Warn if > 15%. |
| עודכן לאחרונה | `last_updated_at` | Display timestamp | Read-only; per-cell, shows when this specific rate was last changed |

### Prime Rate Section

Located at the bottom of each panel (housing / all-purpose), separated by a divider.

| Field | Type | Validation | Notes |
|---|---|---|---|
| ריבית פריים (%) | Decimal input (2dp) | Required. Min 0.0, max 25.0. | This is the Bank of Israel base rate. Displayed as "ריבית בנק ישראל: X% + מרווח קבוע = ריבית פריים". The margin is set in the Mix Manager per track; this field sets the BoI base. |
| ריבית פריים אפקטיבית | Computed display | Read-only | Pulled from `SystemParameter.prime_rate`. This panel's field is the raw BoI rate input; `SystemParameter` stores the full prime (BoI + constant 1.5% historically). Note to developer: clarify with admin whether this field stores BoI rate or effective prime — default assumption is effective prime. |

---

### Panel-Level Controls

Each panel (housing / all-purpose) has its own independent controls:

| Control | Placement | Behavior |
|---|---|---|
| "ערוך טבלה" button | Top-right of panel | Activates edit mode for the entire panel (all six rate tables + prime section become editable inputs). Default state is read-only. |
| "שמור שינויים" button | Bottom of panel (visible in edit mode) | Saves all modified rates to the `InterestRate` table in DB; emits `INTEREST_RATES_UPDATED` event; triggers background recalculation; creates AuditLog entry. |
| "בטל" button | Bottom of panel (visible in edit mode) | Reverts all unsaved changes to last saved values; exits edit mode. |
| Last updated timestamp | Below panel title | Format: "עודכן לאחרונה: DD/MM/YYYY HH:mm על ידי [admin name]". Updates after each save. |

---

## Actions

| Action | Precondition | Outcome | Error State |
|---|---|---|---|
| Click "ערוך טבלה" | Always | All rate inputs in panel become editable | — |
| Edit a rate value | Edit mode active | Local state update; effective rate preview recalculates | Invalid (non-numeric, out of range): red border + inline error message |
| Click "שמור שינויים" | Edit mode active; at least one rate changed; all values valid | DB write; AuditLog; background recalculation triggered; exit edit mode; "Last updated" refreshes | If any rate invalid: save blocked, all invalid fields highlighted red with messages |
| Click "בטל" | Edit mode active | All changes reverted; edit mode exits | — |
| Rate value > 15% | Edit mode active | Inline warning icon shown with tooltip "ריבית גבוהה מהרגיל — האם אתה בטוח?" | Does not block save |
| Rate value ≤ 0 | Edit mode active | Inline error "ריבית חייבת להיות חיובית"; save blocked | Red border |
| Save triggers recalculation | Save successful | Toast: "הריביות עודכנו. חישוב מחדש החל עבור X בקשות פעילות." | If recalculation already running: toast "חישוב קודם בתהליך. הריביות ישמרו ויחולו בסיום החישוב הנוכחי." |

---

## Conditional Logic

- **Edit mode isolation:** Editing the housing panel does not affect the all-purpose panel and vice versa. Each panel has its own edit/save/cancel state.

- **Rate inheritance:** In v1, housing and all-purpose rates are stored independently. If an admin saves identical rates to both tables, that is valid and expected.

- **Prime rate interaction:** The prime rate shown in this screen's prime section is the same `SystemParameter.prime_rate` field also shown in screen 41 (Parameters tab). Editing it here updates the same DB record. If both tabs are open simultaneously, the second save wins (last-write-wins in v1; no optimistic lock).

- **Recalculation scope:** Saving rates triggers recalculation for all applications with `state NOT IN (QUESTIONNAIRE_IN_PROGRESS, ACTIVE_MORTGAGE)`. ACTIVE_MORTGAGE applications are NOT recalculated (they use the locked-in rate from signing, not market rates).

- **Read-only for ACTIVE_MORTGAGE:** A tooltip on the "שמור שינויים" button clarifies: "עדכון ריביות ישפיע על חישובים עבור לקוחות בתהליך (לא על משכנתאות פעילות שכבר נלקחו)."

- **No rate for a term range:** All 5 term-range rows per table must be filled before the panel can be saved. Leaving any rate blank blocks save with error "יש למלא את כל הריביות בטבלה."

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Admin saves housing rates while all-purpose panel is in unsaved edit mode | Each panel is independent; no conflict. The unsaved all-purpose changes remain in edit mode. |
| Two admin sessions editing the same panel concurrently | On second save: detect conflict via `updated_at` check. Show error: "הטבלה עודכנה ע"י מנהל אחר. אנא רענן את הדף." Unsaved changes shown as diff for admin to review. |
| Network error during save | Toast: "שגיאה בשמירה. נסה שוב." Edit mode remains open. |
| Rate set to 0% | Blocked: "ריבית חייבת להיות גדולה מ-0" |
| Rate set to exactly 25% | Allowed (at max boundary), no warning |
| Rate set to 25.001% | Blocked: "ריבית מקסימלית 25%" |
| Admin sets all housing rates to match all-purpose rates | Valid; no system warning |
| Recalculation job fails after rate save | Rates are saved successfully. System status indicator (screen 38) shows red error. Admin must re-trigger recalculation manually from screen 38 or 39. |
| Page is loaded with no rates configured (first-time setup) | All cells show placeholder "—" with a prompt banner: "ריביות לא הוגדרו עדיין. לחץ 'ערוך' כדי להגדיר." |

---

## Audit Log

| Action | `action_type` | `entity_type` | `before_value` | `after_value` |
|---|---|---|---|---|
| Save housing rates | `INTEREST_RATES_UPDATED` | `InterestRate` | `{loan_type: "HOUSING", rates: [...old]}` | `{loan_type: "HOUSING", rates: [...new]}` |
| Save all-purpose rates | `INTEREST_RATES_UPDATED` | `InterestRate` | `{loan_type: "ALL_PURPOSE", rates: [...old]}` | `{loan_type: "ALL_PURPOSE", rates: [...new]}` |
| Per-rate row changed | `INTEREST_RATE_ROW_UPDATED` | `InterestRate` | `{type, cpi_linked, term_range, old_rate}` | `{new_rate}` |
| Prime rate changed | `PRIME_RATE_UPDATED` | `SystemParameter` | `{prime_rate: old}` | `{prime_rate: new}` |

All log entries include: `actor_id`, `actor_role=ADMIN`, `timestamp`, `ip_address`.
