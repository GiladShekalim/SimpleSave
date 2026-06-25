# 07 — Email Engine

## Purpose

Define all transactional email templates, the template rendering and delivery system, provider integration, tracking, retry behavior, and edge cases for SimpleSave.

## Overview

SimpleSave sends transactional emails triggered by application lifecycle events, advisor actions, and scheduled jobs. All templates are stored in the database and are editable by Admin. The engine uses a pluggable provider interface so the underlying email provider (SendGrid, AWS SES, Postmark, etc.) can be swapped without changing application code. One special email type — the authorization letter sent TO banks — is outbound business correspondence, not a notification to a user; it is handled by this engine but has different sender/recipient logic.

---

## Interface / Contract

### Send Email (Internal Service Call)

This is not an HTTP endpoint exposed to the frontend. It is called internally by the notification system and job schedulers.

**Function signature:**

```typescript
sendEmail(params: {
  template_code: string,         // identifies the DB template
  recipient_email: string,
  recipient_name: string,
  variables: Record<string, any>, // template variable substitutions
  reply_to?: string,              // override Reply-To header
  attachments?: Array<{
    filename: string,
    storage_key: string,          // fetched from object storage at send time
    content_type: string
  }>,
  idempotency_key?: string
}): Promise<{ message_id: string, provider: string }>
```

---

## Email Configuration

| Setting | Value |
|---|---|
| From address | `noreply@simplesave.co.il` |
| From name | `SimpleSave` |
| Reply-To (default) | `support@simplesave.co.il` |
| Reply-To (bank correspondence) | Assigned advisor's email address |
| Encoding | UTF-8 |
| Language | Hebrew (RTL) |
| HTML emails | Yes, with plaintext fallback |
| Unsubscribe | Not required (transactional only) |

---

## Template Storage Model

```
email_templates
  id              UUID, PK
  code            VARCHAR UNIQUE (e.g., 'otp_verification')
  name_internal   VARCHAR (admin-facing display name)
  subject_he      VARCHAR (Hebrew subject line, supports {{variables}})
  body_html_he    TEXT (HTML body, Hebrew, RTL, Handlebars syntax)
  body_text_he    TEXT (plaintext fallback)
  variables_schema JSONB (list of expected variable names and types)
  is_active       BOOLEAN
  updated_by      UUID, FK → users.id
  updated_at      TIMESTAMP
```

Templates are rendered using Handlebars (or equivalent mustache-compatible engine). All templates include:

- RTL direction: `<html dir="rtl" lang="he">`
- SimpleSave header with logo
- Hebrew body content
- SimpleSave footer with: address, unsubscribe guidance (v1: "לשינוי הגדרות התקשורת צרו קשר עם support@simplesave.co.il"), copyright.

---

## Email Template Catalog

### T01 — OTP Verification

| Attribute | Value |
|---|---|
| Code | `otp_verification` |
| Subject | `קוד האימות שלך ב-SimpleSave` |
| Trigger | OTP request via email channel |
| Recipient | The email address that requested OTP |

**Body summary:** Your verification code is `{{otp_code}}`. Valid for 10 minutes. Do not share this code.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{otp_code}}` | string | 6-digit OTP code |
| `{{expiry_minutes}}` | integer | 10 |
| `{{request_time}}` | string | Formatted time of request |

---

### T02 — Welcome / Registration Confirmation

| Attribute | Value |
|---|---|
| Code | `welcome_registration` |
| Subject | `ברוך הבא ל-SimpleSave` |
| Trigger | First OTP verification (is_new_user = true) |
| Recipient | Client |

**Body summary:** Welcome to SimpleSave. Your account is ready. Start your mortgage journey by completing your personal details.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{client_name}}` | string | Client's full name (or "לקוח יקר" if not yet set) |
| `{{login_url}}` | string | App login URL |

---

### T03 — Document Uploaded (to Advisor)

