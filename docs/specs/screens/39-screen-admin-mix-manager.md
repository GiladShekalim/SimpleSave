# 39 — Admin Mix Manager

## Purpose
Allows the Admin to configure the five mortgage mix "clocks" (תמהילים). Each clock is a named preset mix of up to 10 tracks shown to all users on the Options screen. Changes here propagate to all active application calculations via a background recalculation job.

## Role Access
Admin only.

## Route
`/admin/mix-manager`  (tab within the Admin shell at `/admin`)

---

## Layout

Dark theme (inherits admin shell: `#0f1623` background, `#1a2235` card surfaces). RTL.

**Page structure:**
1. Tab bar (admin shell tabs — Mix Manager is the active tab)
2. Page header: title "ניהול תמהיל" + "חשב מחדש לכל הלקוחות" button (top-left, danger-styled)
3. Five clock panels stacked vertically, each collapsible

**Clock panel layout:**
- Header row: clock number badge (`שעון 1`…`שעון 5`), clock name (editable inline), total tracks count, collapse/expand chevron
- Expanded body: tracks table + "הוסף מסלול" button + mix-total validation indicator

---

## Fields / Components

### Clock Panel Header

| Field | Type | Validation | Notes |
|---|---|---|---|
| Clock number | Display badge (1–5) | Read-only | Fixed identifiers, not reorderable |
| Clock name | Inline text input | Max 40 chars, required | Default: "תמהיל [N]". Editable on click. |
| Tracks count | Display text | — | "X מסלולים" |
| Mix % total | Display badge | Must equal 100% | Green if 100%, red with value if not |

### Tracks Table (inside each expanded clock panel)

One row per track. Columns (RTL, right to left):

| Column | Field name | Type | Validation |
|---|---|---|---|
| # | `track_number` | Auto-increment display | Read-only |
| סוג ריבית | `interest_type` | Dropdown: `קבועה` / `משתנה` / `פריים` | Required |
| צמוד מדד | `cpi_linked` | Checkbox / Toggle | Disabled (forced OFF) if `interest_type = פריים` |
| תדירות שינוי (שנים) | `change_interval_years` | Dropdown: `3` / `5` | Shown only if `interest_type = משתנה`. Hidden otherwise. |
| תקופה (שנים) | `term_years` | Number input | Min 4, max 30. For `משתנה`: must be a multiple of `change_interval_years` and min 6. |
| % מהתמהיל | `mix_percentage` | Number input (0.1 precision) | Min 0.1, max 99.9. All tracks within a clock must sum to exactly 100.0. |
| שיטת פירעון | `amortization_method` | Dropdown: `שפיצר` / `קרן שווה` | Required |
| ריבית עוגן (%) | `anchor_rate` | Decimal input (2dp) | Min 0.01, max 25.0. For `פריים`: read from SystemParameter `prime_rate`; field is read-only. |
| מרווח (%) | `margin` | Decimal input (2dp) | Min 0.0, max 10.0. For `קבועה`: `margin = 0` (only anchor used); field is read-only and shows 0. For `פריים`: fixed margin, editable. |
| ריבית אפקטיבית (%) | `effective_rate` | Computed display | `anchor_rate + margin`. Updates in real time as user edits. |
| תשלום חודשי לדוגמה | `sample_monthly` | Computed display | Spitzer calculation on a sample ₪1,000,000 loan for the track's `term_years` and `effective_rate`. Shown in ₪ with thousands separator. Updates on blur of any input field. |
| פעולות | — | Two icon buttons | Remove track (trash icon); drag handle for reorder |

**Edit mode:** Rows are editable in-place at all times (no separate "edit mode" toggle needed for the table). Changes are held in local component state until "שמור שעון" is clicked per clock.

### Per-Clock Buttons

| Button | Placement | Precondition | Action |
|---|---|---|---|
| הוסף מסלול | Below table, right-aligned | `track_count < 10` | Appends a new row with default values: `קבועה`, no CPI, term 20y, %=0, שפיצר, anchor=3.5%, margin=0 |
| שמור שעון | Below table, primary style | Mix % must equal 100.0% | Saves clock to DB; creates AuditLog entry; triggers recalculation event |
| בטל שינויים | Below table, secondary style | Unsaved changes exist | Reverts all unsaved edits to last saved state |

### Remove Track Button (per row)

- **Precondition:** `track_count > 1` (cannot remove the last track in a clock)
- **Action on click:** Opens inline confirmation banner within the clock panel: "למחוק מסלול זה? פעולה זו תשפיע על כל הלקוחות המשויכים לשעון זה." with "מחק" (confirm) and "ביטול" buttons.
- Confirmed deletion removes the row from state; clock's % total is immediately re-evaluated.

---

### "חשב מחדש לכל הלקוחות" Button

Located in the page header, styled with `color: #e85c4a` (warning red) and a border.

**Precondition:** At least one clock has unsaved changes OR admin explicitly wants to force-propagate current saved parameters.

**On click:** Opens confirmation dialog modal:

> "חישוב מחדש יופעל עבור X בקשות פעילות. פעולה זו עלולה לארוך מספר דקות.  
> האם להמשיך?"

