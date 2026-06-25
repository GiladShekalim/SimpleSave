# 09 — Mortgage Calculation Engine

## Purpose

Calculate per-track monthly payment, total payment, total interest, CPI adjustment, and full amortization schedule for a given set of mortgage track parameters. This engine is called by the clocks/mix generation module (see `10-clocks-mix-generation.md`) and may also be called directly to preview individual track calculations. All calculation logic must be derived from regulatory parameters stored in the database — no hardcoded rates or business rules.

---

## Inputs

| Parameter | Type | Required | Description |
|---|---|---|---|
| `loan_amount` | decimal (NIS) | Yes | Principal amount for this track |
| `period_years` | integer | Yes | Loan term in years (4–30 for fixed/variable, 4–30 for prime) |
| `amortization_type` | enum | Yes | `spitzer` or `equal_principal` |
| `track_type` | enum | Yes | `fixed`, `variable`, or `prime` |
| `annual_rate` | decimal | Yes | Annual interest rate as decimal (e.g., 0.035 for 3.5%) |
| `cpi_annual_forecast` | decimal | Yes | Annual CPI forecast as decimal (e.g., 0.03 for 3%). Loaded from SystemParameter. |
| `cpi_linked` | boolean | Yes | Whether this track's balance is linked to CPI. Always false for prime tracks. |
| `rate_change_interval_months` | integer | Conditional | Required for variable tracks. Months between rate resets (e.g., 12 = resets every year). |

**Derived inputs (computed before calculation):**

| Derived | Formula |
|---|---|
| `n` | `period_years × 12` (total number of months) |
| `r` | `annual_rate / 12` (monthly interest rate) |

---

## Formula / Algorithm

### Spitzer (שפיצר — Fixed Monthly Payment)

The borrower pays a constant monthly amount. Each payment covers accrued interest first; the remainder reduces the principal.

**Step 1: Calculate monthly payment**

```
monthly_payment = P × r × (1 + r)^n / ((1 + r)^n − 1)
```

Where:
- `P` = loan_amount (or CPI-adjusted balance at start of each year — see CPI linkage below)
- `r` = monthly interest rate = annual_rate / 12
- `n` = total months = period_years × 12

**Step 2: Generate amortization schedule (without CPI)**

For month `k` (k = 1 to n):
```
interest_payment_k = balance_{k-1} × r
principal_payment_k = monthly_payment − interest_payment_k
balance_k = balance_{k-1} − principal_payment_k
```
Initial: `balance_0 = P`

**Step 3: Apply CPI linkage (if cpi_linked = true)**

CPI linkage is applied annually to the outstanding principal balance. At the end of each 12-month period, before computing the next year's monthly payment, inflate the remaining balance:

```
balance_at_year_end_y = balance_at_year_end_y × (1 + cpi_annual_forecast)
```

Then recompute monthly_payment for the remaining term using the inflated balance and the same annual_rate.

Formal algorithm with CPI:
```
balance = loan_amount
for year y = 1 to period_years:
    n_remaining = (period_years - (y-1)) × 12
    monthly_payment_year_y = balance × r × (1+r)^n_remaining / ((1+r)^n_remaining − 1)
    
    for month m = 1 to 12:
        interest = balance × r
        principal = monthly_payment_year_y − interest
        balance = balance − principal
        append row to amortization_schedule
    
    if y < period_years:
        cpi_adjustment = balance × cpi_annual_forecast
        balance = balance + cpi_adjustment
        record cpi_adjustment for the year boundary row
```

---

### Equal Principal (קרן שווה — Decreasing Monthly Payment)

The borrower repays a fixed principal portion each month. Interest decreases as the balance falls.

**Step 1: Fixed principal portion**

```
principal_per_month = P / n
```

**Step 2: Monthly payment for month k**

```
balance_{k-1} = P − (k − 1) × principal_per_month
interest_payment_k = balance_{k-1} × r
monthly_payment_k = principal_per_month + interest_payment_k
balance_k = balance_{k-1} − principal_per_month
```

The monthly payment starts highest in month 1 and decreases monotonically.

**Step 3: Apply CPI linkage (if cpi_linked = true)**

Same annual CPI inflation approach as Spitzer, applied to the remaining balance at year-end boundaries. For equal principal, the fixed principal-per-month portion is recomputed based on the inflated balance and remaining months after each CPI adjustment.

---

### Variable Track (ריבית משתנה)

