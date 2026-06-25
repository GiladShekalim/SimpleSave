# Flow 25 — Admin Parameter Update and Recalculation

## Purpose

Describe the flow for admin updating system-wide parameters (CPI forecast, Prime rate, variable anchor rates) and interest rate tables, including the preview, audit logging, and the background recalculation job that propagates changes to all affected applications.

---

## Preconditions

- Admin is logged in with the Admin role.
- The Admin Parameters screen is accessible.
- At least one parameter or interest rate table entry exists in the database.

---

## Data Model Reference

**SystemParameter table:**
- key (unique string identifier, e.g., "cpi_forecast", "prime_rate")
- display_label (Hebrew label for admin UI)
- current_value (decimal)
- previous_value (decimal, stored on each update for audit)
- unit (e.g., "percent", "NIS")
- last_updated_at
- last_updated_by (admin_id)

**InterestRateTable:**
- track_type (Fixed / Variable / Prime)
- sub_type (e.g., "fixed_5yr", "variable_6mo")
- rate (decimal, percent)
- effective_from (date)
- created_by (admin_id)

---

## Steps — System Parameter Update

### 1. Admin Navigates to Parameters Screen

1. Admin opens Admin area → Parameters tab.
2. Screen displays:
   - Current system parameters (CPI Forecast, Prime Rate, Variable Anchor, others as configured)
   - Per row: parameter name (Hebrew), current value, unit, last updated (date + by whom)
   - "Edit" button per row
   - Job status indicator (last run, status, affected records count)

### 2. Admin Edits a Parameter

1. Admin clicks "Edit" on a parameter row.
2. Inline edit field appears (or modal — implementation choice):
   - Label: parameter name (read-only)
   - Current Value: displayed for reference
   - New Value: number input with unit label (e.g., "%" or "NIS")
   - Notes (optional free text): reason for the change
3. Admin enters the new value.
4. As the admin types the new value, the system performs a real-time preview query:
   - **Preview text:** "שינוי זה יחשב מחדש N בקשות פעילות." (This change will trigger recalculation for N active applications.)
   - N = count of applications in statuses: TIER_SELECTED, PERSONAL_DETAILS_COMPLETE, AUTHORIZATION_SIGNED, DOCUMENTS_SUBMITTED, DOCUMENTS_APPROVED, PRINCIPAL_APPROVAL_REQUESTED, PRINCIPAL_APPROVAL_RECEIVED, BANK_SELECTED, MORTGAGE_SIGNED, COLLATERALS_PENDING, COLLATERALS_COMPLETE, ACTIVE_MORTGAGE.
5. Admin reviews the preview count.

### 3. Admin Confirms Update

1. Admin clicks "שמור" (Save).
2. Confirmation dialog:
   - "Are you sure you want to change [Parameter Name] from [Old Value] to [New Value]? This will trigger recalculation for [N] applications."
   - Buttons: "אשר" | "ביטול"
3. Admin confirms.

### 4. Database Update

1. SystemParameter record updated:
   - previous_value → old current_value
   - current_value → new value
   - last_updated_at → now
   - last_updated_by → admin_id
2. AuditLog entry created:
   - entity_type = SystemParameter
   - entity_id = parameter key
   - action = update
   - old_value, new_value, changed_by, changed_at, notes (if entered)

### 5. Background Job Queued

1. A RecalculationJob record is created:
   - triggered_by = admin_id
   - parameter_key = changed parameter
   - status = queued
   - queued_at = now
   - affected_count = N (from preview)
   - processed_count = 0
   - failed_count = 0
2. Job is placed on the background job queue (e.g., Redis queue, DB-backed queue).
3. Admin sees the job status indicator update to: "בתור" (Queued).

### 6. Background Job Execution

1. Worker picks up the job.
2. Job status → processing.
3. Worker queries: all applications in affected statuses (same set as preview count).
4. For each application:
   a. Retrieve all 5 clocks (mix configurations) for this application.
   b. Recalculate each clock using the new parameter value:
      - CPI forecast change → recalculate CPI-linked track monthly payments and total cost projections.
      - Prime rate change → recalculate Prime-linked track monthly payments.
      - Variable anchor change → recalculate variable track payments.
   c. Store updated calculation results (replace previous cached calculation).
   d. Increment RecalculationJob.processed_count.
   e. IF calculation fails for this application: log error (ApplicationId, error message), increment failed_count, continue to next application (do not halt entire job).
5. After all applications processed:
   - Job status → completed (if failed_count = 0) OR completed_with_errors (if failed_count > 0)
   - Job.completed_at = now

