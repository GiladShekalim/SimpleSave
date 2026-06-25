# 42 — Admin Clients and Leads

## Purpose
Provides the Admin with a complete view of all leads and clients across the system, with tools to filter, search, assign advisors, reassign advisors, and navigate to any application's full detail view. Every new registered lead lands here first for assignment.

## Role Access
Admin only.

## Route
`/admin/clients`  (tab within the Admin shell at `/admin`)

---

## Layout

Dark theme (inherits admin shell). RTL.

**Page structure:**
1. Admin tab bar (לקוחות/לידים tab active)
2. Page header: "לקוחות ולידים" title + row count badge + "ייצוא CSV" button (top-left)
3. Filter bar (horizontal, below header)
4. Leads/clients table (main content)
5. Pagination controls (bottom)

---

## Fields / Components

### Filter Bar

Filters operate in combination (AND logic). Updating any filter immediately re-fetches the table (debounced 300ms on text inputs).

| Filter | Type | Options / Behavior |
|---|---|---|
| סטטוס | Dropdown (single select) | Options: `הכל` / `לפני תהליך` (states: REGISTERED, TIER_SELECTED, PERSONAL_DETAILS_COMPLETE, AUTHORIZATION_SIGNED) / `בתהליך` (states: DOCUMENTS_SUBMITTED through BANK_SELECTED) / `אחרי תהליך` (states: MORTGAGE_SIGNED through ACTIVE_MORTGAGE). Default: `הכל` |
| שכבה | Dropdown (single select) | Options: `הכל` / `שכבה 1` / `שכבה 2` / `שכבה 3`. Default: `הכל` |
| יועץ | Dropdown (single select) | Options: `הכל` + list of active advisors by name + `ללא שיבוץ` (shows unassigned only). Default: `הכל` |
| חיפוש | Text input | Searches across: borrower full name, phone number. Min 2 chars to trigger search. Placeholder: "חיפוש לפי שם או טלפון..." |
| איפוס | Button | Clears all filters and returns to default view |

---

### Leads/Clients Table

**Default sort:** `last_activity_at` DESC (most recently active first). Sort is user-changeable by clicking column headers.

**Row highlight rule:** Rows where `assigned_advisor_id IS NULL` have a left border stripe `#f59e0b` (amber) and row background `#1e1a10` (subtle amber tint).

| Column | Source | Format | Sortable |
|---|---|---|---|
| שם | `Application.primary_borrower.full_name` | Text. Link — click navigates to client detail view | Yes |
| טלפון | `Application.primary_borrower.phone` | Masked: `05X-XXX-XXXX`. Click-to-copy on hover. | No |
| אימייל | `Application.primary_borrower.email` | Truncated at 30 chars with tooltip | No |
| תאריך הרשמה | `Application.registered_at` | `DD/MM/YYYY` | Yes |
| שכבה | `Application.tier` | Badge: שכבה 1 (grey) / שכבה 2 (blue) / שכבה 3 (gold) | Yes |
| סטטוס | `Application.state` | Hebrew state label badge (see state machine in architecture doc) | Yes |
| יועץ משובץ | `Application.assigned_advisor.full_name` | Text, or "ללא שיבוץ" badge (amber) if null | Yes |
| פעילות אחרונה | `Application.last_activity_at` | Relative time (e.g., "לפני 3 שעות") or `DD/MM/YYYY` if > 24h | Yes |
| פעולות | — | Action buttons (see below) | No |

**Table density:** 25 rows per page. Row height 52px.

---

### Actions Per Row

| Button / Action | Label | Precondition | Behavior |
|---|---|---|---|
| Assign Advisor | "שבץ יועץ" | `assigned_advisor_id IS NULL` | Opens Assign Advisor modal |
| Change Advisor | "החלף יועץ" | `assigned_advisor_id IS NOT NULL` | Opens Change Advisor modal (same UI as Assign, but shows current advisor) |
| View Application | "צפה בבקשה" | Always | Navigates to full client detail view (read-only for unassigned leads) |

Actions are shown as a compact button group (3 buttons visible; "View Application" is always shown; Assign/Change are mutually exclusive).

---

### Assign Advisor Modal

Shared component also used from screen 38.

**Modal title:** "שיבוץ יועץ" / "החלפת יועץ"

| Field | Type | Validation | Notes |
|---|---|---|---|
| Lead name + tier (read-only) | Display | — | Header of modal: "[Name] — שכבה [N]" |
| Current advisor (for Change flow) | Display text | — | "יועץ נוכחי: [Name]". Not shown in Assign flow. |
| Select advisor | `<select>` dropdown | Required | Lists all `status=ACTIVE` advisors. Each option: "[Name] — X לקוחות פעילים". Sorted by active client count ASC. |
| Reason for change (for Change flow) | `<textarea>` | Optional, max 500 chars | "סיבת החלפה (אופציונלי)" — attached to audit log |

