# 05 — Document Management

## Purpose

Define how documents are collected, stored, reviewed, and approved in SimpleSave. Covers dynamic document list generation per borrower profile, the upload and review workflow, the approval gate for principal approval, storage security, authorization letter handling, and access control.

## Overview

Each mortgage application has a dynamic set of required and optional documents. The required set is computed from the borrower profile (employment status, loan type, existing loans, property situation). Clients upload documents through the personal area. Advisors review and approve or reject each document. All required-for-principal-approval documents must reach `approved` status before the application can transition to `PRINCIPAL_APPROVAL_REQUESTED`. Files are stored in S3-compatible object storage with no public access.

---

## Interface / Contract

### Document Record

```
documents
  id                         UUID, PK
  application_id             UUID, FK → applications.id
  document_type_id           UUID, FK → document_types.id (nullable if manual)
  manual_label               VARCHAR NULL (for advisor-added manual docs)
  is_required                BOOLEAN
  required_for_principal_approval BOOLEAN
  status                     ENUM('required', 'uploaded', 'approved', 'rejected')
  uploaded_by_user_id        UUID NULL, FK → users.id
  uploaded_at                TIMESTAMP NULL
  storage_key                VARCHAR NULL (S3 object key)
  original_filename          VARCHAR NULL
  file_size_bytes            INTEGER NULL
  mime_type                  VARCHAR NULL
  rejection_reason           TEXT NULL
  approved_by_user_id        UUID NULL, FK → users.id
  approved_at                TIMESTAMP NULL
  rejected_by_user_id        UUID NULL, FK → users.id
  rejected_at                TIMESTAMP NULL
  version                    INTEGER DEFAULT 1 (increments on re-upload)
  created_at                 TIMESTAMP
```

### Document Types Reference Table

```
document_types
  id            UUID, PK
  code          VARCHAR UNIQUE (e.g., 'bank_statements_3m')
  label_he      VARCHAR (Hebrew display name)
  description_he TEXT (shown via ⓘ tooltip)
  default_required BOOLEAN
  required_for_principal_approval BOOLEAN
  sort_order    INTEGER
```

---

## Dynamic Document List Generation

When an application is created (or when the borrower profile changes in the questionnaire), the system evaluates the document requirements. The rules below determine which `document_types` are instantiated as `documents` rows for the application.

### Always Required (All Applications)

| Code | Document | Required for Principal Approval |
|---|---|---|
| `authorization_letters` | כתבי הסמכה — Authorization Letters | Yes |
| `bank_statements_3m` | דפי חשבון 3 חודשים | Yes |
| `id_document` | תעודת זהות + ספח (front + back for biometric) | Yes |

### Conditional on Employment Status

| Condition | Code | Document | Required for PA |
|---|---|---|---|
| Any borrower is `employee` | `pay_slips_3m` | תלושי שכר 3 חודשים | Yes |
| Any borrower is `self_employed` | `bank_income_confirmation` | אישור הכנסות מהבנק | Yes |
| Any borrower is `self_employed` | `tax_assessment_last_year` | שומת מס שנה אחרונה | Yes |

### Conditional on Financial Profile

| Condition | Code | Document | Required for PA |
|---|---|---|---|
| Any borrower has `has_loans = true` | `loan_breakdown_detail` | פירוט הלוואות קיימות | Yes |
| Any borrower renting or renting out property | `rental_contract` | חוזה שכירות | Yes |

### Conditional on Borrower Ownership Status

| Condition | Code | Document | Required for PA |
|---|---|---|---|
| Any borrower is `non_property_owner` | `guarantor_details` | פרטי ערב | Yes |

### Optional Documents (Always Shown, Not Blocking)

| Code | Document | Required for PA |
|---|---|---|
| `savings_fund_statement` | דף ניירות ערך / קרן חסכון | No |
| `purchase_contract_mash` | חוזה רכישה + הצהרת מש"ח | No (if loan_type ≠ all_purpose) |
| `property_appraisal` | חוות דעת שמאי | No |
| `tabu_mishkenet_minha` | נסח טאבו / משכנתא / מינהל | No |

### Manual Documents

Advisors can add custom document requirements at any time. Manual documents have `document_type_id = null` and a `manual_label` text field. The advisor sets `is_required` when adding. These are included in the approval gate check if `required_for_principal_approval = true`.

### Rule Evaluation Order

