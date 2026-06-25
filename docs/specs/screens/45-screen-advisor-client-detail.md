# 45 — Advisor Client Detail

## Purpose
The advisor's full working view of a specific client's mortgage application. Mirrors the client's personal area exactly in terms of data displayed, but gives the advisor edit capabilities, document management controls, state transition controls, and an inline messaging panel. All advisor edits are attributed in the audit log.

## Role Access
- Advisor: full read/write for their assigned client
- Admin: read/write for any client (same screen, same capabilities, accessed from screen 42)
- Client: does NOT access this screen (they use screen 30 — Personal Area Hub)

## Route
`/advisor/clients/:applicationId`  (advisor access)  
`/admin/clients/:applicationId`  (admin access — same component, broader permissions)

---

## Layout

Dark theme (inherits staff shell). RTL.

**Page structure:**
1. Breadcrumb: "הלקוחות שלי > [Client Name]" (back navigation to screen 44)
2. Client header bar (sticky at top)
3. Tab navigation (content tabs)
4. Content area (active tab)
5. Messages panel (collapsible right sidebar — Tier 2 and Tier 3 only)

---

## Fields / Components

### Client Header Bar (sticky)

Always visible regardless of active tab.

| Field | Source | Display |
|---|---|---|
| שם לקוח | `Application.primary_borrower.full_name` | Large bold text |
| טלפון | `Application.primary_borrower.phone` | With click-to-call link (`tel:`) |
| אימייל | `Application.primary_borrower.email` | With click-to-email link (`mailto:`) |
| שכבה | `Application.tier` | Badge (שכבה 1/2/3) |
| סטטוס נוכחי | `Application.state` | Hebrew state label badge (color-coded) |
| יועץ משובץ | `Application.assigned_advisor.full_name` | "יועץ: [Name]". Admin only: "החלף יועץ" link. |
| פעילות אחרונה | `Application.last_activity_at` | Relative timestamp |
| מזהה בקשה | `Application.id` | Small grey text (for support reference) |

**State transition controls (header — advisor/admin):**

"קדם סטטוס" button (primary) and "החזר סטטוס" button (secondary, shown only when rollback is allowed).

Clicking either opens a State Transition Modal (see below).

---

### Tab Navigation

Tabs are shown/hidden based on application state and tier:

| Tab | Hebrew Label | Visible when |
|---|---|---|
| Personal Details | פרטים אישיים | Always |
| Mortgage Details | פרטי משכנתא | `state >= TIER_SELECTED` |
| Documents | מסמכים | `state >= PERSONAL_DETAILS_COMPLETE` |
| Principal Approval | אישור עקרוני | `state >= DOCUMENTS_APPROVED` |
| Bank Selection | בחירת בנק | `state >= PRINCIPAL_APPROVAL_RECEIVED` |
| Post-Mortgage | אחרי המשכנתא | `state >= MORTGAGE_SIGNED` |

---

### Tab: Personal Details (פרטים אישיים)

Mirrors screen 31 (Client Personal Details) exactly in field structure. All fields are editable by advisor.

**Borrower sub-tabs:** If `application.borrower_count > 1`, show sub-tabs: "לווה 1", "לווה 2", etc. Fields are per-borrower.

**Fields (per borrower) — all editable by advisor:**

| Field | Type | Validation | Notes |
|---|---|---|---|
| שם פרטי | Text | Required | |
| שם משפחה | Text | Required | |
| מין | Radio: זכר / נקבה | Required | |
| מצב משפחתי | Dropdown: רווק/נשוי/גרוש/אלמן | Required | |
| מספר ילדים | Number | Min 0 | |
| תאריך לידה | Date picker | Required. Age at loan end must be ≤ 85. | |
| השכלה | Dropdown: תיכוני/על תיכוני/תואר ראשון/תואר שני | Required | |
| טלפון | Phone | Required. Israeli format. | |
| אימייל | Email | Required | |
| סטטוס עיסוק | Dropdown: שכיר/עצמאי/בעל שליטה | Required | |
| מקצוע | Text | — | |
| מקום עבודה | Text + city dropdown | — | |
| ותק במקום עבודה | Date picker (start date) | — | If < 1 year: previous employer fields appear |
| הכנסות נטו | Number (₪) | Required | |
| הלוואות קיימות | Repeating table | — | Fields: type, remaining balance, monthly payment, end date, interest rate, source |
| הכנסות נוספות | Repeating table | — | Fields: type, monthly amount |
| הוצאות קבועות | Repeating table | — | Fields: type, amount, end date, monthly payment |
| חשבונות עו"ש | Repeating table | — | Fields: bank, branch, account number |
| קרן השתלמות / חיסכון | Yes/No; if Yes: table | — | Fields: expected amount, availability date |
| נכסים נוספים | Yes/No; if Yes: table | — | Fields: type, city, address, floor, sqm, value, mortgage balance |
| אזרחות נוספת | Yes/No | — | If Yes: "יש התחשבנות מס בחו"ל?" |
| קרבה לאיש ציבור | Yes/No | — | |
| מצב בריאותי תקין | Yes/No | — | |
| בעיות אשראי | Yes/No | — | If Yes: free text description |
| כתובת מגורים | City dropdown + street text + number + apartment | Required | |

