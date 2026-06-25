# Flow 22 — Principal Approval and Bank Selection

## Purpose

Describe the flow from DOCUMENTS_APPROVED through advisor-led bank submissions, bank response collection, client review of principal approval offers, bank selection, mortgage signing, and transition to COLLATERALS_PENDING.

---

## Preconditions

- Application status = DOCUMENTS_APPROVED.
- All required documents for principal approval are in approved state.
- Authorization letters (PDFs) have been signed by the client.
- Banks are configured in the system with mortgage department email addresses.
- Advisor is assigned to the application.

---

## Steps

### 1. Advisor / Admin Initiates Bank Submissions

1. Advisor (or admin) opens the client application in the advisor dashboard.
2. Advisor navigates to the "Principal Approval" section.
3. System displays the list of banks eligible for submission, pre-selected based on the recommended mix. Advisor may deselect or add banks.
4. Advisor clicks "Submit to Banks".
5. Confirmation dialog: "Submit authorization letters to [N] banks?"
6. Advisor confirms.

### 2. System Sends Authorization Letters to Banks

For each selected bank:

1. System retrieves the signed authorization letter PDF for this application.
2. System composes an email:
   - **To:** Bank.mortgage_department_email (from Bank record)
   - **CC:** Advisor.email
   - **Subject:** formal Hebrew subject line including client name and application reference number
   - **Body:** formal Hebrew request letter (template stored in system, populated with application data)
   - **Attachment:** signed authorization letter PDF
3. Email is dispatched via the system's email engine.
4. A BankSubmission record is created for each bank:
   - application_id, bank_id, submitted_at, status = submitted, email_sent = true.
5. IF email delivery fails for a bank: BankSubmission.email_sent = false; advisor notified: "Email to [Bank Name] failed — please send manually."

### 3. Application Status Update and Client Notification

1. After all submission emails are queued (not waiting for delivery confirmation):
   - Application.status → PRINCIPAL_APPROVAL_REQUESTED
2. **Client notification** (in-app + email): "בקשתך הוגשה לבנקים. הליך אישור העקרוני עשוי להימשך מספר ימים עד שבועות."
3. The Principal Approval tab in client's Personal Area shows: "בקשות נשלחו — ממתין לתשובות הבנקים."
4. Advisor dashboard shows: "Awaiting responses from [N] banks."

### 4. Advisor Tracks Bank Responses Offline

1. Advisor follows up with each bank via phone, email, or in-person branch visits.
2. This activity occurs off-system; system does not track individual advisor-bank communications.
3. When a bank provides a response (verbal or written), advisor enters it into the system.

### 5. Advisor Enters Bank Response

For each bank response received:

1. Advisor opens the client application → Principal Approval section → bank row → "Enter Response".
2. Response form fields:
   - Response date (date picker, required)
   - Decision: Approved / Rejected (radio, required)
   - **IF Approved:**
     - Approved amount (NIS, number, required)
     - Offered track details (mix description, interest rate, term — free text or structured fields)
     - Conditions (free text, optional): any stipulations from the bank
     - Valid until date (date picker, optional)
   - **IF Rejected:**
     - Rejection reason (free text, required)
3. Advisor saves the response.
4. BankSubmission record updated:
   - status → approved OR rejected
   - response_date → entered date
   - All response fields populated.

#### Best Offer Calculation

- After each bank approval is entered, the system computes is_best_offer:
  - **If admin has configured metric = highest_amount:** bank with the highest approved_amount is flagged is_best_offer = true; all others = false.
  - **If admin has configured metric = best_rate:** bank with the lowest interest rate is flagged is_best_offer = true; all others = false.
  - **Tie-breaking:** if two banks have identical values on the configured metric, both are flagged is_best_offer = true (both highlighted on the UI).
- Advisor can also manually override the is_best_offer flag with an audit log entry.

### 6. Application Status After First Response

1. When the first BankSubmission with status = approved OR rejected is saved:
   - Application.status → PRINCIPAL_APPROVAL_RECEIVED
2. **Client notification** (in-app + email): "התקבלה תשובה מהבנקים. כנס לאזור האישי לפרטים."
3. Advisor dashboard updates: response count indicator refreshes.

### 7. Client Reviews Principal Approval Screen

1. Client opens Personal Area → Principal Approval tab.
2. Screen shows a grid of all participating banks (see screen spec for layout detail):
   - **Approved banks:** logo displayed at full brightness; approval amount, offered terms, and conditions shown; "Select This Bank" button visible.
   - **Pending banks:** logo dimmed; "Awaiting response" label.
   - **Rejected banks:** logo dimmed; "Declined" label (Hebrew: "נדחה"); rejection reason visible to advisor only (not shown to client by default — advisor decides whether to share).
   - **Best offer bank:** highlighted card (e.g., border, badge "המלצת היועץ" or "ההצעה הטובה ביותר").
3. Tier 3 clients: advisor contacts client to schedule a review meeting (via calendar booking) to walk through offers together before selection.
4. Advisor's recommendation is shown if the advisor has entered one (free text field visible on client screen).

### 8. Client Selects a Bank

