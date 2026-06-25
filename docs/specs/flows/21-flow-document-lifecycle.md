# Flow 21 — Document Lifecycle

## Purpose

Describe the full lifecycle of a single document from the moment it is identified as required through client upload, advisor review, approval or rejection, and the gate check that triggers DOCUMENTS_APPROVED. Covers both system-generated and manually added document requirements.

---

## Preconditions

- Application exists and is in status AUTHORIZATION_SIGNED or later.
- Client profile data (employment status, loan type, borrower roles) has been collected so that required document types can be determined.
- At least one advisor is assigned to the application (or admin is reviewing directly).

---

## Steps

### 1. Document Requirement Generation

1. When application profile data is saved (Personal Details complete), the system evaluates the client profile against the document requirement rules:

   | Condition | Documents Required |
   |---|---|
   | All borrowers | Authorization letters, bank statements (3 months), ID copy |
   | employment_status = employee | Pay slips (3 months) |
   | employment_status = self_employed | Income confirmation, tax assessment (last 2 years) |
   | Active loans exist | Loan detail letters |
   | Renting (not owning current home) | Rental contract |
   | Loan type != all_purpose | Purchase contract |
   | Non-owner borrower exists | Guarantor details |
   | savings_fund_exists = true | Savings fund statement (optional) |
   | Advisor manual addition | Any label (advisor-specified, required or optional) |
   | Appraisal | Optional (advisor may mark required) |
   | Tabu extract | Optional (advisor may mark required) |

2. For each required document, the system creates a Document record:
   - application_id, document_type, label (Hebrew display name), status = required, is_required = true/false, uploaded_at = null, file_url = null, rejection_reason = null.
3. These records appear immediately in the client's Documents tab.

### 2. Client Sees Document List

1. Client navigates to the Documents tab in Personal Area.
2. Each document row displays:
   - Document name (Hebrew label)
   - Status badge: "נדרש" (Required — red), "הועלה" (Uploaded — yellow), "אושר" (Approved — green), "נדחה" (Rejected — red with reason icon)
   - Upload button (if status = required or rejected)
   - File link (if status = approved)
   - Rejection reason text (if status = rejected)

### 3. Client Uploads a Document

1. Client clicks the "העלאה" (Upload) button on a document row, OR drags and drops a file onto the row.
2. Client selects a file via the OS file picker or the drag-drop zone.

### 4. File Validation (Client-Side and Server-Side)

1. **Client-side validation (immediate, before upload begins):**
   - File type must be PDF, JPG, or PNG. If not: show error toast "קובץ לא נתמך. ניתן להעלות PDF, JPG או PNG בלבד." Do not upload.
   - File size must be <= 10 MB. If above 10 MB: show error toast "הקובץ גדול מדי. הגודל המקסימלי הוא 10MB." Do not upload.
   - File size of exactly 10 MB: allowed (boundary is inclusive).
2. **Server-side validation (after upload begins):**
   - Re-check MIME type from file content (not just extension).
   - Re-check file size.
   - If server validation fails: return error, delete partial upload, set Document.status back to previous value.

### 5. File Storage and Status Update

1. On successful validation, file is stored in secure object storage (AES-256 at rest, TLS 1.3 in transit).
2. File stored under path: `/{application_id}/documents/{document_type}/{timestamp}_{original_filename}`.
3. Document record updated:
   - status → uploaded
   - file_url → secure storage reference
   - uploaded_at → current timestamp
   - IF previously approved (re-upload): status reverts to uploaded, approval revoked (see step 12 for details)
4. Upload progress indicator shown to client during transfer. On completion: status badge updates to "הועלה" (Uploaded) without page reload.

### 6. Advisor Notification

1. System sends notification to assigned advisor (in-app notification + email):
   - "הלקוח [Client Name] העלה מסמך: [Document Label]"
   - Direct link to the document in the advisor dashboard.

### 7. Advisor Opens Document Viewer

1. Advisor clicks the notification or navigates to the client's Documents tab in the advisor dashboard.
2. Advisor clicks on the uploaded document row.
3. Modal overlay opens:
   - **PDF:** rendered inline using PDF viewer component (page navigation, zoom).
   - **Image (JPG/PNG):** displayed inline with zoom.
4. Document metadata shown: upload date, file name, file size.
5. Advisor sees two action buttons: "אשר" (Approve) and "דחה" (Reject).

### 8. Advisor Decision

#### 8a. Approve

1. Advisor clicks "אשר".
2. Confirmation prompt: "Approve this document?"
3. On confirm:
   - Document.status → approved
   - Document.approved_at → current timestamp
   - Document.approved_by → advisor_id
4. **Client notification** (in-app + email): "המסמך [Document Label] אושר."
5. In the client's Documents tab: document name becomes a clickable link to the approved file; status badge shows "אושר" (green).
6. System runs the gate check (step 10).

#### 8b. Reject

1. Advisor clicks "דחה".
2. Rejection reason text area appears (mandatory, free text, Hebrew label: "סיבת הדחייה").
3. Advisor must enter at least 1 character before the confirm button activates.
4. On confirm:
   - Document.status → rejected
   - Document.rejection_reason → advisor's text
   - Document.rejected_at → current timestamp
   - Document.rejected_by → advisor_id