**Buttons:**
- "שבץ" / "החלף" (confirm): saves `assigned_advisor_id`; notifies new advisor via system notification; creates AuditLog entry; closes modal; table row updates immediately
- "ביטול": closes modal with no changes

**Tier 3 warning on Change:** If the current application `tier == 3` AND there are upcoming calendar sessions (`CalendarSession.state = SCHEDULED AND session_date > NOW()`): shows warning banner inside modal: "ליד זה יש פגישות מתוזמנות עם היועץ הנוכחי. יש לבטל או להעביר את הפגישות ידנית לאחר ההחלפה." Admin can still proceed.

---

### Export CSV

**Button:** "ייצוא CSV" — top-right of page header.

**Behavior:** Exports the current filtered result set (all pages, not just current page) as a UTF-8 with BOM CSV file (for Hebrew compatibility in Excel).

**CSV columns:** שם, טלפון, אימייל, תאריך הרשמה, שכבה, סטטוס, יועץ משובץ, פעילות אחרונה.

**Phone in CSV:** Shown unmasked.

**Filename:** `leads_export_YYYY-MM-DD.csv`.

---

### Pagination Controls

- "הקודם" / "הבא" navigation buttons
- Page number indicator: "עמוד X מתוך Y"
- "25 שורות בעמוד" — fixed, not configurable in v1

---

### Click Row → Client Detail View

Clicking anywhere on a row (except buttons) navigates to the full client detail view.

- If `assigned_advisor_id IS NOT NULL`: opens screen 45 (Advisor Client Detail) in admin read-write mode
- If `assigned_advisor_id IS NULL`: opens screen 45 in admin read-only mode with banner: "ליד זה אינו משובץ ליועץ. לביצוע פעולות, יש לשבץ יועץ תחילה."

---

## Conditional Logic

- **Unassigned row highlight:** All rows with `assigned_advisor_id IS NULL` receive amber row styling (border + background tint) regardless of filter state.

- **"שבץ יועץ" vs "החלף יועץ":** Mutually exclusive based on `assigned_advisor_id IS NULL`. Only one button is shown per row.

- **Filter "ללא שיבוץ":** Shows only rows where `assigned_advisor_id IS NULL`. The amber row styling is redundant in this filtered view but still applied for consistency.

- **Filter "לפני תהליך" / "בתהליך" / "אחרי תהליך":** Maps to specific states from the 15-state machine (see architecture overview). Applications in `QUESTIONNAIRE_IN_PROGRESS` are NOT shown in this table (they are not yet registered leads).

- **Advisor filter:** Selecting a specific advisor shows only their clients. Useful for reviewing workload before reassigning.

- **Tier 3 + calendar warning:** Shown in Change Advisor modal only when `tier == 3 AND scheduled_sessions_count > 0`.

- **"View Application" for unassigned:** Admin can view the application in read-only mode but cannot edit data or advance state until an advisor is assigned.

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| All leads are assigned | No amber rows. "ללא שיבוץ" filter returns empty table with "אין לידים ללא שיבוץ" message. |
| Table has 0 rows matching filters | Empty state: "לא נמצאו תוצאות עבור הסינון שנבחר." with "איפוס פילטרים" link. |
| Advisor selected for assignment is deactivated after modal opens | On submit: API returns 400 "יועץ לא פעיל". Show error in modal: "היועץ שנבחר הושבת. אנא בחר יועץ אחר." Keep modal open. |
| Admin exports CSV with active search filter containing 5,000+ rows | Export proceeds server-side. Download starts when ready. A loading spinner replaces the export button during generation. |
| Lead is re-assigned while admin has the row in view (another session) | On next table refresh (60s auto-refresh), the row updates. No optimistic conflict handling in v1. |
| Application state changes while admin views the table | Auto-refresh every 60s updates state badges without full page reload. |
| Phone search with partial number (e.g., "054") | Returns all clients whose phone starts with "054". Server-side LIKE `%054%` search. |
| Multiple borrowers on one application | Table always shows `primary_borrower`. Secondary borrowers are visible in the client detail view. |
| Admin changes advisor for a lead in DOCUMENTS_SUBMITTED state | Allowed with no additional restrictions beyond the Tier 3 calendar warning. AuditLog records the change. |

---

## Audit Log

| Action | `action_type` | `entity_type` | `before_value` | `after_value` |
|---|---|---|---|---|
| Assign advisor | `ADVISOR_ASSIGNED` | `Application` | `{advisor_id: null}` | `{advisor_id: new_advisor_id, advisor_name: "..."}` |
| Change advisor | `ADVISOR_REASSIGNED` | `Application` | `{advisor_id: old_id, advisor_name: "..."}` | `{advisor_id: new_id, advisor_name: "...", reason: "..."}` |
| Export CSV | `LEADS_EXPORTED_CSV` | `AdminUser` | `null` | `{filter_state: "...", filter_tier: "...", filter_advisor: "...", row_count: N}` |

All entries include `actor_id`, `actor_role=ADMIN`, `timestamp`, `ip_address`.
