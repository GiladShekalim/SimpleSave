# 47 — Calendar Booking (Tier 3 Only)

## Purpose
Allows Tier 3 clients to view their assigned advisor's available time slots and book, cancel, or reschedule video or phone meetings. Also allows advisors to manage their availability and view upcoming sessions from their dashboard.

## Role Access
- **Client (Tier 3 only):** Book, cancel, reschedule sessions
- **Advisor:** View their own schedule, manage availability, cancel sessions
- **Admin:** Read-only view of any advisor's calendar; can cancel any session

## Route
- Client: `/personal-area/calendar`
- Advisor availability management: `/advisor/calendar`
- Admin view: `/admin/advisors/:advisorId/calendar`

---

## Access Condition

This screen and all calendar functionality is available only when:
1. `application.tier == 3` (for client access)
2. `application.state >= TIER_SELECTED` (client has confirmed tier selection)

If either condition is not met:
- The calendar link/tab is hidden from the client's personal area
- Direct URL access returns a 403 screen: "לוח השנה זמין ללקוחות שכבה 3 בלבד."

---

## Layout

**Client-facing calendar view:**

Light or dark theme following the client-facing design (separate from admin dark theme). RTL.

**Page structure:**
1. Header: "תיאום פגישה עם יועץ" + advisor name and photo/avatar
2. Week navigation: "< שבוע קודם" / "שבוע הבא >" + "היום" button
3. Weekly calendar grid (main content)
4. Upcoming sessions panel (below calendar): list of client's booked sessions

**Advisor calendar view:**

Same structure but includes:
1. Availability management toggle mode
2. List of all sessions (all clients) by week

---

## Fields / Components

### Weekly Calendar Grid

**Columns:** Sunday through Thursday (5 days). Friday and Saturday are not shown (no slots).

**Rows:** 09:00 through 18:00 in 30-minute blocks (18 slots per day).

**Slot states:**

| State | Visual | Client action |
|---|---|---|
| Available | Light green background | Clickable to book |
| Booked (by this client) | Accent blue background + session label | Clickable to view/cancel/reschedule |
| Booked (by another client) | Dark grey / hidden | Not shown to client (privacy) — just appears as unavailable |
| Blocked by advisor | Striped grey pattern | Not clickable |
| Past slot | Faded grey | Not clickable |
| Current time marker | Horizontal red line | Visual reference only |

**Time zone:** All times displayed in Israel Standard Time (IST/IDT). The system stores all timestamps in UTC. Display conversion is handled client-side using the browser's locale with explicit IST override.

**Navigation:**
- Default view: current week
- "שבוע קודם": disabled if all slots in that week are in the past
- "שבוע הבא": navigates up to 8 weeks forward (no booking beyond 8 weeks)

**Slot hover/focus state:** Shows tooltip: "[Day], [Date] [Month] — [Time]" and "לחץ להזמנה" CTA.

---

### Booking Flow (Client)

Triggered when client clicks an available slot.

**Step 1 — Slot Confirmation**

| Field | Type | Notes |
|---|---|---|
| Selected date and time (read-only) | Display | "[Day], DD/MM/YYYY בשעה HH:mm" |
| סוג פגישה | Radio buttons | "שיחת וידאו" / "שיחה טלפונית" |

**Step 2 — Confirm Screen**

Shows:
- Date, time, meeting type
- Advisor name
- "אישור ותיאום" button
- "חזרה" to reselect

**On confirm:**
1. Creates `CalendarSession` record: `{application_id, advisor_id, client_id, session_date, duration: 30min, meeting_type, status: SCHEDULED}`
2. Generates meeting link if `meeting_type = VIDEO`:
   - v1: a pre-configured static Zoom room or Google Meet link per advisor (stored in `Advisor.video_meeting_url`)
   - v2: dynamically generated per session
3. Sends client confirmation:
   - Email: "פגישתך נקבעה — [Date] [Time] עם [Advisor Name]. [Meeting Link or 'יועץ יתקשר אליך']"
   - SMS: same content, condensed
4. Sends advisor notification:
   - In-app notification: "[Client Name] קבע פגישה ל-[Date] [Time]"
   - Email notification
5. Slot becomes unavailable to other clients
6. Confirm screen replaced by "✓ הפגישה נקבעה בהצלחה" with calendar slot highlighted in blue

---

### Upcoming Sessions Panel (Client)

Below the weekly calendar grid.

**Section title:** "הפגישות שלי"

