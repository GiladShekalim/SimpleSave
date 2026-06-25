# Screen 31 — Personal Details Tab

## Purpose

Collect and store all personal, employment, financial, and eligibility information for each borrower on the application. Data is saved incrementally (auto-save on blur). Completing all required fields triggers the PERSONAL_DETAILS_COMPLETE lifecycle event.

---

## Who Sees This / Access

- Authenticated clients (any tier, including no tier)
- Always accessible — this tab is never locked
- Advisors can view and edit all fields in the client detail view in the advisor dashboard

---

## Layout Overview

**Single borrower:** One set of sections A–G rendered directly.

**Multiple borrowers:** Sub-tabs at the top of the tab content area, one per borrower ("לווה 1 / Borrower 1", "לווה 2 / Borrower 2", etc.). Active borrower's sub-tab is underlined. Switching sub-tabs loads that borrower's data without page reload.

"+ הוסף לווה" / "Add Borrower" button appears after the last borrower sub-tab (if fewer than 4 borrowers). Clicking opens a confirmation dialog before adding a new borrower entry.

Each section is a collapsible card with:
- Section title (Hebrew)
- "ערוך" / Edit toggle button (top-right of card header) — toggles fields between read-only display and edit mode
- Progress indicator: "X/Y שדות הושלמו" / "X of Y fields completed" (small grey text in header)

**Global progress bar** at very top of tab (full-width): "X% of required fields complete" — updates live.

---

## Sections / Components

### Section A — Basic Information (פרטים בסיסיים)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| שם פרטי | First Name | Text input | Yes (mandatory for tier purchase) | Min 2 chars, Hebrew or Latin characters | Always shown |
| שם משפחה | Last Name | Text input | Yes | Min 2 chars | Always shown |
| מין | Gender | Radio (זכר / נקבה) | Yes | One of two options | Always shown |
| תאריך לידה | Date of Birth | Date picker (DD/MM/YYYY) | Yes | Age must be ≥18 and <85 at projected loan start date. Displays computed age next to field. | Always shown |
| מצב משפחתי | Marital Status | Dropdown: רווק / נשוי / גרוש / אלמן (Single / Married / Divorced / Widowed) | Yes | — | Always shown |
| מספר ילדים | Number of Children | Number input (0–20) | No | Integer ≥0 | Always shown |
| ילדים משותפים? | Are children shared between borrowers? | Radio (כן / לא) | No | — | Shown only IF: marital_status = Married AND number of borrowers ≥ 2 |
| השכלה | Education | Dropdown: תיכוני / על-תיכוני / תואר ראשון / תואר שני ומעלה (High School / Post-Secondary / Bachelor's / Master's+) | Yes | — | Always shown |

---

### Section B — Contact Details (פרטי קשר)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| טלפון | Phone Number | Tel input | Yes | Israeli mobile format 05X-XXXXXXX. Pre-filled from OTP registration if phone was used. Read-only if matches OTP-registered phone. | Always shown |
| אימייל | Email Address | Email input | Yes | Standard email format. Pre-filled from OTP registration if email was used. | Always shown |
| כתובת מגורים | Residential Address | Composite: city (dropdown Israeli cities) + street (text) + number (text) + apartment (text, optional) | No | — | Always shown |

---

### Section C — Employment (פרטי תעסוקה)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| סטטוס עיסוק | Employment Status | Dropdown: שכיר / עצמאי / בעל שליטה / לא עובד (Employee / Self-Employed / Controlling Shareholder / Not Working) | No | — | Always shown |
| מקצוע | Occupation | Text input | No | — | Shown if employment_status ≠ Not Working |
| מקום עבודה | Employer Name | Text input | No | — | Shown if employment_status ∈ {Employee, Controlling Shareholder} |
| עיר מקום עבודה | Employer City | Dropdown (Israeli cities list) | No | — | Shown if employment_status ∈ {Employee, Controlling Shareholder} |
| תאריך תחילת עבודה | Employment Start Date | Date picker | No | Must be in the past | Shown if employment_status ∈ {Employee, Controlling Shareholder} |

**Previous employer sub-section:**

Shown automatically when employment_start_date results in tenure < 12 months from today.

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| שם מעסיק קודם | Previous Employer Name | Text input | No | — | tenure < 12 months |
| תאריך תחילת העסקה | Previous Employment From | Date picker | No | Must be before previous_employment_to | tenure < 12 months |
| תאריך סיום העסקה | Previous Employment To | Date picker | No | Must be in the past | tenure < 12 months |

