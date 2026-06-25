# 06 — PDF Generation

## Purpose

Define server-side PDF generation for authorization letters (כתבי הסמכה). Each letter authorizes SimpleSave to negotiate with a specific bank on behalf of the borrowers. One letter is generated per participating bank. Generation is triggered after the application reaches `PERSONAL_DETAILS_COMPLETE` status. The generated PDFs are stored alongside other application documents.

## Overview

Authorization letters are legal documents. Each bank may have different wording requirements. Templates are stored in the database and are editable by Admin. When generation is triggered, the system fetches all active bank templates, populates borrower and property data into each template, renders the PDF server-side, and stores the result in object storage. The client then downloads, signs, and re-uploads the signed copy.

---

## Interface / Contract

### Generate Authorization Letters Endpoint

**POST** `/applications/{application_id}/authorization-letters/generate`

**Authorization:** Advisor or Admin only.

**Trigger conditions (server validates before proceeding):**
- `applications.status` must be `PERSONAL_DETAILS_COMPLETE` or later.
- `applications.personal_details_complete = true`.
- Application must have at least one borrower with full details.

**Response (202 Accepted — async generation):**
```json
{
  "job_id": "uuid",
  "bank_count": 4,
  "estimated_completion_seconds": 10
}
```

**Alternatively, if synchronous generation completes in <5s, respond 200:**
```json
{
  "generated_letters": [
    {
      "document_id": "uuid",
      "bank_id": "uuid",
      "bank_name": "בנק הפועלים",
      "storage_key": "a1b2c3/authorization_letters/uuid_auth_letter_hapoalim_a1b2c3_20260625.pdf",
      "filename": "auth_letter_hapoalim_a1b2c3_20260625.pdf",
      "generated_at": "ISO-8601"
    }
  ]
}
```

---

## Template Structure

Each authorization letter template is stored as a record in the `authorization_letter_templates` table:

```
authorization_letter_templates
  id              UUID, PK
  bank_id         UUID, FK → banks.id
  template_html   TEXT (HTML/CSS template with Handlebars variables)
  version         INTEGER
  is_active       BOOLEAN
  updated_by      UUID, FK → users.id
  updated_at      TIMESTAMP
```

### Letter Structure (Per Template)

The rendered letter contains the following sections in order:

1. **SimpleSave Header**
   - SimpleSave logo
   - Company name and address: SimpleSave בע"מ, [address]
   - Date: `{{date}}` (generation date, Hebrew format: DD/MM/YYYY)

2. **Bank Recipient Block**
   - To: `{{bank_name}}`
   - Bank address: `{{bank_address}}`
   - Branch: `{{bank_branch_name}}, סניף {{bank_branch_number}}`

3. **Subject Line**
   > הנדון: הסמכה לטיפול במשכנתא

