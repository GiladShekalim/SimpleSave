# 49 — V2: Refinancing Opportunity Alerts

> **Status: DEFERRED TO V2**  
> V1 scope is new mortgages only. Refinancing (מחזור משכנתא) alerts and the monitoring infrastructure required to support them are a v2 deliverable. No implementation detail is required before v2 scoping begins.

---

## Purpose
After a client reaches the `ACTIVE_MORTGAGE` state, a background monitoring system periodically compares their existing mortgage tracks against current market rates and system parameters. When potential savings exceed a configurable threshold, the client (and their advisor) receive a proactive alert recommending consideration of refinancing.

## Scope
- Applies to all clients in `ACTIVE_MORTGAGE` state
- Runs as a background scheduled job (monthly, configurable)
- Surfaces alerts through existing notification channels (SMS, email, in-app)
- Introduces a new "Refinancing Calculator" screen (a new v2 screen, not specified here)

---

## Deferred Items

### Alert Trigger Conditions
The system evaluates the following triggers monthly (on the 1st business day of each month):

| Trigger | Threshold (configurable by admin) | Description |
|---|---|---|
| Interest rate drop | Current market rate for equivalent track < client's existing rate by > 0.5% | Any track in the client's mix has a new market rate meaningfully lower than when they signed |
| CPI spike above expected | Actual CPI exceeded forecast by > 1% for 3 consecutive months | CPI-indexed tracks are now more expensive than projected |
| Prime rate change | Prime rate moved by > 0.25% | Affects prime-track component of client's mix |
| Loan balance milestone | Client has repaid > 25% of original principal | May be a good time to refinance remaining balance |

All thresholds are stored in `SystemParameter` and editable by Admin. No hardcoded values.

### Savings Calculation
When a trigger fires, the system runs a simplified Spitzer recalculation comparing:
- Client's existing remaining tracks (remaining term, current balance, original rates)
- Equivalent tracks with current market rates (same term, same amortization method)

Outputs:
- Estimated monthly savings (₪/month)
- Estimated total savings over remaining term (₪)
- Estimated refinancing cost (prepayment penalty estimate — simplified, configurable multiplier)
- Net benefit = total savings minus refinancing cost

Alert is only sent when `net_benefit > threshold` (default: ₪5,000 net — configurable).

### Notification Channels

| Channel | Client | Advisor |
|---|---|---|
| SMS | "יש לנו חדשות על המשכנתא שלך. כדאי לבדוק אם ניתן לחסוך. [Link]" | "לקוח [Name] עשוי להרוויח ממחזור משכנתא." |
| Email | Full summary with amounts, trigger reason, and CTA "חשב מחזור" | Summary email |
| In-app notification | Badge on "הודעות" in client personal area; notification card in advisor dashboard | — |

### Refinancing Calculator Screen (v2 new screen)
A new screen (approximately screen 51 or higher) allowing:
- Detailed comparison: current mortgage terms vs. proposed refinancing terms
- Input of actual current market rates (or use system defaults)
- Amortization table comparison (side by side)
- "צור קשר עם יועץ" CTA to initiate a Tier 2 or Tier 3 advisory process for refinancing

### Admin Controls
- Enable/disable the refinancing alert job globally
- Configure all thresholds (rate drop %, CPI spike %, savings threshold ₪)
- View alert history: which clients were alerted, when, and what the trigger was
- Manually trigger an alert check for a specific client

### Opt-Out
- Clients can opt out of refinancing alerts from their personal area settings
- Preference stored in `Client.refinancing_alerts_enabled` (default: true)
- Opt-out does not affect advisor-facing alerts

---

## V2 Acceptance Criteria

1. Monthly background job runs reliably on the first business day of each month and completes within 60 minutes for up to 1,000 active clients
2. Alert notifications are sent only when net benefit > configured threshold
3. All alert thresholds are admin-configurable without code changes
4. Clients who opt out do not receive alerts (advisor may still receive a notification)
5. Refinancing Calculator screen produces results consistent with the Calculation Engine (screen 09) to within ₪50/month rounding
6. Full audit trail: each alert event logged with trigger reason, calculated savings, and whether notification was sent
7. No false positives: back-test the alert logic against 20 historical client records before go-live
