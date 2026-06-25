# Flow: New Mortgage Questionnaire (10-Question Wizard)

## Purpose

Provide a complete, developer-ready specification for every question in the 10-step mortgage questionnaire wizard. For each question this document covers: question number, Hebrew and English field label, field type, validation rules, conditional logic, error messages, and whether the question repeats per borrower.

This wizard is accessible to unauthenticated visitors. It is the entry point to the entire mortgage application. Answers collected here seed the clock calculations and are carried into the client's personal area upon registration.

---

## Preconditions

- No session required. The wizard is publicly accessible.
- System has at least one active mix definition configured (required for clock generation at end of wizard).
- CPI and prime rate values are configured in system parameters.

---

## Wizard Global Behavior

- **Auto-save:** Every completed step is persisted to browser sessionStorage immediately on clicking "Next." If the user is already authenticated (returning registered client editing from personal area), answers are also saved to the backend on each step.
- **Progress bar:** A linear progress indicator at the top shows "Step N of 10." Per-borrower sub-steps are labeled "Borrower M of N — Step [Q]."
- **Back navigation:** A "Back" button is visible from step 2 onward. Navigating back does not clear previously entered answers.
- **"Next" button behavior:** Disabled until all required fields on the current step pass validation. On click, validates all fields and shows inline errors if any fail.
- **Field formatting:** All NIS number inputs display thousands separators (e.g., 1,250,000). The raw stored value is an integer.
- **Language:** All labels displayed in Hebrew. Field names in this spec are provided in Hebrew (primary) with English translation.
- **RTL layout:** All form elements are right-to-left aligned.

---

## Steps

---

### Q1 — Loan Type (סוג ההלוואה / Loan Type)

| Attribute | Value |
|---|---|
| Step number | 1 of 10 |
| Field label (Hebrew) | סוג ההלוואה |
| Field label (English) | Loan Type |
| Field type | Radio button group (single select) |
| Required | Yes |
| Repeats per borrower | No (one answer for the application) |

**Options:**

| Value | Hebrew Label | English Label |
|---|---|---|
| `primary_residence` | נכס יחיד | Primary Residence |
| `additional_property` | נכס נוסף | Additional Property |
| `all_purpose` | לכל מטרה | All-Purpose Loan |
| `home_improvement` | שיפור דיור | Home Improvement |

**Tooltips (per option):**
- Primary Residence: "The property will be your sole owned property and primary place of residence."
- Additional Property: "You already own at least one property, and this is an additional purchase."
- All-Purpose Loan: "The loan is not for a specific property transaction — for any approved purpose."
- Home Improvement: "Funds used to renovate or improve an existing property you own."

**Validation rules:**
- Selection is mandatory.
- "Next" button is disabled until an option is selected.

**Conditional logic:**
- Selected value is stored as `loan_type`.
- `loan_type` drives Q4 equity minimum and the max financing ratio displayed in the clock output.
- `loan_type = price_for_residents` is not an option here — it is captured in Q2 (property source). The financing ratio adjustment for Price for Residents is applied based on Q2.

**On invalid input:**
- No selection: "Next" button remains disabled. No error message needed — button state communicates the requirement.

---

### Q2 — Property Source (מקור הנכס / Property Source)

| Attribute | Value |
|---|---|
| Step number | 2 of 10 |
| Field label (Hebrew) | מקור הנכס |
| Field label (English) | Property Source |
| Field type | Radio button group (single select) |
| Required | Yes |
| Repeats per borrower | No |

**Options:**

| Value | Hebrew Label | English Label |
|---|---|---|
| `contractor` | קבלן | Contractor (new build from developer) |
| `second_hand` | יד 2 | Second Hand (resale) |
| `price_for_residents` | מחיר למשתכן | Price for Residents |
| `self_build` | בנייה עצמית | Self-Build |

**Tooltips (per option):**
- Contractor: "Purchasing a new apartment directly from a construction contractor."
- Second Hand: "Purchasing a property from a private seller."
- Price for Residents: "Purchasing under the government Price for Residents (מחיר למשתכן) program. Special financing rules apply."
- Self-Build: "You are purchasing land and building a home yourself."

**Validation rules:**
- Selection is mandatory.
- IF Q1 = `home_improvement` and user selects `price_for_residents`: show warning (non-blocking): "Price for Residents typically applies to new home purchases, not home improvement. Please confirm your selection." User can proceed.