**Save button:** "שמור שינויים" — saves all modified fields for the selected borrower tab. Creates AuditLog entries with before/after for each changed field.

**Advisor-only field:** "הערות פנימיות" — a private text area (max 2000 chars) visible only to advisor and admin, not shown to the client. Saved separately.

---

### Tab: Mortgage Details (פרטי משכנתא)

Mirrors screen 32 (Mortgage Details) exactly. All fields editable by advisor.

**Standard fields (editable):**

| Field | Type |
|---|---|
| סטטוס רכישה | Dropdown: מחפש נכס / חתם על חוזה / לקראת חתימה |
| תאריך חתימה | Date (if "חתם על חוזה") |
| מועד נדרש לכסף | Dropdown: חודש הקרוב / שניים / שלושה+ |
| כתובת הנכס | City + street + number + apartment |
| סוג ההלוואה | Dropdown: נכס יחיד / שיפור דיור / נכס נוסף / לכל מטרה |
| מקור הנכס | Dropdown: קבלן / יד 2 / מחיר למשתכן / בנייה עצמית |
| פרטי הנכס | Type + floor + building age + sqm |
| רישום הנכס | Dropdown: טאבו / מנהל / חברה משכנת |
| שווי הנכס | Number (₪) |
| מקור הערכת שווי | Dropdown: הערכה עצמית / שמאי / קבלן |
| הון עצמי | Number (₪) |
| מקור הון עצמי | Multi-select checkboxes + amount per source |
| תשלום חודשי רצוי | Range (min / max) |
| הגשה קודמת | Yes/No; if Yes: bank multi-select |
| העברת חשבון | Yes/No/שמח לשמוע פרטים |

**Advisor-only: "Override Mix" toggle**

Toggle labeled "עקוף תמהיל מוצע". When ON: 
- A warning banner appears: "מצב עקיפה פעיל — הלקוח יקבל תמהיל שונה מהמוצע לשכבתו."
- Advisor can manually select any of the 5 clocks OR input a fully custom track configuration
- Custom configuration fields mirror the Mix Manager (screen 39) track table format, but only for this single client

When OFF: client uses the clock assigned to their tier and loan parameters by the calculation engine.

---

### Tab: Documents (מסמכים)

A complete document management view with advisor-specific action controls.

#### Required Documents List

| Column | Source | Notes |
|---|---|---|
| שם מסמך | `RequiredDocument.document_type_label` | Hebrew label |
| מועד נדרש | `RequiredDocument.required_by_date` | Optional date field set by advisor |
| סטטוס | `Document.status` | See status values below |
| פעולות | — | Per-document action buttons |

**Document status values:**

| Status | Hebrew Label | Color |
|---|---|---|
| PENDING | ממתין להעלאה | Grey |
| UPLOADED | הועלה — ממתין לבדיקה | Blue |
| APPROVED | אושר | Green |
| REJECTED | נדחה | Red |
| NOT_REQUIRED | לא נדרש | Light grey italic |

#### Per-Document Advisor Actions

| Button | Precondition | Action |
|---|---|---|
| "אשר מסמך" | `status = UPLOADED` | Sets `status = APPROVED`; notifies client; AuditLog |
| "דחה מסמך" | `status = UPLOADED` | Opens rejection modal (reason required, max 300 chars); sets `status = REJECTED`; notifies client with reason |
| "בקש מסמך נוסף" | Always | Opens "Add Required Document" form |
| "העלה בשם הלקוח" | Any status | Opens file upload dialog; stores doc attributed to advisor; AuditLog notes "הועלה ע"י יועץ" |
| "צפה במסמך" | `status IN (UPLOADED, APPROVED, REJECTED)` | Opens document viewer (new tab or modal) |
| "סמן כלא נדרש" | `status = PENDING` | Sets `status = NOT_REQUIRED` (e.g., doc not applicable for this client type) |

