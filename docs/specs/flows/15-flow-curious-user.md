# Flow: Curious User (Pre-Registration Wizard)

## Purpose

Document the complete step-by-step experience of a site visitor who arrives with no session, explores the New Mortgage wizard, and either registers to see results or exits without fully registering. This flow covers all 10 questionnaire questions, inline validations, the registration gate shown after Q10, clock preview, drill-down, and data retention behavior on exit.

No tier selection occurs in this flow. Clocks are shown in preview mode only — the client cannot proceed to the personal area until registration is complete (covered in flow-16).

---

## Preconditions

- User has no active session (no cookie / token present).
- The system is operational (no maintenance window).
- CPI, interest rate tables, and at least one mix definition are configured in the admin panel.

---

## Steps

### 1. Arrive at Home Page

1.1. User navigates to the SimpleSave home page.
1.2. No session detected. The page renders in guest mode: header shows "Sign In" and "Get Started" buttons. No personal area link.
1.3. Hero section displays a primary CTA button labeled: **"New Mortgage — Start Here"** (Hebrew: חישוב משכנתה).

---

### 2. Enter the Wizard

2.1. User clicks the "New Mortgage" CTA button.
2.2. System navigates to the wizard start screen (step 1 of 10).
2.3. A progress indicator is shown at the top: "Step 1 of 10."
2.4. Each wizard step occupies the full screen. A "Back" button is visible from step 2 onward.
2.5. Auto-save: on every completed step, answers are written to browser sessionStorage. If the user is already registered and logged in, answers are also persisted to the backend.

---

### 3. Wizard Questions (Q1–Q10)

#### Q1 — Loan Type

- **Field:** Radio buttons (single select, required).
- **Options:** Primary Residence (נכס יחיד) | Additional Property (נכס נוסף) | All-Purpose Loan (לכל מטרה) | Home Improvement (שיפור דיור).
- **Validation:** Selection required. No skip.
- **On invalid:** "Next" button is disabled until an option is selected.
- **Conditional logic:** Selection sets the financing ratio used in Q4 validation and shown in the clock output.
- **UI note:** A brief tooltip per option explains what it means (e.g., "Additional Property: purchasing a second home you will not live in as your primary residence").

---

#### Q2 — Property Source

- **Field:** Radio buttons (single select, required).
- **Options:** Contractor (קבלן) | Second Hand (יד 2) | Price for Residents (מחיר למשתכן) | Self-Build (בנייה עצמית).
- **Validation:** Selection required. No skip.
- **On invalid:** "Next" button disabled.
- **Conditional logic:** If "Price for Residents" is selected, Q4 equity minimum changes to max(10% of value, 100,000 NIS).

---

#### Q3 — Property Value

- **Field:** Number input (NIS), formatted with thousands separator.
- **Validation rules:**
  - Required.
  - Minimum: 100,000 NIS.
  - No defined maximum.
  - Must be a positive integer.
- **On invalid:**
  - Empty: "Please enter the property value."
  - Below 100,000: "Property value must be at least 100,000 NIS."
  - Non-numeric: "Please enter a valid number."
- **Conditional logic:** Value is stored and used to compute equity minimum in Q4 and maximum loan amount in clock generation.

---

#### Q4 — Equity Amount

- **Field:** Number input (NIS), formatted with thousands separator.
- **Validation rules (derived from Q1 and Q3):**
  - IF loan_type = primary_residence OR home_improvement: equity >= property_value × 0.25
  - IF loan_type = price_for_residents: equity >= max(property_value × 0.10, 100,000)
  - IF loan_type = additional_property OR all_purpose: equity >= property_value × 0.50
  - equity must be < property_value (cannot be 100% equity — user does not need a mortgage).
- **On invalid:**
  - Below minimum: "Minimum equity for this loan type is [X] NIS ([Y]% of property value). Please enter at least [X] NIS."
  - Above property value: "Equity cannot exceed property value."
