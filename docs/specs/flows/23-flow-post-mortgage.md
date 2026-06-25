# Flow 23 — Post-Mortgage Management

## Purpose

Describe the lifecycle of an active mortgage from MORTGAGE_SIGNED through collateral completion, drawdown processing, monthly updates, parameter-driven recalculation, and ongoing post-mortgage dashboard management.

---

## Preconditions

- Application status = MORTGAGE_SIGNED (transitions immediately to COLLATERALS_PENDING in this flow).
- Final mortgage details have been entered by the advisor (actual rates, amounts, drawdown schedule).
- Advisor is assigned to the application.

---

## Steps

### 1. Advisor Enters Final Mortgage Data (at Signing)

1. Immediately following the bank signing, the advisor enters final mortgage data into the system (see flow-22, step 10).
2. Data recorded:
   - Actual mix: per-track breakdown (track type, amount NIS, interest rate, CPI-linked yes/no, term years)
   - Bank name and branch
   - Signing date
   - Drawdown schedule: list of {drawdown_date, drawdown_amount NIS, mix_at_drawdown (which tracks are active at this drawdown)}
3. System creates:
   - MortgageSigning record
   - N Drawdown records (one per scheduled drawdown event) with status = scheduled
4. System computes and stores initial amortization schedule from the first drawdown date.

### 2. COLLATERALS_PENDING State

1. Application.status automatically transitions: MORTGAGE_SIGNED → COLLATERALS_PENDING on save of final mortgage data.
2. Advisor navigates to Collaterals tab in the client's application.
3. Advisor populates the collateral requirement list based on the bank's conditions:
   - Each collateral item: description (Hebrew free text), category (optional), status = pending.
4. Collateral list saved. Client's Collaterals tab is now populated.

### 3. Collateral Completion

1. Collateral items are fulfilled off-system (e.g., life insurance policy, property insurance, bank guarantee).
2. Client or advisor marks each collateral item as submitted in the system (either party can update).
3. Advisor then marks each item as approved (final confirmation).
4. As each item is approved, its status updates: pending → submitted → approved.
5. **Gate check:** after every collateral approval:
   - IF all Collateral records for this application have status = approved → trigger transitions:
     - Application.status → COLLATERALS_COMPLETE → ACTIVE_MORTGAGE (immediate sequential transition)
   - IF any collateral still pending or submitted → no transition.
6. **Client notification** on ACTIVE_MORTGAGE: "ברכות! המשכנתא שלך פעילה. כנס ללוח הבקרה לפרטים."
7. Post-mortgage dashboard unlocks in client's Personal Area (Post-Mortgage tab).

### 4. Post-Mortgage Dashboard Activated

1. The Post-Mortgage tab in the client's Personal Area becomes accessible.
2. Dashboard displays:
   - Current total outstanding balance (NIS)
   - Monthly payment amount (NIS)
   - Per-track breakdown: balance, rate, remaining term
   - Next drawdown (if pending)
   - Last updated timestamp
   - Any alerts or flags

### 5. Drawdown Processing

Multiple drawdown events may occur (typically once per project phase for new construction, or a single event for an existing property purchase).

#### 5a. Pre-Drawdown Alert

1. Each day, a scheduled job checks Drawdown records with status = scheduled.
2. IF a Drawdown.drawdown_date is exactly 3 days from today:
   - **Client notification** (in-app + email + optional SMS): "תזכורת: משיכה של [Amount NIS] מתוכננת ל-[Date]. לפרטים כנס לאזור האישי."
   - Advisor notified: "Drawdown alert sent for [Client Name] — [Amount] on [Date]."

#### 5b. Post-Drawdown Update

1. After the drawdown date passes, advisor marks Drawdown.status = completed.
2. Advisor enters or confirms actual drawdown amount (may differ slightly from scheduled).
3. System recalculates amortization schedule from this drawdown date forward:
   - Adds the drawdown amount to the outstanding balance on the relevant tracks.
   - Recalculates monthly payment from that date.
4. Updated figures displayed on Post-Mortgage dashboard.
5. **Client notification:** "משיכה בסך [Amount NIS] בוצעה. פרטי המשכנתא עודכנו."

#### 5c. Drawdown Rescheduled

1. If the drawdown date changes, advisor updates Drawdown.drawdown_date.
2. Previous alert (if already sent) is noted in audit log.
3. New 3-day-before alert is scheduled automatically.
4. **Client notification:** "תאריך המשיכה שלך שונה ל-[New Date]."

### 6. Monthly Update Cycle

Monthly updates are triggered by admin action or a scheduled background job.

#### Trigger Options

- **Manual (admin):** Admin clicks "Run Monthly Update" on the Admin Parameters screen.
- **Scheduled:** Background job runs on a configurable schedule (e.g., first of each month).

#### Update Steps