1. Start with always-required list.
2. For each borrower in the application, evaluate each conditional rule.
3. Deduplicate — if two borrowers both trigger the same document type, create only one `documents` row.
4. Add optional document rows (status = `required`, not blocking).
5. Persist the `documents` rows. Existing rows for the application are not deleted if a rule no longer applies after a questionnaire edit — instead, set `is_required = false`. This preserves any already-uploaded files.

---

## Required-for-Approval Gate

**Definition:** All `documents` rows for an application where `required_for_principal_approval = true` must have `status = 'approved'` before the application can transition to `DOCUMENTS_APPROVED`.

**Gate Check Implementation:**

```
function checkDocumentApprovalGate(application_id):
  blocking_docs = SELECT * FROM documents
    WHERE application_id = ?
      AND required_for_principal_approval = true
      AND status != 'approved'
  
  if blocking_docs.count == 0:
    transition application to DOCUMENTS_APPROVED
    fire notification Trigger 7 (All Documents Approved)
  else:
    return { blocked: true, pending_docs: blocking_docs }
```

This check runs:
- After each individual document approval by an advisor.
- After re-upload of a previously rejected document completes.

---

## Upload Flow

### Client-Side Steps

1. Client navigates to Documents tab in personal area.
2. Each document row shows: Hebrew label, ⓘ tooltip button, status badge, upload button (or drag-and-drop zone).
3. Client selects file via file picker or drags file onto the drop zone.
4. Frontend validates before upload:
   - File size ≤ 10 MB. If exceeded: show "קובץ גדול מדי. הגודל המקסימלי הוא 10MB."
   - MIME type is `application/pdf`, `image/jpeg`, or `image/png`. If not: show "פורמט קובץ לא נתמך. יש להעלות PDF, JPG או PNG."
5. Frontend sends multipart POST to `/applications/{id}/documents/{document_id}/upload`.
6. Server re-validates file size and MIME type.
7. Server uploads file to object storage (see Storage section).
8. Server updates `documents` row: `status = 'uploaded'`, `storage_key`, `original_filename`, `file_size_bytes`, `mime_type`, `uploaded_at`, `uploaded_by_user_id`.
9. Server fires Trigger 3 (Client Uploaded Documents) notification.
10. Frontend refreshes document row status to show "הועלה" (uploaded) badge.

### Re-Upload After Rejection

1. Client sees rejection reason displayed beneath the document row.
2. Client uploads a new file.
3. Server increments `version`, overwrites `storage_key` (previous version file in storage is not deleted — kept for audit; the previous key is stored in `document_versions` table if audit trail needed).
4. `status` reverts to `uploaded`, `rejection_reason` cleared, `approved_at` and `approved_by_user_id` cleared.
5. Advisor is notified (Trigger 3).
6. Advisor must re-approve.

---

## Storage

- Provider: S3-compatible object storage (AWS S3, MinIO, or equivalent).
- Bucket: dedicated per environment (e.g., `simplesave-documents-prod`).
- Object key format: `{application_id}/{document_type_code}/{uuid}_{original_filename}`
  - Example: `a1b2c3/bank_statements_3m/f9e8d7_statements.pdf`
  - For manual documents: `{application_id}/manual/{uuid}_{original_filename}`
- Access: Bucket policy = no public access. All file access via server-generated pre-signed URLs.
- Pre-signed URL expiry: 15 minutes (for document viewer use).
- Server never streams the file to the client directly — it issues a pre-signed URL and the client fetches from storage.
- Server-side encryption: AES-256 (SSE-S3 or SSE-KMS).

---

## Advisor Review Flow

1. Advisor navigates to client's application → Documents tab.
2. Advisor sees all `documents` rows with status badges and file viewer buttons.
3. For each uploaded document:
   - Advisor clicks the document name or view icon → document viewer modal opens (see Document Viewer).
   - Advisor clicks "אשר" (Approve) or "דחה" (Reject).
   - If Reject: modal prompts for rejection reason (required text field, min 10 characters).
4. On Approve: `status → approved`, `approved_by_user_id`, `approved_at` set. Notification Trigger 4 fired.
5. On Reject: `status → rejected`, `rejection_reason` set, `rejected_by_user_id`, `rejected_at` set. Notification Trigger 5 fired.
6. After each approve action, gate check runs (see above).

---

## Document Viewer

- Triggered by clicking a document name in the documents list (any status other than `required`).
- Server generates a 15-minute pre-signed URL for the storage object.
- Modal opens containing:
  - PDF: embedded `<iframe>` or PDF.js viewer.
  - Image (JPG/PNG): `<img>` tag.
