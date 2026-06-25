# Screen 27 — Mortgage Questionnaire Wizard (10-Step Wizard)

## Purpose

The pre-registration wizard collects all data needed to compute the client's 5 mortgage clock options. It is the primary entry point for new clients. All 10 questions are presented one per screen with a persistent progress bar. State is auto-saved after each step. Registration is deferred until after step 10.

---

## Access / Who Sees This

- Any visitor (logged in or not).
- Route: `/questionnaire`
- Unauthenticated users may complete the wizard; they are prompted to register only at the very end (after step 10).
- If a registered, logged-in client visits `/questionnaire`, the wizard pre-fills from their existing application data.

---

## Layout Overview

```
[Navigation Bar — same as home page]
[Progress Bar — full width, below nav, sticky]
[Step Content — centered card, max-width 640px, RTL]
[Back / Next Buttons — bottom of card, full width on mobile]
```

- Direction: RTL. Hebrew labels throughout.
- Progress bar: shows "שאלה N מתוך 10" (Question N of 10) with step dots or a filled bar.
- Step labels (short Hebrew titles) visible above or below the progress bar.
- Auto-save: wizard state saved to localStorage AND server (if registered user) after each Next click.
- Back button always returns to previous step without losing data.

---

## Global Wizard Components

### Progress Bar

| Element | Details |
|---|---|
| Step counter label | "שאלה N מתוך 10" — updates on each step |
| Visual bar | Filled proportionally (N/10 × 100%) |
| Step labels | Short Hebrew title per step, shown as dots or breadcrumbs below the bar |

### Navigation Buttons (bottom of each step card)

| Button | Action | Disabled State |
|---|---|---|
| **הקודם** (Back) | Return to previous step. Data retained. | Disabled on step 1 (no previous step). |
| **הבא** (Next) | Validate current step. If valid: save state, advance to next step. If invalid: show inline errors. | Disabled until all required fields on current step are valid. |

---

## Step 1 — סוג הלוואה (Loan Type)

**Hebrew step title:** סוג הלוואה
**English:** Loan Type

### Fields

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **סוג הלוואה** | Radio group | Yes | One option must be selected | Always visible |

**Options:**

| Value | Hebrew Label | English (dev reference) |
|---|---|---|
| primary | נכס יחיד | Primary Residence |
| additional | נכס נוסף | Additional Property |
| all_purpose | הלוואה לכל מטרה | All-Purpose Loan |
| home_improvement | שיפור דיור | Home Improvement |

### Behavior

- Next button enabled only when one option is selected.
- Selected value stored in wizard state as `loan_type`.
- No info (ⓘ) button on this step.
- Affects: Q4 equity validation, Q2 conditional logic.

### Error Message

- None — selection is mandatory before Next activates.

---

## Step 2 — מקור הנכס (Property Source)

**Hebrew step title:** מקור הנכס
**English:** Property Source

### Conditional Visibility

- Shown for loan types: primary, additional. For loan types all_purpose and home_improvement, this step is shown but labelled differently (see note below).

> Note: For `all_purpose` and `home_improvement`, property source still collected for completeness but max-financing rules differ. The step title changes to "סוג הנכס הנוכחי" (Current Property Type) for these loan types.

### Fields

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **מקור הנכס** | Radio group | Yes | One option must be selected | Always visible on step 2 |

**Options:**

| Value | Hebrew Label | English (dev reference) |
|---|---|---|
| contractor | קבלן | Contractor (New Build) |
| second_hand | יד 2 | Second Hand |
| price_for_residents | מחיר למשתכן | Price for Residents |
| self_build | בנייה עצמית | Self Build |

### Behavior

- Stored as `property_source`.
- Affects Q4 equity minimum and max financing percentage computation.
- No info (ⓘ) button.

---

## Step 3 — שווי הנכס (Property Value)

**Hebrew step title:** שווי הנכס
**English:** Property Value

### Fields

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **שווי הנכס (₪)** | Number input (integer, NIS) | Yes | Min: 100,000. Must be a positive integer. No decimals. | Always visible |

**Placeholder:** "הזן שווי נכס..."

**Hint (shown after user enters a valid value):**
- "סכום מימון מקסימלי: [computed_max_loan NIS] ([computed_max_percent]%)"
- Computed as: property_value × max_financing_percent (based on loan_type + property_source)
  - Primary + contractor/second_hand: 75%
  - Price for residents: 90% (min equity 100,000 NIS enforced at Q4)
  - Additional property: 50%
  - All-purpose: 50% minus existing loans (loans not yet known at this step — hint shows 50%)
  - Home improvement: 70%

