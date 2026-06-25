# 43 — Admin Advisors Management

## Purpose
Allows the Admin to view, add, and manage advisor accounts. Provides per-advisor drill-down showing their client list and performance summary. Advisor deactivation requires bulk client reassignment before proceeding.

## Role Access
Admin only.

## Route
`/admin/advisors`  (tab within the Admin shell at `/admin`)

---

## Layout

Dark theme (inherits admin shell). RTL.

**Page structure:**
1. Admin tab bar (יועצים tab active)
2. Page header: "ניהול יועצים" title + "הוסף יועץ" button (top-left, primary style)
3. Advisors table (main content, left portion ~60% width)
4. Drill-down panel (right portion ~40% width) — appears when an advisor row is clicked; hidden by default

On screens narrower than 1024px: drill-down panel replaces the table view (back button to return).

---

## Fields / Components

### Advisors Table

**Default sort:** `joined_at` DESC (newest first). User-sortable by clicking headers.

| Column | Source | Format | Sortable |
|---|---|---|---|
| שם | `Advisor.full_name` | Text. Clickable row. | Yes |
| אימייל | `Advisor.email` | Text | No |
| טלפון | `Advisor.phone` | `05X-XXX-XXXX` format | No |
| לקוחות פעילים | Count of `Application` where `assigned_advisor_id = this AND state NOT IN (QUESTIONNAIRE_IN_PROGRESS, ACTIVE_MORTGAGE)` | Integer badge | Yes |
| לידים בתור | Count of `Application` where `assigned_advisor_id = this AND state IN (REGISTERED, TIER_SELECTED)` | Integer badge | Yes |
| תאריך הצטרפות | `Advisor.joined_at` | `DD/MM/YYYY` | Yes |
| סטטוס | `Advisor.status` | Badge: "פעיל" (green) / "מושבת" (red) | Yes |
| פעולות | — | Icon buttons (see below) | No |

**Row count:** No pagination needed in v1 (advisor count expected < 50). Show all rows. If > 50 advisors, add pagination (25 per page).

---

### Row Action Buttons

| Button | Icon | Precondition | Action |
|---|---|---|---|
| השבת | Deactivate icon | `status = ACTIVE` | Opens Deactivate modal |
| הפעל | Activate icon | `status = INACTIVE` | Reactivates advisor; toast "יועץ הופעל מחדש."; AuditLog entry |

---

### Add Advisor Button + Form

Clicking "הוסף יועץ" opens a modal form.

**Modal title:** "הוספת יועץ חדש"

| Field | Type | Validation | Notes |
|---|---|---|---|
| שם פרטי | Text input | Required. Max 50 chars. Hebrew/English. | |
| שם משפחה | Text input | Required. Max 50 chars. | |
| אימייל | Email input | Required. Valid email format. Must be unique in `Advisor.email`. | System sends OTP-based first-login invitation to this email. |
| טלפון | Phone input | Required. Israeli mobile format: `05XXXXXXXX`. Must be unique in `Advisor.phone`. | System sends OTP to this phone for first login. |
| הערות | Textarea | Optional. Max 500 chars. | Internal admin note about this advisor. |

**System behavior on add:**
1. Creates `Advisor` record with `status = ACTIVE`, `joined_at = NOW()`
2. Creates `AuthCredential` record with `role = ADVISOR`
3. Sends welcome email to `Advisor.email` with OTP invitation link (valid 48h)
4. Sends welcome SMS to `Advisor.phone` with OTP
5. Creates AuditLog entry `ADVISOR_CREATED`

**Modal buttons:**
- "הוסף יועץ" (confirm): validates form; proceeds if valid
- "ביטול": closes modal

**Error states:**
- Duplicate email: "כתובת המייל כבר קיימת במערכת."
- Duplicate phone: "מספר הטלפון כבר קיים במערכת."
- Network error: "שגיאה ביצירת היועץ. נסה שוב."

---

### Deactivate Advisor Modal

Triggered by the "השבת" button on an advisor row.

**Pre-check (before modal opens):** API call to count advisor's active clients (`assigned_advisor_id = this AND state NOT IN (QUESTIONNAIRE_IN_PROGRESS, ACTIVE_MORTGAGE)`).

**Case A: Advisor has 0 active clients**

Modal shows:
> "האם להשבית את [Name]? לא יוכל להיכנס למערכת עד להפעלתו מחדש."

Buttons: "השבת" (confirm) / "ביטול"

Confirmed: sets `Advisor.status = INACTIVE`; creates AuditLog `ADVISOR_DEACTIVATED`; toast "יועץ הושבת.".

**Case B: Advisor has N > 0 active clients**

Modal shows bulk reassignment tool before deactivation:

**Modal title:** "השבתת יועץ — העברת לקוחות"

**Warning banner:**
> "ל-[Name] יש X לקוחות פעילים. יש להעביר אותם ליועץ אחר לפני ההשבתה."

**Bulk reassignment section:**

| Field | Type | Validation | Notes |
|---|---|---|---|
| יועץ חדש לכולם | Dropdown | Required | Lists all active advisors except the one being deactivated. Each option shows "[Name] — Y לקוחות פעילים". |
| OR: reassign individually | Expandable list | Optional | Shows each client as a row with individual advisor dropdown. |

**Client list in modal (if individual reassignment selected):**

| Column | Notes |
|---|---|
| שם לקוח | Read-only |
| סטטוס | State badge |
| יועץ חדש | Per-row dropdown (same advisor options) |

