# 02 — Data Model

## Purpose
Define all database entities, fields, types, constraints, and relationships for SimpleSave v1.

---

## Entity: User
Central identity record. All three roles share this entity; role field determines access.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| phone | VARCHAR(20) | UNIQUE, NULLABLE | At least one of phone/email required |
| email | VARCHAR(255) | UNIQUE, NULLABLE | |
| role | ENUM('admin','advisor','client') | NOT NULL | |
| full_name | VARCHAR(255) | NULLABLE | Populated during personal details step |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Soft-disable |
| created_at | TIMESTAMP | NOT NULL | |
| last_login_at | TIMESTAMP | NULLABLE | |

---

## Entity: OTPSession
Temporary record for OTP verification flow.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → User | |
| otp_hash | VARCHAR(255) | NOT NULL | SHA-256 of OTP code |
| channel | ENUM('phone','email') | NOT NULL | |
| expires_at | TIMESTAMP | NOT NULL | 10 minutes from issue |
| used_at | TIMESTAMP | NULLABLE | Set on successful verification |
| attempt_count | INTEGER | NOT NULL, DEFAULT 0 | Lock after 5 failed attempts |

---

## Entity: Borrower
One per borrower on an application. Multiple borrowers per application (1–5).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| application_id | UUID | FK → Application | |
| user_id | UUID | FK → User, NULLABLE | Null if borrower is not the account holder |
| is_property_owner | BOOLEAN | NOT NULL | If false, only 50% of income counted |
| sequence_number | INTEGER | NOT NULL | 1 = primary borrower |
| first_name | VARCHAR(100) | NULLABLE | Mandatory for tier purchase |
| last_name | VARCHAR(100) | NULLABLE | Mandatory for tier purchase |
| gender | ENUM('male','female') | NULLABLE | |
| birth_date | DATE | NULLABLE | Mandatory; drives max loan term (age 85 cap) |
| marital_status | ENUM('single','married','divorced','widowed') | NULLABLE | |
| num_children | INTEGER | NULLABLE | |
| children_shared | BOOLEAN | NULLABLE | For couples: are children shared? |
| education | ENUM('high_school','post_secondary','bachelor','master') | NULLABLE | |
| phone | VARCHAR(20) | NULLABLE | |
| email | VARCHAR(255) | NULLABLE | |
| employment_status | ENUM('employee','self_employed','controlling_shareholder') | NULLABLE | |
| occupation | VARCHAR(255) | NULLABLE | |
| employer_name | VARCHAR(255) | NULLABLE | |
| employer_city | VARCHAR(100) | NULLABLE | |
| employment_start_date | DATE | NULLABLE | |
| prev_employer_name | VARCHAR(255) | NULLABLE | If < 1 year at current employer |
| prev_employment_start_date | DATE | NULLABLE | |
| prev_employment_end_date | DATE | NULLABLE | |
| has_additional_citizenship | BOOLEAN | NULLABLE | |
| has_foreign_tax_obligation | BOOLEAN | NULLABLE | If additional citizenship = true |
| is_politically_exposed | BOOLEAN | NULLABLE | |
| has_health_issues | BOOLEAN | NULLABLE | If true → flag for life insurance review |
| has_credit_issues | BOOLEAN | NULLABLE | |
| credit_issues_detail | TEXT | NULLABLE | Free text, required if has_credit_issues = true |
| net_income | DECIMAL(12,2) | NULLABLE | Monthly, in NIS |
| military_service_months | INTEGER | NULLABLE | For first-apartment eligibility |
| num_siblings_in_country | INTEGER | NULLABLE | For gov eligibility calc |
| is_smoker | BOOLEAN | NULLABLE | For life insurance |
| wedding_date | DATE | NULLABLE | For gov eligibility calc |
| children_under_18 | INTEGER | NULLABLE | For gov eligibility calc |
| address_city | VARCHAR(100) | NULLABLE | |
| address_street | VARCHAR(255) | NULLABLE | |
| address_number | VARCHAR(20) | NULLABLE | |
| address_apartment | VARCHAR(20) | NULLABLE | |
| has_checking_account | BOOLEAN | NULLABLE | |
| checking_accounts | JSONB | NULLABLE | Array of {bank, branch, account_number} |
| has_savings_fund | BOOLEAN | NULLABLE | |
| savings_fund_amount | DECIMAL(12,2) | NULLABLE | |
| savings_fund_available_date | DATE | NULLABLE | |
| has_rental_payment | BOOLEAN | NULLABLE | |
| rental_payment_amount | DECIMAL(12,2) | NULLABLE | |