| Column | Source | Notes |
|---|---|---|
| תאריך ושעה | `CalendarSession.session_date` | `Day DD/MM/YYYY בשעה HH:mm` |
| סוג | `CalendarSession.meeting_type` | "שיחת וידאו" + icon / "שיחה טלפונית" + icon |
| יועץ | Advisor name | Read-only |
| קישור | `CalendarSession.meeting_link` | Shown for VIDEO type only. "הצטרף לשיחה" clickable link. |
| סטטוס | `CalendarSession.status` | SCHEDULED / CANCELLED / COMPLETED |
| פעולות | — | Cancel / Reschedule buttons |

**Sort:** Upcoming sessions (SCHEDULED) first by date ASC; past sessions (COMPLETED / CANCELLED) below, by date DESC.

---

### Cancellation Flow (Client)

Triggered by "בטל פגישה" button on a session.

**Deadline:** Client can cancel up to 24 hours before the session. If `session_date - NOW() < 24h`: cancellation button is disabled with tooltip: "לא ניתן לבטל פחות מ-24 שעות לפני הפגישה. צור קשר עם יועצך."

**Cancellation modal:**

> "ביטול פגישה — [Date] [Time]  
> האם אתה בטוח שברצונך לבטל את הפגישה?"

Optional reason field (free text, max 300 chars, label: "סיבת הביטול (אופציונלי)").

**On confirm:**
1. Sets `CalendarSession.status = CANCELLED`, `cancelled_at = NOW()`, `cancelled_by = CLIENT`
2. Slot becomes available again for re-booking
3. Advisor receives notification: "[Client Name] ביטל את הפגישה ב-[Date] [Time]. [Reason if provided]"
4. Client receives cancellation confirmation SMS + email

---

### Reschedule Flow (Client)

Triggered by "שנה מועד" button on a session.

**Reschedule = Cancel + Rebook in one flow:**

1. Show calendar grid with current booking pre-highlighted
2. Client selects a new slot
3. Confirmation step: "להחליף את הפגישה מ-[Old Date Time] ל-[New Date Time]?"
4. On confirm:
   - Old session: `status = CANCELLED`, `cancellation_reason = RESCHEDULED`
   - New session: created as per normal booking flow
5. All notifications fired (cancellation of old + confirmation of new)

**Deadline:** Same 24h rule applies. Cannot reschedule if < 24h before original session.

---

### Meeting Reminders (Automated)

Triggered by the notification/scheduler system (not interactive):

| When | Channel | Content |
|---|---|---|
| 24 hours before `session_date` | SMS + Email | "תזכורת: פגישה מחר ב-[Time] עם [Advisor/Client Name]. [Link if VIDEO]" |
| 1 hour before `session_date` | SMS only | "תזכורת: פגישה בעוד שעה ב-[Time]. [Link if VIDEO]" |

Reminders are sent to both client and advisor.

---

### Advisor Availability Management (`/advisor/calendar`)

Advisors access this from their dashboard via "ניהול זמינות" link.

**Default availability (system-configured, overridable by admin):**
- Monday–Thursday 09:00–18:00 IST
- All 30-minute slots available by default

**Advisor controls:**
- Click a slot to toggle it: Available ↔ Blocked
- Click and drag across multiple slots to block/unblock a range
- "חסום כל השבוע" button: blocks entire current week
- "שחרר כל השבוע" button: unblocks entire current week

**Repeat block:** "חסום כל [Day] עד [Date]" — blocks all slots on a specific day of week for the next N weeks.

**Save button:** "שמור זמינות" — saves all changes. Creates AuditLog `ADVISOR_AVAILABILITY_UPDATED`.

**Advisor session list (below availability grid):**

| Column | Notes |
|---|---|
| תאריך ושעה | |
| שם לקוח | Linked to screen 45 |
| סוג פגישה | |
| סטטוס | SCHEDULED / CANCELLED / COMPLETED |
| פעולות | "בטל" (advisor can cancel at any time) |

**Advisor cancel:** No 24h restriction. Client notified immediately with message: "הפגישה שלך ב-[Date] [Time] בוטלה על ידי היועץ. אנא קבע פגישה חדשה." and a link back to the calendar.

---

## Actions

