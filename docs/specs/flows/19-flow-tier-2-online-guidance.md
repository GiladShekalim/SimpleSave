# Flow: Tier 2 — Online Guidance

## Purpose

Document the complete lifecycle flow for a Tier 2 client from tier activation through active mortgage status. Tier 2 extends the Tier 1 flow (flow-18) with a dedicated assigned advisor, fully functional two-way messaging throughout the process, more active advisor involvement in document review and bank coordination, and an enriched bank comparison view with advisor annotations.

Where steps are identical to Tier 1, this document references them but notes any Tier 2-specific differences. Where steps diverge significantly, they are fully specified.

---

## Preconditions

- Client has completed the 10-question wizard and registered via OTP.
- Admin has activated Tier 2 for the client after off-system payment confirmation.
- Admin has assigned an advisor to the client.
- Application status is: **TIER_SELECTED**.
- Both the client and the assigned advisor have received activation notifications.

---

## Steps

### Step 1 — Tier Activation and Advisor Assignment

1.1. Admin activates Tier 2 from the admin dashboard after confirming payment.
1.2. Admin selects an advisor from the active advisor list and assigns them to the client.
1.3. **Advisor notification:** Assigned advisor receives: "You have been assigned a new client: [Client Name]. Log in to review their application."
1.4. **Client notification:** Client receives: "Your Tier 2 — Online Guidance tier has been activated. Your advisor is [Advisor Name]. Log in to meet them in your personal area."
1.5. Client logs in via OTP. The personal area header shows: "Your Advisor: [Advisor Name]."
1.6. Available tabs (Tier 2, post-tier activation):
  - Clocks (interactive)
  - Personal Details (interactive)
  - Mortgage Details (interactive)
  - Documents (locked until AUTHORIZATION_SIGNED)
  - Principal Approval (locked until DOCUMENTS_APPROVED)
  - Collaterals (locked until BANK_SELECTED)
  - Messages (fully functional — compose, send, receive)
  - Post-Mortgage Dashboard (locked until ACTIVE_MORTGAGE)

---

### Step 2 — First Advisor Contact

2.1. The advisor opens the client's application in their advisor dashboard.
2.2. Advisor sees all tabs: Personal Details, Mortgage Details (pre-filled from wizard), Documents, Principal Approval, Collaterals, Messages.
2.3. Advisor sends an introductory message to the client via the Messages tab: e.g., "Hello [Client Name], I'm [Advisor Name] and I'll be guiding you through your mortgage process. Let's start by completing your personal details."
2.4. Client sees the message in their Messages tab with the advisor's name as the sender.
2.5. From this point, the Messages tab is the primary communication channel throughout all subsequent steps.

---

### Step 3 — Personal Details Completion (with Advisor Review)

3.1. Steps are identical to Tier 1 (flow-18, Step 2), with the following additions:

**Advisor involvement:**
3.2. After the client fills in personal details, the advisor reviews the data from their client detail view.
3.3. The advisor can:
  - **Edit the client's personal details directly** (within advisor permissions): changes are logged with the advisor's ID, and the client sees a subtle notification: "Your advisor updated your personal details."
  - **Send a message** asking the client to correct or clarify specific fields (e.g., "Please double-check your ID number in the Personal Details tab").
3.4. The status transition to PERSONAL_DETAILS_COMPLETE occurs when all mandatory fields are complete — regardless of whether the client or advisor filled them.
3.5. Advisor receives a notification when status reaches PERSONAL_DETAILS_COMPLETE.

---

### Step 4 — Authorization Letters

4.1. Identical to Tier 1 (flow-18, Step 3): system generates authorization letters; client downloads, signs, and uploads.
4.2. **Tier 2 difference:** The advisor is notified when the client uploads signed authorization documents. Advisor can review them before the Documents tab becomes fully active if desired (admin configuration; default = automatic unlock on upload).
4.3. Application status transitions to **AUTHORIZATION_SIGNED** on upload.
4.4. Advisor can send a message confirming receipt: "I can see your signed authorization. Great — your documents tab is now open."

---

### Step 5 — Document Upload (Client-Initiated, Advisor-Reviewed)

5.1. Documents tab unlocks with the same dynamic document list as Tier 1 (flow-18, Step 4).
5.2. The advisor can add manual document requirements via their advisor dashboard. New rows appear immediately in the client's Documents tab with a notification.
5.3. The client uploads documents as in Tier 1.
5.4. **Key Tier 2 difference — advisor reviews, not admin:**
  - The assigned advisor is the primary document reviewer for Tier 2 clients.
  - Admin retains oversight and can also review/approve/reject at any time.
  - Advisor reviews documents with **more active engagement**: leaves detailed notes on each document row (visible to client) explaining what is acceptable or what needs to be corrected.
5.5. **Messaging during document upload:**
  - At any point, the client can ask the advisor questions via the Messages tab. Messages are tagged with the current application stage (e.g., "[Documents Stage]").
  - The advisor responds. Messages appear in the client's Messages tab and in the advisor's client detail > Messages view.
  - Messages are stored permanently on the application record.