---

### Section D — Citizenship and Compliance (אזרחות ותאימות רגולטורית)

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| אזרחות נוספת | Additional Citizenship | Radio (כן / לא) with ⓘ tooltip: "נדרש על ידי הבנק לצורך קביעת תושבות מס" | No | — | Always shown |
| חבות מס במדינה נוספת | Tax obligation abroad? | Radio (כן / לא) | No | — | Shown only IF additional_citizenship = כן |
| קרבה לאיש ציבור | Politically Exposed Person (PEP) | Radio (כן / לא) with ⓘ tooltip explaining PEP: "בעל תפקיד ציבורי בכיר, בן משפחה של בעל תפקיד כזה, או מי שמקורב לו" | No | — | Always shown |
| מצב בריאותי תקין | Healthy Medical Status | Radio (כן / לא) | No | IF לא: display info box "צרו קשר — ביטוח חיים עשוי לדרוש חיתום מיוחד" in amber | Always shown |
| בעיות אשראי ב-7 שנים האחרונות | Credit issues in past 7 years? | Radio (כן / לא) with ⓘ button that opens a list panel (see below) | Yes | — | Always shown |
| פירוט בעיות אשראי | Credit issues detail | Textarea (free text) | Yes (conditional) | Min 10 chars | Shown only IF credit_issues = כן |

**Credit issues ⓘ panel content (opens as popover/modal):**
- האכיפה (Enforcement)
- חשבון מוגבל (Limited account)
- פיגורים במשכנתא (Mortgage arrears)
- צ'קים שחזרו (Bounced checks)
- הלוואות שחזרו (Returned loans)
- הוראות קבע שסורבו (Direct debit dishonored)
- אחר (Other)

---

### Section E — Financial Information (מידע פיננסי)

#### Net Income

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| הכנסה נטו חודשית | Net Monthly Income | Number input (NIS, integer) | Yes | > 0. ⓘ tooltip: "שכיר: ממוצע 3 חודשים אחרונים. עצמאי/בעל שליטה: ממוצע 3 שנים אחרונות." | Always shown |

#### Additional Income Table

Expandable multi-row table. Each row:

| Column | Type | Options |
|---|---|---|
| סוג הכנסה / Income Type | Dropdown | שכר דירה (Rental income) / קצבה (Pension) / פנסיה (Retirement) / אחר (Other) |
| סכום חודשי / Monthly Amount | Number (NIS) | — |

"+ הוסף הכנסה" / "Add Income" button below table. "X" delete button per row.

#### Fixed Expenses Table

Expandable multi-row table. Each row:

| Column | Type |
|---|---|
| סוג הוצאה / Expense Type | Dropdown: משכנתא / הלוואה / ליסינג / כרטיס אשראי / אחר |
| תשלום חודשי / Monthly Payment (NIS) | Number |
| יתרה לסילוק / Outstanding Balance (NIS) | Number |
| תאריך סיום / End Date | Date picker |
| ריבית / Interest Rate (%) | Number |
| מקור / Source | Text (bank/lender name) |

"+ הוסף הוצאה" / "Add Expense" button.

#### Checking Accounts Table

One row per bank account. Columns:

| Column | Type |
|---|---|
| בנק / Bank | Dropdown (bank list from system) |
| סניף / Branch | Number input |
| מספר חשבון / Account Number | Number input |

"+ הוסף חשבון" / "Add Account" button.

#### Savings Fund (קרן השתלמות)

| Hebrew Label | Type | Required | Conditional |
|---|---|---|---|
| קרן השתלמות | Radio (כן / לא) | No | Always shown |
| סכום / Amount (NIS) | Number input | No | Shown IF כן |
| תאריך זמינות / Available Date | Date picker | No | Shown IF כן |

#### Rent and Other

| Hebrew Label | Field Name | Type | Required | Conditional |
|---|---|---|---|---|
| תשלום שכ"ד חודשי | Monthly Rent Payment (NIS) | Number | No | Always shown |

---

### Section F — Additional Properties (נכסים נוספים)

| Hebrew Label | Field Name | Type | Required | Conditional |
|---|---|---|---|---|
| נכסים נוספים | Additional Properties | Radio (כן / לא) | No | Always shown |

IF כן: expandable table of additional properties. Each row:

