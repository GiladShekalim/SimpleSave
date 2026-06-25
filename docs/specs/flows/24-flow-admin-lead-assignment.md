# Flow 24 — Admin Lead Assignment

## Purpose

Describe how admin manages incoming new leads — from first notification through advisor assignment, monitoring, and reassignment. Covers admin tooling for workload visibility, advisor selection, and all edge cases around advisor availability and accidental duplicate assignment.

---

## Preconditions

- Admin is logged in with the Admin role.
- At least one advisor account exists and is active in the system.
- A new client has completed OTP registration (or the questionnaire and submitted contact details).

---

## Steps

### 1. New Lead Created

1. Client completes the OTP registration flow (phone or email verified).
2. A new Application record is created:
   - client_id, status = REGISTERED (or QUESTIONNAIRE_COMPLETE if questionnaire was submitted before registration).
   - advisor_id = null (unassigned).
   - created_at = now.
3. System sends notification to all Admin accounts (in-app + email):
   - "ליד חדש: [Client Full Name], [Phone or Email], [Loan Type], [Desired Payment Range NIS]"
   - Direct link to the lead in the Admin Overview screen.

### 2. Admin Reviews Lead Inbox

1. Admin opens the Admin Overview screen.
2. "New Leads" inbox section shows all unassigned applications, sorted by created_at (newest first).
3. Each lead row displays:
   - Client name
   - Registration date/time
   - Loan type (from Q1)
   - Computed loan amount (property value minus equity)
   - Desired monthly payment range (from Q10)
   - Preferred tier (if client selected on tier selection screen)
   - Urgency indicator: color-coded by time since registration (e.g., green < 24h, yellow 24–48h, red > 48h)
4. Admin clicks a lead row to open the Lead Detail view.

### 3. Admin Reviews Lead Detail

1. Lead Detail view shows:
   - Full questionnaire answers (Q1–Q10 verbatim responses)
   - Computed figures: max loan amount, max monthly payment, max term
   - Preferred tier (if selected)
   - Contact details: phone and/or email
   - Registration timestamp
   - Any notes (admin can add internal notes, not visible to client)

### 4. Admin Reviews Advisor Roster

1. On the Lead Detail view (or as a panel alongside it), admin sees the Advisor Selection panel:
   - List of all active advisors
   - Per advisor:
     - Full name
     - Active client count (current assignments in any in-progress status)
     - Load indicator: Low / Medium / High (thresholds admin-configurable; e.g., Low < 10, Medium 10–20, High > 20)
     - Location / region (if configured on advisor profile)
     - Specialization tags (if configured)
     - Availability indicator (if advisor has calendar slots available for Tier 3 bookings)
2. Admin can sort or filter advisors by load, location, or specialization.

### 5. Admin Assigns Advisor

1. Admin selects an advisor from the roster (clicks advisor row or uses a dropdown).
2. Admin clicks "שייך יועץ" (Assign Advisor).
3. Confirmation dialog: "Assign [Advisor Name] to [Client Name]?"
4. On confirm:
   - Application.advisor_id → selected advisor_id
   - Application.assigned_at → now
   - AuditLog entry: assigned_by = admin_id, advisor_id, client_id, timestamp.
5. **Advisor notification** (in-app + email): "לקוח חדש שויך אליך: [Client Full Name]. [Loan Type]. [Loan Amount NIS approximate]."
   - Direct link to the client record in the advisor dashboard.
6. **Client notification** (in-app + email, Tier 2 and Tier 3 only):
   - Tier 2: "הבקשה שלך מטופלת על ידי מערכת SimpleSave."
   - Tier 3: "היועץ האישי שלך הוא [Advisor Full Name]. הוא/היא יצרו קשר בקרוב לתיאום פגישה."
7. Lead is removed from the "New Leads" inbox and moves to the "Active Clients" list.
8. If Tier 3: advisor's calendar becomes visible to the client for booking initial meeting.

### 6. Admin Monitoring — Ongoing

1. Admin can view all advisors' active client lists at any time:
   - Admin Overview → Advisors panel → click advisor → see all their assigned clients
   - Each client entry: name, status, last activity date, tier