5.6. When the client uploads a document: the advisor receives a notification to review.

---

### Step 6 — Document Review (Advisor-Led)

6.1. Advisor reviews each uploaded document.
6.2. **Approve:** Document status → APPROVED. Advisor can leave an optional approval note visible to the client.
6.3. **Reject:** Advisor enters a rejection reason (required, min 10 characters). Document status → REJECTED. Client notified with reason. Client re-uploads. Advisor re-reviews.
6.4. **Request additional document:** Advisor adds a new row via "Add Document Requirement" in the advisor dashboard. Client is notified.
6.5. Advisor can annotate a document row with notes visible to the client (e.g., "Please ensure the payslip is from an official source and includes your employer's stamp.").
6.6. **Transition to DOCUMENTS_APPROVED:** When all mandatory documents are APPROVED: status transitions to **DOCUMENTS_APPROVED**. Client and advisor both receive notifications.

---

### Step 7 — Bank Submission (Advisor-Led)

7.1. After DOCUMENTS_APPROVED, the advisor reviews the complete application before submission.
7.2. **Advisor sends authorization letters to banks via the system:**
  - Principal Approval tab shows a "Submit to Banks" action for the advisor.
  - The advisor selects which banks to submit to (from a configured bank list).
  - System generates emails with the client's authorization letters attached, sent from the SimpleSave system email on behalf of the advisor.
  - A log entry is created per bank: submission timestamp, bank name, advisor ID.
7.3. Application status transitions to **PRINCIPAL_APPROVAL_REQUESTED**.
7.4. Client receives notification: "Your advisor has submitted your application to [N] banks. We'll notify you as responses arrive."
7.5. Advisor sends a message: "I've submitted your application to [N] banks. I'll update you as soon as we hear back."

---

### Step 8 — Bank Responses (Advisor Enters Manually)

8.1. Banks respond to the advisor via email or phone (off-system).
8.2. Advisor enters each response into the system via the Principal Approval tab on the client's application:
  - Bank name
  - Approved loan amount (NIS)
  - Interest rate (%)
  - Loan term (years)
  - Conditions / notes
  - Response date
8.3. When the first bank response is entered: application status transitions to **PRINCIPAL_APPROVAL_RECEIVED**.
8.4. Client receives notification: "Great news! A bank has responded. Your advisor is reviewing the offers."
8.5. Advisor continues entering responses as they arrive. Multiple responses can be entered at any time while status = PRINCIPAL_APPROVAL_RECEIVED.

---

### Step 9 — Bank Comparison View (מכרז ריביות / Interest Rate Tender)

9.1. After at least one bank response is entered, the client can view the Principal Approval tab.
9.2. **Tier 2 enhanced bank comparison view (מכרז ריביות):**
  - All approved bank offers are displayed in a comparison grid.
  - Each row shows: bank name/logo, approved amount, interest rate, loan term, monthly payment estimate, conditions.
  - The advisor's recommended bank is highlighted with a visual indicator: "Advisor Recommendation" badge.
  - **Advisor annotations:** Each bank offer row can have an advisor note visible to the client (e.g., "This bank offers the best rate but has a longer processing time." or "Recommended — best rate given your profile.").