Where `X` is a real-time count fetched from the API (`applications.state NOT IN (QUESTIONNAIRE_IN_PROGRESS, ACTIVE_MORTGAGE)`).

**Modal buttons:**
- "כן, חשב מחדש" — triggers background recalculation job, disables the button with spinner + "מחשב..." label, creates `AuditLog` entry `RECALCULATION_TRIGGERED`
- "ביטול" — closes modal

**After trigger:** A dismissable toast notification: "החישוב מחדש החל. ניתן לעקוב אחר ההתקדמות בסטטוס המערכת."

---

## Actions

| Action | Precondition | Outcome | Error State |
|---|---|---|---|
| Edit clock name | Always available | Saves on blur if valid | If blank: revert to previous name + red border |
| Add track | `track_count < 10` | New row added to bottom of table | If 10 tracks exist: button disabled, tooltip "עד 10 מסלולים לשעון" |
| Remove track | `track_count > 1` | Inline confirmation shown | If only 1 track: button disabled, tooltip "נדרש לפחות מסלול אחד" |
| Save clock | Mix % total = 100.0% | Persists to DB; AuditLog; recalculation event | If % ≠ 100: save button disabled, red badge showing current total (e.g., "97.5%") |
| Cancel changes | Unsaved changes exist | Reverts state; no DB write | — |
| Recalculate all | Always available | Background job triggered | If job already running: button disabled, tooltip "חישוב בתהליך, אנא המתן" |
| Collapse/expand clock | Always | Toggles panel height | — |
| Reorder tracks | Drag handle | Updates `track_number` sequence in local state; saved on "שמור שעון" | — |

---

## Conditional Logic

- `interest_type = פריים`:
  - `cpi_linked` checkbox is forced to `false` and disabled with tooltip "מסלול פריים אינו צמוד מדד"
  - `change_interval_years` field is hidden
  - `anchor_rate` is read from `SystemParameter.prime_rate`, displayed read-only
  - `margin` is editable (this is the spread over prime)

- `interest_type = קבועה`:
  - `change_interval_years` field is hidden
  - `margin` is locked to 0 and shown read-only
  - `anchor_rate` is the full fixed rate

- `interest_type = משתנה`:
  - `change_interval_years` is shown (dropdown 3y or 5y)
  - `term_years` must be a multiple of `change_interval_years`: validate on blur; show inline error "התקופה חייבת להיות כפולה של תדירות השינוי"
  - `term_years` minimum is 6 years

- Mix % total:
  - Recalculated in real time as user edits any track's `mix_percentage`
  - "שמור שעון" button disabled when total ≠ 100.0%
  - Badge color: green (#22c55e) when = 100.0%, red (#e85c4a) otherwise

- `effective_rate`:
  - Recomputed on any change to `anchor_rate` or `margin`
  - If effective rate > 15%: show inline warning icon with tooltip "ריבית גבוהה מ-15% — אנא ודא שהנתון נכון"

- `sample_monthly` preview:
  - Uses ₪1,000,000 reference principal, client's actual principal is NOT used here
  - Recalculates on blur of `term_years`, `effective_rate`, `amortization_method`
  - For `קרן שווה`: shows first-month payment (highest)
  - For `שפיצר`: shows constant monthly payment

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Admin sets all 5 tracks of a clock to the same type | No restriction — system allows any valid combination |
| Two tracks in same clock have the same type, interval, and term | Allowed; no uniqueness constraint on track combination within a clock |
| Admin saves a clock while background recalculation is running | Save is allowed; recalculation picks up the new values on its next pass (or admin can re-trigger after save) |
| `prime_rate` changes in Parameters tab while Mix Manager is open | `anchor_rate` for prime tracks updates on next page load or manual refresh; inline warning "ריבית הפריים עודכנה. יש לרענן את הדף." |
| Admin tries to delete a clock entirely | No delete-clock action exists; clocks are always 5. Admin can set all tracks to a single track with 100% to effectively neutralize a clock. |
| Sample monthly payment would be NaN (e.g., term = 0) | Shows "—" dash instead of a number; does not throw an error |
| Browser tab is closed with unsaved changes | On `beforeunload`: browser shows native "leave page?" dialog (no custom handling needed in v1) |
| Network error on save | Toast: "שגיאה בשמירה. נסה שוב." with retry button. State is preserved. |

---

## Audit Log

Every state-changing action creates an `AuditLog` entry:

| Action | `action_type` | `entity_type` | `before_value` | `after_value` |
|---|---|---|---|---|
| Clock name changed | `MIX_CLOCK_NAME_UPDATED` | `MixClock` | `{name: "old"}` | `{name: "new"}` |
| Track added | `MIX_TRACK_ADDED` | `MixTrack` | `null` | `{full track JSON}` |
| Track removed | `MIX_TRACK_REMOVED` | `MixTrack` | `{full track JSON}` | `null` |
| Track field updated | `MIX_TRACK_UPDATED` | `MixTrack` | `{field: old_value}` | `{field: new_value}` |
| Clock saved | `MIX_CLOCK_SAVED` | `MixClock` | `{tracks: [...old]}` | `{tracks: [...new]}` |
| Recalculation triggered | `RECALCULATION_TRIGGERED` | `System` | `null` | `{affected_count: N, triggered_by: admin_id}` |
