# 44 — Advisor Dashboard

## Purpose
The primary landing screen for advisors after login. Provides a filtered view of all assigned clients sorted by urgency (nearest upcoming action, then unread messages), plus a personal task management list for self-organized follow-ups.

## Role Access
Advisor only. Admin and Client roles are redirected to their respective dashboards.

## Route
`/advisor`  (redirect from `/advisor/dashboard`)

---

## Layout

Dark theme matching the admin shell (consistent design across all staff-facing screens). Background `#0f1623`, card surfaces `#1a2235`. RTL throughout.

**Shell structure:**
1. Top bar: logo (right), advisor's name + "יועץ" role badge (center-right), logout button (left)
2. Tab navigation: "הלקוחות שלי" | "משימות" | (notification badge on "הלקוחות שלי" for unread messages)
3. Content area: renders the active tab

**Default tab:** "הלקוחות שלי" is active on first load.

---

## Fields / Components

---

### Tab 1: "הלקוחות שלי" (My Clients)

#### Filter Bar

| Filter | Type | Options | Default |
|---|---|---|---|
| סטטוס | Dropdown | `הכל` / `לפני תהליך` / `בתהליך` / `אחרי תהליך` | `הכל` |
| חיפוש | Text input | Search by client name or phone | Empty |
| איפוס | Button | Clears all filters | — |

Filters apply in real time (debounced 300ms on text).

- "לפני תהליך": `state IN (REGISTERED, TIER_SELECTED, PERSONAL_DETAILS_COMPLETE, AUTHORIZATION_SIGNED)`
- "בתהליך": `state IN (DOCUMENTS_SUBMITTED, DOCUMENTS_APPROVED, PRINCIPAL_APPROVAL_REQUESTED, PRINCIPAL_APPROVAL_RECEIVED, BANK_SELECTED)`
- "אחרי תהליך": `state IN (MORTGAGE_SIGNED, COLLATERALS_PENDING, COLLATERALS_COMPLETE, ACTIVE_MORTGAGE)`

#### Client Cards

Displayed as a vertical list of cards (not a table), one card per assigned application.

**Sort order (fixed, not user-changeable):**
1. Primary: clients with a scheduled action/meeting date (`next_action_at`) — sorted by `next_action_at` ASC (nearest first)
2. Secondary among clients without a scheduled action: clients with `unread_message_count > 0` sorted by most recent message DESC
3. Tertiary: all remaining clients sorted by `last_activity_at` DESC

**Card fields:**

| Field | Source | Display |
|---|---|---|
| שם לקוח | `Application.primary_borrower.full_name` | Bold, large text. Clickable — opens screen 45. |
| טלפון | `Application.primary_borrower.phone` | `05X-XXX-XXXX` |
| שכבה | `Application.tier` | Badge: שכבה 1 (grey) / שכבה 2 (blue) / שכבה 3 (gold) |
| סטטוס | `Application.state` | Hebrew state badge (color-coded, see conditional logic) |
| פעולה הבאה | `Application.next_action_at` | "פגישה ב-DD/MM בשעה HH:mm" or "אין פעולה מתוזמנת" |
| הודעות שלא נקראו | `Message.unread_advisor_count` | Orange badge with count. Hidden if 0. |
| פעילות אחרונה | `Application.last_activity_at` | Relative or absolute timestamp |

**Card visual hierarchy:**
- Cards with `next_action_at < NOW() + 24h` (imminent): gold left border highlight
- Cards with `unread_message_count > 0`: blue left border highlight
- All other cards: no highlight

**Clicking a card:** Navigates to screen 45 (Advisor Client Detail).

#### Empty State

If advisor has no assigned clients: illustration + "אין לקוחות משובצים אליך עדיין. פנה למנהל לשיבוץ לקוחות."

#### Client Count Badge

Below the "הלקוחות שלי" tab label: "(X)" where X = total count matching current filter.

#### Unread Messages Badge

On the "הלקוחות שלי" tab label: a red notification dot badge showing total unread messages across ALL advisor's clients. Disappears when count reaches 0.

---

### Tab 2: "משימות" (Tasks)

A personal to-do list for the advisor. Not linked to the state machine — these are reminder/note tasks the advisor creates for themselves.

#### Sub-Filter Bar

| Filter | Type | Options | Default |
|---|---|---|---|
| טווח | Dropdown | `היום` / `השבוע` / `כל הפתוחות` / `הושלמו` | `כל הפתוחות` |
| לקוח מקושר | Dropdown | List of advisor's clients + "ללא קישור" + "הכל" | `הכל` |

#### Task List

Cards or rows, sorted by: incomplete first (by `due_date` ASC), then completed (by `completed_at` DESC).

**Task fields:**

| Field | Source | Display |
|---|---|---|
| כותרת | `Task.title` | Bold text. Strikethrough if status=DONE. |
| לקוח מקושר | `Task.linked_application_id` | Client name link (if linked), or "—" if standalone |
| תאריך יעד | `Task.due_date` | `DD/MM/YYYY`. Shown in red if past due and still OPEN. |
| עדיפות | `Task.priority` | Badge: "נמוכה" (grey) / "בינונית" (yellow) / "גבוהה" (red) |
| סטטוס | `Task.status` | Toggle checkbox: open (unchecked) / done (checked) |
| פעולות | — | Edit icon, Delete icon |

