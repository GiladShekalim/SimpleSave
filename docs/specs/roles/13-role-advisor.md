# Role: Advisor

## Purpose

Define the permissions, responsibilities, constraints, and account lifecycle for the Advisor role in SimpleSave. Advisors are assigned to specific clients and accompany them through the mortgage process. Their scope is strictly limited to their assigned clients; they have no access to any other client's data or to system configuration.

---

## Role Overview

An Advisor is a human mortgage professional employed or contracted by the SimpleSave operation. They are assigned clients by an Admin. Depending on the client's tier, the advisor's involvement ranges from document review and bank coordination (Tier 1 admin-assisted) to active guidance, messaging, and signing accompaniment (Tier 2 and Tier 3).

Advisors work primarily from the Advisor Dashboard: a list of their assigned clients, each linking to a client detail view where all tabs of the client's personal area are visible (subject to permissions below).

---

## Access Scope

| Scope | Access Level |
|---|---|
| Assigned clients — all application data | Full read; write within documented permissions |
| Unassigned clients | No access |
| Other advisors' clients | No access |
| Admin dashboard | No access |
| System parameters (CPI, prime, rate tables, mixes) | No access |
| Tier pricing | No access |
| Advisor accounts (own or others) | Read own profile only; cannot create or edit advisor accounts |
| Admin accounts | No access |
| Audit log | No access (admins only) |
| Document type registry | Read-only (to know what types exist) |
| Notification log | No access |
| Bank response data (assigned clients) | Full read/write |
| Collateral records (assigned clients) | Full read/write |
| Calendar availability (Tier 3) | Read/write own availability |

---

## Permissions Table

| Action | Allowed? | Conditions / Notes |
|---|---|---|
| View assigned client's full application | ✅ | All tabs: Personal Details, Mortgage Details, Documents, Principal Approval, Collaterals, Messages, Post-Mortgage Dashboard |
| Edit assigned client's personal details | ✅ | Changes logged with advisor ID; client is notified of advisor-initiated edits |
| Edit assigned client's mortgage details (income, expenses) | ✅ | Logged; within the personal area fields only |
| View client's saved clock calculations | ✅ | Read-only display of calculation results; cannot modify clock definitions |
| Approve a client document | ✅ | Marks document row as APPROVED; timestamp + advisor ID logged |
| Reject a client document | ✅ | Must supply a rejection reason string (min 10 characters); client notified with reason |
| Add a manual document requirement to client's document list | ✅ | Creates a new document row with custom name and description; logged |
| Add notes to a document row | ✅ | Free-text annotation visible to client and admins; logged |
| Send messages to assigned client | ✅ | Messages tagged with current application stage; appears in client's Messages tab |
| Receive messages from assigned client | ✅ | Visible in advisor's client detail > Messages tab and in advisor's unified message inbox |
| Create a task for themselves | ✅ | Task is private to the advisor; linked to a client application |
| Complete a task | ✅ | Marks task as done; stored but not deleted |
| Delete their own task | ✅ | Soft-delete; task no longer appears in active task list |
| Enter bank principal approval response | ✅ | Keys in: bank name, approved amount, interest rate, conditions, response date; logged |
| Send authorization letters to banks (Tier 2/3) | ✅ | Triggered from Principal Approval tab; system sends email on behalf of advisor |
| Mark application as MORTGAGE_SIGNED | ✅ | Enters final mortgage terms; triggers collaterals tab unlock |
| Populate collateral records | ✅ | Add/edit collateral items for assigned client |
| Mark collaterals complete | ✅ | Transitions status to COLLATERALS_COMPLETE then ACTIVE_MORTGAGE |
| Annotate bank offers with notes visible to client (Tier 2/3) | ✅ | Free-text advisory note per bank offer row |
| View client's post-mortgage dashboard | ✅ | Read-only; mirrors what client sees |
| Set Tier 3 calendar availability | ✅ | Advisor sets available time slots; clients can book from these slots |
| Confirm / cancel a Tier 3 calendar booking | ✅ | Can reschedule with message to client |
| View own profile (name, contact info) | ✅ | Read-only via settings page |
| Change own contact info | ⚠️ | Requires admin approval before change takes effect (to prevent notification routing errors) |
| Change system parameters | ❌ | No access |
| View unassigned clients | ❌ | Strict data isolation |
| View another advisor's client list or client detail | ❌ | Strict data isolation |
| Create or edit advisor accounts | ❌ | Admin only |
| Create or edit admin accounts | ❌ | Admin only |
| Access the Admin Dashboard | ❌ | No access |
| Change tier pricing | ❌ | Admin only |
| Edit mix / clock / track definitions | ❌ | Admin only |
| Edit interest rate tables | ❌ | Admin only |
| Delete application data | ❌ | No deletion rights; admin soft-delete only |
| Manually advance application lifecycle status arbitrarily | ❌ | Advisors trigger status transitions only via defined flow actions (e.g., approving all docs transitions to DOCUMENTS_APPROVED); they cannot skip steps |
| View audit log | ❌ | Admin only |