**Buttons:**
- "העבר והשבת" (confirm): 
  1. Reassigns all listed clients to selected advisor(s)
  2. Sets `Advisor.status = INACTIVE`
  3. Creates AuditLog entries for each reassignment + deactivation
  4. Notifies newly assigned advisor(s) via system notification
  5. Toast: "X לקוחות הועברו ויועץ הושבת."
- "ביטול": closes modal; no changes

**Error:** If new advisor becomes inactive between modal open and confirm: "היועץ שנבחר הושבת. בחר יועץ אחר."

---

### Advisor Drill-Down Panel

Opened by clicking any row in the advisors table.

**Panel header:** Advisor name, email, phone, status badge, "סגור" (X) button.

**Performance Summary (display-only):**

| Metric | Source | Format |
|---|---|---|
| לידים שהומרו ללקוחות | Count of applications that progressed past `TIER_SELECTED` | Integer |
| לקוחות שסיימו תהליך | Count of applications in `ACTIVE_MORTGAGE` or `COLLATERALS_COMPLETE` | Integer |
| ממוצע ימים לסגירה | Avg days from `registered_at` to `MORTGAGE_SIGNED` | "X ימים" |
| לקוחות פעילים כעת | Current active count | Integer |

**Client list (inside drill-down):**

Mirrors the Clients/Leads table (screen 42) filtered to this advisor, showing:
- Name, phone, tier, state, last activity
- "צפה בבקשה" link per row

**Pagination in drill-down:** Show 10 rows; "הצג עוד" loads next 10.

---

## Actions

| Action | Precondition | Outcome | Error State |
|---|---|---|---|
| Click "הוסף יועץ" | Always | Opens Add Advisor modal | — |
| Submit Add Advisor form | All required fields valid, unique email/phone | Advisor created; invitation sent | Duplicate email/phone: inline error |
| Click advisor row | Always | Drill-down panel opens with that advisor's data | — |
| Click "השבת" | `status = ACTIVE` | Deactivate modal opens | — |
| Confirm deactivation (no clients) | 0 active clients | Advisor deactivated | — |
| Confirm bulk reassign + deactivate | New advisor selected; all clients assigned | Clients reassigned; advisor deactivated | Invalid advisor selection: inline error |
| Click "הפעל" | `status = INACTIVE` | Advisor reactivated immediately | — |
| Sort by column | Click column header | Table re-sorts; indicator arrow shows direction | — |

---

## Conditional Logic

- **"השבת" vs "הפעל":** Mutually exclusive based on `Advisor.status`. Only one is shown per row.

- **Add Advisor — duplicate validation:** Email and phone uniqueness is validated server-side on submit. Client-side can optionally do a debounced check on blur.

- **Drill-down panel vs table:** On desktop (≥1024px), both shown side by side. On mobile/tablet (<1024px), drill-down replaces the table with a back navigation.

- **Performance summary:** Computed on-demand when drill-down panel opens. No caching in v1. Show loading spinner during computation.

- **Reactivation:** "הפעל" requires no additional steps — sets `status = ACTIVE` immediately. Admin may want to re-invite (resend OTP) separately — show "שלח הזמנה מחדש" link in the drill-down panel for inactive advisors.

- **Active Mortgage clients:** Applications in `ACTIVE_MORTGAGE` state are NOT counted in "active clients" for workload purposes (post-process clients require minimal advisor attention). They ARE shown in the drill-down client list with a distinct state badge.

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Zero advisors in system | Table shows empty state: "אין יועצים במערכת. לחץ 'הוסף יועץ' כדי להתחיל." |
| New advisor invitation email bounces | v1: no bounce detection. Admin must manually resend via "שלח הזמנה מחדש" in drill-down panel. |
| Admin tries to deactivate themselves (if admin has dual role in future) | Not applicable in v1 — Admin and Advisor are separate roles. |
| Advisor has only ACTIVE_MORTGAGE clients (post-process) | Deactivate modal shows Case B but notes: "X לקוחות הם בשלב משכנתא פעילה. ניתן להשבית ללא העברה, אך מומלץ להקצות יועץ חלופי." Confirm button available without mandatory reassignment. |
| Two admins simultaneously try to deactivate the same advisor | First confirm succeeds. Second confirm gets API error "יועץ כבר מושבת." and refreshes. |
| Resend invitation to active advisor | "שלח הזמנה מחדש" sends new OTP email/SMS. Old tokens are invalidated. AuditLog entry: `ADVISOR_INVITATION_RESENT`. |
| Deactivation confirm fails due to network error | Toast: "שגיאה בהשבתת יועץ. נסה שוב." Modal stays open. No partial state changes. |

---

## Audit Log

| Action | `action_type` | `entity_type` | `before_value` | `after_value` |
|---|---|---|---|---|
| Advisor created | `ADVISOR_CREATED` | `Advisor` | `null` | `{full_name, email, phone}` |
| Advisor deactivated | `ADVISOR_DEACTIVATED` | `Advisor` | `{status: "ACTIVE"}` | `{status: "INACTIVE"}` |
| Advisor reactivated | `ADVISOR_REACTIVATED` | `Advisor` | `{status: "INACTIVE"}` | `{status: "ACTIVE"}` |
| Client reassigned during deactivation | `ADVISOR_REASSIGNED` | `Application` | `{advisor_id: old}` | `{advisor_id: new, reason: "ADVISOR_DEACTIVATED"}` |
| Invitation resent | `ADVISOR_INVITATION_RESENT` | `Advisor` | `null` | `{channel: "email+sms"}` |

All entries include `actor_id`, `actor_role=ADMIN`, `timestamp`, `ip_address`.
