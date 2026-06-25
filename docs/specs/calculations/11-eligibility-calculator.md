# 11 — Eligibility Calculator (Zchaut Misrad Hashikun)

## Purpose

Calculate government housing assistance eligibility (זכאות משרד השיכון) score and loan entitlement amount for qualifying borrowers. The calculator determines whether the client's application qualifies for a Ministry of Housing-assisted mortgage, the entitlement score, and the associated loan amount.

---

## Scope (v1)

**In scope:** Vatikei haaretz (ותיקי הארץ — veteran residents) category only. This is the primary eligibility path for Israeli-born citizens and long-term residents.

**Out of scope (deferred to v2):**
- New immigrants (עולים חדשים)
- Olim pathway (5-year track)
- Disabled veterans (נכי צבא)
- Other special categories

---

## Applicability Conditions

The eligibility calculator runs ONLY when ALL of the following are true:

1. `application.loan_type = 'primary_residence'` (דירה ראשונה)
2. No borrower in the application has `has_prior_property = true` (no prior apartment ownership by any borrower)
3. At least one borrower has `is_veteran_resident = true` (ותיק הארץ — born in Israel or resided continuously for the qualifying period)

If any condition is not met, the calculator returns `{ is_eligible: false, reason: 'conditions_not_met' }` and no score is shown.

---

## Inputs

All inputs are drawn from `Borrower` records associated with the application.

| Input | Source Field | Type | Notes |
|---|---|---|---|
| `birth_date` | `borrowers.birth_date` | date | Used to compute age at application date |
| `marital_status` | `borrowers.marital_status` | enum | `single`, `married`, `divorced`, `widowed` |
| `num_children_under_18` | `borrowers.children_under_18` | integer | From month 5 of pregnancy counts as 1 child (see Edge Cases) |
| `military_service_months` | `borrowers.military_service_months` | integer | 0 if no service or data missing |
| `num_siblings_in_country` | `borrowers.num_siblings_in_country` | integer | Siblings currently residing in Israel |
| `wedding_date` | `borrowers.wedding_date` | date | Required if marital_status = married |
| `is_veteran_resident` | `borrowers.is_veteran_resident` | boolean | |
| `has_prior_property` | `borrowers.has_prior_property` | boolean | Must be false for all borrowers for eligibility |

**Couple handling:** If the application has two borrowers, evaluate using the primary eligible borrower. If one borrower is a veteran resident and the other is not, use the veteran resident's data for scoring. If both are eligible veterans, use the higher-scoring borrower's data.

---

## Scoring Table

**IMPORTANT TO DEVELOPER:** The exact point values and scoring table must be validated against the current official table published at:
https://www.gov.il/he/pages/mortgage_guide?chapterIndex=2

The table below reflects the structure and representative values as understood from the official source. Verify all values before go-live and populate the `eligibility_scoring_rules` table accordingly.

### Scoring Rules

All scoring rules are stored in the `eligibility_scoring_rules` database table (admin-editable):

```
eligibility_scoring_rules
  id              UUID, PK
  rule_category   VARCHAR  (e.g., 'marital_status', 'children', 'military_service', ...)
  condition_key   VARCHAR  (machine-readable condition identifier)
  condition_label_he VARCHAR  (Hebrew label for admin display)
  points          INTEGER
  sort_order      INTEGER
  is_active       BOOLEAN
  updated_at      TIMESTAMP
```

### Category 1: Marital Status

| Condition | Points (Placeholder — verify from gov.il) |
|---|---|
| Single | 0 |
| Married | 6 |
| Divorced with custody | 6 |
| Widowed | 6 |

### Category 2: Number of Children Under 18

| Children | Points (Placeholder) |
|---|---|
| 0 | 0 |
| 1 | 6 |
| 2 | 12 |
| 3 | 18 |
| 4 | 24 |
| 5 | 30 |
| 6 or more | 36 |

Points = children_count × 6 (capped per government table). Use table lookup, not formula.

### Category 3: Military Service

| Service Duration | Points (Placeholder) |
|---|---|
| 0 months | 0 |
| 1–12 months | 4 |
| 13–24 months | 8 |
| 25–36 months | 12 |
| 37–48 months | 16 |
| 49–60 months | 20 |
| 61 months or more | 24 |

### Category 4: Siblings in Country (Israel)

| Siblings Count | Points (Placeholder) |
|---|---|
| 0 | 0 |
| 1–2 | 4 |
| 3–4 | 8 |
| 5 or more | 12 |

### Category 5: Wedding Duration (Married borrowers only)

Duration = years since `wedding_date` to current application date.