**Conditional logic:**
- IF `property_source = price_for_residents`:
  - Q4 equity minimum changes to: max(property_value × 0.10, 100,000 NIS) — minimum 100,000 NIS equity regardless.
  - Max financing ratio becomes 90% (instead of 75% for primary residence).
  - A note is stored on the application: `price_for_residents = true`.

---

### Q3 — Property Value (שווי הנכס / Property Value)

| Attribute | Value |
|---|---|
| Step number | 3 of 10 |
| Field label (Hebrew) | שווי הנכס |
| Field label (English) | Property Value |
| Field type | Number input (NIS, integer) |
| Required | Yes |
| Repeats per borrower | No |

**Placeholder:** "Enter property value in NIS"

**Validation rules:**
- Required.
- Must be a positive integer (no decimals).
- Minimum: 100,000 NIS.
- No defined maximum.

**Inline hint:** Below the input: "Enter the full purchase price or appraised value of the property."

**On invalid input:**

| Condition | Error message |
|---|---|
| Empty | "Please enter the property value." |
| Non-numeric | "Please enter a valid number." |
| Below 100,000 | "Property value must be at least 100,000 NIS." |
| Negative | "Property value must be a positive number." |

**Conditional logic:**
- Stored as `property_value`.
- Used in Q4 to compute equity minimum.
- Used in clock generation for loan amount = property_value − equity.

---

### Q4 — Equity Amount (הון עצמי / Equity Amount)

| Attribute | Value |
|---|---|
| Step number | 4 of 10 |
| Field label (Hebrew) | הון עצמי |
| Field label (English) | Equity Amount |
| Field type | Number input (NIS, integer) |
| Required | Yes |
| Repeats per borrower | No |

**Placeholder:** "Enter equity amount in NIS"

**Minimum equity calculation (computed from Q1, Q2, Q3):**

| Condition | Minimum equity formula |
|---|---|
| Q1 = primary_residence (any Q2 except price_for_residents) | `property_value × 0.25` |
| Q1 = primary_residence AND Q2 = price_for_residents | `max(property_value × 0.10, 100,000)` |
| Q1 = additional_property | `property_value × 0.50` |
| Q1 = all_purpose | `property_value × 0.50` |
| Q1 = home_improvement | `property_value × 0.30` (70% max financing) |

**Live hint (shown below the input in real-time):**
"Minimum equity required: [X] NIS ([Y]%)"
Updates as property_value changes (if user goes back to Q3 and edits).

**Validation rules:**
- Required.
- Must be >= computed minimum equity.
- Must be < property_value (you cannot have 100% equity — no loan needed).
- Must be a positive integer.

**On invalid input:**

| Condition | Error message |
|---|---|
| Empty | "Please enter your equity amount." |
| Below minimum | "Minimum equity for this loan type is [X] NIS ([Y]% of property value). Please enter at least [X] NIS." |
| >= property_value | "Equity cannot equal or exceed property value." |

**Conditional logic:**
- Stored as `equity_amount`.
- `loan_amount = property_value − equity_amount` (used in clock generation).

---

### Q5 — Number of Borrowers (מספר לווים / Number of Borrowers)

| Attribute | Value |
|---|---|
| Step number | 5 of 10 |
| Field label (Hebrew) | מספר לווים |
| Field label (English) | Number of Borrowers |
| Field type | Dropdown (select) |
| Required | Yes |
| Repeats per borrower | No |

**Options:** 1, 2, 3, 4, 5

**Validation rules:**
- Required.
- Must be an integer between 1 and 5.

**Conditional logic:**
- Stored as `num_borrowers`.
- IF `num_borrowers > 1`: Q6, Q7, Q8, Q9 repeat `num_borrowers` times. Progress bar updates to show additional sub-steps.
- IF user returns to Q5 and changes the value to a different number: show a confirmation dialog before clearing per-borrower data.
  - Dialog: "Changing the number of borrowers will reset all borrower information you have entered (birth dates, names, income, and expense details). Do you want to continue?"
  - "Yes, reset" → all Q6–Q9 answers are cleared. Proceed to Q6 with the new borrower count.
  - "No, keep current" → value reverts to the previous selection. No data cleared.

---

### Q6 — Birth Date + Full Name (per borrower) (שם מלא ותאריך לידה / Full Name and Birth Date)