#### Add Required Document Form

Triggered by "בקש מסמך נוסף".

| Field | Type | Validation |
|---|---|---|
| סוג מסמך | Dropdown (predefined list) + "אחר" (free text) | Required |
| הסבר ללקוח | Textarea | Optional. Shown to client in their document list. Max 300 chars. |
| תאריך יעד | Date picker | Optional |

Adds a new row to the required documents list with `status = PENDING`. Client is notified.

#### Document Viewer

Opens in a modal or new tab depending on file type:
- PDF: embedded viewer
- Image (JPG/PNG): full-size image display
- Download button always visible for advisor

---

### Tab: Principal Approval (אישור עקרוני)

Read-only for advisor in most cases. Mirrors client's view (screen showing bank approval statuses).

**Advisor-only actions:**
- "עדכן סטטוס אישור" per bank: sets bank approval status (APPROVED / REJECTED / PENDING) — enters data received externally
- "הוסף הערה לבנק": internal note per bank entry

---

### Tab: Bank Selection (בחירת בנק)

Read-only for advisor. Shows which bank the client selected (if state = BANK_SELECTED or later). Advisor can add a note about the selection.

---

### Tab: Post-Mortgage (אחרי המשכנתא)

Visible from `MORTGAGE_SIGNED` onward. Mirrors client's post-mortgage view with mortgage track details and repayment schedule. Advisor can upload final mortgage terms document on behalf of client.

---

### Messages Panel (Tier 2 and Tier 3 only)

A collapsible right-side panel showing the full conversation thread between advisor and client for this application.

**Trigger:** "הצג הודעות" button in header bar. Panel slides in from the right. "X" to close.

**Thread layout:**
- Messages listed chronologically, oldest at top
- Advisor messages: right-aligned, accent color background
- Client messages: left-aligned, dark card background
- Timestamp below each message: `DD/MM HH:mm`

**New message composer:**
- Textarea (max 2000 chars)
- "שלח" button
- File attachment support (optional in v1 — attach document directly in message)

**Unread indicator:** Unread client messages shown with a dot badge; automatically marked as read when advisor opens the panel.

**For Tier 1 clients:** Messages panel is NOT shown. A banner explains: "לקוחות שכבה 1 אינם כוללים ליווי יועץ."

---

### State Transition Modal

Opened by "קדם סטטוס" or "החזר סטטוס" buttons in the header.

**Title:** "שינוי סטטוס — [Current State] → [Target State]"

**Fields:**
| Field | Type | Validation |
|---|---|---|
| הערת ביקורת | Textarea | Required. Min 10 chars. Max 500 chars. |
| אישור שינוי | Checkbox "אני מאשר/ת את השינוי" | Required to be checked |

**Advance preconditions (system enforces):**

| Transition | Precondition |
|---|---|
| → DOCUMENTS_SUBMITTED | All required docs have `status != PENDING` |
| → DOCUMENTS_APPROVED | All required docs have `status = APPROVED` |
| → PRINCIPAL_APPROVAL_REQUESTED | `authorization_signed = true` |
| → MORTGAGE_SIGNED | `bank_selected_id IS NOT NULL` |
| → ACTIVE_MORTGAGE | All collaterals marked complete |

If precondition not met: advance button is disabled with tooltip listing what is missing.

**Rollback:** Advisor can roll back one state at a time. Rollback always requires audit note. Some rollbacks require admin permission (configurable in v1 by restricting rollback from certain states to admin-only).

---

## Actions

| Action | Precondition | Outcome | Error State |
|---|---|---|---|
| Save Personal Details | All required fields valid | DB write; AuditLog per changed field | Invalid field: red border + error message |
| Save Mortgage Details | Valid form data | DB write; AuditLog | — |
| Approve document | `status = UPLOADED` | Status → APPROVED; client notified | Network error: toast "שגיאה בעדכון מסמך." |
| Reject document | `status = UPLOADED`; reason provided | Status → REJECTED; client notified with reason | Reason empty: "חובה לספק סיבה לדחייה" |
| Add required document | Always | New document row added; client notified | — |
| Upload on behalf | Always | File stored; AuditLog notes advisor upload | File > 10MB: "קובץ גדול מדי. מקסימום 10MB." |
| Send message | Tier 2 or 3; textarea not empty | Message sent; client notified | Network error: unsent message preserved in textarea |
| Advance state | Preconditions met; audit note provided | State → next; AuditLog | Precondition not met: button disabled |
| Rollback state | Always (with note) | State → previous; AuditLog | Note < 10 chars: save blocked |
| Override Mix toggle ON | Always | Custom mix fields appear; warning banner | — |

