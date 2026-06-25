# Flow 20 — Tier 3: Personal Advisor

## Purpose

Describe the full end-to-end journey for a client enrolled in Tier 3 (Personal Advisor). Tier 3 extends Tier 2 (Online Guidance) by adding a named, assigned advisor who is actively involved at every stage — from calendar booking through post-mortgage monitoring — and who directly represents the client at banks.

---

## Preconditions

- Application status is at least QUESTIONNAIRE_COMPLETE.
- Client has selected or been placed in Tier 3.
- Tier 3 is activated in the system (admin toggle).
- At least one active advisor account exists with availability slots configured.

---

## Steps

### 1. Tier 3 Activation and Advisor Assignment

1. Admin activates Tier 3 for the application (or client self-selects Tier 3 on the tier selection screen).
2. Application status transitions to TIER_SELECTED.
3. Admin opens the lead in the Admin Overview screen and reviews the advisor roster (workload, location, specialization).
4. Admin clicks "Assign Advisor", selects an advisor, and confirms.
5. Application.advisor_id is set.
6. **Advisor notification:** "New Tier 3 client assigned to you: [Client Name]. Please configure your availability slots."
7. **Client notification** (in-app + email): "Your personal advisor is [Advisor Full Name]. Book your initial meeting to get started."
8. Advisor's calendar booking screen becomes visible inside the client's Personal Area.

### 2. Calendar Booking — Initial Meeting (before Personal Details)

This step occurs BEFORE the client fills in Personal Details. The calendar screen is the first tab shown after tier selection.

1. Client opens the "Book Initial Meeting" screen inside Personal Area.
2. System fetches advisor's availability slots for the next 30 days.
   - IF no slots available: show message "No available slots at this time — we will contact you shortly." Client cannot proceed to calendar but can proceed to Personal Details if advisor manually overrides.
3. Client selects a date from the calendar.
4. Available time slots for that date are displayed (30-minute or 60-minute blocks, as configured per advisor).
5. Client selects a time slot.
6. Meeting format is shown (advisor specifies per slot):
   - **In-person:** address provided by advisor.
   - **Remote:** video call link provided by advisor (or generated automatically via configured integration).
7. Client confirms the booking.
8. System creates a MeetingBooking record:
   - advisor_id, client_id, application_id, scheduled_at, format (in_person | remote), location_or_link, status = confirmed.
9. **Confirmation sent to client** (email + in-app): date, time, format, location/link.
10. **Confirmation sent to advisor** (email + in-app): client name, date, time, format.
11. Calendar step is marked complete. Client may now proceed to Personal Details.

### 3. Initial Meeting

1. Advisor and client meet (in-person or remote) at the scheduled time.
2. Advisor reviews questionnaire data, explains the process, and agrees on a path with the client.
3. Advisor updates internal notes on the application (visible to advisor and admin only).
4. Advisor may schedule additional meetings via the same calendar flow (step 2 applies, no restriction to "initial" only).

### 4. Personal Details

1. Identical to Tier 2 Personal Details flow (see flow-14 or equivalent).
2. Advisor is notified when client completes Personal Details.
3. Application status → PERSONAL_DETAILS_COMPLETE.

### 5. Authorization Letters

1. Advisor prepares or reviews the authorization letter for each bank.
2. Client is prompted to sign authorization letters (DocuSign or in-app signature flow).
3. Application status → AUTHORIZATION_SIGNED.
4. Advisor is notified when client signs.

### 6. Documents Submission

1. System generates the required document checklist based on client profile (see flow-21).
2. Advisor may add manual document requirements at any time.
3. Client uploads documents; advisor receives notification per upload.
4. Advisor actively reviews each document — not passive: advisor may call or message client to clarify issues.
5. Advisor approves or rejects each document (with mandatory rejection reason if rejecting).
6. Advisor may schedule an additional meeting to assist client with difficult documents.
7. Once all required documents are approved: application status → DOCUMENTS_APPROVED.
8. Client notified; Principal Approval tab unlocks.

### 7. Bank Submissions (Advisor-Led)

1. Advisor initiates submission to selected banks (not the client).
2. System sends authorization letter PDFs to each bank's mortgage department email, CC'ing the advisor.
3. Application status → PRINCIPAL_APPROVAL_REQUESTED.
4. Client notified: "Your application has been submitted to the banks."
5. Advisor tracks progress with each bank directly — via phone, email, or in-person visits to bank branches.
6. Advisor enters each bank's response manually into the system (approved amount, track details, conditions, rejection reason if applicable).

### 8. Bank Response and Principal Approval Review