| Attribute | Value |
|---|---|
| Code | `document_uploaded_advisor` |
| Subject | `מסמך חדש הועלה — {{client_name}}` |
| Trigger | Notification Trigger 3 |
| Recipient | Assigned Advisor (or Admin if no advisor assigned) |

**Body summary:** Client `{{client_name}}` has uploaded a new document: `{{document_label_he}}`. Review it in the application dashboard.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{client_name}}` | string | |
| `{{document_label_he}}` | string | Hebrew document type name |
| `{{uploaded_at}}` | string | Formatted timestamp |
| `{{application_url}}` | string | Deep link to application documents tab |

---

### T04 — Document Approved (to Client)

| Attribute | Value |
|---|---|
| Code | `document_approved_client` |
| Subject | `המסמך שלך אושר ב-SimpleSave` |
| Trigger | Notification Trigger 4 |
| Recipient | Client |

**Body summary:** Your document `{{document_label_he}}` has been approved.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{document_label_he}}` | string | |
| `{{approved_at}}` | string | |
| `{{personal_area_url}}` | string | |

---

### T05 — Document Rejected (to Client)

| Attribute | Value |
|---|---|
| Code | `document_rejected_client` |
| Subject | `נדרשת פעולה: מסמך נדחה ב-SimpleSave` |
| Trigger | Notification Trigger 5 |
| Recipient | Client |

**Body summary:** Your document `{{document_label_he}}` was rejected. Reason: `{{rejection_reason}}`. Please upload a corrected version.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{document_label_he}}` | string | |
| `{{rejection_reason}}` | string | |
| `{{upload_url}}` | string | Deep link to upload screen |

---

### T06 — All Documents Approved — Gate Unlock (to Client)

| Attribute | Value |
|---|---|
| Code | `all_documents_approved` |
| Subject | `כל המסמכים אושרו — ב-SimpleSave` |
| Trigger | Notification Trigger 7 |
| Recipient | Client |

**Body summary:** All your required documents have been approved. We are now proceeding to the principal approval stage. Your advisor will be in touch.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{client_name}}` | string | |
| `{{approved_at}}` | string | |
| `{{personal_area_url}}` | string | |

---

### T07 — Authorization Letter Ready to Sign (to Client)

| Attribute | Value |
|---|---|
| Code | `auth_letter_ready` |
| Subject | `כתבי ההסמכה שלך מוכנים — נדרשת חתימה` |
| Trigger | Notification Trigger 6 |
| Recipient | Client |

**Body summary:** Your authorization letters are ready. Download each letter, sign it, and upload the signed copy to your personal area.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{letter_count}}` | integer | Number of letters generated |
| `{{documents_url}}` | string | Deep link to documents tab |

---

### T08 — Principal Approval Response Received (to Client)

| Attribute | Value |
|---|---|
| Code | `principal_approval_response` |
| Subject | `תשובה לאישור עקרוני התקבלה — SimpleSave` |
| Trigger | Notification Trigger 9 |
| Recipient | Client |

**Body summary:** A response has been received from `{{bank_name}}` regarding your principal approval request. Your advisor will contact you to discuss the next steps.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{bank_name}}` | string | |
| `{{response_type_label_he}}` | string | "אושר" / "אושר בתנאים" / "נדחה" |
| `{{received_at}}` | string | |
| `{{personal_area_url}}` | string | |

---

### T09 — Bank Selected (to Client)

| Attribute | Value |
|---|---|
| Code | `bank_selected` |
| Subject | `בנק נבחר — SimpleSave` |
| Trigger | Application status transitions to `BANK_SELECTED` |
| Recipient | Client |