| Years Married | Points (Placeholder) |
|---|---|
| 0–1 | 0 |
| 2–4 | 2 |
| 5–9 | 4 |
| 10–14 | 6 |
| 15–19 | 8 |
| 20 or more | 10 |

Not applicable for single, divorced (no wedding_date), or widowed borrowers.

### Category 6: Age of Borrower

Age = floor((application_date - birth_date) / 365.25)

| Age at Application | Points (Placeholder) |
|---|---|
| Under 30 | 0 |
| 30–34 | 4 |
| 35–39 | 8 |
| 40–44 | 12 |
| 45–49 | 16 |
| 50 and above | 20 |

---

## Scoring Algorithm

```
function calculateEligibilityScore(borrower, application_date):
  
  if not borrower.is_veteran_resident:
    return { is_eligible: false }
  
  score = 0
  
  // Category 1: Marital status
  score += lookup('marital_status', borrower.marital_status)
  
  // Category 2: Children
  children = borrower.children_under_18  // includes pregnant from month 5
  score += lookup('children', clamp(children, 0, 6+))
  
  // Category 3: Military service
  service_months = borrower.military_service_months ?? 0
  score += lookup('military_service', service_months)
  
  // Category 4: Siblings
  siblings = borrower.num_siblings_in_country ?? 0
  score += lookup('siblings', siblings)
  
  // Category 5: Wedding duration (only if married and wedding_date exists)
  if borrower.marital_status == 'married' AND borrower.wedding_date != null:
    years_married = floor(years_between(borrower.wedding_date, application_date))
    score += lookup('wedding_duration', years_married)
  
  // Category 6: Age
  age = floor(years_between(borrower.birth_date, application_date))
  score += lookup('age', age)
  
  return score

function lookup(category, value):
  // Find the matching row in eligibility_scoring_rules for the given category
  // and condition that covers the value (range match or exact match)
  // Return the points value
```

---

## Entitlement Amount Lookup

After computing the score, the system looks up the corresponding entitlement loan amount. This table is also stored in the database (`eligibility_entitlement_amounts`) and is admin-editable.

```
eligibility_entitlement_amounts
  id              UUID, PK
  score_min       INTEGER
  score_max       INTEGER
  loan_amount_ils INTEGER  (entitlement loan in NIS)
  label_he        VARCHAR  (e.g., "זכאות ברמה ב")
  is_active       BOOLEAN
  updated_at      TIMESTAMP
```

**Placeholder entitlement table (verify from gov.il before go-live):**

| Score Range | Entitlement Amount (NIS) — Placeholder |
|---|---|
| 0–9 | 0 (not eligible) |
| 10–19 | 100,000 |
| 20–29 | 150,000 |
| 30–39 | 200,000 |
| 40–49 | 250,000 |
| 50–59 | 300,000 |
| 60–69 | 350,000 |
| 70–79 | 400,000 |
| 80–89 | 450,000 |
| 90–99 | 500,000 |
| 100+ | 600,000 |

A score of 0–9 with 0 entitlement means the borrower technically meets the vatikei haaretz category conditions but did not score enough points for an entitlement. Display: "אינך עומד/ת בתנאי הסף לזכאות. ניתן לבדוק מחדש אם חל שינוי בנסיבות."

---

## Outputs

| Output | Type | Description |
|---|---|---|
| `is_eligible` | boolean | True if applicability conditions met and score >= minimum threshold |
| `score` | integer | Total points scored |
| `eligibility_loan_amount` | integer (NIS) | Entitlement amount from lookup table (0 if below threshold) |
| `eligibility_label_he` | string | Hebrew label from entitlement table (e.g., "זכאות ברמה ב") |
| `eligibility_note_he` | string | Full explanation text to display to client |
| `score_breakdown` | array | Per-category points for transparency display |
| `inapplicable_reason` | string / null | Reason why calculator did not run (if conditions not met) |

**Score breakdown row:**

| Field | Type | Description |
|---|---|---|
| `category` | string | Machine key |
| `category_label_he` | string | Hebrew label |
| `input_value` | string | What was evaluated (e.g., "נשוי/אה", "3 ילדים") |
| `points` | integer | Points awarded |

**eligibility_note_he template:**

If eligible:
> "לפי הנתונים שהוזנו, הניקוד שלך הוא {score} נקודות. זכאותך לסיוע ממשלתי הינה {loan_amount_formatted} ₪. בכפוף לאישור משרד השיכון."