| Attribute | Value |
|---|---|
| Step number | 6 of 10 (sub-steps: Borrower 1 of N, Borrower 2 of N, etc.) |
| Field label (Hebrew) — Name | שם מלא |
| Field label (English) — Name | Full Name |
| Field label (Hebrew) — Birth Date | תאריך לידה |
| Field label (English) — Birth Date | Date of Birth |
| Field type | Text input (name) + Date picker (birth date) |
| Required | Yes (both fields) |
| Repeats per borrower | Yes — one screen per borrower |

**Validation rules (per borrower):**

| Rule | Detail |
|---|---|
| Name required | Min 2 characters, max 100 characters. |
| Birth date required | Must be a valid past date. |
| Minimum age | Borrower must be at least 18 years old as of today. Error: "Borrower must be at least 18 years old." |
| Maximum age cap | Computed: `max_loan_term = 85 − floor(age_at_application_date)`. IF `max_loan_term < 4`: blocking error (see below). |

**Age cap error (blocking):**
"Based on this borrower's age, the maximum loan term is [N] years, which is below the minimum required of 4 years. This borrower cannot be included in a mortgage application."
- "Next" button is disabled.
- The user must either correct the birth date or remove this borrower (go back to Q5 and reduce the count).

**Multi-borrower age note (non-blocking warning):**
When all borrowers have been entered, if the oldest borrower's computed max_loan_term is less than 30 years (but >= 4):
- Show a non-blocking info message: "Based on the oldest borrower's age, the maximum loan term for this application is [N] years. This will be reflected in your mortgage options."

**Conditional logic:**
- The system tracks `oldest_borrower_age` across all borrowers.
- `max_loan_term = 85 − oldest_borrower_age` (at application date). This caps the term on all tracks in all clocks.

---

### Q7 — Net Income per Borrower (הכנסה נטו / Net Income)

| Attribute | Value |
|---|---|
| Step number | 7 of 10 (sub-steps per borrower) |
| Field label (Hebrew) | הכנסה חודשית נטו |
| Field label (English) | Monthly Net Income |
| Field type | Number input (NIS/month, integer) |
| Required | Yes |
| Repeats per borrower | Yes — one entry per borrower |

**Placeholder:** "Enter monthly net income in NIS"

**Info button (ℹ️) text:**
"For employees: calculate the average of your last 3 monthly payslips (after tax and social security deductions).
For self-employed: calculate the average monthly income based on your last 3 years' certified tax assessments."

**Validation rules:**
- Required.
- Must be > 0 NIS.
- Must be a positive integer.

**On invalid input:**

| Condition | Error message |
|---|---|
| Empty | "Please enter monthly net income." |
| Zero or negative | "Net income must be greater than 0." |
| Non-numeric | "Please enter a valid number." |

**Note on non-property-owner adjustment:**
The 50% income counting rule for non-property-owner borrowers is NOT applied in the wizard. The wizard uses full income for all borrowers. The 50% rule is applied later in the personal area when property ownership status is confirmed via Personal Details. This simplification is intentional for the pre-registration step.

---

### Q8 — Additional Income per Borrower (הכנסות נוספות / Additional Income)

| Attribute | Value |
|---|---|
| Step number | 8 of 10 (sub-steps per borrower) |
| Field label (Hebrew) | הכנסות נוספות |
| Field label (English) | Additional Income |
| Field type | Dynamic table (add/remove rows) |
| Required | No (table can be empty) |
| Repeats per borrower | Yes — one table per borrower |

**Per row fields:**

| Field | Hebrew label | Field type | Required (if row exists) |
|---|---|---|---|
| Income type | סוג הכנסה | Dropdown (see below) | Yes |
| Monthly amount | סכום חודשי (₪) | Number input (NIS, integer) | Yes |

**Income type dropdown options:**

| Value | Hebrew Label | English Label |
|---|---|---|
| `pension` | פנסיה | Pension |
| `rental` | שכר דירה | Rental Income |
| `dividend` | דיבידנד | Dividend |
| `alimony_received` | מזונות (קבלה) | Alimony Received |
| `other` | אחר | Other |

**Table controls:**
- "Add Income Source" (+ הוסף הכנסה) button: adds a new empty row.
- "Remove" (X) button per row: removes that row. No confirmation needed.

**Info button (ℹ️) text:**
"Include any regular monthly income you receive in addition to your main salary. Examples: rental income from a property, pension payments, dividends from shares, or alimony received. Do not include one-time payments or gifts."

**Validation rules:**
- If the table is empty: valid — no additional income declared.
- If any row exists:
  - Income type must be selected.
  - Monthly amount must be > 0 NIS.