**Body summary:** Your advisor has selected `{{bank_name}}` for your mortgage. Congratulations on reaching this milestone. Next steps: mortgage signing.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{bank_name}}` | string | |
| `{{loan_amount_formatted}}` | string | |
| `{{selected_at}}` | string | |

---

### T10 — Mortgage Signed (to Client)

| Attribute | Value |
|---|---|
| Code | `mortgage_signed_client` |
| Subject | `ברוכים הבאים לבית החדש — המשכנתא נחתמה` |
| Trigger | Notification Trigger 10 |
| Recipient | Client |

**Body summary:** Congratulations! Your mortgage has been signed. The collateral process is now beginning. Your advisor will guide you through the remaining steps.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{client_name}}` | string | |
| `{{bank_name}}` | string | |
| `{{loan_amount_formatted}}` | string | |
| `{{signed_at}}` | string | |

---

### T11 — Drawdown Alert (to Client)

| Attribute | Value |
|---|---|
| Code | `drawdown_alert` |
| Subject | `תזכורת: משיכת כספי המשכנתא בעוד 7 ימים` |
| Trigger | Notification Trigger 12 (scheduled) |
| Recipient | Client |

**Body summary:** Reminder — your mortgage drawdown is scheduled for `{{drawdown_date}}`. Please ensure all collaterals are complete and contact your advisor if you have questions.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{drawdown_date}}` | string | Hebrew formatted date |
| `{{amount_formatted}}` | string | |
| `{{advisor_name}}` | string | |
| `{{advisor_email}}` | string | |

---

### T12 — Monthly Mortgage Update (to Client)

| Attribute | Value |
|---|---|
| Code | `monthly_mortgage_update` |
| Subject | `עדכון חודשי משכנתא — {{month_label}} — SimpleSave` |
| Trigger | Notification Trigger 14 (scheduled, 1st of month) |
| Recipient | Client (ACTIVE_MORTGAGE only) |

**Body summary:** Your monthly mortgage update for `{{month_label}}`. This month's payment: `{{monthly_payment_formatted}}` ₪ (principal: `{{principal_portion}}`, interest: `{{interest_portion}}`, CPI: `{{cpi_portion}}`). Remaining balance: `{{balance_remaining_formatted}}` ₪.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{month_label}}` | string | e.g., "יולי 2026" |
| `{{monthly_payment_formatted}}` | string | |
| `{{principal_portion}}` | string | |
| `{{interest_portion}}` | string | |
| `{{cpi_portion}}` | string | |
| `{{balance_remaining_formatted}}` | string | |

---

### T13 — Advisor Assigned (to Client)

| Attribute | Value |
|---|---|
| Code | `advisor_assigned` |
| Subject | `יועץ אישי הוקצה אליך — SimpleSave` |
| Trigger | Notification Trigger 2 (adapted for client-facing version) |
| Recipient | Client |

**Body summary:** A dedicated advisor, `{{advisor_name}}`, has been assigned to your application. You can message them directly through your personal area.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{advisor_name}}` | string | |
| `{{advisor_email}}` | string | (optional, if Tier 3) |
| `{{personal_area_url}}` | string | |

---

### T14 — System Parameter Recalculation Notification (to Client)

| Attribute | Value |
|---|---|
| Code | `system_param_recalculation` |
| Subject | `תוכניות המשכנתא שלך עודכנו — SimpleSave` |
| Trigger | Notification Trigger 13 (batch) |
| Recipient | Affected clients |

**Body summary:** System interest rate parameters have been updated. Your mortgage plans (clocks) have been recalculated. Log in to view your updated options.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{parameter_name_he}}` | string | Hebrew name of changed parameter |
| `{{clocks_url}}` | string | Deep link to clocks screen |

---

### T15 — Authorization Letter to Bank (Outbound Business Correspondence)

This is a distinct email type: it is sent FROM SimpleSave TO the bank's mortgage department, not to a SimpleSave user.

| Attribute | Value |
|---|---|
| Code | `auth_letter_to_bank` |
| Subject | `בקשת משכנתא — {{borrower_names}} — {{property_address}}` |
| Sender | `noreply@simplesave.co.il` |
| Reply-To | Assigned advisor's email address |
| Recipient | `banks.mortgage_department_email` |
| CC | Assigned advisor's email |
| Attachments | Generated authorization letter PDF(s) |
| Trigger | Advisor clicks "שלח כתב הסמכה לבנק" in the application screen |