### Error Messages

| Condition | Hebrew Error Message |
|---|---|
| Value < 100,000 | "הסכום המינימלי הוא 100,000 ₪" |
| Non-numeric input | "אנא הזן מספר תקין" |
| Empty | Next button remains disabled |

---

## Step 4 — הון עצמי (Equity Amount)

**Hebrew step title:** הון עצמי
**English:** Equity Amount

### Fields

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **הון עצמי (₪)** | Number input (integer, NIS) | Yes | Min equity varies (see below). Must not exceed property_value. | Always visible |

**Placeholder:** "הזן הון עצמי..."

**Dynamic minimum equity based on Q1 (loan_type) + Q2 (property_source):**

| Loan Type + Property Source | Min Equity Formula |
|---|---|
| Primary + contractor OR second_hand | property_value × 0.25 |
| Primary + price_for_residents | max(property_value × 0.10, 100,000) |
| Primary + self_build | property_value × 0.25 |
| Additional property (any source) | property_value × 0.50 |
| All-purpose | property_value × 0.50 |
| Home improvement | property_value × 0.30 |

**Hint text (always visible below input):**
- "הון עצמי מינימלי נדרש: [min_equity NIS] ([min_percent]%)"

**Computed loan amount hint (shown after valid entry):**
- "סכום הלוואה: [property_value - equity NIS]"

### Error Messages

| Condition | Hebrew Error Message |
|---|---|
| Below minimum | "הון עצמי מינימלי: [min_equity] ₪ ([min_percent]%)" |
| Above property value | "ההון העצמי אינו יכול לעלות על שווי הנכס" |
| Empty | Next remains disabled |

---

## Step 5 — מספר לווים (Number of Borrowers)

**Hebrew step title:** מספר לווים
**English:** Number of Borrowers

### Fields

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **מספר לווים** | Dropdown (1, 2, 3, 4, 5) | Yes | Must select 1–5 | Always visible |
| **לווה N: יהיה רשום כבעל הנכס?** (Will borrower N be registered as property owner?) | Checkbox | Yes | Must answer for each borrower | One checkbox per borrower, shown after dropdown selection |

**Behavior:**
- When N is selected from the dropdown, N checkbox rows appear dynamically below.
- Checkbox labels: "לווה 1: יהיה רשום כבעל הנכס?", "לווה 2: יהיה רשום כבעל הנכס?", etc.
- Default: all checkboxes checked (all registered as property owners).
- IF a checkbox is unchecked: only 50% of that borrower's income is counted toward repayment capacity (explained in an info tooltip next to the checkbox: "לווה שאינו רשום כבעל הנכס — רק 50% מהכנסתו נלקחת בחשבון לצורך חישוב כושר ההחזר").
- Stored as: `num_borrowers`, `borrowers[N].is_property_owner`.

### No info (ⓘ) button at step level.

---

## Step 6 — פרטי לווים (Borrower Details: Name + Birth Date)

**Hebrew step title:** פרטי לווים
**English:** Borrower Details

This step repeats for each borrower (sub-steps within step 6 OR all borrowers shown on one scroll: implementation choice — show all borrowers on one page for ≤ 3 borrowers; paginate for 4–5).

### Fields (per borrower)

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **שם מלא — לווה N** (Full Name) | Text input | Yes | Min 2 characters, max 100 characters, Hebrew/English letters only | Always visible |
| **תאריך לידה — לווה N** (Birth Date) | Date picker | Yes | Must be in the past. Borrower must be at least 18. Must not be more than 85 years old. | Always visible |

**Computed max term (shown below all borrower entries):**
- "תקופת הלוואה מקסימלית: [85 - oldest_borrower_age] שנים"
- Updated in real time as birth dates are entered.
- IF computed max term < 4 years: inline error blocking Next (see error below).

### Error Messages

| Condition | Hebrew Error Message |
|---|---|
| Birth date missing | "תאריך לידה שדה חובה" |
| Borrower under 18 | "גיל מינימלי ללווה: 18" |
| Borrower over 85 | "גיל מקסימלי ללווה: 85" |
| Max term < 4 years (based on oldest borrower) | "תקופת ההלוואה המקסימלית (פחות מ-4 שנים) אינה מאפשרת קבלת משכנתא. אנא בדוק את תאריכי הלידה." — Next button blocked. |
| Full name missing | "שם מלא שדה חובה" |

---

## Step 7 — הכנסות (Net Income per Borrower)

**Hebrew step title:** הכנסות נטו
**English:** Net Monthly Income