- **UI hint:** Below the input, show the computed minimum equity in real-time as the user types in Q3 and Q4 (e.g., "Minimum equity: 250,000 NIS (25%)").

---

#### Q5 — Number of Borrowers

- **Field:** Dropdown, options 1 to 5.
- **Validation:** Required. No skip.
- **On invalid:** "Next" button disabled.
- **Conditional logic:**
  - IF number_of_borrowers > 1: Q6, Q7, Q8, Q9 repeat N times (one set per borrower). Progress indicator updates to show additional sub-steps.
  - IF user returns to Q5 and changes the number: show confirmation dialog: "Changing the number of borrowers will reset all borrower information you have entered. Do you want to continue?" IF user confirms → reset all per-borrower answers. IF user cancels → revert to previous value.

---

#### Q6 — Birth Date + Full Name (per borrower, repeated N times)

- **Fields (per borrower):**
  - Full Name: text input, required, max 100 characters.
  - Birth Date: date picker, required.
- **Validation (per borrower):**
  - Birth date must be in the past.
  - Borrower must be at least 18 years old at application date.
  - Computed max_loan_term = 85 − floor((today − birth_date) / 365.25).
  - IF max_loan_term < 4: show blocking error: "Based on this borrower's age, the maximum loan term is [N] years, which is below the minimum required of 4 years. This borrower cannot be included in a mortgage application."
  - IF there are multiple borrowers: max_loan_term is determined by the OLDEST borrower. Show a note: "The maximum loan term for this application is [N] years, based on the age of the oldest borrower."
- **Repeat:** Step appears once per borrower (labeled "Borrower 1 of N," "Borrower 2 of N," etc.).

---

#### Q7 — Net Income (per borrower, repeated N times)

- **Field:** Number input (monthly NIS), per borrower.
- **Validation:** Required. Must be > 0.
- **On invalid:** "Please enter a valid monthly income greater than 0."
- **Info button (ℹ️):** "For employees: average of your last 3 monthly payslips. For self-employed: average monthly income based on your last 3 years' tax assessments."
- **Note for non-property-owner borrowers:** The system does not ask about property ownership status in the wizard; this is captured in Personal Details later. In the wizard, full income is used. The 50% adjustment for non-owners is applied in the personal area mortgage calculations.

---

#### Q8 — Additional Income (per borrower, repeated N times)

- **Field:** Optional repeating table (add/remove rows). Default: empty table.
- **Per row:**
  - Type: dropdown — Pension (פנסיה) | Rental Income (שכר דירה) | Dividend (דיבידנד) | Alimony Received (מזונות) | Other (אחר).
  - Monthly Amount (NIS): number input, required if row exists.
- **Validation:** If a row exists, both fields are required. Monthly amount must be > 0.
- **"Add Row" button:** Adds a new empty row.
- **"Remove" button (per row):** Removes that row.
- **Info button (ℹ️):** "Include any consistent additional income you receive monthly. Do not include one-time payments."
- **Skip option:** If no additional income, user can proceed with an empty table (no rows required).

---

#### Q9 — Fixed Expenses (per borrower, repeated N times)

- **Field:** Repeating table (add/remove rows). Default: empty table.
- **Per row:**
  - Type: dropdown — Loan (הלוואה) | Alimony Paid (מזונות ששולמו) | Leasing (ליסינג) | Rent (שכר דירה) | Other (אחר).
  - Monthly Payment (NIS): number input, required if row exists.
  - Remaining Balance (NIS): number input, required if row exists.
  - End Date: date picker, required if row exists. Must be in the future.
  - Interest Rate (%): number input, optional.
  - Source: dropdown — Bank (בנק) | Savings Fund (קרן חיסכון) | Insurance Company (חברת ביטוח) | Other (אחר).
- **Validation:** If a row exists, all required fields within the row must be filled.
- **"Add Row" button / "Remove" button:** Standard.
- **Info button (ℹ️):** "Include all regular monthly obligations: loans, leasing payments, court-ordered alimony, and ongoing rent. Do not include one-time or irregular expenses."
- **Skip option:** If no fixed expenses, user can proceed with an empty table.

