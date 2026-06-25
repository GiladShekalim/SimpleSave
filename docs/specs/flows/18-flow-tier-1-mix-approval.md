# Flow: Tier 1 — Mix + Principal Approval (Self-Service)

## Purpose

Document the complete lifecycle flow for a Tier 1 client from the moment their tier is activated through to active mortgage status. Tier 1 is a self-service tier: the client fills their own data, uploads documents, receives principal approval results, and selects a bank — with admin monitoring in the background and no dedicated assigned advisor. All key steps, state transitions, auto-save behavior, document review cycles, and edge cases are covered.

---

## Preconditions

- Client has completed the 10-question wizard (status: QUESTIONNAIRE_COMPLETE or REGISTERED).
- Client has registered via OTP (status: REGISTERED).
- Admin has activated Tier 1 for the client after off-system payment confirmation.
- Application status is now: **TIER_SELECTED**.
- No advisor is assigned for Tier 1 clients. Document review and bank submission are handled by admin.

---

## Steps

### Step 1 — Personal Area Entry (Post-Tier Activation)

1.1. Client receives a notification (SMS/email): "Your Tier 1 — Mix + Principal Approval has been activated. Log in to continue your application."
1.2. Client logs in via OTP.
1.3. Client lands on the personal area hub.
1.4. Available tabs (per Tier 1 access rules):
  - Clocks (interactive)
  - Personal Details (interactive — primary CTA)
  - Mortgage Details (interactive)
  - Documents (locked — shows "Complete personal details and sign authorization to unlock")
  - Principal Approval (locked)
  - Collaterals (locked)
  - Messages (visible, read-only, shows upgrade prompt — no compose)
  - Post-Mortgage Dashboard (locked)
1.5. A first-time prompt banner: "Welcome! Start by completing your personal details to continue your application."

---

### Step 2 — Personal Details Tab Completion

2.1. Client clicks on the Personal Details tab.
2.2. The form displays all mandatory fields for each borrower on the application.

**Mandatory personal details fields (per borrower):**
- Full name (pre-filled from registration)
- ID number (Israeli Teudat Zehut — 9 digits)
- Date of birth (pre-filled from wizard Q6)
- Marital status (dropdown: single / married / divorced / widowed)
- Address (street, city, postal code)
- Email address
- Phone number (pre-filled from registration)
- Employment type (employee / self-employed / both)
- Bank account details (bank, branch, account number — for authorization letters)
- Property ownership status (owns property / does not own property) — affects 50% income rule

**Additional per-borrower fields (optional but prompted):**
- Employer name (if employee)
- Years at current employer

2.3. **Auto-save behavior:** Every field triggers an auto-save on focus-out (blur event). A subtle save indicator ("Saved ✓") appears next to the last-saved field. There is no manual "Save" button.
2.4. The system tracks completeness in real-time. A progress indicator shows: "Personal Details: [X of Y fields complete]."
2.5. For applications with multiple borrowers, each borrower has a sub-section (accordion or tab). All borrowers must complete their mandatory fields.

**Transition to PERSONAL_DETAILS_COMPLETE:**
2.6. When all mandatory fields for all borrowers are filled and pass validation: application status automatically transitions to **PERSONAL_DETAILS_COMPLETE**.
2.7. A success notification is shown inline: "Personal details complete. Your authorization letters are being prepared."
2.8. System generates authorization letters (one per target bank). Client is notified via SMS/email.

---

### Step 3 — Authorization Signing

3.1. Personal Details tab and Mortgage Details tab transition to **read-only** (minor edits require contacting admin support).
3.2. A new prompt appears in the personal area (or within the Personal Details tab): "Your authorization letters are ready. Please download, sign, and upload them."
3.3. **v1 signing flow (download + upload):**
  - A "Download Authorization Letters" button generates a ZIP file containing one PDF authorization letter per bank.
  - Client downloads, prints, signs physically (or uses a digital signature tool outside the system), and scans.
  - Client clicks "Upload Signed Authorization" and uploads the signed file(s).
3.4. IF all authorization documents are uploaded: application status transitions to **AUTHORIZATION_SIGNED**.
3.5. Documents tab unlocks.
3.6. Client receives confirmation: "Authorization received. Your documents tab is now unlocked."

---

### Step 4 — Documents Tab: Upload Required Documents

4.1. Client clicks on the Documents tab.
4.2. The system displays a **dynamic document list** generated based on the client's profile (loan type, employment type, number of borrowers, etc.).
4.3. **Document list generation rules:**
  - Employee borrower: payslips (last 3 months), bank statements (last 3 months), employment letter.
  - Self-employed borrower: last 3 years' tax assessments, certified bank statements, accountant letter.
  - All applicants: ID copy (Teudat Zehut), property documentation (purchase contract or appraiser report), equity proof (bank statement showing equity funds).
  - Additional property: proof of ownership of existing property.
  - Price for Residents: certificate of eligibility.
