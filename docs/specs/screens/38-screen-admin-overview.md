# 38 — Admin Dashboard Overview

## Purpose
The primary landing screen after admin login. Provides a real-time summary of system health, lead assignment queue, recent audit activity, and direct navigation to all admin management tabs.

## Role Access
Admin only. Advisor and Client roles are redirected to their respective dashboards at this route.

## Route
`/admin`  (redirect from `/admin/dashboard`)

---

## Layout

Dark theme throughout. Background `#0f1623`. Card surfaces `#1a2235`. Border/divider `#2a3550`. Primary accent `#4f8ef7`. Text primary `#e8ecf4`. Text secondary `#8a9bc0`.

**Direction:** RTL. All flex/grid containers use `direction: rtl`. Text alignment right by default.

**Shell structure (top to bottom):**
1. Top bar — logo (right), admin user name + role badge (center-right), logout button (left)
2. Tab navigation bar — horizontal tabs below top bar: `ניהול תמהיל` | `ריביות שוק` | `פרמטרים` | `לקוחות/לידים` | `יועצים`
3. Content area — this screen is the default view that loads when `/admin` is first accessed; it is NOT one of the five tabs. It acts as a "home" panel shown before any tab is selected. Navigating to any tab replaces the content area.

**Content area (overview screen) is divided into two columns (70% / 30%):**
- Right column (70%): Summary cards row + Unassigned Leads Queue + Recent Activity Feed
- Left column (30%): Quick stats sidebar (advisors online today, system status indicator)

---

## Fields / Components

### Summary Cards Row (4 cards, equal width, RTL order right-to-left)

| Card | Metric | Data Source | Refresh |
|---|---|---|---|
| לידים השבוע | Count of `Application` records created in the last 7 calendar days | `applications.created_at` | On page load; auto-refresh every 60s |
| בקשות פעילות | Count of applications where `state NOT IN (QUESTIONNAIRE_IN_PROGRESS, ACTIVE_MORTGAGE)` | `applications.state` | Same |
| יועצים פעילים | Count of `Advisor` records where `status = ACTIVE` | `advisors.status` | Same |
| לידים ללא שיבוץ | Count of applications where `assigned_advisor_id IS NULL AND state >= REGISTERED` | join `applications` | Same |

Each card:
- Large numeric value (font-size 2.5rem, accent color)
- Hebrew label below
- Small trend indicator: arrow up/down + percentage delta vs previous 7-day window (display-only)
- Card background `#1a2235`, rounded corners 8px, 1px border `#2a3550`

---

### Unassigned Leads Queue

**Title:** "תור לידים ללא שיבוץ"

**Condition:** Displayed only when `unassigned_count > 0`. If zero, shows empty-state card: "אין לידים ממתינים לשיבוץ" with a checkmark icon.

**Table columns (RTL, right-to-left):**

| Column | Source | Notes |
|---|---|---|
| שם לווה ראשי | `Application.primary_borrower.full_name` | Linked — click opens client detail in a new tab |
| טלפון | `Application.primary_borrower.phone` | Masked: `05X-XXX-XXXX` format |
| תאריך הרשמה | `Application.created_at` | Format `DD/MM/YYYY HH:mm` |
| שכבה (Tier) | `Application.tier` | Badge: `שכבה 1` / `שכבה 2` / `שכבה 3`, color-coded (1=grey, 2=blue, 3=gold) |
| שיבוץ יועץ | Action button | "שבץ יועץ" — opens Assign Advisor modal |

**Sort:** Default sort by `created_at` ascending (oldest unassigned first).

**Pagination:** Show first 10 rows. "הצג עוד" button loads next 10.

**Row highlight:** Entire row background `#2a1a10` (amber tint) for rows where `created_at` > 48 hours ago and still unassigned, to flag urgent assignment.

---

### Assign Advisor Modal

Triggered by "שבץ יועץ" button in the queue or anywhere an assignment action is initiated.

**Modal fields:**

| Field | Type | Validation | Notes |
|---|---|---|---|
| Lead name (read-only) | Display text | — | Shows borrower name + tier badge |
| Advisor dropdown | `<select>` | Required | Lists all `status=ACTIVE` advisors. Each option shows: `[Name] — X לקוחות פעילים`. Sorted by active client count ascending (suggest least-loaded advisor first). |
| Notes (optional) | `<textarea>` | Max 500 chars | Internal note attached to the assignment audit entry |

**Buttons:**
- "שבץ" (confirm): writes `assigned_advisor_id`, creates `AuditLog` entry, sends system notification to assigned advisor, closes modal
- "ביטול" (cancel): closes modal, no changes