---

## Entity: Application
One per mortgage request. A client can have multiple applications over time.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| client_user_id | UUID | FK → User | |
| advisor_id | UUID | FK → User, NULLABLE | Assigned by admin |
| tier | ENUM('mix_approval','online_guidance','personal_advisor') | NULLABLE | Chosen at registration |
| status | ENUM (see lifecycle in 01-architecture-overview.md) | NOT NULL | |
| loan_type | ENUM('primary_residence','additional_property','all_purpose','home_improvement') | NULLABLE | |
| property_source | ENUM('contractor','second_hand','price_for_residents','self_build') | NULLABLE | |
| property_value | DECIMAL(14,2) | NULLABLE | |
| equity_amount | DECIMAL(14,2) | NULLABLE | |
| equity_sources | JSONB | NULLABLE | Array of {source_type, amount} |
| loan_amount | DECIMAL(14,2) | NULLABLE | Derived: property_value − equity_amount |
| financing_ratio | DECIMAL(5,4) | NULLABLE | Derived: loan_amount / property_value |
| desired_monthly_min | DECIMAL(10,2) | NULLABLE | |
| desired_monthly_max | DECIMAL(10,2) | NULLABLE | Max 40% of net income |
| max_loan_term_years | INTEGER | NULLABLE | Derived: 85 − age of oldest borrower |
| property_registration_type | ENUM('tabu','minha','mishkenet') | NULLABLE | |
| property_type | ENUM('private_house','duplex','apartment_building') | NULLABLE | |
| property_address_city | VARCHAR(100) | NULLABLE | |
| property_address_street | VARCHAR(255) | NULLABLE | |
| property_address_number | VARCHAR(20) | NULLABLE | |
| property_address_apartment | VARCHAR(20) | NULLABLE | |
| property_floor | INTEGER | NULLABLE | |
| property_total_floors | INTEGER | NULLABLE | |
| property_area_sqm | DECIMAL(8,2) | NULLABLE | |
| property_age_years | INTEGER | NULLABLE | |
| purchase_status | ENUM('searching','signed_contract','about_to_sign') | NULLABLE | |
| contract_signed_date | DATE | NULLABLE | If purchase_status = signed_contract |
| money_needed_by | ENUM('this_month','two_months','three_plus_months') | NULLABLE | |
| previously_applied_to_banks | BOOLEAN | NULLABLE | |
| previously_applied_bank_ids | JSONB | NULLABLE | Array of bank IDs |
| willing_to_transfer_account | ENUM('yes','no','want_details_first') | NULLABLE | |
| has_prior_mortgage_application | BOOLEAN | NULLABLE | |
| selected_mix_id | UUID | FK → Mix, NULLABLE | Clock the client chose |
| selected_bank_id | UUID | FK → Bank, NULLABLE | Bank chosen after principal approval |
| authorization_signed_at | TIMESTAMP | NULLABLE | |
| terms_accepted_at | TIMESTAMP | NULLABLE | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

---

## Entity: AdditionalIncome
Per borrower, per income type.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| borrower_id | UUID | FK → Borrower | |
| income_type | ENUM('pension','rental','dividend','alimony_received','other') | NOT NULL | |
| income_type_detail | VARCHAR(255) | NULLABLE | If type = other |
| monthly_amount | DECIMAL(12,2) | NOT NULL | |

---

## Entity: FixedExpense
Per borrower, per expense (loans, alimony paid, leasing, rent, other).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| borrower_id | UUID | FK → Borrower | |
| expense_type | ENUM('loan','alimony_paid','leasing','rent','other') | NOT NULL | |
| expense_type_detail | VARCHAR(255) | NULLABLE | |
| monthly_amount | DECIMAL(12,2) | NOT NULL | |
| remaining_balance | DECIMAL(12,2) | NULLABLE | |
| end_date | DATE | NULLABLE | |
| interest_rate | DECIMAL(5,4) | NULLABLE | |
| source | ENUM('bank','savings_fund','insurance_company','other') | NULLABLE | |

---