9.3. Advisor sets the recommendation and adds notes via their advisor dashboard (Principal Approval tab on the client's application).
9.4. Client can see the advisor's notes and recommendation but makes the final bank selection themselves.
9.5. **Advisor sends a message** explaining the comparison: "I've reviewed all the bank offers. I recommend [Bank Name] because [reason]. Take a look and let me know if you have any questions."

---

### Step 10 — Client Selects Bank

10.1. Client reviews the bank comparison view and advisor annotations.
10.2. Client can message the advisor with questions before deciding.
10.3. Client clicks "Select This Bank" on their chosen offer.
10.4. Confirmation dialog: "Are you sure you want to select [Bank Name]?" → "Confirm."
10.5. Application status transitions to **BANK_SELECTED**.
10.6. Client and advisor both receive notifications of the selection.
10.7. Advisor sends a confirmation message: "Perfect — you've selected [Bank Name]. I'll coordinate the next steps for signing."

---

### Step 11 — Mortgage Signing Accompaniment (Off-System, Advisor-Led)

11.1. The advisor coordinates the mortgage signing with the client and the selected bank.
11.2. For Tier 2, this accompaniment is **remote** (phone, video call, messages) unless the client opts for an in-person session (typically Tier 3).
11.3. The signing process is off-system. The advisor guides the client via messages during this stage.
11.4. Once signing is complete, the advisor marks the application: **MORTGAGE_SIGNED** in the system.
11.5. Advisor enters final mortgage details:
  - Final loan amount
  - Final interest rate (per track)
  - Final loan term
  - Signing date
  - Bank reference number
11.6. Collaterals tab unlocks.

---

### Step 12 — Collaterals (Advisor-Managed)

12.1. Advisor populates the collateral items from their advisor dashboard.
12.2. Each item: collateral type, status (PENDING / COMPLETE), notes.
12.3. Client views the collaterals tab (read-only).
12.4. Advisor can send messages explaining each collateral requirement (e.g., "You'll need to sign a property lien registration form at your attorney's office. I'll send you the details.").
12.5. When all collateral items are COMPLETE: advisor marks them all done → application status transitions to **COLLATERALS_COMPLETE** → then immediately to **ACTIVE_MORTGAGE**.

---

### Step 13 — Post-Mortgage and Ongoing Advisor Support

13.1. Client receives notification: "Congratulations — your mortgage is now active!"
13.2. Post-Mortgage Dashboard tab unlocks and is set as the default landing tab.
13.3. Dashboard shows: final mortgage summary, monthly payment schedule, remaining balance, next payment date.
13.4. **Tier 2 ongoing support:** The Messages tab remains fully functional after ACTIVE_MORTGAGE. Client can continue messaging their advisor with questions about the ongoing mortgage.
13.5. Advisor is responsible for responding to post-mortgage messages within a service level defined internally.

---

## State Transitions

(Same as Tier 1; the only behavioral difference is that advisor drives more steps)

| Trigger | From Status | To Status |
|---|---|---|
| Admin activates Tier 2 and assigns advisor | REGISTERED / QUESTIONNAIRE_COMPLETE | TIER_SELECTED |
| All mandatory personal details complete (by client or advisor) | TIER_SELECTED | PERSONAL_DETAILS_COMPLETE |
| Signed authorization uploaded | PERSONAL_DETAILS_COMPLETE | AUTHORIZATION_SIGNED |
| All mandatory documents uploaded | AUTHORIZATION_SIGNED | DOCUMENTS_SUBMITTED |
| All mandatory documents approved by advisor | DOCUMENTS_SUBMITTED | DOCUMENTS_APPROVED |
| Advisor submits to banks via system | DOCUMENTS_APPROVED | PRINCIPAL_APPROVAL_REQUESTED |
| First bank response entered by advisor | PRINCIPAL_APPROVAL_REQUESTED | PRINCIPAL_APPROVAL_RECEIVED |
| Client selects a bank | PRINCIPAL_APPROVAL_RECEIVED | BANK_SELECTED |
| Advisor marks mortgage signed | BANK_SELECTED | MORTGAGE_SIGNED |
| Advisor marks all collaterals complete | MORTGAGE_SIGNED | COLLATERALS_COMPLETE → ACTIVE_MORTGAGE |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Advisor is reassigned mid-process | Admin reassigns the client to a new advisor. New advisor immediately gains full read/write access. Old advisor retains read-only access until ACTIVE_MORTGAGE. Both advisors notified. Client notified: "Your advisor has changed. Your new advisor is [Name]." Full application history (messages, notes, document notes) transfers to the new advisor's view. |
| Advisor is unavailable (illness, leave) | Admin can either reassign the client immediately or temporarily take the advisor role themselves via the admin dashboard. If admin acts in place of the advisor, their actions appear under the admin's identity in the audit log. |
| Client upgrades from Tier 1 to Tier 2 mid-process | Admin changes tier to Tier 2 in the admin dashboard. All existing data (personal details, documents, approvals) is preserved and carries over. Admin assigns an advisor. Messages tab unlocks. Advisor sees the full application history including any previously approved documents. |
| Client messages advisor outside business hours | Messages are stored and delivered. There is no SLA enforcement in v1. Advisor sees the message on next login. |
| Advisor adds annotation to a bank offer after the client has already selected a different bank | The annotation is stored but the bank selection is already made. No notification is sent to the client for annotations on non-selected offers post-selection. |
| Multiple bank responses arrive on the same day | Advisor enters all responses. All appear in the comparison grid. Client sees all offers simultaneously. |
| Client disagrees with advisor's bank recommendation and selects a different bank | Fully allowed. The client has final say on bank selection. No blocking or warning is shown. The advisor's recommendation remains visible as an annotation for reference. |
| Advisor rejects a document that was already approved (correction needed) | Advisor changes document status to REJECTED (with reason). Application status reverts from DOCUMENTS_APPROVED to DOCUMENTS_SUBMITTED. Client is notified. Client re-uploads. Review restarts for that document only; other approved documents retain their status. |
| Client reaches ACTIVE_MORTGAGE and requests further advice | Client can continue messaging the advisor. The advisor's access to the application remains active in read-only mode. Post-mortgage dashboard data is the primary reference. |
| Advisor accidentally enters wrong bank response data | Advisor can edit the response entry while status = PRINCIPAL_APPROVAL_RECEIVED. Each edit is logged with the before/after values. If status has advanced past PRINCIPAL_APPROVAL_RECEIVED, admin must be involved to make corrections. |
| Application has 5 borrowers — advisor edits personal details for one borrower | The edit is logged with advisor ID and the specific borrower affected. The client receives a notification: "Your advisor updated the personal details for borrower [Name]." |