---

## Document Review Details

When an advisor reviews a document:

1. **Approve:** Advisor clicks Approve on the document row. Status changes from UPLOADED to APPROVED. Timestamp and advisor ID are recorded.
2. **Reject:** Advisor clicks Reject. A modal requires a rejection reason (free text, min 10 characters). Status changes from UPLOADED to REJECTED. Client receives a notification with the reason. Client can re-upload; new upload resets the document status to UPLOADED and triggers re-review notification to the advisor.
3. **Request additional document:** Advisor clicks "Add Document Requirement." Enters document name, description, and whether it is mandatory or optional. The new row appears in the client's Documents tab immediately.

When all mandatory documents are APPROVED, the system automatically transitions application status from DOCUMENTS_SUBMITTED to DOCUMENTS_APPROVED and notifies the client.

---

## Bank Response Entry

Advisors manually enter responses from banks into the Principal Approval tab. For each bank:

- Bank name
- Approved loan amount (NIS)
- Interest rate offered (%)
- Loan term (years)
- Conditions / special notes (free text)
- Response date

At least one bank response moves the application status from PRINCIPAL_APPROVAL_REQUESTED to PRINCIPAL_APPROVAL_RECEIVED. Additional bank responses can be entered at any time while the application is in PRINCIPAL_APPROVAL_RECEIVED status.

---

## Task Management

Tasks are personal to-do items linked to a client application. They are private to the creating advisor and not visible to clients or other advisors.

Each task has:
- Title (required)
- Description (optional)
- Linked client application (required)
- Due date (optional)
- Status: OPEN / DONE

Advisors create, complete, and delete their own tasks only. No cross-advisor task assignment.

---

## Account Creation

- Advisor accounts are created exclusively by an Admin via Admin Dashboard > User Management > New Advisor.
- No self-registration.
- Admin enters: full name, email address, phone number.
- System sends an OTP invite to the configured contact.
- Advisor completes first login via OTP.
- Credentials: OTP-only (phone or email). No passwords. Session expires after 24 hours of inactivity.

---

## Advisor Reassignment

When an admin reassigns a client from Advisor A to Advisor B:

- Advisor B gains full write access to the client application immediately.
- Advisor A retains **read-only** access to the client's full application history until the client's application reaches ACTIVE_MORTGAGE status, at which point it disappears from Advisor A's dashboard.
- All messages, notes, and tasks created by Advisor A remain visible in the application history.
- Both Advisor A and Advisor B receive a notification about the reassignment.
- The client (Tier 2/3) receives a notification that their advisor has changed and sees Advisor B's name.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Advisor is deactivated by admin while they have active assigned clients | All their clients are flagged as "unassigned" in the admin dashboard; advisor loses all access immediately; clients in Tier 2/3 are notified that a new advisor will be assigned shortly |
| Client re-uploads a document that the advisor had already approved | Document status reverts to UPLOADED; advisor receives a re-review notification; DOCUMENTS_APPROVED application status reverts to DOCUMENTS_SUBMITTED if any mandatory document is now unreviewed |
| Advisor tries to approve a document type they added manually and the document is empty (client uploaded a blank file) | System shows a warning; advisor can still approve (they take responsibility) or reject with reason |
| Advisor sends a message to a Tier 1 client | Tier 1 clients do not have messaging enabled; message composition is blocked in the advisor's interface for Tier 1 clients; advisor sees "Client is on Tier 1 — messaging not available" |
| Client upgrades from Tier 1 to Tier 2 mid-process | Admin activates the upgrade; admin assigns an advisor; advisor immediately sees the client application with full history; messaging tab becomes functional |
| Two advisors' clients are accidentally visible to each other due to a bug | Should never occur; if reported, this is a P0 data isolation breach; immediate investigation and audit log review required |
| Advisor enters a bank response with an approved amount exceeding the client's requested loan | Allowed; system flags it as "exceeds requested amount" in the display but does not block entry |
| Advisor is on leave and has unreviewed documents | Admin can reassign the client or can review documents themselves from the admin interface |