1. System identifies all applications in ACTIVE_MORTGAGE status.
2. For each application, for each track in the mortgage:

   **CPI-Linked Tracks (Fixed CPI, Variable CPI):**
   - Retrieve current CPI forecast from SystemParameter (admin-editable, default 3% annual).
   - Apply monthly CPI increment: outstanding_balance × (1 + cpi_annual/12).
   - Recalculate monthly payment based on updated balance and remaining term.

   **Variable Rate Tracks:**
   - Check if the rate change interval for this track has been reached (e.g., every 6 months).
   - IF interval reached: flag track as "rate_change_due".
   - Advisor prompted to enter new rate for flagged tracks.
   - On rate entry: recalculate monthly payment from this point.

   **Prime-Linked Tracks:**
   - Retrieve current Prime rate from SystemParameter.
   - Apply effective rate = Prime rate + spread (as signed in mortgage).
   - Recalculate monthly payment.

3. Updated balance, payment, and rate data stored.
4. Last-updated timestamp updated on each application.
5. **Client notification (batch):** "נתוני המשכנתא שלך עודכנו לחודש זה."

### 7. Admin-Triggered Recalculation

When admin updates a system parameter (CPI, Prime rate, or variable anchor — see flow-25):

1. Background job recalculates all applications from TIER_SELECTED through ACTIVE_MORTGAGE.
2. For ACTIVE_MORTGAGE applications: full monthly recalculation applied immediately.
3. **Batch notification** sent to all affected clients: "חישובי המשכנתא שלך עודכנו בעקבות שינוי בריבית/מדד השוק."
4. Admin sees job progress indicator on the Parameters screen.

### 8. Post-Mortgage Advisor Responsibilities

1. Advisor monitors client's dashboard monthly:
   - Reviews updated balances and payments.
   - Identifies anomalies (unexpected rate changes, high CPI impact).
2. Advisor sends proactive messages to client for:
   - Significant rate changes
   - Upcoming drawdown events
   - Annual review reminders
3. Advisor may schedule annual review meetings via calendar booking (same flow as initial meeting in Tier 3).

### 9. Refinancing Check (v2 Feature — Not in Scope v1)

- Algorithm periodically checks if refinancing conditions are now more favorable than the signed mortgage.
- IF beneficial: advisor receives alert; advisor manually decides whether to send "consider refinancing" recommendation to client.
- This is a v2 feature. In v1: no automated refinancing check is performed.

---

## State Transitions

| From | To | Trigger |
|---|---|---|
| MORTGAGE_SIGNED | COLLATERALS_PENDING | Advisor saves final mortgage data |
| COLLATERALS_PENDING | COLLATERALS_COMPLETE | All collateral items approved |
| COLLATERALS_COMPLETE | ACTIVE_MORTGAGE | Automatic sequential transition |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Drawdown rescheduled | Advisor updates date. System cancels any already-queued alert job for old date. New alert scheduled for 3 days before new date. Client notified of reschedule. |
| Multiple drawdowns | Each Drawdown record is independent. Alerts and amortization recalculations fire per drawdown event. Cumulative balance reflects all completed drawdowns. |
| CPI not updated by admin on time | Post-Mortgage dashboard shows "ממתין לעדכון חודשי" (Awaiting Monthly Update) badge on the balance/payment figures. Existing figures remain displayed but flagged as potentially stale. |
| Variable rate track reaches interval but advisor doesn't update rate | Track flagged as "rate_change_due" in the system. Advisor dashboard shows pending action: "Enter new rate for [Client Name] — [Track Name]." Monthly payment displayed with a warning indicator until rate is updated. |
| Advisor deactivated while client is in ACTIVE_MORTGAGE | Admin receives alert. Admin reassigns advisor. New advisor inherits all post-mortgage tasks and monitoring responsibilities. Client notified of new advisor. |
| Collateral item cannot be fulfilled | Advisor marks it as "blocked" (new status for exceptional cases). Admin is notified. Application remains in COLLATERALS_PENDING. Handled case-by-case. |
| Two drawdowns scheduled on the same date | Both are created as separate Drawdown records. Both alerts fire. Both are processed independently. |
| Admin triggers recalculation while a monthly job is already running | New job is queued; it starts only after the current job completes. Queueing is logged in JobQueue table. |

---

## Error States

| Error | User-Facing Message | System Action |
|---|---|---|
| Drawdown alert delivery failure | Silent retry (3 attempts, 10-minute intervals). If all fail: admin alert. | Alert status = delivery_failed logged. Manual follow-up by advisor. |
| Monthly update job fails mid-run | "עדכון חודשי נכשל — בדיקה בתהליך" on admin parameters screen. | Job logs error per failed application. Admin alerted. Failed records retried in next run. |
| CPI parameter missing / null | Monthly update skips CPI-linked track recalculation. Warning logged. Admin alerted: "CPI parameter not set — CPI tracks not updated." | CPI tracks flagged as stale. |
| Amortization calculation error (e.g., negative balance) | Admin alerted with application ID and error details. | Calculation result not saved. Previous values retained. Manual review required. |