1. Client clicks "בחר בנק זה" (Select This Bank) on the chosen bank card.
2. Confirmation dialog:
   - Title: "אישור בחירת בנק"
   - Body: "אתה עומד לבחור את [Bank Name]. הצעה: [Approved Amount NIS] לתקופה של [Term]. האם להמשיך?"
   - Buttons: "אשר" (Confirm) | "ביטול" (Cancel)
3. On confirm:
   - BankSubmission.status for selected bank → selected
   - BankSubmission.status for all other approved banks → not_selected
   - Application.status → BANK_SELECTED
   - Application.selected_bank_id → bank_id
4. Remaining unselected banks shown with "לא נבחר" (Not Selected) label replacing their action button.
5. **Advisor notification:** "Client [Name] has selected [Bank Name] as their lender."
6. **Client confirmation** (in-app): "בחרת ב[Bank Name]. היועץ שלך יצור קשר לתיאום חתימה."

### 9. Pre-Signing Phase

1. Advisor coordinates appointment at the selected bank for mortgage signing (off-system).
2. Advisor may use the Messages tab to communicate with client about scheduling.
3. Tier 3 advisors typically attend the signing appointment in person.

### 10. Mortgage Signing

1. After the mortgage is signed at the bank, the advisor returns to the system.
2. Advisor opens the application → Principal Approval tab → "Mark as Signed".
3. Signing confirmation form:
   - Signing date (date picker, required)
   - Final mortgage details:
     - Actual approved amount (NIS, required)
     - Actual mix / track breakdown (structured: per track — type, amount, rate, term)
     - Drawdown schedule (list of: drawdown date, amount)
     - Any additional conditions noted at signing (free text, optional)
4. Advisor saves. System updates:
   - Application.status → MORTGAGE_SIGNED
   - Application.final_mortgage_details → saved record
   - MortgageSigning record created (signing_date, advisor_id, bank_id, final details).

### 11. Transition to Collaterals

1. Immediately on MORTGAGE_SIGNED save:
   - Application.status → COLLATERALS_PENDING
2. Collaterals tab unlocks in client's Personal Area.
3. **Client notification:** "המשכנתא נחתמה. כעת יש להשלים את הביטחונות הנדרשים."
4. Continue to flow-23 (Post-Mortgage).

---

## State Transitions

| From | To | Trigger |
|---|---|---|
| DOCUMENTS_APPROVED | PRINCIPAL_APPROVAL_REQUESTED | Advisor submits to banks |
| PRINCIPAL_APPROVAL_REQUESTED | PRINCIPAL_APPROVAL_RECEIVED | First bank response entered by advisor |
| PRINCIPAL_APPROVAL_RECEIVED | BANK_SELECTED | Client confirms bank selection |
| BANK_SELECTED | MORTGAGE_SIGNED | Advisor marks mortgage as signed |
| MORTGAGE_SIGNED | COLLATERALS_PENDING | Automatic on MORTGAGE_SIGNED save |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| All banks reject | No BANK_SELECTED transition. Principal Approval screen shows: "כל הבנקים דחו את הבקשה. אנא פנה ליועץ שלך." Do NOT show "Select This Bank" button on any card. Advisor receives alert: "All banks declined for [Client Name]." |
| Client selects bank then changes mind (before MORTGAGE_SIGNED) | Advisor can reset: opens application → Principal Approval → "Reset Bank Selection". Requires confirmation + mandatory reason (audit logged). Application.status reverts to PRINCIPAL_APPROVAL_RECEIVED. All BankSubmission.status reverts to approved/rejected (not selected). Client notified of reset. |
| Best offer tie (two banks with identical metric) | Both flagged is_best_offer = true. Both highlighted on the client screen with "ההצעה הטובה ביותר" badge. |
| Bank email delivery fails | BankSubmission.email_sent = false. Advisor notified inline. Bank row in the submissions list shows a warning icon. Application status still transitions to PRINCIPAL_APPROVAL_REQUESTED. |
| Advisor enters wrong bank response data | Advisor can edit any bank response until BANK_SELECTED. After BANK_SELECTED, only admin can edit with mandatory audit log entry and reason. |
| Bank responds with conditional approval (conditions attached) | Advisor enters conditions in the free-text conditions field. Conditions are shown on the client's bank card (advisors can configure visibility). |
| Multiple drawdowns scheduled | Each is entered as a separate row in the drawdown schedule table at signing step. Each will generate its own alert event (flow-23). |

---

## Error States

| Error | User-Facing Message | System Action |
|---|---|---|
| Bank email send failure | Advisor sees: "Email to [Bank Name] failed. Please contact the bank directly." | BankSubmission.email_sent = false. Application flow continues. |
| Required field missing in bank response form | Inline validation: "שדה חובה" on each missing field. Save button disabled until all required fields filled. | N/A |
| Bank selection on non-approved bank | "Select This Bank" button not rendered for non-approved banks. | N/A — UI-level prevention. |
| Advisor marks signed without selecting drawdown schedule | System validates at least one drawdown entry exists. If missing: "נא הוסף לפחות תשלום משיכה אחד." | Save blocked. |