### Fields (per borrower)

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **הכנסות נטו — לווה N (₪)** | Number input (NIS) | Yes | Min 1. Positive integer. | Always visible per borrower |
| Note for non-owner borrower | Informational text | N/A | N/A | Shown only if borrower N has is_property_owner = false |

**Non-owner borrower note text (Hebrew):** "(50% מהכנסה זו ייחשבו לצורך חישוב כושר ההחזר)"

**Info (ⓘ) button:**
- Tooltip/modal content (Hebrew): "שכיר: ממוצע 3 חודשים אחרונים. עצמאי: ממוצע 3 שנים אחרונות."

### Error Messages

| Condition | Hebrew Error Message |
|---|---|
| Empty or zero | "אנא הזן הכנסה חיובית" |
| Non-numeric | "אנא הזן מספר תקין" |

---

## Step 8 — הכנסות נוספות (Additional Income)

**Hebrew step title:** הכנסות נוספות
**English:** Additional Income (Optional)

This step is optional. Client may skip it (Next enabled even with no rows).

### Fields

**Dynamic table. Initially empty. Client adds rows with "הוסף הכנסה" button.**

Per row:

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **סוג הכנסה** (Income Type) | Dropdown | Yes (if row exists) | Must select one option | Always on each row |
| **סכום חודשי (₪)** (Monthly Amount) | Number input | Yes (if row exists) | Positive integer | Always on each row |
| **לווה** (Borrower) | Dropdown (borrower N selector) | Yes if num_borrowers > 1 | Must select one | Shown only if num_borrowers > 1 |
| **הסר** (Remove) | Button | N/A | N/A | Always on each row |

**Income type options (Hebrew / English dev reference):**

| Value | Hebrew |
|---|---|
| pension | פנסיה |
| rental | שכירות |
| dividend | דיבידנד |
| alimony | מזונות |
| other | אחר |

**Info (ⓘ) button:**
- Tooltip content (Hebrew): "הכנסות נוספות כוללות: דמי שכירות, פנסיה, קצבאות, מזונות מתקבלים, דיבידנדים."

**"Example" button:** Opens an example panel showing a sample filled table (illustrative data, not inserted into form).

**"הוסף הכנסה" (Add Income) button:** Adds a blank row to the table.

### Error Messages

| Condition | Hebrew Error Message |
|---|---|
| Row exists but type not selected | "אנא בחר סוג הכנסה" (inline on row) |
| Row exists but amount empty or zero | "אנא הזן סכום חיובי" (inline on row) |

---

## Step 9 — הוצאות קבועות (Fixed Expenses)

**Hebrew step title:** הוצאות קבועות
**English:** Fixed Expenses (Optional)

This step is optional. Client may skip it.

### Fields

**Dynamic table. Initially empty. Client adds rows with "הוסף הוצאה" button.**

Per row:

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **סוג הוצאה** (Expense Type) | Dropdown | Yes (if row exists) | Must select | Always on each row |
| **תשלום חודשי (₪)** (Monthly Payment) | Number input | Yes (if row exists) | Positive integer | Always on each row |
| **יתרה לסיום (₪)** (Remaining Balance) | Number input | No | Positive integer or zero | Always on each row |
| **תאריך סיום** (End Date) | Date picker | No | Must be in the future if provided | Always on each row |
| **ריבית (%)** (Interest Rate) | Number input | No | 0–50 percent | Always on each row |
| **מקור** (Source) | Dropdown | No | Must select if filled | Always on each row |
| **לווה** (Borrower) | Dropdown | Yes if num_borrowers > 1 | Must select | Shown if num_borrowers > 1 |
| **הסר** (Remove) | Button | N/A | N/A | Always on each row |

**Expense type options:**

| Value | Hebrew |
|---|---|
| loan | הלוואה |
| alimony_paid | מזונות |
| leasing | ליסינג |
| rent | שכ"ד |
| other | אחר |

**Source options:**

| Value | Hebrew |
|---|---|
| bank | בנק |
| provident_fund | קרן השתלמות |
| insurance | ביטוח |
| other | אחר |

**Info (ⓘ) button:**
- Tooltip (Hebrew): "כולל הלוואות בנקאיות, מזונות, ליסינג רכב, שכר דירה. אלו מפחיתים את כושר ההחזר שלך."

### Error Messages

| Condition | Hebrew Error Message |
|---|---|
| Expense type not selected | "אנא בחר סוג הוצאה" (inline on row) |
| Monthly payment empty or zero | "אנא הזן תשלום חיובי" (inline on row) |
| End date in the past | "תאריך סיום חייב להיות בעתיד" |