---

## Conditional Logic

- **Edit mode:** Unlike the admin parameter form, advisor fields are editable inline without a separate "edit mode" toggle. There is a "שמור" button per tab — changes are not auto-saved.

- **Tab visibility:** Tabs are hidden until the application reaches the required state. Attempting to navigate directly to a hidden tab URL redirects to the appropriate earliest visible tab.

- **Messages panel:** Hidden entirely for Tier 1 clients. Always visible for Tier 2 and Tier 3 (even if 0 messages exist).

- **Override Mix:** If `application.tier == 1` and advisor overrides mix: a warning is shown: "לקוח שכבה 1 אינו כולל ייעוץ. שינוי תמהיל ידני יירשם ביומן הביקורת."

- **Borrower sub-tabs:** Shown only when `application.borrower_count > 1`. Single-borrower applications show all fields in a single view.

- **Documents tab progress bar:** Shows "X מתוך Y מסמכים אושרו" with a progress bar. Green when X = Y.

- **State badge in header:** Updates immediately after a successful state transition, without full page reload.

---

## Edge Cases

| Scenario | System Behavior |
|---|---|
| Advisor saves Personal Details with a field that would invalidate the mix calculation (e.g., lower income) | Save proceeds. A warning banner shows: "שינוי נתוני הכנסה עשוי להשפיע על תוצאות החישוב. מומלץ לחשב מחדש." Manual recalculation trigger offered. |
| Client uploads a document while advisor has the Documents tab open | Auto-refresh every 60s updates the document list. |
| Advisor approves a document that was later superseded by a new upload from client | v1: each upload creates a new document version. Advisor sees the latest version. Previous versions are archived and accessible via "היסטוריית גרסאות" link. |
| Application is reassigned to a different advisor mid-session | Current advisor session still works for the remainder of the session; on next load (or 60s refresh) the application no longer appears in their list. No data loss. |
| File upload fails (S3 error) | Error toast. File not saved. Status remains PENDING. Advisor should retry. |
| Advance state from DOCUMENTS_SUBMITTED but one doc is REJECTED | Advance to DOCUMENTS_APPROVED is blocked. Tooltip shows: "מסמך '[name]' נדחה. יש לאשר או להחליף לפני המעבר." |
| Tier 3 client has a scheduled calendar session; advisor rolls back state | Rollback proceeds. Warning: "ייתכן שפגישות מתוזמנות רלוונטיות לסטטוס. בדוק את לוח הזמנים." |
| Advisor tries to edit a client in ACTIVE_MORTGAGE state | Most fields are read-only after MORTGAGE_SIGNED. An edit banner says "לקוח בשלב משכנתא פעילה — עריכה מוגבלת. פנה למנהל לשינויים." |

---

## Audit Log

Every advisor or admin action on this screen that changes data generates an `AuditLog` entry:

| Action | `action_type` | `entity_type` | Notes |
|---|---|---|---|
| Personal details field changed | `CLIENT_FIELD_UPDATED` | `Borrower` | Per-field `before_value` / `after_value` |
| Mortgage details field changed | `MORTGAGE_FIELD_UPDATED` | `Application` | Per-field |
| Document approved | `DOCUMENT_APPROVED` | `Document` | |
| Document rejected | `DOCUMENT_REJECTED` | `Document` | Includes rejection reason |
| Document requested | `DOCUMENT_REQUESTED` | `RequiredDocument` | Includes doc type |
| Document uploaded by advisor | `DOCUMENT_UPLOADED_BY_ADVISOR` | `Document` | |
| Message sent | `MESSAGE_SENT` | `Message` | Content NOT stored in AuditLog (stored in Message table) |
| State advanced | `STATE_ADVANCED` | `Application` | `before_state`, `after_state`, audit note |
| State rolled back | `STATE_ROLLED_BACK` | `Application` | `before_state`, `after_state`, audit note |
| Override mix toggled | `MIX_OVERRIDE_TOGGLED` | `Application` | `{override: true/false}` |
| Custom mix saved | `CUSTOM_MIX_SAVED` | `Application` | Full mix JSON |

All entries include `actor_id`, `actor_role` (ADVISOR or ADMIN), `timestamp`, `ip_address`.