2. Admin can click into any client record (read-only mirror of what the advisor sees — no edit capability from this view, except for admin-only actions).
3. Admin can filter the full client list by: status, tier, advisor, registration date range, loan type.
4. Admin can export client list to CSV for reporting.

### 7. Advisor Reassignment

1. Admin navigates to a client record (from any admin view).
2. Admin clicks "שנה יועץ" (Change Advisor).
3. Advisor Selection panel opens (same as step 4 above).
4. Admin selects new advisor and confirms.
5. On confirm:
   - Application.advisor_id → new advisor_id
   - Application.reassigned_at → now
   - AuditLog entry: reassigned_by = admin_id, previous_advisor_id, new_advisor_id, client_id, timestamp.
6. **Previous advisor notification:** "הלקוח [Client Name] הועבר ליועץ אחר."
   - Client is removed from previous advisor's client list immediately.
7. **New advisor notification:** "לקוח חדש שויך אליך (העברה): [Client Name]. [Current status]."
   - Client appears in new advisor's dashboard.
8. **Client notification** (Tier 3): "היועץ האישי שלך עודכן ל-[New Advisor Full Name]."
9. If Tier 3 and client had booked meeting with previous advisor:
   - All existing MeetingBooking records with old advisor are cancelled (status = cancelled_reassignment).
   - Both parties notified of cancellation.
   - New advisor is prompted to re-invite client to book initial meeting.

---

## State Transitions

| Event | Application Field Change | Status Change |
|---|---|---|
| Admin assigns advisor | advisor_id set | None (status unchanged) |
| Admin reassigns advisor | advisor_id updated | None (status unchanged) |
| Tier 3 initial meeting booked (after assignment) | meeting_booked_at set | None |

Note: Lead assignment does not itself change Application.status. The TIER_SELECTED → PERSONAL_DETAILS_COMPLETE transition is driven by the client completing personal details, not by advisor assignment.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| No advisors available (all accounts inactive or none exist) | Admin sees warning: "אין יועצים פעילים — לא ניתן לשייך. צור חשבון יועץ חדש." Assign button is disabled. Admin must create a new advisor account first. |
| Admin tries to assign same lead to two advisors simultaneously | UI enforces single selection. Assignment is atomic (DB constraint: application.advisor_id is a single FK). If two admin tabs race, the second save will see advisor_id already set and show: "ליד זה כבר שויך." |
| Client self-assigns to advisor | Not possible. Client role has no access to advisor list or assignment UI. Assignment is an admin-only action. |
| Admin assigns advisor, then advisor account is deactivated | Admin receives alert: "יועץ [Name] הושבת — יש לו/לה לקוחות פעילים." Deactivation is blocked until admin reassigns all active clients, OR admin force-deactivates and manually reassigns. |
| Admin accidentally assigns wrong advisor and realizes immediately | Admin can reassign immediately (step 7). Previous advisor is notified of the reversal. No waiting period required. |
| Lead was registered but did not complete questionnaire | Lead appears in the New Leads inbox with "questionnaire incomplete" indicator. Admin can still assign; advisor will prompt client to complete questionnaire. |
| Two admins open the same lead simultaneously | Last writer wins (optimistic locking). Second admin sees: "This lead was just updated. Refresh to see current state." |

---

## Error States

| Error | Admin-Facing Message | System Action |
|---|---|---|
| Notification delivery to advisor fails | Warning shown in admin UI next to assignment confirmation: "Advisor notification failed — they may not have been alerted. Contact directly." | Assignment still saved. Retry email delivery (3 attempts). Log failure. |
| Notification delivery to client fails | Silent retry. Admin not alerted unless all retries fail. | Assignment saved regardless. |
| Database save fails on assignment | "שגיאה בשמירת השיוך. אנא נסה שוב." | Application.advisor_id not changed. No notifications sent. |
| Advisor has reached a hard capacity limit (if configured) | Admin sees warning on advisor row: "יועץ זה הגיע לקיבולת המקסימלית." Assign button still available (warning only, not a hard block — admin overrides by proceeding). | Audit log notes capacity override. |