Variable tracks reset their interest rate at each `rate_change_interval_months` interval. Because future rates are unknown, the calculation uses the current annual_rate for ALL intervals (pessimistic scenario).

**Algorithm:**

1. Treat the variable track identically to a fixed track for calculation purposes, using the current `annual_rate` for all periods.
2. Add a note in the output: `rate_assumption_note_he = "חישוב מבוסס על הריבית הנוכחית לכל תקופת ההלוואה. שינויי ריבית עתידיים עשויים לשנות את התשלום."` (Calculation based on current rate for entire loan term. Future rate changes may affect payment.)
3. `rate_change_interval_months` is stored in the track output for display but does not alter the calculation.

---

### Prime Track (פריים)

Prime tracks are never CPI-linked. The rate is computed as:

```
annual_rate = prime_rate + track_spread
```

Where:
- `prime_rate` is loaded from `SystemParameter.prime_rate` (e.g., 0.045 = 4.5%)
- `track_spread` is stored on the `mix_tracks` record (can be negative, e.g., −0.015 for prime − 1.5%)

The calculation then proceeds identically to the Fixed track formula (Spitzer or Equal Principal per `amortization_type`), with `cpi_linked = false`.

---

### CPI Linkage Formal Rule

Applied to both Spitzer and Equal Principal when `cpi_linked = true`:

```
At each 12-month boundary (end of months 12, 24, 36, ...):
  cpi_adjustment_amount = outstanding_balance × cpi_annual_forecast
  outstanding_balance += cpi_adjustment_amount
  recompute remaining monthly payment based on new balance and remaining months
```

The `cpi_adjustment` field on each year-boundary amortization row records the inflation amount added.

---

### Multi-Track Mix Calculation

When calculating a full mix (which may have 1–10 tracks summing to 100%):

1. For each track in the mix:
   ```
   track_loan_amount = total_loan_amount × (track_percentage / 100)
   ```
2. Run the single-track calculation for each track independently using `track_loan_amount`.
3. Sum across all tracks for each month to produce the mix-level amortization schedule:
   ```
   mix_monthly_payment_month_k = Σ track_monthly_payment_k (for all tracks)
   mix_interest_month_k = Σ track_interest_k
   mix_principal_month_k = Σ track_principal_k
   mix_cpi_month_k = Σ track_cpi_k
   mix_balance_remaining_month_k = Σ track_balance_k
   ```
4. Compute mix totals:
   ```
   total_payment = Σ mix_monthly_payment_k (for k=1 to max n)
   total_interest_paid = Σ mix_interest_month_k
   total_cpi_adjustment = Σ mix_cpi_month_k
   ```

Note: tracks may have different `period_years`. In that case the mix amortization schedule runs until the last track completes. Shorter tracks contribute 0 to monthly totals after they end.

---

### Risk Level Calculation

Risk score measures the proportion of the loan exposed to variable or prime rates (index-linked and rate-volatile).

```
prime_percentage = Σ track_percentage WHERE track_type = 'prime'
variable_percentage = Σ track_percentage WHERE track_type = 'variable'
cpi_linked_percentage = Σ track_percentage WHERE cpi_linked = true

risk_score_percentage = prime_percentage + variable_percentage + cpi_linked_percentage
```

Note: a fixed CPI-linked track counts toward risk. A prime track is already variable AND never CPI-linked; it counts once via `prime_percentage`.

Clamp `risk_score_percentage` at 100% (if overlap, do not double-count — use weighted unique exposure).

**Risk level mapping:**

| Risk Score | Level | Display Color |
|---|---|---|
| 0% – 32% | Low (נמוך) | Green |
| 33% – 66% | Medium (בינוני) | Yellow |
| 67% – 100% | High (גבוה) | Red |

---

## Outputs

| Output | Type | Description |
|---|---|---|
| `monthly_payment_initial` | decimal (NIS) | Monthly payment in month 1 (Spitzer: constant; Equal Principal: highest) |
| `monthly_payment_final` | decimal (NIS) | Monthly payment in final month (Spitzer ≈ initial; Equal Principal: lowest) |
| `total_payment_over_term` | decimal (NIS) | Sum of all monthly payments |
| `total_interest_paid` | decimal (NIS) | Total interest portion across all payments |
| `total_cpi_adjustment` | decimal (NIS) | Total CPI inflation added to balance over loan life |
| `risk_level` | enum | `low` / `medium` / `high` |
| `risk_score_percentage` | decimal | 0–100 |
| `rate_assumption_note_he` | string | Non-null for variable tracks |
| `amortization_schedule` | array | One row per month — see below |