---

## Step 10 — טווח תשלום חודשי רצוי (Desired Monthly Payment Range)

**Hebrew step title:** תשלום חודשי רצוי
**English:** Desired Monthly Payment Range

### Computed Values (displayed read-only above the fields)

| Label (Hebrew) | Computation |
|---|---|
| **הכנסה נטו לצורך החזר** (Net income for repayment) | Sum of all borrowers' net income (owners: 100%; non-owners: 50%) minus fixed expenses monthly payments |
| **תשלום מקסימלי מותר (40%)** (Max allowed — 40%) | net_income_for_repayment × 0.40 |

### Fields

| Label (Hebrew) | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **תשלום מינימלי (₪)** (Minimum Payment) | Number input (NIS) | Yes | Positive integer. Must be < maximum payment value. | Always visible |
| **תשלום מקסימלי (₪)** (Maximum Payment) | Number input (NIS) | Yes | Positive integer. Must be ≤ computed 40% cap. Must be > minimum payment value. | Always visible |

**Dynamic hint below maximum payment field:**
- "מקסימום מותר: [40_percent_cap] ₪"

### Error Messages

| Condition | Hebrew Error Message |
|---|---|
| Maximum > 40% cap | "מקסימום מותר: [cap] ₪ (40% מהכנסתך)" |
| Minimum > Maximum | "הסכום המינימלי חייב להיות נמוך מהמקסימום" |
| Either field empty | Next remains disabled |
| Either field zero or negative | "אנא הזן סכום חיובי" |

---

## Post Step 10 — Registration Gate

After the client clicks "הבא" on step 10 and validation passes:

### IF client is NOT yet registered (unauthenticated or no account):

Display an interstitial screen (same wizard card layout, NOT counted as a step in the progress bar):

**Title (Hebrew):** "ראה את 5 תמהילי המשכנתא שלך"
**Body (Hebrew):** "צור חשבון חינמי כדי לראות את האפשרויות המחושבות עבורך."

| Field | Type | Required | Validation |
|---|---|---|---|
| **טלפון נייד** (Mobile Phone) | Text input | Yes (unless email provided) | Israeli mobile format |
| **- או -** | Separator text | N/A | N/A |
| **אימייל** (Email) | Text input | Yes (unless phone provided) | Standard email format |

**At least one of phone or email is required.**

| Button | Action |
|---|---|
| **צור חשבון** (Create Account) | Sends OTP to phone or email. On OTP verification: creates Account + Application, saves all wizard data, navigates to `/personal-area` → Clocks screen. |
| **כבר יש לי חשבון** (I already have an account) | Opens OTP Login Modal. On successful login: links wizard data to existing account, navigates to Clocks screen. |

### IF client IS already registered and logged in:

Skip the registration interstitial entirely. Wizard data saved, navigate directly to `/personal-area` → Clocks screen.

---

## Empty States

- Step 8 (Additional Income) table: "אין הכנסות נוספות. לחץ 'הוסף הכנסה' להוספה." — shown when table is empty.
- Step 9 (Fixed Expenses) table: "אין הוצאות קבועות. לחץ 'הוסף הוצאה' להוספה." — shown when table is empty.
- Both steps: client may proceed with empty tables (optional fields).

---

## Error States

| Error | Display | Location |
|---|---|---|
| Auto-save fails (localStorage) | Silent — no user-facing message. Data remains in memory for the session. | Background |
| Auto-save fails (server, for logged-in users) | Small non-blocking toast: "שמירה אוטומטית נכשלה. הנתונים שמורים בדפדפן שלך." | Bottom of page |
| Wizard state corrupted / unreadable on return | Reset wizard to step 1 with message: "לא ניתן לשחזר ההתקדמות. אנא מלא מחדש." | Step 1 page load |
| OTP send failure (at registration gate) | "שגיאה בשליחת הקוד. אנא נסה שוב." | Below phone/email field |
| Account creation failure | "שגיאה ביצירת החשבון. אנא נסה שוב מאוחר יותר." | Below Create Account button |

---

## Navigation

| Destination | Trigger |
|---|---|
| `/questionnaire` (step 1) | User clicks "New Mortgage" from home page |
| Step N+1 | User clicks "הבא" with valid inputs |
| Step N-1 | User clicks "הקודם" |
| `/personal-area` (Clocks tab) | Successful registration or login at post-step-10 gate |
| `/` (Home) | User clicks SimpleSave logo in nav bar |
| OTP Login Modal | User clicks "כבר יש לי חשבון" at registration gate |