If not eligible (below threshold):
> "לפי הנתונים שהוזנו, הניקוד שלך הוא {score} נקודות. אינך עומד/ת בתנאי הסף לזכאות. ניתן לבדוק מחדש אם חל שינוי בנסיבות."

If conditions not met:
> "מחשבון הזכאות אינו רלוונטי לבקשה זו ({inapplicable_reason})."

---

## Display in Personal Area

The eligibility result is displayed in the Personal Details tab of the personal area, in a dedicated "זכאות" (Eligibility) section:

- Shown only if applicability conditions are met.
- If eligible: green badge with text "זכאי/ת לסיוע ממשלתי" + amount.
- If not eligible (conditions met but score below threshold): orange badge with "אינך עומד/ת בתנאי הסף לזכאות".
- Score breakdown expandable/collapsible section (click to show per-category points).
- Disclaimer displayed beneath all results: "הסכום המוצג הינו הערכה בלבד. הסכום הסופי נקבע על ידי משרד השיכון בהתאם לנסיבות הספציפיות."

---

## Update Trigger

Recalculate whenever any of the following borrower fields change:
- `birth_date`
- `marital_status`
- `children_under_18`
- `military_service_months`
- `num_siblings_in_country`
- `wedding_date`
- `is_veteran_resident`
- `has_prior_property`

Also recalculate when:
- A new borrower is added or removed from the application.
- Admin updates any row in `eligibility_scoring_rules` or `eligibility_entitlement_amounts`.

Recalculation is synchronous (inline with the save operation) for individual borrower field changes. For admin table changes, a background job recalculates all affected applications.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Two borrowers, one eligible and one not | Use the eligible borrower's score. If both are eligible, use the higher score. |
| Couple: one veteran resident, one not | Veteran resident's score is used. Non-veteran borrower's data is ignored for scoring. |
| Pregnant borrower from month 5 of pregnancy | `children_under_18` should be set to include the unborn child (borrower or questionnaire marks pregnancy stage). System counts as 1 child if `borrower.pregnancy_month >= 5`. Developer note: add `pregnancy_month` nullable field to borrowers and handle in this calculation. |
| `military_service_months` missing / null | Assume 0 months. Do not block scoring. |
| `num_siblings_in_country` missing / null | Assume 0 siblings. |
| `wedding_date` missing for married borrower | Do not award wedding-duration points. Log a data quality warning. Do not block scoring. |
| Score exactly on category boundary (e.g., score = 20) | Use the lower band's upper boundary (score 20 falls in the 20–29 band). |
| Admin sets `score_min = score_max` for a single-score band | Valid — single-score bands are allowed in the table structure. |
| Loan type is not primary_residence | `is_eligible = false`, `inapplicable_reason = "loan_type_not_primary_residence"`. No score computed. |
| Any borrower has_prior_property = true | `is_eligible = false`, `inapplicable_reason = "prior_property_ownership"`. No score computed. |
| No borrower qualifies as veteran resident | `is_eligible = false`, `inapplicable_reason = "no_veteran_resident_borrower"`. |
| All eligibility table data deleted (misconfiguration) | Return error: `{ is_eligible: null, error: "eligibility_table_not_configured" }`. Admin alerted. |

---

## Developer Notes

1. **Official source:** The scoring tables (`eligibility_scoring_rules`) and entitlement amounts (`eligibility_entitlement_amounts`) MUST be populated from the official government source before go-live:
   https://www.gov.il/he/pages/mortgage_guide?chapterIndex=2

2. **Placeholder values:** All point values and loan amounts in this spec are structural placeholders. The actual regulatory values must be verified with a licensed mortgage advisor and/or directly from the Ministry of Housing.

3. **Annual updates:** The government revises entitlement amounts periodically (often annually). The Admin interface must provide an easy way to update both tables. Consider adding a `version` field and `effective_date` to support future versioning.

4. **Score display transparency:** Showing the per-category breakdown is important for client trust and advisor verification. Always return `score_breakdown` even when not displayed by default.

5. **Eligibility vs loan max:** The eligibility loan amount is in addition to the standard mortgage, not a replacement. The calculator result informs the financial planning but the total loan still must comply with all standard mortgage limits (LTV, payment ratio, etc.).

---

## Dependencies

- `borrowers` table (all input fields above)
- `applications` table (loan_type, application_date)
- `eligibility_scoring_rules` table (admin-managed scoring)
- `eligibility_entitlement_amounts` table (admin-managed entitlement table)
- `system_parameters` (none directly, but admin trigger for recalculation batch)
- Background job queue (for admin-triggered batch recalculation)
- AuditLog (`ELIGIBILITY_CALCULATED` event with application_id, score, amount)