---

#### Q10 — Desired Monthly Payment Range

- **Fields:**
  - Minimum monthly payment (NIS): number input, required.
  - Maximum monthly payment (NIS): number input, required.
- **Computed net income (system-calculated from Q7–Q9):**
  - total_income = sum of all borrowers' (net_income + additional_income)
  - total_expenses = sum of all borrowers' fixed monthly payments
  - net_qualifying_income = total_income − total_expenses
  - payment_cap = floor(net_qualifying_income × 0.40)
- **Validation:**
  - min_payment > 0.
  - max_payment >= min_payment.
  - max_payment <= payment_cap.
  - IF max_payment > payment_cap: error: "The maximum monthly payment you can enter is [payment_cap] NIS, based on 40% of your qualifying net income ([net_qualifying_income] NIS/month)."
- **Live hint:** Below the max input, show in real-time: "Your maximum allowed payment based on income: [payment_cap] NIS/month."
- **If min_payment > payment_cap:** Error on the min field: "This amount exceeds your maximum qualifying payment of [payment_cap] NIS."

---

### 4. Post-Q10: Registration Gate

4.1. After Q10 is validated and user clicks "Next," the system shows the **registration gate screen** instead of clock results.
4.2. Screen heading: "Your results are ready! Create a free account to see your mortgage options."
4.3. Two input options (user picks one):
  - Name + Phone number
  - Name + Email address
4.4. A "Skip for now" link is NOT shown — minimal registration is required to see clocks (protects proprietary calculation output).
4.5. User fills in name + contact info and clicks "Continue."
4.6. System sends a 6-digit OTP to the provided phone or email.
4.7. OTP entry screen: 6-digit input, 10-minute validity, 60-second resend timer.
4.8. IF OTP verified:
  - Session created.
  - Application record created with status = REGISTERED.
  - Questionnaire answers attached to the application.
  - Proceed to Step 5 (clock display).
4.9. IF OTP fails (wrong code):
  - Error: "Incorrect code. [N] attempts remaining."
  - After 5 failed attempts: "Your account has been temporarily locked. Please contact support or try again in 30 minutes."
4.10. IF OTP expires before entry:
  - "Resend Code" button becomes active after 60 seconds.
  - User taps "Resend" → new OTP sent; previous OTP invalidated.

---

### 5. Clocks Screen

5.1. After successful OTP verification, the system calculates 5 clock (mix) options based on the current active mix definitions and the questionnaire data.
5.2. Client is navigated to the **Clocks screen**.
5.3. Five clock cards are displayed side-by-side (or in a scrollable list on mobile).
5.4. Each card shows:
  - Clock name / label (e.g., "Mix 1 — Conservative")
  - Total loan amount (NIS)
  - Recommended monthly payment
  - Loan term summary
  - A "View Details" button
  - A "Select This Mix" button
5.5. The screen header shows: "These are your mortgage mix options — choose the one that fits your plan."

---

### 6. Clock Drill-Down

6.1. User clicks "View Details" on any clock card.
6.2. System navigates to the clock detail screen for that mix.
6.3. Detail screen shows:
  - Breakdown per track: track type, amount, term, interest rate, monthly payment
  - Amortization chart (principal vs. interest over time)
  - Total cost summary (total interest paid, total repayment)
  - CPI assumption note: "Calculation assumes CPI of [X]% annually."
6.4. **Copy protection:** The entire results panel uses CSS `user-select: none`; right-click context menu is suppressed on results elements. No download or print button.
6.5. User can navigate back to the clocks overview without losing context.

---

### 7. Select Clock — Decision Point

7.1. User clicks "Select This Mix" on any clock (either from the overview card or from the drill-down detail screen).
7.2. System shows a prompt: "To proceed with this mix, you need to complete your registration."
  - "Complete Registration" button → navigates to full registration / tier selection (flow-16).
  - "Exit" button → exits to home page.

