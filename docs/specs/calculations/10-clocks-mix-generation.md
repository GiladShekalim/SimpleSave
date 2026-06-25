# 10 — Clocks / Mix Generation

## Purpose

Given a client's application data and up to 5 admin-configured mortgage mixes, compute the output for each "clock" displayed on the client's mortgage options screen. Each clock corresponds to one mix and shows a risk speedometer, initial monthly payment, total cost, and track breakdown. This module orchestrates the mortgage calculation engine for all active mixes and assembles the display data.

---

## Inputs

| Input | Source | Description |
|---|---|---|
| `application.loan_amount` | applications table | Total requested loan amount in NIS |
| `application.desired_monthly_min` | applications table | Client's minimum desired monthly payment (NIS) |
| `application.desired_monthly_max` | applications table | Client's maximum desired monthly payment (NIS) |
| `application.max_loan_term_years` | Computed (85 − oldest borrower age) | Maximum allowable loan term for this application |
| `application.loan_purpose_id` | applications table | Used for rate lookup |
| `mixes[]` | mixes table, `is_active = true`, ordered by `clock_number` | Up to 5 active mix records |
| `mixes[].mix_tracks[]` | mix_tracks table | Tracks within each mix (1–10 per mix, sum of percentages = 100) |
| `interest_rate_table[]` | interest_rates table | Anchor rates by track_type, cpi_linked, loan_purpose, period range |
| `SystemParameter.prime_rate` | system_parameters | Current prime rate (decimal) |
| `SystemParameter.cpi_annual_forecast` | system_parameters | Current CPI forecast (decimal) |

---

## Data Model Context

### Mix Record

```
mixes
  id              UUID, PK
  clock_number    INTEGER (1–5, unique among active mixes)
  name_he         VARCHAR
  is_active       BOOLEAN
  created_by      UUID
  updated_at      TIMESTAMP
```

### Mix Track Record

```
mix_tracks
  id                         UUID, PK
  mix_id                     UUID, FK → mixes.id
  track_type                 ENUM('fixed', 'variable', 'prime')
  amortization_type          ENUM('spitzer', 'equal_principal')
  period_years               INTEGER
  cpi_linked                 BOOLEAN
  spread                     DECIMAL (added to anchor rate; can be negative)
  rate_change_interval_months INTEGER NULL (variable tracks only)
  percentage                 DECIMAL (portion of total loan, must sum to 100 across mix)
  sort_order                 INTEGER
```

### Interest Rate Table Record

```
interest_rates
  id              UUID, PK
  track_type      ENUM('fixed', 'variable')  -- prime uses prime_rate from SystemParameter
  cpi_linked      BOOLEAN
  loan_purpose_id UUID NULL (null = applies to all purposes)
  period_min_years INTEGER
  period_max_years INTEGER
  anchor_rate     DECIMAL (annual rate before spread, e.g., 0.032)
  effective_from  DATE
  effective_until DATE NULL
  is_active       BOOLEAN
```

---

## Process Per Clock / Mix

For each active mix (ordered by `clock_number`):

### Step 1: Validate Mix Completeness

- Sum of `mix_tracks.percentage` must equal 100. If not, skip clock, log warning `INVALID_MIX_PERCENTAGES`.
- Each track must have `period_years` ≤ `application.max_loan_term_years`. If any track exceeds the max, truncate to `application.max_loan_term_years` (enforce silently and flag `term_truncated: true` on that track in output).

### Step 2: Rate Lookup Per Track

For each `mix_track`:

**Fixed and Variable tracks:**

1. Query `interest_rates` WHERE:
   - `track_type = mix_track.track_type`
   - `cpi_linked = mix_track.cpi_linked`
   - `(loan_purpose_id = application.loan_purpose_id OR loan_purpose_id IS NULL)`
   - `period_min_years <= mix_track.period_years AND period_max_years >= mix_track.period_years`
   - `is_active = true`
   - `effective_from <= today AND (effective_until IS NULL OR effective_until >= today)`
2. If multiple rows match (e.g., purpose-specific and general): prefer the more specific row (non-null `loan_purpose_id` wins).
3. If no row matches: flag track as `rate_not_configured: true`. Skip this entire clock (cannot compute without a rate).
4. `annual_rate = anchor_rate + mix_track.spread`

**Prime tracks:**

1. `annual_rate = SystemParameter.prime_rate + mix_track.spread`
2. `cpi_linked = false` (enforce — prime is never CPI-linked regardless of track record).
3. No lookup in `interest_rates` table needed.

### Step 3: Compute Track Loan Amount

```
track_loan_amount = application.loan_amount × (mix_track.percentage / 100)
```