**On invalid input:**

| Condition | Error message |
|---|---|
| Row exists but type not selected | "Please select an income type." (inline, on that row) |
| Row exists but amount is 0 or empty | "Please enter a monthly amount greater than 0." (inline, on that row) |

**Conditional logic:**
- All additional income rows for a borrower are stored as an array.
- `total_additional_income_borrower_N = sum of all additional income rows for borrower N`.
- Carried into net qualifying income calculation in Q10.

---

### Q9 — Fixed Expenses per Borrower (הוצאות קבועות / Fixed Expenses)

| Attribute | Value |
|---|---|
| Step number | 9 of 10 (sub-steps per borrower) |
| Field label (Hebrew) | הוצאות קבועות |
| Field label (English) | Fixed Monthly Expenses |
| Field type | Dynamic table (add/remove rows) |
| Required | No (table can be empty) |
| Repeats per borrower | Yes — one table per borrower |

**Per row fields:**

| Field | Hebrew label | Field type | Required (if row exists) |
|---|---|---|---|
| Expense type | סוג ההוצאה | Dropdown (see below) | Yes |
| Monthly payment | תשלום חודשי (₪) | Number input (NIS, integer) | Yes |
| Remaining balance | יתרת חוב (₪) | Number input (NIS, integer) | Yes |
| End date | תאריך סיום | Date picker | Yes |
| Interest rate (%) | ריבית (%) | Number input (percentage, 2 decimal places) | No |
| Source | מקור | Dropdown (see below) | Yes |

**Expense type dropdown options:**

| Value | Hebrew Label | English Label |
|---|---|---|
| `loan` | הלוואה | Loan |
| `alimony_paid` | מזונות (תשלום) | Alimony Paid |
| `leasing` | ליסינג | Vehicle Leasing |
| `rent` | שכר דירה | Rent |
| `other` | אחר | Other |

**Source dropdown options:**

| Value | Hebrew Label | English Label |
|---|---|---|
| `bank` | בנק | Bank |
| `savings_fund` | קרן חיסכון | Savings Fund |
| `insurance` | חברת ביטוח | Insurance Company |
| `other` | אחר | Other |

**Table controls:**
- "Add Expense" (+ הוסף הוצאה) button.
- "Remove" (X) button per row.

**Info button (ℹ️) text:**
"Include all regular monthly financial obligations: personal loans, leasing payments, court-ordered alimony you pay, and your current rent if renting. Do not include utility bills, subscriptions, or irregular expenses."

**Validation rules:**
- If the table is empty: valid.
- If any row exists:
  - Expense type: required.
  - Monthly payment: required; must be > 0.
  - Remaining balance: required; must be >= 0.
  - End date: required; must be a future date.
  - Source: required.
  - Interest rate: optional; if entered must be >= 0 and <= 100.

**On invalid input (inline, per field in the row):**

| Condition | Error message |
|---|---|
| Type not selected | "Please select an expense type." |
| Monthly payment empty or 0 | "Please enter a monthly payment greater than 0." |
| Remaining balance empty | "Please enter the remaining balance." |
| End date empty or in the past | "Please enter a future end date." |
| Interest rate out of range | "Interest rate must be between 0 and 100." |
| Source not selected | "Please select a source." |

**Conditional logic:**
- All expense rows are stored as an array for each borrower.
- `total_fixed_expenses_borrower_N = sum of monthly payment for all rows for borrower N`.
- Carried into net qualifying income calculation in Q10.

---

### Q10 — Desired Monthly Payment Range (טווח תשלום חודשי רצוי / Desired Monthly Payment Range)

| Attribute | Value |
|---|---|
| Step number | 10 of 10 |
| Field label (Hebrew) — Min | תשלום חודשי מינימלי |
| Field label (Hebrew) — Max | תשלום חודשי מקסימלי |
| Field label (English) — Min | Minimum Monthly Payment |
| Field label (English) — Max | Maximum Monthly Payment |
| Field type | Two number inputs (NIS, integer) |
| Required | Yes (both fields) |
| Repeats per borrower | No (one range for the whole application) |

**Computed values (system-calculated from Q7–Q9, shown live on this screen):**

```
total_income = sum over all borrowers of (net_income + sum(additional_income))
total_expenses = sum over all borrowers of sum(fixed_monthly_payments)
net_qualifying_income = total_income − total_expenses
payment_cap = floor(net_qualifying_income × 0.40)
```