---

### 8. Exit Without Full Registration

8.1. IF user clicks "Exit" or closes the browser:
  - IF OTP was verified (Step 4 completed): session is ended but application data is retained in the database for **30 days** from the last activity date. The user can return via OTP login and resume from where they left off.
  - IF OTP was NOT verified (user never completed step 4): no backend record exists. Questionnaire answers were stored in sessionStorage only. On session end, all data is lost.
8.2. When retained data expires (30 days of inactivity, no tier selected): application status transitions to EXPIRED. Client receives one email/SMS notification 7 days before expiry: "Your SimpleSave application will expire in 7 days. Log in to save your progress."
8.3. After expiry: application is soft-deleted; no further access.

---

## State Transitions

| Trigger | From Status | To Status |
|---|---|---|
| OTP verified (first time) | (no record) | REGISTERED |
| User exits before OTP | (no record) | (no record — sessionStorage only) |
| 30 days of inactivity with no tier selected | REGISTERED | EXPIRED (soft-delete) |

No tier selection, PERSONAL_DETAILS_COMPLETE, or AUTHORIZATION_SIGNED status transitions occur in this flow.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User refreshes the browser mid-wizard | Wizard resumes from the last completed step (answers restored from sessionStorage). If the session expired, the wizard restarts from step 1. |
| User navigates back to Q5 and changes borrower count | Confirmation dialog: "This will reset your borrower details." On confirm, all per-borrower answers (Q6–Q9 for each borrower) are cleared. |
| Birth date entered in Q6 yields max_term < 4 years | Blocking error shown inline; "Next" button disabled until the birth date is corrected or the borrower is removed. |
| All borrowers combined have 0 net income | payment_cap computes to 0; Q10 min and max payment fields both error: "Qualifying income is 0. Please review your income entries." |
| User provides an equity amount exactly at the minimum threshold | Validation passes. No warning shown. |
| Property Source is "Price for Residents" but equity >= 25% of value | Valid. No error. The less restrictive condition for Price for Residents (10% min) is a floor, not a ceiling. |
| User with an existing registered account arrives at the wizard | The wizard is accessible without session. If the user completes Q10 and enters an already-registered phone/email at the gate, the system sends an OTP for login instead of registration. Their existing application is loaded (if any). |
| User completes wizard but does not verify OTP and closes browser | No backend record is created. Data is only in sessionStorage, which is cleared on tab close. The next visit starts fresh. |
| Loan term computed from oldest borrower age is between 4 and 10 years | Warning shown (non-blocking): "Based on the borrower's age, the maximum loan term is [N] years. This limits your mix options." User can proceed. |

---

## Error States

| Error | User-Visible Message |
|---|---|
| Required field empty on any Q | "This field is required." shown inline below the field. "Next" button disabled. |
| Property value < 100,000 NIS | "Property value must be at least 100,000 NIS." |
| Equity below minimum for loan type | "Minimum equity for this loan type is [X] NIS. Please enter at least [X] NIS." |
| Max loan term < 4 years (age) | "Based on this borrower's age, the maximum loan term is [N] years, which is below the minimum of 4 years. A mortgage cannot be issued." |
| Monthly payment max > 40% of qualifying income | "The maximum monthly payment you can enter is [X] NIS, based on 40% of your qualifying net income." |
| OTP wrong code | "Incorrect code. [N] attempts remaining." |
| OTP locked (5 failed attempts) | "Your account has been temporarily locked. Please contact support or try again in 30 minutes." |
| OTP expired | "Your code has expired. Click 'Resend' to get a new code." (Resend button appears after 60 seconds.) |
| Clock calculation fails (system error) | "We could not generate your mortgage options. Please try again. If the problem persists, contact support." |
| Network error mid-wizard | "Connection lost. Your progress has been saved. Please check your internet connection and try again." |