- Modal header shows: document type label, upload date, current status.
- Modal is read-only; no editing of the file from the viewer.

---

## Authorization Letters (כתבי הסמכה)

Authorization letters are a special document type that is generated (not uploaded by client) as the first step. See `06-pdf-generation.md` for generation details.

**Document flow for authorization letters:**

1. Letters are generated as PDFs and stored in object storage (same bucket, under `{application_id}/authorization_letters/`).
2. Each letter appears as a separate `documents` row with `document_type_id → authorization_letters`, one per bank.
3. Status after generation: `uploaded` (pre-populated by system, not client upload).
4. Client downloads each letter (pre-signed URL), signs physically or with an external tool, and re-uploads the signed copy.
5. On re-upload of signed copy, `version` increments and `status → uploaded` awaiting advisor approval.
6. Once all authorization letters are approved, contributes to the gate check.
7. Status `AUTHORIZATION_SIGNED` is set when all authorization letter documents are in `approved` status.

---

## Tooltip (ⓘ) Descriptions

Each document type has a `description_he` field in the `document_types` table. This is displayed as a tooltip (or expandable info panel) when the client clicks the ⓘ icon next to the document name.

Example for `bank_statements_3m`:
> "דפי חשבון בנק מלאים לשלושת החודשים האחרונים, כולל כל דפי המסמך. יש להוריד ישירות מהאתר של הבנק או לסרוק."

These descriptions are admin-editable via the `document_types` table management screen.

---

## Access Control

| Role | Access |
|---|---|
| Client | Can view and upload their own application's documents only. Cannot see other applications. |
| Advisor | Can view all documents of assigned clients. Can approve/reject. Cannot see documents of clients assigned to other advisors. |
| Admin | Can view all documents for all applications. Can approve/reject. Can add manual document requirements. Can view document storage metadata. |

Server enforces these rules on every document endpoint. Requests for documents belonging to another user's application return 403 Forbidden.

---

## Auto-Save of Questionnaire Answers

Although not a document upload, document-adjacent note: the questionnaire wizard (which determines borrower profile and thus document requirements) auto-saves on each step completion. This means:

- `borrowers` and `application` records are updated incrementally.
- If the borrower profile changes (e.g., a borrower is marked `self_employed` after step 4), the document generation logic re-evaluates and adds any newly-required document rows.
- Existing `documents` rows are never deleted during re-evaluation; `is_required` may be set to `false` if a rule no longer applies.

---

## Error Handling

| Error | Handling |
|---|---|
| File too large (>10MB) | Client-side and server-side check. Return 413 with message "קובץ גדול מדי". |
| Unsupported format | Client-side and server-side MIME check. Return 415. |
| Storage upload failure | Retry 3 times, exponential backoff. If all fail, return 500 to client with "שגיאה בהעלאת הקובץ, נסה שנית." Alert logged. |
| Pre-signed URL generation failure | Return 503. Client shown "אירעה שגיאה בטעינת המסמך." |
| Document not found | Return 404. |
| Unauthorized access | Return 403. |
| Duplicate upload (same file, same slot) | Allowed — treated as a new version. Overwrites the previous file reference in `documents`, increments `version`. |

---

## Edge Cases

- **Document approved then re-uploaded:** When a client uploads a new file to a slot already in `approved` status, the status reverts to `uploaded` and the document requires re-approval. This is intentional — the approved file and the new file may differ.
- **Advisor not assigned:** Document uploads by the client notify all Admins instead of an advisor.
- **Multiple borrowers, same document type:** Only one `documents` row per `(application_id, document_type_id)`. The single row represents the combined requirement for the application.
- **Application in final status (ACTIVE_MORTGAGE):** Document upload is disabled for read-only terminal statuses. The documents tab shows history only.
- **Admin-added manual document after gate already passed:** If an advisor adds a required manual document after the application has already reached `DOCUMENTS_APPROVED`, the status reverts to `DOCUMENTS_SUBMITTED` and the gate check re-evaluates. This is an exceptional action and the admin is warned before confirming.
- **File viewer for image (portrait vs landscape):** The viewer should handle both orientations. No server-side image transformation is performed in v1.

---

## Dependencies

- `documents` table
- `document_types` table
- `applications` table (status transitions)
- `borrowers` table (profile data for dynamic rule evaluation)
- Object storage (S3-compatible)
- Notification system (`04-notification-system.md`, Triggers 3, 4, 5, 7)
- PDF generation (`06-pdf-generation.md`) for authorization letters
- AuditLog (all document status changes)