4.4. Each document row shows:
  - Document name (Hebrew + English)
  - Whether it is mandatory or optional
  - Status: MISSING / UPLOADED / APPROVED / REJECTED
  - Upload button (or "Re-upload" if previously uploaded)
  - Rejection reason (shown inline if status = REJECTED)
  - Admin notes (shown if any notes were added)
4.5. **Upload behavior:**
  - Accepted formats: PDF, JPG, PNG.
  - Maximum file size: [configured by admin; default 10 MB per file].
  - Upload is per-document (one file per document row; multi-page documents should be combined into one PDF).
  - On upload: document status changes from MISSING to UPLOADED immediately.
4.6. After each upload, admin receives a background notification (no real-time interruption to client flow).

---

### Step 5 — All Documents Submitted

5.1. When the client has uploaded at least one file for every mandatory document: the system shows a "Submit Documents for Review" button (or automatic submission if all mandatory docs are uploaded simultaneously).
5.2. IF the client clicks "Submit for Review" (or all mandatory docs are uploaded): application status transitions to **DOCUMENTS_SUBMITTED**.
5.3. Client sees a confirmation banner: "Your documents have been submitted for review. We'll notify you of the outcome."
5.4. Admin receives a notification: "Application [ID] — all documents submitted for review."

---

### Step 6 — Document Review by Admin

6.1. Admin opens the application in the admin dashboard.
6.2. Admin reviews each uploaded document.
6.3. For each document, admin either:
  - **Approves:** Document status → APPROVED. Client is not immediately notified per document (batch notification when all are reviewed).
  - **Rejects:** Admin enters a rejection reason (required). Document status → REJECTED. Client is notified immediately with the rejection reason.
  - **Requests additional document:** Admin adds a new row to the document list with a custom name and description.
6.4. **If any document is rejected:**
  - Client receives notification: "One or more documents need attention. Please review the feedback in your Documents tab."
  - Client sees the rejected document row with the reason displayed.
  - Client re-uploads the corrected document → status resets to UPLOADED → admin notified to re-review.
  - This review cycle repeats until all mandatory documents are APPROVED.
6.5. **If additional document is requested:**
  - New row appears in client's document list immediately.
  - Client receives notification: "A new document has been requested. Please see your Documents tab."
6.6. **Transition to DOCUMENTS_APPROVED:** When all mandatory documents (including any manually added ones) have status = APPROVED: application status transitions to **DOCUMENTS_APPROVED**.
6.7. Client receives notification: "All documents approved! Your Principal Approval tab is now unlocked."

---

### Step 7 — Principal Approval Tab Unlocked

7.1. Client clicks on the Principal Approval tab.
7.2. Initial state: "Your documents have been approved. We are preparing to submit your application to banks. You will be notified when responses are received."
7.3. Application is queued for bank submission.

---

### Step 8 — Bank Submission

8.1. Admin (acting as the submission agent for Tier 1) reviews the client's complete application.
8.2. Admin sends the authorization letters to the target banks (via email from the system interface, or manually — v1).
8.3. Admin marks the submission in the system: triggers status transition to **PRINCIPAL_APPROVAL_REQUESTED**.
8.4. Client receives notification: "Your application has been submitted to banks. We will notify you as responses arrive."
8.5. Principal Approval tab shows: "Application submitted to [N] banks. Awaiting responses."

---

### Step 9 — Bank Responses Entered

9.1. Banks respond to the authorization requests (off-system — via phone, fax, or email to the admin/advisor team).
9.2. Admin enters each bank response manually into the system via the Principal Approval tab on the application:
  - Bank name
  - Approved loan amount (NIS)
  - Interest rate (%)
  - Loan term (years)
  - Conditions / special notes
  - Response date
9.3. When at least one bank response is entered: application status transitions to **PRINCIPAL_APPROVAL_RECEIVED**.
9.4. Client receives notification: "A bank has responded to your application! View your approval options in the Principal Approval tab."
9.5. Additional bank responses can be entered at any time while status = PRINCIPAL_APPROVAL_RECEIVED.

---

### Step 10 — Client Views Bank Approvals and Selects Bank

10.1. Client opens the Principal Approval tab.
10.2. A grid is shown with one row per bank response:
  - Bank name / logo
  - Approved loan amount
  - Interest rate offered
  - Loan term
  - Conditions
  - "Select This Bank" button
10.3. Client reviews the options.
10.4. Client clicks "Select This Bank" on their preferred offer.
10.5. A confirmation dialog: "Are you sure you want to select [Bank Name]? This will begin the mortgage signing process."
  - "Confirm" → application status transitions to **BANK_SELECTED**. Client receives confirmation.
  - "Cancel" → no change.
10.6. After BANK_SELECTED: Principal Approval tab becomes read-only. The selected bank is highlighted.

---

### Step 11 — Mortgage Signing (Off-System) and Admin Confirmation