| Action | Role | Precondition | Outcome | Error State |
|---|---|---|---|---|
| Select available slot | Client | Slot available; `tier == 3`; `state >= TIER_SELECTED` | Booking confirmation step shown | — |
| Confirm booking | Client | Slot still available | Session created; notifications sent | Slot taken between selection and confirm: "חריג — משבצת זו אינה זמינה. אנא בחר אחרת." |
| Cancel session | Client | `session_date - NOW() > 24h` | Session cancelled; notifications sent; slot freed | < 24h: button disabled with tooltip |
| Reschedule session | Client | Same 24h rule | Old session cancelled; new session created | Slot taken: error in step 3 |
| Navigate week | Client/Advisor | — | Calendar grid updates | — |
| Toggle slot availability | Advisor | Their own calendar | Slot blocked/unblocked | — |
| Save availability | Advisor | — | Changes persisted; AuditLog | Network error: revert + toast |
| Cancel session (advisor) | Advisor | Their session | Session cancelled; client notified | — |
| View advisor calendar | Admin | — | Read-only view of advisor's calendar | — |

---

## Conditional Logic

- **`tier != 3`:** Calendar tab/link completely hidden. No 403 shown unless direct URL is attempted.

- **`state < TIER_SELECTED`:** Calendar hidden even for Tier 3 clients (tier selection must be confirmed first).

- **VIDEO meeting type:** Shows Zoom/Meet link in confirmation, upcoming sessions, and reminders. Phone type shows no link — advisor calls client at the registered phone number.

- **No available slots in current week:** Calendar grid shows all slots as grey. Banner below week navigation: "אין משבצות זמינות השבוע. נסה לבחור שבוע אחר." with "שבוע הבא >" button highlighted.

- **Next week also fully booked:** Shows same message. If no slots in next 8 weeks: "אין זמינות בשמונה השבועות הקרובים. צור קשר ישירות עם יועצך." with advisor phone number shown.

- **Client has an existing SCHEDULED session:** The booking button for new slots shows a warning: "יש לך פגישה מתוזמנת ב-[Date Time]. האם לקבוע פגישה נוספת?" Confirm allows multiple sessions.

- **Advisor unavailability admin override:** Admin can unblock any slot on an advisor's calendar for emergency scheduling.

- **Session completed:** When `session_date < NOW()` and `status = SCHEDULED`, a background job sets `status = COMPLETED` after 1 hour past session end time (assumes session ran to completion). Advisor can manually mark sessions as COMPLETED or NO_SHOW.

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Two Tier 3 clients click the same slot simultaneously | Race condition: first `INSERT` succeeds; second gets a DB constraint error. API returns 409 "חריג — משבצת זו נתפסה. אנא בחר אחרת." Client UI shows the error in the confirm step. |
| Advisor sets all slots as blocked with existing SCHEDULED sessions | Existing sessions are NOT affected. Blocking applies only to future unbooked slots. System warns advisor: "יש פגישות מתוזמנות קיימות. חסימה לא תשפיע עליהן." |
| Client navigates to calendar but advisor has no availability configured | All slots grey. Message: "יועצך טרם הגדיר זמינות. אנא פנה ישירות ליועץ." |
| Client tries to rebook after advisor deactivation | If advisor is deactivated, their calendar is locked. Client sees: "יועצך הוחלף. פגישות תואמות תבוצענה עם יועצך החדש." Admin must manually set up new advisor's calendar. |
| SMS fails to send (OTP/SMS provider down) | Session is still created. Email is sent. An alert is logged to the notification error queue. Admin is notified via system status indicator. |
| Reminder fires for a session that was cancelled after scheduling | Background reminder job checks `status == SCHEDULED` before firing. Cancelled sessions do not receive reminders. |
| Client cancels 25 hours before session (just over deadline) | Cancellation allowed (> 24h). Slot freed. |
| Client cancels 23 hours before session | Cancellation blocked. Tooltip: "לא ניתן לבטל פחות מ-24 שעות לפני הפגישה." |

---

## Audit Log

| Action | `action_type` | `entity_type` | Notes |
|---|---|---|---|
| Session booked | `SESSION_BOOKED` | `CalendarSession` | `{session_date, meeting_type, advisor_id}` |
| Session cancelled by client | `SESSION_CANCELLED_BY_CLIENT` | `CalendarSession` | `{reason}` |
| Session cancelled by advisor | `SESSION_CANCELLED_BY_ADVISOR` | `CalendarSession` | `{reason}` |
| Session rescheduled | `SESSION_RESCHEDULED` | `CalendarSession` | `{old_session_id, new_session_date}` |
| Availability updated by advisor | `ADVISOR_AVAILABILITY_UPDATED` | `AdvisorAvailability` | `{week_start, changes: [{slot, blocked: true/false}]}` |
| Session marked completed | `SESSION_COMPLETED` | `CalendarSession` | `{marked_by: SYSTEM/ADVISOR}` |