| Column | Type |
|---|---|
| סוג נכס / Property Type | Dropdown: בית פרטי / דו משפחתי / בניין משותף / קרקע |
| עיר / City | Dropdown (Israeli cities) |
| רחוב / Street | Text input |
| מספר / Number | Text input |
| קומה / Floor | Number |
| דירה / Apartment | Text input |
| שטח במ"ר / Area sqm | Number |
| שווי משוער / Estimated Value (NIS) | Number |
| משכנתא קיימת / Existing Mortgage | Radio (כן / לא) |
| יתרת משכנתא / Mortgage Balance (NIS) | Number — shown IF existing mortgage = כן |

"+ הוסף נכס" / "Add Property" button.

---

### Section G — First Apartment Eligibility (זכאות דירה ראשונה)

**Visibility condition:** Shown only IF:
- Loan type (from mortgage details) = primary_residence (דירה ראשונה / מגורים)
- Client has no prior owned properties (additional_properties = לא)

If borrower has not yet entered mortgage details, show a note: "מלאו את נתוני המשכנתא תחילה כדי לבדוק זכאות."

| Hebrew Label | Field Name | Type | Required | Validation | Conditional |
|---|---|---|---|---|---|
| חודשי שירות סדיר | Military Service Months | Number (0–60+) | No | Integer ≥ 0 | Always shown in section |
| מספר אחים בארץ | Siblings in Country | Number (0–20) | No | Integer ≥ 0 | Always shown in section |
| תאריך נישואים | Wedding Date | Date picker | No | Must be in the past | Always shown in section |
| ילדים מתחת לגיל 18 | Children Under 18 | Number (0–20) | No | Integer ≥ 0. ⓘ tooltip: "החל מחודש 5 להריון, עובר נחשב כילד." | Always shown in section |
| מעשן? | Smoker | Radio (כן / לא) | No | — | Always shown in section |

#### Eligibility Result Widget

Rendered inside Section G, below the fields.

**Visibility condition:** Shown when all of the following are provided:
- military_service_months
- siblings_in_country
- wedding_date (if married)
- children_under_18

**Widget content:**
- Title: "ניקוד זכאות משוער" / Estimated Eligibility Score
- Score number (computed by backend algorithm)
- Estimated entitlement loan amount (NIS), e.g. "₪200,000 – ₪280,000"
- Disclaimer text: "בכפוף לאישור משרד השיכון" / "Subject to Ministry of Housing confirmation"
- "Refresh" icon button (re-triggers calculation after edits)

---

## Buttons

| Button | Action | Conditions |
|---|---|---|
| Auto-save | Fires on blur of any field. No user action required. Updates "Last saved" indicator. | Always active |
| שמור / Save (manual) | Saves all current field values for active borrower. Shows "✓ נשמר" checkmark for 3 seconds then reverts to "שמור" label. | Always shown; enabled only when unsaved changes exist |
| ערוך / Edit (per section) | Toggles section from read-only to edit mode | Shown in read-only mode per section |
| + הוסף לווה / Add Borrower | Adds a new borrower sub-tab | Shown if borrower count < 4 |
| מחק לווה / Remove Borrower | Removes a borrower (with confirmation dialog) | Shown only on borrower sub-tabs 2+ |

---

## States

### Mandatory fields incomplete

- "Complete required fields to proceed" banner shown below section header
- Required unfilled fields show red asterisk and red placeholder text
- Global progress bar shows < 100%

### All mandatory fields complete

- Global progress bar reaches 100%, turns green
- "✓ פרטים אישיים הושלמו" success toast displayed
- Application lifecycle status auto-updates to PERSONAL_DETAILS_COMPLETE (server-side trigger)
- Green checkmark appears next to tab label in sidebar

### Saving

- Per-field: small spinner replaces field border on blur
- Failure: field border turns red, "שגיאה בשמירה" tooltip

### Read-only (advisor preview)

- All fields rendered as text (no inputs)
- "Advisor View" banner shown at top
- No save or edit buttons visible

---

## Navigation

**Incoming paths:**
- 30-screen-personal-area-hub.md → Personal Details tab click

**Outgoing paths:**
- Completing section triggers no navigation (auto-save in place)
- When PERSONAL_DETAILS_COMPLETE triggered: banner appears in hub header suggesting "Continue to Mortgage Details"
- "Continue" CTA (if present) → Mortgage Details tab