**Live hint panel (always visible on Q10 screen):**
```
Your income summary:
  Total monthly income:    [total_income] NIS
  Total fixed expenses:    [total_expenses] NIS
  Qualifying net income:   [net_qualifying_income] NIS
  Maximum monthly payment: [payment_cap] NIS (40% of qualifying income)
```

This panel updates in real-time as the user types in Q10 fields (the income summary figures are static; only the payment cap reminder is shown).

**Validation rules:**

| Rule | Detail |
|---|---|
| Min payment required | Must be > 0 |
| Max payment required | Must be > 0 |
| Max >= Min | max_payment must be >= min_payment |
| Max <= payment_cap | max_payment cannot exceed floor(net_qualifying_income × 0.40) |
| Min <= payment_cap | min_payment cannot exceed payment_cap |

**On invalid input:**

| Condition | Error message |
|---|---|
| min_payment empty | "Please enter a minimum monthly payment." |
| max_payment empty | "Please enter a maximum monthly payment." |
| max_payment < min_payment | "Maximum payment cannot be less than minimum payment." |
| max_payment > payment_cap | "The maximum monthly payment you can enter is [payment_cap] NIS, based on 40% of your qualifying net income ([net_qualifying_income] NIS/month)." |
| min_payment > payment_cap | "This amount exceeds your maximum qualifying payment of [payment_cap] NIS/month." |
| net_qualifying_income <= 0 | "Your qualifying income is 0 or negative based on the information provided. Please review your income and expense entries." — "Next" button disabled. |

**Special case: net_qualifying_income <= 0:**
IF total_expenses >= total_income: the system cannot compute a valid payment_cap. Both payment fields are disabled. An error banner is shown: "Your declared fixed expenses exceed or equal your declared income. Please go back and review your income and expense information." A "Back" button is highlighted.

---

## Post-Q10: Registration Gate (Unauthenticated Users)

After Q10 is validated and the user clicks "Next":

**IF user is NOT authenticated:**
- Navigate to the registration gate screen (step 4 of flow-15).
- Screen: "Your results are ready! Create a free account to see your mortgage options."
- Required fields: Full Name (if not already entered) + Phone or Email.
- OTP sent → verified → application created → proceed to Clocks screen.

**IF user IS authenticated (returning registered client):**
- Questionnaire answers are saved to the existing application.
- Navigate directly to the Clocks screen.
- Application status updated from QUESTIONNAIRE_IN_PROGRESS to QUESTIONNAIRE_COMPLETE (if coming from a new wizard session), or REGISTERED (if the status was already REGISTERED with no wizard data).

---

## State Transitions

| Trigger | From Status | To Status |
|---|---|---|
| User starts the wizard | (any / none) | QUESTIONNAIRE_IN_PROGRESS (set when first question is answered and saved) |
| User completes Q10 and is already registered | QUESTIONNAIRE_IN_PROGRESS | QUESTIONNAIRE_COMPLETE |
| User completes Q10 and verifies OTP (new user) | QUESTIONNAIRE_IN_PROGRESS | REGISTERED |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User navigates back from Q6 to Q5 and changes borrower count | Confirmation dialog shown. On confirm: Q6–Q9 data for all borrowers is cleared. User re-enters borrower data. |
| User navigates back from Q10 to Q8 and adds an expense that pushes net_qualifying_income to 0 | When they return to Q10, the payment fields are disabled and the income-negative error banner is shown. |
| Q6 borrower age results in max_loan_term = 4 years exactly | Valid (4 years is the minimum). No error. Clock generation proceeds with 4-year max term. |
| User has multiple borrowers with identical birth dates | Valid. System proceeds without error. |
| User inputs Q8 additional income that is very large (e.g., 10,000,000 NIS/month) | System accepts it without a maximum limit. The clock will reflect this unusually high income. No cap in v1. |
| Wizard is accessed from a mobile browser | All fields are rendered for mobile; number inputs open the numeric keyboard on iOS/Android. Date picker uses the native date input. |
| User completes wizard as a registered user whose application is already at TIER_SELECTED or later | Warning shown before starting: "You already have an active application. Starting a new questionnaire will create a new mortgage calculation. Your existing application will not be affected." User must confirm before proceeding. |
| Browser sessionStorage is cleared mid-wizard (e.g., browser privacy mode clears on close) | On return, all wizard data is lost. Wizard starts from Q1. If the user is authenticated, the backend auto-save (if triggered) retains completed steps. |