5. **Client notification** (in-app + email): "המסמך [Document Label] נדחה. סיבה: [Rejection Reason Text]"
6. In the client's Documents tab: document row shows rejection reason inline; Upload button reappears.

### 9. Rejection Re-Upload Loop

1. Client sees rejection reason in the document row.
2. Client prepares a corrected file and clicks the Upload button.
3. Steps 3–8 repeat.
4. IF rejected again: loop repeats. No limit on re-upload attempts.

### 10. Gate Check — DOCUMENTS_APPROVED Trigger

After every document approval event:

1. System queries: find all Document records for this application where is_required = true AND required_for_principal_approval = true.
2. IF all such documents have status = approved:
   - Application status → DOCUMENTS_APPROVED
   - **Client notification:** "כל המסמכים אושרו. לשונית אישור עקרוני נפתחה."
   - Principal Approval tab unlocks in the client's Personal Area.
   - Advisor notified: "All required documents approved for [Client Name]. Application ready for bank submission."
3. IF any required document is still pending/uploaded/rejected: no transition; gate remains closed.

### 11. Advisor Adds Manual Document Requirement

1. Advisor clicks "Add Document" in the client's Documents tab (advisor view).
2. Dialog opens:
   - Label (Hebrew text input, required)
   - Required / Optional toggle (default: required)
   - Notes for client (optional free text)
3. Advisor confirms. System creates a new Document record:
   - document_type = manual, label = advisor-entered text, status = required, is_required = as set, added_by = advisor_id.
4. Document appears immediately in the client's Documents tab with "נדרש" badge.
5. **Client notification:** "נוסף מסמך חדש לרשימה: [Label]. אנא העלה אותו."

### 12. Duplicate / Re-Upload Rules

| Scenario | Behavior |
|---|---|
| Client uploads a new file to a document currently in 'required' state | Normal upload flow. |
| Client uploads a new file to a document currently in 'uploaded' state (pre-review) | New file overwrites previous. status remains uploaded. Advisor notified of re-upload. |
| Client uploads a new file to a document currently in 'approved' state | status reverts to uploaded. Previous approval is removed (approved_at, approved_by cleared). Document.previous_version_url saved for audit. Advisor notified: "Client re-uploaded a previously approved document: [Label]. Re-review required." |
| Client uploads a new file to a document currently in 'rejected' state | Normal re-upload flow. Rejection reason cleared. status → uploaded. |

### 13. Document List Changes After Profile Update

1. IF client updates profile data that adds a new document requirement (e.g., adds a loan → loan detail required), system creates new Document records with status = required.
2. New documents appear in the client's Documents tab immediately.
3. **Client notification:** "מסמך חדש נדרש: [Label]."
4. Already-approved documents are NOT affected by profile changes — they remain approved.
5. Gate check re-evaluates: if new required document added, DOCUMENTS_APPROVED is NOT yet triggered even if previously all docs were approved.

---

## State Transitions (per Document record)

| From | To | Trigger |
|---|---|---|
| — | required | System generates requirement OR advisor adds manual doc |
| required | uploaded | Client uploads a valid file |
| uploaded | approved | Advisor approves |
| uploaded | rejected | Advisor rejects (with reason) |
| rejected | uploaded | Client re-uploads |
| approved | uploaded | Client re-uploads an approved document |

## Application-Level State Triggered by Document Flow

| Condition | Application Status Transition |
|---|---|
| All required_for_principal_approval docs = approved | DOCUMENTS_SUBMITTED → DOCUMENTS_APPROVED |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Client uploads wrong file type | Validate before upload. Show Hebrew error toast. Do not create or modify Document record. |
| File exactly at 10 MB boundary | Allowed. Upload proceeds normally. |
| Duplicate upload (any current status) | See step 12 table above. |
| Advisor approves doc, then client re-uploads | Document reverts to uploaded. Advisor receives re-review notification. Gate check does not re-trigger until advisor re-approves. |
| Required documents change after profile update | New required docs added. Already-approved docs remain. Gate check re-evaluates. |
| Advisor adds optional document, client does not upload | Optional documents do not block the gate check. Gate ignores is_required = false records. |
| File storage service temporarily unavailable | Upload fails with error: "שגיאת שרת בעת ההעלאה. אנא נסה שוב." Document status unchanged. Client can retry. |
| Advisor account deactivated with pending reviews | Documents remain in 'uploaded' state. New assigned advisor receives notification of all pending documents upon assignment. |

---

## Error States

| Error | User-Facing Message | System Action |
|---|---|---|
| Invalid file type | "קובץ לא נתמך. ניתן להעלות PDF, JPG או PNG בלבד." | Upload blocked. No server request. |
| File too large | "הקובץ גדול מדי. הגודל המקסימלי הוא 10MB." | Upload blocked. No server request. |
| Server-side MIME mismatch | "הקובץ אינו תקין. אנא בדוק את הקובץ ונסה שוב." | Partial upload deleted. Status unchanged. |
| Storage service error | "שגיאת שרת בעת ההעלאה. אנא נסה שוב." | Upload rolled back. Status unchanged. Admin alerted. |
| Rejection without reason | Reject button disabled until reason entered. | N/A |
| Notification delivery failure | Silent retry (3 attempts). If all fail: admin alert. | Status transitions proceed normally regardless of notification failure. |
