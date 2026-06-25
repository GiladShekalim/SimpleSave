# Role: Admin

## Purpose

Define the permissions, responsibilities, constraints, and account lifecycle for the Admin role in SimpleSave. Admins are the system owners — the internal operations team responsible for running the platform, configuring system parameters, and overseeing all client and advisor activity.

---

## Role Overview

The Admin role has full read/write access to every entity in the system. Admins configure the mortgage engine (CPI, prime rate, interest rate tables, mix definitions), manage advisor accounts, assign clients to advisors, manually activate client tiers after off-system payment, monitor document review progress, enter bank responses, and view the complete audit log.

Admins do **not** represent a client or advisor in any transaction — they operate as back-office operators. There is no client-facing persona for an admin account.

---

## Access Scope

| Scope | Access Level |
|---|---|
| All client applications (all statuses, all advisors) | Full read/write |
| All advisor accounts | Full read/write |
| All admin accounts | Full read/write |
| System configuration (CPI, prime, rate tables, tier prices) | Full read/write |
| Mix / clock / track definitions | Full read/write |
| Document type registry | Full read/write |
| Audit log | Read-only (immutable) |
| Notification log (sent/failed) | Read + resend |
| OTP lockout records | Read + manual unlock |
| Client tier assignments | Full read/write |
| Client-advisor assignment table | Full read/write |
| Bank response data | Full read/write |
| Collateral records | Full read/write |

---

## Permissions Table

| Action | Allowed? | Conditions / Notes |
|---|---|---|
| View any client application | ✅ | No restriction; all lifecycle states |
| Edit any client application data | ✅ | All edits logged with before/after snapshot |
| Manually advance application lifecycle status | ✅ | Must provide a reason string (stored in audit log) |
| Create advisor account | ✅ | Sets initial name, email/phone; advisor receives OTP invite |
| Edit advisor account | ✅ | Can change name, contact info, active status |
| Deactivate (soft-delete) advisor account | ✅ | Advisor's current clients are flagged as unassigned |
| Create additional admin account | ✅ | Only existing admins may create new admins |
| Edit admin account | ✅ | Logs all changes |
| Deactivate admin account | ✅ | Cannot deactivate own account |
| Assign client to advisor | ✅ | Triggers notification to both advisor and client (tier 2/3 only) |
| Reassign client from one advisor to another | ✅ | Old advisor loses write access; all data transferred; both parties notified |
| Edit system parameters (CPI %, prime rate) | ✅ | Change is logged; affects all future calculations; existing saved clocks are not retroactively recalculated |
| Edit interest rate tables | ✅ | Version-stamped; new entries take effect immediately for new calculations |
| Edit mix / clock / track definitions | ✅ | Existing client clocks snapshot the definition at save time; future calculations use updated definitions |
| Edit tier pricing (display only in v1) | ✅ | Updates the pricing shown on the tier selection screen |
| Set client tier manually | ✅ | Used after off-system payment confirmation; logs payment reference note |
| Add / remove document types from registry | ✅ | Removal is soft-delete; existing document requirements referencing a removed type remain visible as legacy |
| Approve / reject client documents | ✅ | Same flow as advisor; rejection requires a reason string |
| Add manual document requirement to a client application | ✅ | Creates a new row in the client's document list |
| Enter bank principal approval responses | ✅ | Manually keys in approved amount, interest rate, conditions per bank |
| Mark application as MORTGAGE_SIGNED | ✅ | Triggers collaterals tab unlock |
| Populate / approve collateral records | ✅ | Same flow as advisor |
| View full audit log (all users, all entities) | ✅ | Filterable by date, user, entity, action type |
| Manually unlock OTP-locked account | ✅ | Logs who unlocked, timestamp |
| View failed notifications | ✅ | SMS, email failures surfaced in notification log |
| Resend failed notifications | ✅ | Creates a new send attempt; logs outcome |
| View client's clock calculations | ✅ | Read-only view of saved calculation results |
| Send messages to clients (tier 2/3 threads) | ✅ | Appears as "SimpleSave Team" sender |
| Export audit log | ✅ | CSV download; logged as a data export event |
| Delete application data permanently | ❌ | Hard delete is prohibited; soft-delete only |
| Impersonate another user (admin, advisor, client) | ❌ | No impersonation feature exists |
| Bypass audit log | ❌ | All state-changing actions are always logged; no override |
| Modify audit log entries | ❌ | Audit log is append-only and immutable |
| Approve own document uploads (N/A — admins do not apply) | ❌ | Admins have no mortgage application |

---

## Prohibited Actions

1. **Hard-delete any application, document, message, or audit record.** All removal operations are soft-delete; data remains queryable by admins and is physically retained per data retention policy.
2. **Impersonate a client or advisor.** Admins act under their own account at all times. There is no "log in as" feature.
3. **Bypass or suppress audit log entries.** Every admin action that changes data (write, status transition, parameter update) generates an immutable audit entry.
4. **Modify audit log entries after creation.** The audit log is append-only.
5. **Deactivate their own admin account.** Prevents accidental lockout of the last admin.
6. **Create client accounts directly.** Clients self-register via OTP; admins cannot create a client record on a client's behalf.
7. **Retroactively recalculate saved client clocks** when system parameters change. Saved clocks reflect the parameters at the time of calculation.

---

## Account Creation

- **First admin:** Bootstrapped via a server-side CLI script executed during initial deployment. The script sets a name, email, and phone; the admin then authenticates via OTP on first login.
- **Subsequent admins:** Created exclusively by an existing active admin through the Admin Dashboard > User Management > New Admin form.
- **No self-registration:** Admin accounts cannot be created from the public-facing site.
- **Credentials:** OTP-only (phone or email). No passwords. Session expires after 24 hours of inactivity.
- **Invite flow:** When a new admin is created, the system sends an OTP invite to the configured email or phone. The recipient uses that OTP to complete their first login.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Admin changes CPI rate while a client is mid-calculation | New rate applies only to calculations initiated after the change. In-progress wizard sessions that have not yet generated clocks use the rate at the moment of clock generation. |
| Admin reassigns client to an advisor who is deactivated | System prevents assignment to a deactivated advisor; admin must choose an active advisor. |
| Admin manually advances lifecycle status by more than one step | Allowed but flagged as a "skip" in the audit log; system does not enforce step-by-step progression for admin overrides. |
| Last active admin is about to be deactivated | System blocks the deactivation with an error: "Cannot deactivate the last active admin account." |
| Admin rejects a document that was previously approved | Document status reverts to REJECTED; client is notified; DOCUMENTS_APPROVED status on the application reverts to DOCUMENTS_SUBMITTED; other already-approved documents retain their status. |
| Admin unlocks an OTP account that was locked due to fraud suspicion | Unlock is logged; admin must enter a free-text justification note. |
| Admin edits a client's personal details after AUTHORIZATION_SIGNED | Change is logged with before/after snapshot; a flag is set indicating authorization letters may need to be re-issued; admin must confirm they acknowledge this. |
| Two admins edit the same entity simultaneously | Last-write wins; both writes are independently logged. No optimistic locking in v1. |
| Admin removes a document type that is currently required by an active application | Soft-delete marks the type as retired; existing requirements in active applications remain and must still be fulfilled or manually waived by an admin with a logged reason. |