**Amortization schedule row:**

| Field | Type | Description |
|---|---|---|
| `month` | integer | 1 to n |
| `monthly_payment` | decimal | Total payment this month |
| `principal_payment` | decimal | Principal portion |
| `interest_payment` | decimal | Interest portion |
| `cpi_adjustment` | decimal | CPI added to balance at this month's year boundary (0 for non-year-boundary months) |
| `balance_remaining` | decimal | Outstanding balance after this month's payment and any CPI adjustment |

---

## Rounding Rules

- All monetary values rounded to 2 decimal places.
- Intermediate calculations (monthly rate, balance) use full floating-point precision.
- Final output values rounded at display time only, not mid-calculation.
- NIS values displayed with thousands separator (e.g., ₪1,234,567.89).
- Final month payment adjusted to eliminate rounding residual: the last payment may differ slightly from prior payments to ensure `balance_remaining = 0` exactly.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| `loan_amount = 0` | Reject at input validation before reaching this engine. Return validation error. |
| `period_years` exceeds `(85 − oldest_borrower_age)` at application date | Truncate `period_years` to `floor(85 − oldest_borrower_age)`. If this results in `period_years < 4`, the track is invalid for this borrower; flag as `term_not_feasible: true` in output. |
| `annual_rate = 0` | Allowed (interest-free track). Monthly payment = P/n for Spitzer and Equal Principal both. |
| `r` very small (near zero) | Use the limit formula to avoid division instability: if `r < 0.0000001`, monthly_payment ≈ P/n |
| CPI forecast = 0 | Treat as no linkage effect. CPI adjustment = 0 for all months. |
| Track percentage rounds to non-100% total | The caller (mix engine) must validate that Σ track_percentages = 100 before calling this engine per track. The engine accepts `track_loan_amount` directly. |
| `period_years < 4` | Reject. Minimum term is 4 years. Return validation error. |

---

## Worked Example

**Scenario:** Single track, Spitzer, fixed rate, not CPI-linked.

| Input | Value |
|---|---|
| Loan amount (P) | ₪1,000,000 |
| Term | 25 years (n = 300 months) |
| Amortization type | Spitzer |
| Annual rate | 3.5% (r = 0.035 / 12 = 0.0029167) |
| CPI linked | No |
| Track type | Fixed |

**Step 1: Monthly payment**

```
r = 0.035 / 12 = 0.00291667
n = 300
(1 + r)^n = (1.00291667)^300

Compute (1.00291667)^300:
  ln(1.00291667) = 0.002912415
  300 × 0.002912415 = 0.873725
  e^0.873725 = 2.39565

monthly_payment = 1,000,000 × 0.00291667 × 2.39565 / (2.39565 − 1)
               = 1,000,000 × 0.006986 / 1.39565
               = 1,000,000 × 0.0050050
               = ₪5,005.00 (approx)
```

More precisely: **₪5,005.84 / month**

**Step 2: First month amortization row**

```
interest_month_1 = 1,000,000 × 0.00291667 = ₪2,916.67
principal_month_1 = 5,005.84 − 2,916.67 = ₪2,089.17
balance_month_1 = 1,000,000 − 2,089.17 = ₪997,910.83
```

**Step 3: Final month (month 300)**

As the loan nears completion, the interest portion approaches zero and the principal portion approaches the full monthly payment. The final payment extinguishes the remaining balance (possibly slightly adjusted for rounding).

**Step 4: Totals**

```
total_payment = 5,005.84 × 300 = ₪1,501,752
total_interest = 1,501,752 − 1,000,000 = ₪501,752
total_cpi_adjustment = ₪0 (not CPI-linked)
```

**Step 5: Risk assessment**

This is a fixed, non-CPI-linked track.
```
risk_score_percentage = 0%
risk_level = low (נמוך)
```

---

## Dependencies

- `SystemParameter` table: `prime_rate`, `cpi_annual_forecast`
- `mix_tracks` records: `track_type`, `annual_rate` (= anchor_rate + spread), `cpi_linked`, `period_years`, `amortization_type`, `rate_change_interval_months`, `percentage`
- `borrowers` table: `birth_date` (for max term calculation)
- Caller provides `loan_amount` and `track_loan_amount` after splitting by percentage
