# 01 — Architecture Overview

## Purpose
Define the structural principles, technology approach, and non-functional requirements that govern every module in SimpleSave.

## System Definition
SimpleSave is a B2B2C Hebrew-language web application that digitizes the end-to-end mortgage advisory process. It serves three roles (Admin, Advisor, Client) across three service tiers. The platform replaces in-person mortgage advisor meetings, collects documents, manages bank submissions, and tracks the mortgage lifecycle.

**Language:** Hebrew UI throughout. All code, comments, documentation, and spec files are in English.
**Direction:** RTL (right-to-left) for all UI.
**Scope (v1):** New mortgage only. Refinancing, renewal, and mortgage insurance are out of scope.

---

## SOLID Principles Applied

| Principle | Application in SimpleSave |
|---|---|
| Single Responsibility | Each service (auth, document, calculation, notification) owns one concern. No cross-domain logic in controllers. |
| Open/Closed | Mortgage track types, document types, notification triggers, and regulatory parameters are configuration-driven — adding a new track type requires no code change, only a new config entry. |
| Liskov Substitution | Role-based access enforced at the service layer, not the route layer. Swapping auth providers or notification providers does not break callers. |
| Interface Segregation | Client-facing API contracts differ from advisor-facing and admin-facing contracts. No role receives data fields it cannot act on. |
| Dependency Inversion | Calculation engine, PDF generator, email sender, and OTP provider are injected as interfaces. Concrete implementations are swappable without touching business logic. |

---

## Modularity Requirements
- Each domain (auth, applications, documents, calculations, notifications, admin) is an isolated module with its own routes, services, and repository layer.
- Inter-module communication via defined service interfaces only — no direct DB cross-queries between modules.
- Regulatory parameters (financing ratios, CPI, prime rate, track definitions) are stored in the database and loaded at runtime. No hardcoded business rules except mathematical formulas.
- Adding a new service tier or document type must not require changes to core routing or calculation logic.

---

## Non-Functional Requirements

| Requirement | Specification |
|---|---|
| Security | Israeli Privacy Protection Law Standard 13 (תקן 13) compliance. All PII encrypted at rest (AES-256) and in transit (TLS 1.3). Audit log on every state-changing action. |
| Authentication | OTP-only via phone or email. No passwords stored. Session tokens expire after 24 hours of inactivity. |
| Scalability | Stateless API layer. Horizontal scaling supported. DB connection pooling. |
| Availability | Target 99.5% uptime. No scheduled maintenance windows during Israeli business hours (Sun–Thu 08:00–20:00 IST). |
| Performance | Initial page load < 3s on 4G. Calculation response < 500ms. Document upload feedback < 2s acknowledgment. |
| Accessibility | v1: baseline functional accessibility. Full WCAG 2.1 AA deferred to v2 (see `v2/48-v2-accessibility.md`). |
| Data Retention | Client data retained for 7 years post-process (regulatory requirement). Soft-delete only — no hard deletes for any PII. |
| Audit Trail | All admin and advisor actions logged with timestamp, user ID, action type, before/after values. |

---

## Repository Structure
```
SimpleSave/
├── docs/
│   └── specs/              ← all spec MD files
├── src/
│   ├── frontend/           ← React/Next.js application
│   │   ├── components/     ← shared UI components
│   │   ├── pages/          ← route-level pages
│   │   ├── hooks/          ← custom React hooks
│   │   ├── store/          ← state management
│   │   └── utils/          ← formatting, validation helpers
│   ├── backend/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── applications/
│   │   │   ├── documents/
│   │   │   ├── calculations/
│   │   │   ├── notifications/
│   │   │   ├── admin/
│   │   │   └── advisors/
│   │   ├── common/         ← shared middleware, error handling, logging
│   │   └── config/         ← environment config, regulatory parameters loader
│   └── database/
│       ├── migrations/     ← versioned schema changes
│       ├── seeds/          ← reference data (banks, cities, document types)
│       └── schema/         ← entity definitions
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── infrastructure/         ← deployment, CI/CD, environment config
```

---

## Technology Stack Decisions
Technology choices are to be finalized in the technical spec phase. The architecture is stack-agnostic but assumes:
- **Frontend:** Component-based SPA or SSR framework with RTL support
- **Backend:** REST or GraphQL API, Node.js or equivalent
- **Database:** Relational DB (PostgreSQL recommended) for transactional integrity; document storage (S3-compatible) for uploaded files
- **PDF generation:** Server-side (puppeteer or equivalent) — not client-side
- **OTP provider:** Pluggable interface (Twilio / AWS SNS / Firebase — TBD in tech spec)
- **Email provider:** Pluggable interface (SendGrid / SES — TBD)
- **Charts:** Chart.js (confirmed from reference HTML) or equivalent

---

## Regulatory Parameters (Configuration-Driven)

All values below live in the database and are editable by Admin. No hardcoded business rules.

| Parameter | Current Value | Admin Editable? | Affects |
|---|---|---|---|
| Max financing ratio — primary residence | 75% | No (regulatory) | Loan eligibility |
| Max financing ratio — additional property | 50% | No (regulatory) | Loan eligibility |
| Max financing ratio — all-purpose | 50% minus existing mortgage | No (regulatory) | Loan eligibility |
| Max financing ratio — home improvement | 70% | No (regulatory) | Loan eligibility |
| Max financing ratio — price-for-residents | 90% (min 100K NIS equity) | No (regulatory) | Loan eligibility |
| Max monthly payment ratio | 40% of net income | No (regulatory) | Repayment cap |
| Max borrower age at loan end | 85 years | No (regulatory) | Loan term cap |
| Min equity — price-for-residents | 100,000 NIS | No (regulatory) | Eligibility |
| CPI annual forecast | 3% | Yes | Indexed track calculations |
| Prime rate | Current Bank of Israel rate | Yes | Prime track calculations |
| Variable rate anchors | Per-term table | Yes | Variable track calculations |
| Market interest rates | Per-type, per-term table | Yes | All calculations |

---

## State Machine — Application Lifecycle

```
QUESTIONNAIRE_IN_PROGRESS
  → QUESTIONNAIRE_COMPLETE (all 10 wizard questions answered)
  → REGISTERED (OTP verified, terms signed)
  → TIER_SELECTED (tier 1/2/3 chosen)
  → PERSONAL_DETAILS_COMPLETE (all mandatory fields filled)
  → AUTHORIZATION_SIGNED (כתבי הסמכה signed)
  → DOCUMENTS_SUBMITTED (all required docs uploaded)
  → DOCUMENTS_APPROVED (advisor approved all required docs)
  → PRINCIPAL_APPROVAL_REQUESTED (submitted to banks)
  → PRINCIPAL_APPROVAL_RECEIVED (at least one bank approved)
  → BANK_SELECTED (client chose a bank)
  → MORTGAGE_SIGNED (signed at chosen bank)
  → COLLATERALS_PENDING (collateral list active)
  → COLLATERALS_COMPLETE (all collaterals submitted)
  → ACTIVE_MORTGAGE (drawdowns tracked, monthly updates)
```

Transitions are unidirectional. Rollback is only possible by advisor or admin action with audit log entry.