### Step 4: Run Mortgage Calculation Engine

Call the calculation engine (see `09-mortgage-calculation-engine.md`) for each track with:

```
{
  loan_amount: track_loan_amount,
  period_years: min(mix_track.period_years, application.max_loan_term_years),
  amortization_type: mix_track.amortization_type,
  track_type: mix_track.track_type,
  annual_rate: annual_rate (computed above),
  cpi_annual_forecast: SystemParameter.cpi_annual_forecast,
  cpi_linked: mix_track.cpi_linked,
  rate_change_interval_months: mix_track.rate_change_interval_months
}
```

Collect each track's output (monthly_payment_initial, total_payment, total_interest_paid, total_cpi_adjustment, amortization_schedule).

### Step 5: Aggregate Mix Results

Sum per-track values:
```
mix_monthly_payment_initial = Σ track.monthly_payment_initial
mix_total_payment = Σ track.total_payment_over_term
mix_total_interest = Σ track.total_interest_paid
mix_total_cpi = Σ track.total_cpi_adjustment
```

Build mix-level amortization schedule by summing month-by-month rows across all tracks (aligning by month index, padding shorter tracks with 0 after their term ends).

### Step 6: Compute Risk Score

```
prime_pct = Σ mix_track.percentage WHERE track_type = 'prime'
variable_pct = Σ mix_track.percentage WHERE track_type = 'variable'
cpi_linked_fixed_pct = Σ mix_track.percentage WHERE track_type = 'fixed' AND cpi_linked = true

risk_score = prime_pct + variable_pct + cpi_linked_fixed_pct
risk_score = min(risk_score, 100)  -- cap at 100%

risk_level:
  if risk_score < 33: 'low'
  if risk_score <= 66: 'medium'
  else: 'high'
```

### Step 7: Determine Desired-Range Flag

```
is_within_desired_range = (
  mix_monthly_payment_initial >= application.desired_monthly_min
  AND mix_monthly_payment_initial <= application.desired_monthly_max
)
```

If `desired_monthly_min` or `desired_monthly_max` is null (client has not filled in preferences), set `is_within_desired_range = null`.

---

## Output Per Clock

| Field | Type | Description |
|---|---|---|
| `clock_number` | integer (1–5) | Position in the 5-clock display |
| `mix_id` | UUID | |
| `mix_name_he` | string | Hebrew mix name from mix record |
| `risk_level` | enum | `low` / `medium` / `high` |
| `risk_score_percentage` | decimal | 0–100 |
| `monthly_payment_initial` | decimal (NIS) | First month total payment across all tracks |
| `total_payment` | decimal (NIS) | Total paid over full term |
| `total_interest_and_cpi` | decimal (NIS) | `total_interest + total_cpi_adjustment` |
| `is_within_desired_range` | boolean / null | True if monthly_payment_initial is in client's desired range |
| `term_truncated` | boolean | True if any track's period was capped at max_loan_term_years |
| `per_track_breakdown` | array | One entry per track — see below |
| `amortization_schedule` | array | Monthly rows for the entire mix |
| `stacked_bar_data` | array | Monthly: `{ month, principal, interest, cpi }` for chart rendering |
| `cumulative_totals_data` | array | Cumulative: `{ month, total_paid_to_date, balance_remaining }` |
| `rate_assumption_notes` | array | Variable track notes (empty array if no variable tracks) |

**Per-track breakdown row:**

| Field | Type | Description |
|---|---|---|
| `track_order` | integer | Display order within the mix |
| `track_type` | enum | `fixed` / `variable` / `prime` |
| `track_type_label_he` | string | e.g., "קבועה צמודה" |
| `percentage` | decimal | % of total loan |
| `loan_amount` | decimal | Absolute NIS amount for this track |
| `annual_rate` | decimal | Effective annual rate (anchor + spread) |
| `period_years` | integer | Term |
| `cpi_linked` | boolean | |
| `amortization_type` | enum | |
| `monthly_payment_initial` | decimal | Track's month-1 payment |
| `total_payment` | decimal | Track's total payment |
| `rate_not_configured` | boolean | True if no rate row found (clock skipped) |
| `term_truncated` | boolean | True if term was capped |

---

## Speedometer Risk Display

The risk gauge is a semicircular speedometer graphic.

| Zone | Degrees | Color | Risk Score Range |
|---|---|---|---|
| Green (Low) | 0° – 60° | #2ECC71 | 0% – 32% |
| Yellow (Medium) | 60° – 120° | #F39C12 | 33% – 66% |
| Red (High) | 120° – 180° | #E74C3C | 67% – 100% |