11.1. The mortgage signing process occurs off-system (client visits bank branch or signs remotely with the bank).
11.2. Admin monitors and assists as needed (via admin dashboard).
11.3. Once signing is complete, admin marks the application: **MORTGAGE_SIGNED**.
11.4. Admin enters final mortgage details:
  - Final loan amount
  - Final interest rate
  - Final loan term
  - Signing date
11.5. Collaterals tab unlocks for the client (view-only; populated by admin).

---

### Step 12 — Collaterals Tab

12.1. Admin populates the collateral items (e.g., property lien registration, life insurance assignment).
12.2. Each collateral item shows:
  - Collateral type
  - Status (PENDING / COMPLETE)
  - Notes
12.3. Client can view the collaterals list (read-only).
12.4. When all collateral items are marked as COMPLETE by admin: application status transitions to **COLLATERALS_COMPLETE**, then immediately to **ACTIVE_MORTGAGE**.

---

### Step 13 — Post-Mortgage Dashboard

13.1. Application is now ACTIVE_MORTGAGE.
13.2. Client receives notification: "Congratulations! Your mortgage is now active."
13.3. Post-Mortgage Dashboard tab unlocks and becomes the default landing tab.
13.4. Dashboard shows:
  - Active mortgage summary (final terms)
  - Monthly payment schedule
  - Remaining balance
  - Next payment due date
  - Key contact information (admin/support)
13.5. All other tabs transition to read-only. No further editing is possible.

---

## State Transitions

| Trigger | From Status | To Status |
|---|---|---|
| Admin activates Tier 1 | REGISTERED / QUESTIONNAIRE_COMPLETE | TIER_SELECTED |
| All mandatory personal details complete | TIER_SELECTED | PERSONAL_DETAILS_COMPLETE |
| Signed authorization uploaded | PERSONAL_DETAILS_COMPLETE | AUTHORIZATION_SIGNED |
| All mandatory documents uploaded | AUTHORIZATION_SIGNED | DOCUMENTS_SUBMITTED |
| All mandatory documents approved by admin | DOCUMENTS_SUBMITTED | DOCUMENTS_APPROVED |
| Admin submits to banks | DOCUMENTS_APPROVED | PRINCIPAL_APPROVAL_REQUESTED |
| First bank response entered | PRINCIPAL_APPROVAL_REQUESTED | PRINCIPAL_APPROVAL_RECEIVED |
| Client selects a bank | PRINCIPAL_APPROVAL_RECEIVED | BANK_SELECTED |
| Admin marks mortgage signed | BANK_SELECTED | MORTGAGE_SIGNED |
| Admin marks all collaterals complete | MORTGAGE_SIGNED | COLLATERALS_COMPLETE → ACTIVE_MORTGAGE |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Client returns to personal area after abandoning mid-process | The application resumes from its last saved status. All previously entered data is intact. The relevant tab is highlighted as the next required action. |
| Client wants to upgrade from Tier 1 to Tier 2 mid-process | Admin can change the tier from the admin dashboard at any stage up to MORTGAGE_SIGNED. All existing data is preserved. An advisor is assigned. Messaging tab unlocks. |
| Client re-uploads a document that admin had already approved | Document status reverts from APPROVED to UPLOADED. Admin receives a re-review notification. If the application was in DOCUMENTS_APPROVED status, it reverts to DOCUMENTS_SUBMITTED until the re-uploaded document is approved again. |
| Admin rejects a document after DOCUMENTS_APPROVED was reached | Application status reverts from DOCUMENTS_APPROVED to DOCUMENTS_SUBMITTED. Client is notified. Client re-uploads. |
| Client selects a bank but the bank later withdraws the approval | Admin changes application status back to PRINCIPAL_APPROVAL_RECEIVED manually (logged). Client is notified: "The selected bank has withdrawn their approval. Please select another bank." Bank selection is reset. |
| Client's personal details include information inconsistent with documents (e.g., income on form does not match payslip) | Document reviewer (admin) rejects the document with a note. Client must re-upload a corrected document or update personal details (admin unlocks editing if needed). |
| Admin submits to more banks after initial submission | Additional bank names can be added in the Principal Approval tab. Submission to additional banks is logged. Status remains PRINCIPAL_APPROVAL_REQUESTED until first response. |
| Two bank responses arrive simultaneously | Both are entered by admin; both appear in the bank grid. Client sees all offers. |
| Client wants to change their bank selection after BANK_SELECTED | Allowed before MORTGAGE_SIGNED. Admin can reset the bank selection (reverts to PRINCIPAL_APPROVAL_RECEIVED) with a logged reason. After MORTGAGE_SIGNED: no change possible. |
| Mandatory personal detail field is left blank (auto-save partial data) | Auto-save saves the partial state. The completeness tracker shows the field as incomplete. Status does not advance to PERSONAL_DETAILS_COMPLETE until all mandatory fields are filled. |
| Authorization letter signing is done digitally outside the system | v1 does not verify the signature method. The client simply uploads the file. Admin visually reviews the signed document as part of the general document review step. |