1. After first bank response entered: status → PRINCIPAL_APPROVAL_RECEIVED.
2. Client notified: "A bank response is available — check your Principal Approval tab."
3. Advisor contacts client to schedule a bank comparison meeting (additional calendar booking).
4. Advisor and client review offers together (in-person or remote meeting).
5. Advisor makes a formal recommendation, documented in the system.
6. Client selects a bank on the Principal Approval screen.
7. Confirmation dialog shown; client confirms.
8. Application status → BANK_SELECTED.
9. Advisor notified of selection.

### 9. Mortgage Signing

1. Advisor accompanies client to the bank signing appointment (in-person, optional but typical for Tier 3).
2. After signing, advisor marks the application as MORTGAGE_SIGNED.
3. Advisor enters final mortgage details: actual rates, actual amounts, drawdown schedule.
4. Application status → MORTGAGE_SIGNED → COLLATERALS_PENDING.

### 10. Collaterals

1. Advisor populates collateral requirements as specified by the bank.
2. Client works through collateral items; advisor tracks completion.
3. Advisor may call or meet client to assist with collateral fulfillment.
4. Once all collaterals complete: status → COLLATERALS_COMPLETE → ACTIVE_MORTGAGE.

### 11. Post-Mortgage Monitoring

1. Advisor actively monitors the client's mortgage:
   - Monthly: reviews updated balance, payment, and rate data.
   - CPI and variable rate changes: advisor interprets changes for client, sends proactive messages.
   - Drawdown events: advisor sends alert and explanation 3 days before each drawdown.
2. Advisor may initiate additional meetings (calendar flow) for annual reviews or refinancing discussions.
3. If refinancing opportunity detected (v2 algorithm): advisor personally reaches out to client.

---

## State Transitions

| From | To | Trigger |
|---|---|---|
| TIER_SELECTED | TIER_SELECTED | Advisor assigned (no status change, internal field update) |
| TIER_SELECTED | PERSONAL_DETAILS_COMPLETE | Client completes personal details (after initial meeting booked) |
| PERSONAL_DETAILS_COMPLETE | AUTHORIZATION_SIGNED | Client signs auth letters |
| AUTHORIZATION_SIGNED | DOCUMENTS_SUBMITTED | First document uploaded |
| DOCUMENTS_SUBMITTED | DOCUMENTS_APPROVED | All required docs approved by advisor |
| DOCUMENTS_APPROVED | PRINCIPAL_APPROVAL_REQUESTED | Advisor submits to banks |
| PRINCIPAL_APPROVAL_REQUESTED | PRINCIPAL_APPROVAL_RECEIVED | First bank response entered |
| PRINCIPAL_APPROVAL_RECEIVED | BANK_SELECTED | Client selects bank |
| BANK_SELECTED | MORTGAGE_SIGNED | Advisor marks signing complete |
| MORTGAGE_SIGNED | COLLATERALS_PENDING | Advisor enters collateral list |
| COLLATERALS_PENDING | COLLATERALS_COMPLETE | All collaterals marked complete |
| COLLATERALS_COMPLETE | ACTIVE_MORTGAGE | System auto-transitions |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Advisor has no availability slots | Client sees "No available slots — contact us." Calendar step remains open; advisor can manually override to unblock Personal Details. |
| Client cancels a meeting | Client clicks "Cancel Meeting" on the booking. System updates MeetingBooking.status = cancelled. Both advisor and client notified. Rebook prompt shown immediately with available slots. |
| Advisor cancels a meeting | Advisor cancels via their dashboard. Client notified with apology message and rebook link. |
| Advisor replaced mid-process | Admin reassigns. All existing MeetingBooking records for old advisor are cancelled (both parties notified). New advisor is notified. New advisor sends re-invite via calendar to client. Client sees updated advisor name everywhere. |
| Client does not show to meeting | Advisor marks meeting as "no-show" in advisor dashboard. Client receives follow-up notification. Advisor or admin can trigger rebook. |
| Multiple additional meetings needed | No limit on additional meetings. Each follows the same calendar booking flow. |
| Advisor enters wrong bank response | Advisor can edit bank response up until BANK_SELECTED. After that, only admin can edit with audit log entry. |

---

## Error States

| Error | Display | Resolution |
|---|---|---|
| Calendar API unavailable | "Calendar temporarily unavailable. Please try again later." — shown on booking screen. | Retry after system recovery. Advisor can manually contact client. |
| Meeting confirmation email fails | In-app confirmation still shown. Background retry for email delivery (3 attempts). | Admin alerted if email fails permanently. |
| Advisor removed from system while client is active | Admin receives alert: "Advisor [Name] has open Tier 3 clients — reassign before deactivating." Deactivation blocked until reassignment. | Admin reassigns all clients first. |