Needle angle formula:
```
needle_degrees = (risk_score_percentage / 100) × 180
```

The needle points left (0°) for zero risk and right (180°) for maximum risk.

---

## Rate Lookup Logic

Rate lookup uses the following precedence:

1. **Exact purpose match + period in range:** `loan_purpose_id = application.loan_purpose_id AND period_min_years <= track.period_years <= period_max_years`
2. **General rate (no purpose) + period in range:** `loan_purpose_id IS NULL AND period_min_years <= track.period_years <= period_max_years`
3. **Period range fallback:** If the track's `period_years` falls outside any configured range, use the closest range boundary. For example, if the track is 28 years and the table has a row for 25–30 years, that row matches.

If after all fallbacks no rate row is found:
- Set `rate_not_configured: true` on the track.
- Skip the entire clock (cannot display partial calculation).
- Record a warning in the clock output: `skipped_reason: "rate_not_configured"`.

---

## Admin Clock Assignment

- Admin manages mixes in the Mixes management screen.
- Each mix is assigned a `clock_number` (1–5) that determines its display position.
- Only one mix can occupy each `clock_number` among active mixes. If admin tries to assign a `clock_number` already taken, the existing mix is deactivated or the admin is prompted to resolve the conflict.
- If fewer than 5 mixes are active, only the active clocks are shown. Slots without an active mix show an empty state ("שעון זה אינו פעיל").
- A mix can be deactivated without deletion; its historical clock data is preserved for audit.

---

## Recalculation Trigger

When Admin changes a `SystemParameter` that affects calculations (`prime_rate`, `cpi_annual_forecast`, or any row in `interest_rates`):

1. A background job is enqueued: `recalculate_all_clocks`.
2. The job fetches all applications in states REGISTERED through BANK_SELECTED (active pre-signing applications).
3. For each application, run the full 5-clock generation process.
4. Store results in `clock_results` cache table:

```
clock_results
  id                UUID, PK
  application_id    UUID, FK
  mix_id            UUID, FK
  clock_number      INTEGER
  calculated_at     TIMESTAMP
  result_json       JSONB  (full clock output)
  parameter_snapshot JSONB (prime_rate, cpi_forecast, interest_rates version used)
```

5. On client load, the frontend reads from `clock_results` (the latest row per `(application_id, clock_number)`).
6. Fire Trigger 13 (System Parameter Changed) notifications to affected clients after recalculation completes.

**Cache invalidation:** `clock_results` rows are considered stale if `calculated_at < SystemParameter.last_param_change_at`. In that case, re-run calculation on demand for that application.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| `loan_amount = 0` | Blocked at input validation. Clocks module should not be called. If called with 0, return empty result with `error: 'INVALID_LOAN_AMOUNT'`. |
| No active mixes | Return empty clock array with `admin_alert: true`. Admin is notified via in-app alert: "אין מיקסים פעילים. יש להגדיר לפחות מיקס אחד." |
| Rate missing for a track | Skip the entire clock for that mix. Display "שעון לא זמין — חסרה ריבית" in the slot. |
| All 5 clocks skipped (all rate missing) | Show empty state: "תוכניות משכנתא אינן זמינות כרגע. הנהלה מטפלת." |
| Desired payment range not set | `is_within_desired_range = null`. Do not highlight any clock as in-range. |
| Desired payment range exceeded by all clocks | Show all clocks but none is highlighted as "within range". Display message: "כל התוכניות חורגות מהתשלום החודשי הרצוי. כדאי לשקול הגדלת הטווח." |
| Track `period_years` exceeds `max_loan_term_years` | Truncate to max. Flag `term_truncated = true`. Show advisory note to client next to the clock. |
| Mix has only 1 track at 100% | Valid — process normally. |
| Mix has 10 tracks | Valid — process each track, sum results. |
| Concurrent recalculation jobs | Use a job lock (advisory lock or idempotency key) to prevent two recalculation jobs for the same application from running simultaneously. |
| Client loads clocks while recalculation is in progress | Serve the previous (stale) `clock_results` with a `is_recalculating: true` flag so the frontend can show a "מחשב מחדש..." indicator. |

---

## Dependencies

- Mortgage Calculation Engine (`09-mortgage-calculation-engine.md`)
- `mixes` table
- `mix_tracks` table
- `interest_rates` table
- `system_parameters` table (`prime_rate`, `cpi_annual_forecast`, `last_param_change_at`)
- `applications` table
- `borrowers` table (oldest borrower age for max term)
- `clock_results` table (cache)
- Background job queue
- Notification system (`04-notification-system.md`, Trigger 13)