## Entity: AdditionalProperty
Per borrower, per property owned.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| borrower_id | UUID | FK → Borrower | |
| property_type | ENUM('private_house','duplex','apartment_building') | NOT NULL | |
| city | VARCHAR(100) | NOT NULL | |
| street | VARCHAR(255) | NOT NULL | |
| number | VARCHAR(20) | NOT NULL | |
| floor | INTEGER | NULLABLE | |
| apartment_number | VARCHAR(20) | NULLABLE | |
| area_sqm | DECIMAL(8,2) | NULLABLE | |
| estimated_value | DECIMAL(14,2) | NULLABLE | |
| existing_mortgage | DECIMAL(14,2) | NULLABLE | |

---

## Entity: Mix
A mortgage mix = a named collection of tracks, authored and managed by Admin.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| clock_number | INTEGER | NOT NULL, 1–5 | Which of the 5 clocks this is |
| name | VARCHAR(100) | NOT NULL | Internal admin name |
| risk_level | ENUM('low','medium','high') | NOT NULL | Drives speedometer display |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

---

## Entity: MixTrack
One track within a mix. A mix has 1–10 tracks. Track percentages must sum to 100%.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| mix_id | UUID | FK → Mix | |
| sequence | INTEGER | NOT NULL | Display order |
| track_type | ENUM('fixed','variable','prime') | NOT NULL | |
| cpi_linked | BOOLEAN | NOT NULL | false for prime tracks always |
| period_years | INTEGER | NOT NULL | 4–30; variable min 6 |
| rate_change_interval_months | INTEGER | NULLABLE | Variable tracks only (e.g. 36, 60) |
| amortization_type | ENUM('spitzer','equal_principal') | NOT NULL | |
| percentage_of_mix | DECIMAL(5,2) | NOT NULL | Must total 100 across tracks in mix |
| anchor_rate | DECIMAL(6,4) | NULLABLE | From interest rate table |
| spread | DECIMAL(6,4) | NULLABLE | Margin over anchor |
| total_rate | DECIMAL(6,4) | NULLABLE | Derived: anchor + spread (or prime + spread) |

---

## Entity: InterestRateTable
Admin-managed rate table. One entry per type/term/purpose combination.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| track_type | ENUM('fixed','variable','prime') | NOT NULL | |
| cpi_linked | BOOLEAN | NOT NULL | |
| loan_purpose | ENUM('housing','all_purpose') | NOT NULL | |
| period_years_min | INTEGER | NOT NULL | |
| period_years_max | INTEGER | NOT NULL | |
| rate | DECIMAL(6,4) | NOT NULL | Annual rate |
| effective_from | DATE | NOT NULL | |
| created_by_admin_id | UUID | FK → User | |

---

## Entity: SystemParameter
Key-value store for admin-editable regulatory/market parameters.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| key | VARCHAR(100) | UNIQUE, NOT NULL | e.g. 'cpi_annual_forecast', 'prime_rate' |
| value | DECIMAL(10,6) | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |
| updated_by_admin_id | UUID | FK → User | |
| previous_value | DECIMAL(10,6) | NULLABLE | For audit |

---

## Entity: Bank
Reference table of participating banks.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| name_he | VARCHAR(100) | NOT NULL | Hebrew display name |
| logo_url | VARCHAR(500) | NULLABLE | |
| mortgage_hotline | VARCHAR(50) | NULLABLE | |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | |

---

## Entity: PrincipalApproval
One record per bank per application, tracking approval status.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| application_id | UUID | FK → Application | |
| bank_id | UUID | FK → Bank | |
| status | ENUM('pending','approved','rejected','expired') | NOT NULL | |
| submitted_at | TIMESTAMP | NULLABLE | |
| response_at | TIMESTAMP | NULLABLE | |
| approved_amount | DECIMAL(14,2) | NULLABLE | |
| approved_mix_details | JSONB | NULLABLE | Track details from bank |
| notes | TEXT | NULLABLE | Advisor-entered notes |
| is_best_offer | BOOLEAN | NOT NULL, DEFAULT false | Computed; only one per application |

---