#### Add Task Button

"+ הוסף משימה" — opens an inline form (or modal) at the top of the task list.

**Add Task Form fields:**

| Field | Type | Validation |
|---|---|---|
| כותרת | Text input | Required. Max 200 chars. |
| לקוח מקושר | Dropdown (optional) | List of advisor's clients + "ללא קישור" |
| תאריך יעד | Date picker | Optional. Cannot be in the past (warn if past date selected, but not blocked). |
| עדיפות | Dropdown | Options: נמוכה / בינונית / גבוהה. Default: בינונית. |

**Save behavior:** POST to tasks API. Task appears immediately in list.

#### Mark Done

Clicking the checkbox on a task:
- Sets `Task.status = DONE`, `Task.completed_at = NOW()`
- Task moves to the "הושלמו" section (visually de-emphasized)
- Reversible: clicking checkbox again sets back to OPEN

#### Delete Task

- Click trash icon → inline confirmation: "למחוק משימה זו?" with "מחק" / "ביטול"
- Confirmed: DELETE API call; task removed from list

#### Edit Task

- Click pencil icon → same form as Add Task, pre-filled
- Save → PATCH API call; task updates in place

#### Empty States

- "כל הפתוחות" filter + no open tasks: "אין משימות פתוחות. לחץ '+' כדי להוסיף."
- "הושלמו" filter + no completed tasks: "לא הושלמו משימות עדיין."
- "היום" filter + nothing due today: "אין משימות להיום."

---

## Actions

| Action | Precondition | Outcome | Error State |
|---|---|---|---|
| Click client card | Always | Navigate to screen 45 | — |
| Filter by status | Always | Card list re-filters | — |
| Search by name/phone | Min 2 chars typed | Card list re-filters | — |
| Switch tabs | Always | Tab content changes; badge on "הלקוחות שלי" persists | — |
| Add task | Always | Task creation form opens | Required field empty: inline error |
| Mark task done | Task is OPEN | Task marked DONE; checkbox checked | Network error: revert checkbox; toast error |
| Mark task undone | Task is DONE | Task reverts to OPEN | — |
| Delete task | Always | Inline confirmation, then DELETE | — |
| Edit task | Always | Pre-filled form shown | Same validation as Add Task |
| Logout | Always | Session cleared; redirect to `/login` | — |

---

## Conditional Logic

- **Unread messages badge:** Total unread count computed as `SUM(message.unread_advisor_count)` across all advisor's applications. Badge disappears when count = 0. Badge shows only on "הלקוחות שלי" tab.

- **State badge colors:**
  - `REGISTERED`, `TIER_SELECTED`: grey (cold lead)
  - `PERSONAL_DETAILS_COMPLETE`, `AUTHORIZATION_SIGNED`: blue (in onboarding)
  - `DOCUMENTS_SUBMITTED`, `DOCUMENTS_APPROVED`: orange (active work)
  - `PRINCIPAL_APPROVAL_REQUESTED`, `PRINCIPAL_APPROVAL_RECEIVED`: purple (pending bank)
  - `BANK_SELECTED`, `MORTGAGE_SIGNED`: green (closing)
  - `COLLATERALS_PENDING`, `COLLATERALS_COMPLETE`: teal (post-signing)
  - `ACTIVE_MORTGAGE`: dark green (complete)

- **next_action_at source:** For Tier 3 clients, this is the next `CalendarSession.session_date` where `status = SCHEDULED`. For Tier 2, this can be a manually set reminder date on the application (advisor-set field). For Tier 1, this field is typically null.

- **Past-due task highlight:** If `task.due_date < TODAY AND task.status = OPEN`: task title shown in red and "⚠ פגה" label added.

- **Task linked to client:** If a linked client's application is in ACTIVE_MORTGAGE, the task still shows but with a "(סיים תהליך)" note next to the client name.

- **Auto-refresh:** Client cards auto-refresh every 60 seconds to pick up new messages, state changes, and new assignments. Tasks do NOT auto-refresh (manual interactions only).

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Advisor has 0 assigned clients | "הלקוחות שלי" tab shows empty state. Tasks tab is fully functional. |
| Advisor has 100+ clients | List renders with virtual scrolling or pagination (25 cards per page). Sort order preserved. |
| Two clients have the same next_action_at timestamp | Both appear at top; sorted alphabetically as tiebreaker. |
| Client sends a message while advisor is viewing dashboard | Unread count badge increments within 60s auto-refresh. No real-time push in v1. |
| Advisor navigates to screen 45 and returns | Dashboard state (selected tab, filter state) is preserved via session storage or component state. |
| Task due date is today | Shown in "היום" sub-filter. No special color unless past due. |
| Advisor is reassigned a client mid-session | New client appears on next auto-refresh. |
| Session expires while advisor is on dashboard | Next API call returns 401; auto-redirect to `/login?reason=session_expired`. |

---

## Audit Log

Tasks are personal advisor tools — task CRUD does NOT generate AuditLog entries. Only state-changing actions on applications logged:

The dashboard itself does not directly trigger AuditLog events. All AuditLog events originate from screen 45 (Advisor Client Detail) actions.