4. **Borrower Identification**
   > אנו החתומים מטה, {{borrower_1_full_name}}, ת.ז. {{borrower_1_id_number}}{{#if borrower_2}}, ו-{{borrower_2_full_name}}, ת.ז. {{borrower_2_id_number}}{{/if}}, מסמיכים בזאת את SimpleSave בע"מ לפעול בשמנו מול {{bank_name}} בכל הנוגע לבקשת משכנתא לנכס הנמצא בכתובת {{property_address}}.

5. **Authorization Body**
   > SimpleSave מוסמכת לנהל משא ומתן, לקבל הצעות, ולהמציא כל מסמך הנדרש לטיפול בבקשת ההלוואה בסך {{loan_amount_formatted}} ₪ לתקופה של {{loan_term_years}} שנים.

   Each bank's `template_html` may customize the wording of this paragraph. The variables remain the same.

6. **Loan Details Table**

   | שדה | ערך |
   |---|---|
   | סכום ההלוואה המבוקש | {{loan_amount_formatted}} ₪ |
   | מטרת ההלוואה | {{loan_purpose_label}} |
   | כתובת הנכס | {{property_address}} |
   | תקופת ההלוואה המבוקשת | {{loan_term_years}} שנים |

7. **Signature Block**
   ```
   ___________________________        ___________________________
   {{borrower_1_full_name}}           {{borrower_2_full_name}} (אם רלוונטי)
   ת.ז. {{borrower_1_id_number}}     ת.ז. {{borrower_2_id_number}}
   תאריך: _____________               תאריך: _____________
   ```

8. **SimpleSave Footer**
   - "מסמך זה הופק על ידי מערכת SimpleSave"
   - Generation timestamp
   - Confidentiality notice

---

## Template Variable Mapping

All variables are resolved from the `applications` and `borrowers` tables at generation time.

| Template Variable | Source |
|---|---|
| `{{date}}` | Current date at generation time |
| `{{bank_name}}` | `banks.name_he` |
| `{{bank_address}}` | `banks.address` |
| `{{bank_branch_name}}` | `application.preferred_bank_branch_name` (if set) or blank |
| `{{bank_branch_number}}` | `application.preferred_bank_branch_number` (if set) or blank |
| `{{borrower_1_full_name}}` | `borrowers[0].first_name + last_name` |
| `{{borrower_1_id_number}}` | `borrowers[0].id_number` |
| `{{borrower_2_full_name}}` | `borrowers[1].first_name + last_name` (if exists) |
| `{{borrower_2_id_number}}` | `borrowers[1].id_number` (if exists) |
| `{{property_address}}` | `applications.property_address` |
| `{{loan_amount_formatted}}` | `applications.requested_loan_amount` formatted with thousands separator |
| `{{loan_purpose_label}}` | `loan_purposes.label_he` (joined via `applications.loan_purpose_id`) |
| `{{loan_term_years}}` | `applications.desired_loan_term_years` |

If a required variable has a null value at generation time, the generation fails for that letter and an error is logged (see Error Handling).

---

## Generation Trigger

### Conditions for Generation

The generation action is available when:
1. `applications.status >= PERSONAL_DETAILS_COMPLETE`
2. All required personal details fields on all borrowers are populated (full name, ID number).
3. `applications.property_address` is not null.
4. `applications.requested_loan_amount` is not null.

### Who Can Trigger

- Advisor: can trigger generation manually from the client's application screen.
- Client: can request generation by clicking "בקש כתבי הסמכה" in the documents tab (sends a request to the advisor, does not auto-generate without advisor confirmation). In v1, client-initiated generation is a notification to the advisor only.
- System: generation can be triggered automatically when the application transitions to `PERSONAL_DETAILS_COMPLETE` if admin enables auto-generation in SystemParameters.

### Batch Generation

When triggered, all bank letters are generated in a single batch operation:

1. Fetch all active `authorization_letter_templates` (one per bank that the application is submitting to).
2. For each template, render HTML with borrower data using the template engine (Handlebars).
3. Convert rendered HTML to PDF using the server-side PDF renderer (Puppeteer, wkhtmltopdf, or equivalent).
4. Upload each PDF to object storage.
5. Create or update `documents` rows (one per bank, `document_type_id → authorization_letters`).
6. Fire Trigger 6 (Authorization Letter Ready to Sign) notification once all letters are complete.

---

## File Naming Convention

```
auth_letter_{bank_slug}_{application_id}_{date}.pdf
```

| Component | Format | Example |
|---|---|---|
| `bank_slug` | Lowercase alphanumeric, underscores | `hapoalim`, `leumi`, `mizrahi_tefahot` |
| `application_id` | First 8 chars of UUID | `a1b2c3d4` |
| `date` | YYYYMMDD | `20260625` |

Full example: `auth_letter_hapoalim_a1b2c3d4_20260625.pdf`

**Storage path:** `{application_id}/authorization_letters/{filename}`

---

## E-Signature Flow (v1)

v1 uses a download-sign-upload flow. E-signature platform integration is deferred to v2.

1. System generates the letter PDF and stores it.
2. Client sees the letter in the Documents tab with status "ממתין לחתימה".
3. Client clicks "הורד לחתימה" — receives a pre-signed download URL (15 min expiry).
4. Client prints and signs physically, or uses a third-party tool (e.g., Adobe Acrobat, DocuSign outside the system).
5. Client uploads the signed PDF back to the same document slot.
6. Advisor reviews the signed copy and approves it.

Display note: the Documents tab shows two actions per authorization letter: "הורד" (download unsigned template) and "העלה חתום" (upload signed copy).

---

## Storage

- Same S3-compatible bucket as other documents: `simplesave-documents-{env}`.
- Path: `{application_id}/authorization_letters/{filename}`.
- Access: pre-signed URLs only, no public access.
- Retention: generated PDFs are retained indefinitely (same as other documents).

---

## Error Handling

| Error | Action |
|---|---|
| Missing required template variable (e.g., null ID number) | Skip that letter. Log error. Return partial result with list of failed letters. Admin alerted. |
| HTML rendering error | Retry template rendering up to 3 times. If persistent, skip letter, log error with stack trace. |
| PDF conversion failure | Retry 3 times. If all fail, mark job as failed, notify Admin via in-app notification. |
| Storage upload failure | Retry 3 times with exponential backoff. If all fail, mark job as failed. |
| No active bank templates found | Return 422 with message "אין תבניות בנק פעילות. יש להגדיר תבניות בממשק הניהול." |
| Partial batch failure (some letters succeed, some fail) | Complete successful letters, store them. Return list of succeeded and failed letters. Advisor notified of failure. |

On any failure, the job record (`pdf_generation_jobs` table) records: `status = 'failed'`, `error_detail`, `failed_at`.

---

## Edge Cases

- **Regeneration:** If generation is triggered again after letters already exist, the system creates new files with the current date in the filename, creates new `documents` rows, and marks the old rows as superseded (`status → required` or a new `superseded` status). Old files remain in storage for audit.
- **Single borrower vs two borrowers:** Template rendering omits the second borrower block if `borrowers` count is 1. The `{{#if borrower_2}}` guard handles this.
- **Bank with no template:** If a bank does not have an active `authorization_letter_templates` row, that bank is skipped. A warning is surfaced in the generation result.
- **Letter for bank not in the original mix:** In v1, authorization letters are generated for all banks configured in the system (or a curated list configured per application). The exact scope of which banks receive letters is determined by the advisor at generation time.
- **Admin editing a template after letters are generated:** Editing a template does not retroactively update already-generated PDFs. Regeneration must be triggered manually to get letters with the updated template.

---

## Dependencies

- `authorization_letter_templates` table
- `banks` table
- `applications` table
- `borrowers` table
- `documents` table and `document_types` table
- Object storage (S3-compatible)
- PDF rendering library (Puppeteer / wkhtmltopdf / equivalent)
- Template engine (Handlebars or equivalent)
- Notification system (`04-notification-system.md`, Trigger 6)
- AuditLog (`PDF_GENERATED` event with application_id, bank_id, filename)