### 7. Batch Notification to Clients

1. After job completes (status = completed or completed_with_errors):
   - System enqueues notification to all successfully recalculated clients:
     - "חישובי המשכנתא שלך עודכנו בעקבות שינוי בנתוני השוק. כנס לאזור האישי לצפייה בנתונים המעודכנים."
   - Clients in pre-registration statuses (QUESTIONNAIRE_IN_PROGRESS, QUESTIONNAIRE_COMPLETE, REGISTERED) also have their clock calculations updated silently (no notification — they have not yet seen clock results).

### 8. Admin Sees Job Progress

1. On the Parameters screen, the job status indicator shows:
   - "מעבד..." (Processing) with a progress counter: "X / N בקשות" while running.
   - "הושלם" (Completed) with final counts when done.
   - "הושלם עם שגיאות" (Completed with Errors) and a link to the error log if failed_count > 0.
2. Admin can click the error log link to see a list of failed application IDs and error messages.
3. Admin can manually trigger a retry for failed applications from the error log view.

---

## Steps — Interest Rate Table Update

Interest rate tables are separate from global system parameters. They affect specific track types only.

### 1. Admin Navigates to Interest Rate Table

1. Admin opens Admin area → Interest Rates tab.
2. Table of all current interest rates displayed per track type and sub-type.
3. Admin clicks "Edit" on a specific rate row, OR clicks "Add Rate Version" to add a new effective-from date entry.

### 2. Admin Updates Rate

1. Admin enters the new rate value and effective_from date.
2. Preview: "This rate change affects track type [X]. Applications using mixes that include [X] tracks will be recalculated. Estimated affected applications: N."
   - N = count of applications using mixes that include the changed track type.
3. Admin confirms.

### 3. Database Update and Audit

1. InterestRateTable record updated (or new version record created with effective_from date).
2. AuditLog entry created (same structure as parameter update).

### 4. Scoped Recalculation Job

1. A RecalculationJob is queued with scope = track_type filter.
2. Worker processes only applications using mixes that include the affected track type.
3. Same execution, notification, and error handling as steps 6–8 above, but scoped.

---

## State Transitions

Parameter updates do not change Application.status. They only update cached calculation data.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Parameter update while a recalculation job is already running | New job created with status = queued. Starts only after current job completes. Queue is FIFO. Admin sees: "A recalculation is in progress. Your change will be processed next." |
| Admin changes CPI by a large amount (e.g., 10% to 0.1%) | No automatic block. System applies the change. Audit log records the magnitude. Admin's responsibility to verify the value. Admin may optionally be shown a warning: "This is a significant change from the current value — confirm to proceed." |
| Recalculation job fails entirely (worker crash) | Job status → failed. Admin sees: "חישוב נכשל — אנא נסה שוב." Admin can click "Retry Job" to re-queue the same job. Previous calculation values remain in place (no partial overwrite if job aborted before saving results). |
| Recalculation job fails partway (some records processed, some not) | Records are saved per-application atomically. Completed records keep new values. Failed records keep old values and are logged. Admin sees failed count and can retry failed subset. |
| Admin updates the same parameter twice before the first job completes | Second update queued. When the second job runs, it uses the then-current parameter value (which is the second update's value). Net effect: all applications recalculated to the latest value. First job's mid-state calculations are overwritten by second job. |
| No applications in affected statuses | Job is created but processes 0 records. Status → completed immediately. Preview shows "0 applications affected" before admin confirms. |
| Interest rate table change applies to a track type not currently used in any active mix | Scoped recalculation job processes 0 records. No notifications sent. Change logged in audit. |

---

## Error States

| Error | Admin-Facing Message | System Action |
|---|---|---|
| Preview count query times out | "לא ניתן לחשב את מספר הבקשות כרגע. ניתן לשמור בכל זאת." | Allow admin to save with advisory. No preview shown. |
| DB save of parameter fails | "שגיאה בשמירת הפרמטר. אנא נסה שוב." | No audit log entry. No job queued. previous_value unchanged. |
| Background worker unavailable | Job stays in queued state. Admin sees "בתור — ממתין לעובד." | System will process job when worker recovers. Admin can re-trigger manually if needed. |
| Notification batch delivery failure | Admin notified: "Client notifications for the recalculation update failed to deliver. Please notify clients manually or retry." | Recalculation values still saved. Clients see updated data if they log in; they just did not receive a push notification. |
| Calculation produces invalid result (NaN, negative) | Error logged per application. Application not updated. Admin error log shows: "Calculation error for Application [ID]: [error detail]." | Manual review required. |