## Entity: Document
One record per document slot per application.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| application_id | UUID | FK → Application | |
| borrower_id | UUID | FK → Borrower, NULLABLE | Null for application-level docs |
| document_type | FK → DocumentType | NOT NULL | |
| status | ENUM('required','uploaded','approved','rejected','not_required') | NOT NULL | |
| file_url | VARCHAR(500) | NULLABLE | Storage key |
| file_name | VARCHAR(255) | NULLABLE | Original filename |
| uploaded_at | TIMESTAMP | NULLABLE | |
| reviewed_at | TIMESTAMP | NULLABLE | |
| reviewed_by | UUID | FK → User, NULLABLE | Advisor who reviewed |
| rejection_reason | TEXT | NULLABLE | |
| is_required_for_approval | BOOLEAN | NOT NULL | |

---

## Entity: DocumentType
Reference table of all possible document types.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| name_he | VARCHAR(255) | NOT NULL | Hebrew label shown to client |
| description_he | TEXT | NULLABLE | Tooltip/ⓘ explanation in Hebrew |
| required_condition | JSONB | NOT NULL | Rules: {employment_status, loan_type, etc.} |
| required_for_principal_approval | BOOLEAN | NOT NULL | |

---

## Entity: Collateral
Post-signing collateral requirements, advisor-populated.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| application_id | UUID | FK → Application | |
| description_he | TEXT | NOT NULL | |
| status | ENUM('pending','submitted','approved') | NOT NULL | |
| added_by_advisor_id | UUID | FK → User | |
| created_at | TIMESTAMP | NOT NULL | |

---

## Entity: Message
Client ↔ Advisor messaging thread, scoped to application.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| application_id | UUID | FK → Application | |
| sender_id | UUID | FK → User | |
| body | TEXT | NOT NULL | |
| attachment_url | VARCHAR(500) | NULLABLE | |
| stage_tag | VARCHAR(100) | NULLABLE | Which process stage the message relates to |
| sent_at | TIMESTAMP | NOT NULL | |
| read_at | TIMESTAMP | NULLABLE | |

---

## Entity: Task
Advisor self-created tasks for follow-up tracking.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| advisor_id | UUID | FK → User | |
| application_id | UUID | FK → Application, NULLABLE | |
| title | VARCHAR(255) | NOT NULL | |
| due_date | DATE | NULLABLE | |
| is_complete | BOOLEAN | NOT NULL, DEFAULT false | |
| created_at | TIMESTAMP | NOT NULL | |

---

## Entity: Drawdown
Mortgage fund withdrawal events after mortgage is signed.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| application_id | UUID | FK → Application | |
| drawdown_date | DATE | NOT NULL | |
| amount | DECIMAL(14,2) | NOT NULL | |
| mix_details | JSONB | NOT NULL | Track breakdown at time of drawdown |
| notes | TEXT | NULLABLE | |
| alert_sent_at | TIMESTAMP | NULLABLE | |

---

## Entity: AuditLog
Immutable record of every state-changing action.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| actor_id | UUID | FK → User | |
| action_type | VARCHAR(100) | NOT NULL | e.g. 'application.status_changed' |
| entity_type | VARCHAR(100) | NOT NULL | e.g. 'Application' |
| entity_id | UUID | NOT NULL | |
| before_value | JSONB | NULLABLE | |
| after_value | JSONB | NULLABLE | |
| created_at | TIMESTAMP | NOT NULL | |
| ip_address | VARCHAR(45) | NULLABLE | |

---

## Key Derived Values (Computed, Not Stored)

| Derived Value | Formula |
|---|---|
| Loan amount | `property_value − equity_amount` |
| Financing ratio | `loan_amount / property_value` |
| Max loan term | `85 − age_of_oldest_borrower_at_application_date` (in years) |
| Combined net income | `sum(borrower.net_income where is_property_owner = true) + sum(borrower.net_income * 0.5 where is_property_owner = false)` |
| Total income | `combined_net_income + sum(additional_incomes)` |
| Net income for repayment cap | `total_income − sum(fixed_expenses)` |
| Max monthly payment | `net_income_for_repayment_cap × 0.40` |

---

## Relationships Summary

```
User ──< Borrower (via Application)
User (client) ──< Application >── User (advisor)
Application ──< Borrower
Application ──< Document
Application ──< PrincipalApproval >── Bank
Application ──< Message
Application ──< Collateral
Application ──< Drawdown
Application >── Mix
Borrower ──< AdditionalIncome
Borrower ──< FixedExpense
Borrower ──< AdditionalProperty
Mix ──< MixTrack
AuditLog >── User (actor)
```