**Body summary:** Formal request letter. SimpleSave is submitting a mortgage inquiry on behalf of the borrowers. Please find the signed authorization letter attached.

**Variables:**

| Variable | Type | Description |
|---|---|---|
| `{{borrower_names}}` | string | Comma-separated borrower names |
| `{{property_address}}` | string | |
| `{{loan_amount_formatted}}` | string | |
| `{{loan_term_years}}` | integer | |
| `{{advisor_name}}` | string | |
| `{{advisor_phone}}` | string | |
| `{{attachment_filename}}` | string | (referenced in body, actual attachment is separate) |

Bank contact addresses are stored in `banks.mortgage_department_email`. If a bank has no email configured, the action is blocked with a warning to the advisor.

---

## Provider Interface

The email engine abstracts the underlying provider behind an interface:

```typescript
interface EmailProvider {
  send(params: {
    to: string,
    to_name: string,
    from: string,
    from_name: string,
    reply_to: string,
    subject: string,
    html: string,
    text: string,
    attachments?: Array<{ filename: string, content: Buffer, content_type: string }>
  }): Promise<{ provider_message_id: string }>

  onDeliveryWebhook(event: ProviderWebhookEvent): void
}
```

Concrete implementations: `SendGridEmailProvider`, `SESEmailProvider`, etc. The active provider is selected via `SystemParameter.email_provider` (default: `sendgrid`).

---

## Tracking

The `notifications` table records delivery state:

| Field | Populated by |
|---|---|
| `sent_at` | Set immediately after successful `provider.send()` call |
| `delivered_at` | Populated via provider delivery webhook |
| `opened_at` | Optional — populated via open-tracking pixel webhook (can be disabled for privacy) |

Provider webhooks POST to `/webhooks/email/{provider}`. The endpoint matches the `provider_message_id` to a `notifications` row and updates the corresponding field.

---

## Retry Behavior

- On transient send failure (network error, 5xx from provider): retry up to 3 times.
- Backoff: 30s → 2 min → 10 min.
- After 3 failures: mark `notifications.failed_at`, log to dead-letter queue.
- Permanent failures (e.g., invalid email 4xx): do not retry. Log immediately.
- Admin can view failed email log and manually retry from the admin panel.

---

## Edge Cases

- **No email address on file:** Email dispatch is skipped. In-app notification is still sent. If SMS channel applies, SMS is sent. No error is raised — just the channel skips.
- **Bounce handling:** If the provider reports a hard bounce, set `users.email_bounced = true` and disable future email sending to that address. Admin is notified via in-app alert. Soft bounces: retry allowed per provider behavior.
- **Invalid email format:** Caught at input validation (user profile save). The email engine adds a final guard: if the address fails RFC 5321 validation, log error and skip without retry.
- **Bank with no mortgage_department_email (for T15):** Return error to the advisor interface: "כתובת דוא"ל של מחלקת משכנתאות לבנק X לא מוגדרת. יש לעדכן בהגדרות."
- **Template rendering error:** If Handlebars rendering throws (e.g., missing required variable), log the error with template_code and variables snapshot, skip send, record as failed in `notifications`.
- **Admin edits a template mid-flight:** The running send uses the template snapshot resolved at call time. Edits only affect subsequent sends.
- **Duplicate send prevention:** The `idempotency_key` on `notifications` prevents duplicate emails even if the job queue retries the enqueue step.

---

## Dependencies

- `email_templates` table
- `notifications` table
- `users` table (recipient email)
- `banks` table (mortgage_department_email for T15)
- Object storage (for PDF attachments on T15)
- Email provider SDK (SendGrid / SES / Postmark)
- Webhook endpoint for delivery tracking
- Template engine (Handlebars or equivalent)
- AuditLog (`EMAIL_SENT` event with template_code, recipient, message_id)
