# Screen 32 — Mortgage Details Tab

## Purpose

Collect and store all information about the property being purchased and the loan parameters. Fields are pre-filled from the questionnaire wizard (Q1–Q10). All fields are editable; changes trigger a recalculation of the 5 mortgage mix clocks. Provides a read-only computed display of key ratios.

---

## Who Sees This / Access

- Authenticated clients (any tier, including no tier)
- Always accessible — this tab is never locked
- Advisors can view and edit all fields in the client detail view

---

## Layout Overview

Single-column layout with collapsible section cards, same visual pattern as Personal Details tab.

**Pre-fill note displayed at top of tab (first visit only):**
Info box: "הנתונים הבאים הועתקו מהשאלון שלך. בדקו ועדכנו אם נדרש." / "The following data was copied from your questionnaire. Review and update if needed."

**Live computed display bar (sticky at top of content area):**
Shows 3 values computed from current field values, updating live as fields change:
- סכום הלוואה / Loan Amount: property_value − equity_amount (NIS)
- יחס מימון / Financing Ratio: (loan_amount / property_value) × 100 (%)
- תקופה מקסימלית / Max Loan Term: 85 − oldest_borrower_age (years)

Color indicator on financing ratio: green if within limit, red if exceeds maximum for selected loan type.

---

## Sections / Components

### Section A — Purchase Status (סטטוס רכישה)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| סטטוס רכישה | Purchase Status | Dropdown: מחפש נכס (Searching) / לקראת חתימה (About to Sign) / חתם על חוזה (Signed Contract) | Yes | — | Always shown |
| תאריך חתימה | Contract Date | Date picker | Yes (conditional) | Must be a valid date; may be past or future (up to +6 months) | Shown only IF purchase_status = Signed Contract |
| מתי צריך את הכסף? | Funds Needed By | Dropdown: חודש הקרוב (This Month) / חודשיים (2 Months) / שלושה חודשים+ (3+ Months) | Yes (conditional) | — | Shown only IF purchase_status = Signed Contract |

---

### Section B — Loan Parameters (פרמטרי הלוואה)

Pre-filled from wizard answers. All editable. Changes here trigger a recalculation of the clock options.

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| סוג ההלוואה | Loan Type | Dropdown: דירה ראשונה (Primary Residence) / דירה נוספת (Additional Property) / דירה לכל מטרה (All-Purpose) / שיפור מגורים (Improvement) / מחיר למשתכן (Price-for-Residents) | Yes | — | Always shown |
| מקור הנכס | Property Source | Dropdown: יד שנייה (Secondhand) / קבלן (Contractor/New Build) / מחיר למשתכן (Price-for-Residents Scheme) | Yes | — | Always shown |
| שווי הנכס | Property Value | Number input (NIS, integer) | Yes | > 100,000 NIS | Always shown |
| הון עצמי | Equity Amount | Number input (NIS, integer) | Yes | Dynamic validation: must be ≥ minimum equity required for selected loan_type (see financing rules below) | Always shown |
| תחום תשלום חודשי רצוי | Desired Monthly Payment Range | Two number inputs: Min (NIS) + Max (NIS) | Yes | Min > 0; Max ≥ Min; Max ≤ 40% of (net_income − fixed_expenses) — soft cap with warning if exceeded | Always shown |

**Financing ratio validation rules (inline error on equity_amount field):**

| Loan Type | Maximum Financing Ratio | Minimum Equity |
|---|---|---|
| Primary Residence (דירה ראשונה) | 75% | 25% of property value |
| Additional / All-Purpose | 50% | 50% of property value |
| Improvement (שיפור מגורים) | 70% | 30% of property value |
| Price-for-Residents (מחיר למשתכן) | 90% | 10% of property value (min loan amount 100,000 NIS) |

If equity_amount results in a financing ratio exceeding the maximum: display inline error below field: "יחס המימון המרבי עבור [loan type] הוא [X]%. נדרש הון עצמי מינימלי של ₪[Y]."

**Desired monthly payment cap logic:**
- Cap = 40% × (sum of all borrowers' net_income − sum of all borrowers' fixed_expenses monthly total)
- If client has not yet entered income data: display soft-warning only, not hard block
- If Max input exceeds cap: amber warning "התשלום החודשי המרבי שלך הוא ₪[cap]. חריגה עלולה לפגוע בסיכוי האישור."

---