**Error state:** If no active advisors exist, dropdown shows "אין יועצים פעילים" and the confirm button is disabled with tooltip "יש להוסיף יועץ לפני השיבוץ".

---

### Recent Activity Feed

**Title:** "פעילות אחרונה"

**Source:** `AuditLog` table, last 20 entries, sorted `created_at` DESC.

**Feed item format:**
```
[timestamp] [actor_role badge] [actor_name] — [action_description]
```

Examples:
- `14:32 | מנהל | ישראל ישראלי — עדכן ריבית קבועה צמודה 20-25 שנים ל-4.2%`
- `13:55 | יועץ | רחל כהן — אישרה מסמך תלוש שכר עבור [client name]`
- `13:10 | לקוח | דוד לוי — העלה מסמך תעודת זהות`

**Timestamp:** Relative if < 1 hour ("לפני 23 דקות"), absolute HH:mm if same day, `DD/MM` if prior day.

**Feed item row:** Right border colored strip by actor role (Admin=red, Advisor=blue, Client=green). Entire row is a link — clicking opens the relevant entity (application, parameter, advisor, etc.).

---

### Quick Stats Sidebar (left 30%)

**Advisors section:**
- List of all active advisors with their current active client count
- Each row: avatar initial circle, name, client count badge
- "הוסף יועץ" shortcut button (navigates to Advisors tab → Add Advisor form)

**System status indicator:**
- Green dot + "מערכת תקינה" if last background calculation job ran within 30 minutes
- Yellow dot + "חישוב מחדש בתהליך..." if recalculation job is currently running
- Red dot + "שגיאה בחישוב — בדוק לוגים" if last job failed; shows timestamp of failure

---

## Actions

### Tab Navigation

| Tab label | Target route | Notes |
|---|---|---|
| ניהול תמהיל | `/admin/mix-manager` | See screen 39 |
| ריביות שוק | `/admin/interest-rates` | See screen 40 |
| פרמטרים | `/admin/parameters` | See screen 41 |
| לקוחות/לידים | `/admin/clients` | See screen 42 |
| יועצים | `/admin/advisors` | See screen 43 |

Active tab is highlighted with bottom border accent color `#4f8ef7`.

### Logout
- Clears session token, redirects to `/` (home screen)
- No confirmation dialog

### Auto-refresh
- Summary cards and unassigned queue refresh every 60 seconds via polling (not WebSocket in v1)
- A subtle "עודכן לאחרונה: 14:35:22" timestamp shows below the cards

---

## Conditional Logic

- If `application.tier == 1`: "שבץ יועץ" button label changes to "שבץ אנליסט" (tier 1 is self-service but admin may still assign a support contact)
- If `application.state == QUESTIONNAIRE_IN_PROGRESS`: the lead does NOT appear in the unassigned queue (user has not yet registered; not yet a lead)
- If `application.state >= REGISTERED AND assigned_advisor_id IS NULL`: lead appears in unassigned queue
- If admin has the Assign Advisor modal open and another admin assigns the same lead concurrently (detected on confirm): show conflict error "ליד זה שובץ כבר ע"י מנהל אחר. רענן את הדף."
- Summary card "לידים השבוע" counts regardless of tier or state (any new registration this week)

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Zero unassigned leads | Unassigned queue section shows empty state illustration + "מצוין! כל הלידים משובצים." |
| All advisors inactive | Assign Advisor modal shows warning banner "כל היועצים מושבתים. לא ניתן לשבץ." with link to add a new advisor |
| Admin session expires mid-view | On next API call, 401 is returned; client redirects to `/login?reason=session_expired` with Hebrew message |
| Audit feed has no entries yet | Shows "אין פעילות עדיין" placeholder |
| Background recalculation takes > 5 minutes | System status badge shows yellow "חישוב בתהליך" for the duration; no user action required |
| Admin navigates to tab then presses browser back | Returns to overview screen (not browser history back to prior page) |
| Screen width < 768px (tablet) | Two-column layout collapses to single column. Summary cards wrap to 2×2 grid. |

---

## Audit Log

Every action on this screen that changes system state is logged to the `AuditLog` table with:
- `actor_id` (admin user ID)
- `actor_role` = `ADMIN`
- `action_type`
- `entity_type` + `entity_id`
- `before_value` / `after_value` (JSON)
- `timestamp`
- `ip_address`
- `notes` (free text, optional)

| Action | `action_type` | `entity_type` |
|---|---|---|
| Assign advisor to lead | `ADVISOR_ASSIGNED` | `Application` |
| Admin logout | `LOGOUT` | `AdminUser` |