### Section C — Property Details (פרטי הנכס)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| כתובת הנכס — עיר | City | Dropdown (Israeli cities list) | No | — | Always shown |
| כתובת הנכס — רחוב | Street | Text input | No | — | Always shown |
| כתובת הנכס — מספר | House Number | Text input | No | — | Always shown |
| כתובת הנכס — דירה | Apartment Number | Text input | No | — | Always shown |
| סוג נכס | Property Type | Dropdown: בית פרטי (Private House) / דו משפחתי (Semi-Detached) / בניין משותף (Apartment Building) | No | — | Always shown |
| רישום הנכס | Property Registration | Dropdown: טאבו (Tabu) / מנהל מקרקעי ישראל (Minha) / חברה משכנת (Mishkenet) with ⓘ tooltip: "מקושר לעורך הדין המטפל בעסקה" | No | — | Always shown |
| קומה | Floor | Number input (0–100) | No | — | Shown only IF property_type = Apartment Building |
| מספר קומות בבניין | Total Floors in Building | Number input (1–100) | No | Must be ≥ floor | Shown only IF property_type = Apartment Building |
| גיל הבניין | Building Age (years) | Number input (0–200) | No | Integer ≥ 0 | Always shown |
| שטח במ"ר | Area in sqm | Number input | No | > 0 | Always shown |
| מקור הערכת שווי | Value Assessment Source | Dropdown: הערכה עצמית (Self-Assessment) / שמאי (Licensed Appraiser) / קבלן (Contractor) | No | — | Always shown |

---

### Section D — Equity Sources (מקורות הון עצמי)

Multi-select + amount table. The client picks one or more equity source types and specifies the NIS amount for each.

| Source Option | Hebrew Label | Amount Field |
|---|---|---|
| Checking Account | עוש | Number (NIS) |
| Savings / Deposits | חיסכון / פיקדון | Number (NIS) |
| Personal Loan | הלוואה | Number (NIS) |
| Family Assistance | עזרה מבני משפחה | Number (NIS) |
| Savings Fund (Keren Hishtalmut) | קרן השתלמות | Number (NIS) |
| Other | אחר | Number (NIS) + free text description |

Validation: sum of all equity source amounts must equal equity_amount. Inline error if mismatch: "סכום מקורות ההון אינו תואם את ההון העצמי שהוזן (₪[equity_amount])."

---

### Section E — Prior Bank Applications (פניות קודמות לבנקים)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| האם הוגשה בקשה קודמת לבנקים? | Previous mortgage application | Radio (כן / לא) | No | — | Always shown |
| לאיזה בנקים? | Which banks (previously applied) | Multi-select checkbox list (all banks in system) | No | — | Shown IF previous_application = כן |
| האם תסכים להעביר חשבון בנק? | Willing to transfer bank account? | Radio: כן / לא / אשמח לשמוע פרטים (Yes / No / Want details first) | No | — | Always shown |

---

### Section F — Additional Capital (הון עצמי נוסף)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| הוספת הון עצמי נוסף לסגירת חלק מהמשכנתא? | Add capital to reduce mortgage? | Radio (כן / לא) | No | — | Always shown |
| סכום הון נוסף | Additional Capital Amount (NIS) | Number input | No | > 0 | Shown only IF additional_capital = כן |

---

## Buttons

| Button | Action | Conditions |
|---|---|---|
| Auto-save | Fires on blur of any field. "עודכן" / "Updated" indicator in top-right of section card. | Always active |
| שמור / Save (manual) | Saves all fields for current tab. Shows "✓ נשמר" checkmark for 3 seconds. | Always visible; enabled when unsaved changes exist |
| חשב מחדש את השעונים / Recalculate Clocks | Triggers server-side recalculation of all 5 mortgage mix clocks based on current mortgage detail values. Shows loading spinner on button during computation. On success: toast "השעונים חושבו מחדש!" and redirect prompt "לצפייה בשעונים" (View Clocks button). | Appears after any field change that affects loan parameters. Also always available as a manual button at the bottom of the tab. |

---

## States

### Unsaved changes

- A yellow "שינויים לא נשמרו" / "Unsaved changes" banner appears at the bottom of the content area (sticky)
- Leave-page guard: if navigating away with unsaved changes → confirmation dialog "יש שינויים שלא נשמרו. האם ברצונך לשמור לפני שתמשיך?"

### Recalculating clocks

- All clock-related displays (if visible) show a loading spinner
- "Recalculate" button shows spinner + "מחשב..." label
- Fields remain editable during recalculation

### Financing ratio exceeded

- Equity field has red border
- Inline error message below field
- Computed display bar shows financing ratio in red
- "Recalculate Clocks" button is disabled until equity is corrected

### Read-only (advisor view)

- All fields rendered as styled text, no inputs
- Section headers show last-edited timestamp

---

## Navigation

**Incoming paths:**
- 30-screen-personal-area-hub.md → Mortgage Details tab click

**Outgoing paths:**
- "View Clocks" CTA (after recalculation) → 28-screen-clocks-options.md
- No mandatory navigation from this tab; data saves in place
