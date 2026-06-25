# Role: Client

## Purpose

Define the permissions, access gates, UI state rules, and constraints for the Client role in SimpleSave. Clients are end-users seeking a new mortgage. They self-register via OTP, complete the mortgage questionnaire, select a service tier, and navigate the application lifecycle through their personal area.

---

## Role Overview

A Client is an individual (or one of up to 5 co-borrowers) pursuing a new mortgage through the SimpleSave platform. Clients interact entirely through the public-facing site. Their access to features expands as their service tier is activated and as they progress through the application lifecycle.

Clients never see other clients' data, never access the admin or advisor dashboards, and cannot modify system parameters or approve their own documents.

---

## Access Scope

| Scope | Access Level |
|---|---|
| Own application data | Full read; write within permissions below |
| Other clients' data | No access |
| Advisor identity (name only, Tier 2/3) | Read-only |
| Advisor's notes on documents | Read-only (visible in document row) |
| Admin area | No access |
| Advisor dashboard | No access |
| System parameters (CPI, rates, mix definitions) | No access |
| Audit log | No access |
| Clock calculation results | Read-only display (no text selection / copy; display-only rendering) |
| Document status | Read-only per document row |
| Message thread with advisor (Tier 2/3) | Read/write |

---

## Access Gates by Tier

### No Tier Selected (status: REGISTERED or QUESTIONNAIRE_COMPLETE)

The client has completed the questionnaire and/or OTP registration but has not selected a tier.

| Tab / Feature | State |
|---|---|
| Clocks screen (5 mix options) | Visible, interactive (can view and drill into each clock) |
| Personal Details tab | Visible, interactive (can fill and save) |
| Mortgage Details tab | Locked — shows "Select a tier to continue" |
| Documents tab | Locked |
| Principal Approval tab | Locked |
| Collaterals tab | Locked |
| Messages tab | Locked |
| Post-Mortgage Dashboard | Locked |
| Tier selection screen | Visible, interactive |

Locked tabs show a consistent lock overlay with a prompt: "Upgrade to a service tier to access this section" and an "Upgrade" button that navigates to the tier selection screen.

---

### Tier 1 — Mix + Principal Approval (self-service)

| Tab / Feature | State | Notes |
|---|---|---|
| Clocks screen | Visible, interactive | Can view selected clock and drill-down |
| Personal Details tab | Visible, interactive | All fields editable; mandatory fields highlighted |
| Mortgage Details tab | Visible, interactive | Pre-populated from questionnaire; editable |
| Documents tab | Unlocked after AUTHORIZATION_SIGNED | Upload + view document status |
| Principal Approval tab | Unlocked after DOCUMENTS_APPROVED | View bank grid, select bank |
| Collaterals tab | Unlocked after BANK_SELECTED | View collateral list (read-only; populated by admin) |
| Messages tab | Visible, read-only | Shows a prompt: "Upgrade to Tier 2 or Tier 3 to chat with an advisor." No compose button. |
| Post-Mortgage Dashboard | Unlocked after ACTIVE_MORTGAGE | View mortgage summary, payment schedule |

---

### Tier 2 — Online Guidance

| Tab / Feature | State | Notes |
|---|---|---|
| Clocks screen | Visible, interactive | |
| Personal Details tab | Visible, interactive | Advisor can also edit; client sees advisor edits flagged |
| Mortgage Details tab | Visible, interactive | |
| Documents tab | Unlocked after AUTHORIZATION_SIGNED | Upload + view status + see advisor notes |
| Principal Approval tab | Unlocked after DOCUMENTS_APPROVED | Expanded bank comparison view; advisor annotation visible |
| Collaterals tab | Unlocked after BANK_SELECTED | View list |
| Messages tab | Fully functional | Compose and send messages; see advisor responses; messages tagged by stage |
| Post-Mortgage Dashboard | Unlocked after ACTIVE_MORTGAGE | |
| Assigned advisor name | Visible in header/profile | Shown as: "Your Advisor: [Name]" |

---

### Tier 3 — Personal Advisor

All Tier 2 features plus:

| Tab / Feature | State | Notes |
|---|---|---|
| Calendar booking | Visible in Messages tab or dedicated Calendar tab | Client can book a time slot from advisor's availability |
| Assigned advisor name + photo | Visible | More prominent placement than Tier 2 |
| Calendar booking confirmation | Sent via notification | Email/SMS confirmation of booked meeting |

---

## Permissions Table

| Action | Allowed? | Conditions / Notes |
|---|---|---|
| Complete the 10-question wizard | ✅ | Before registration; no login required |
| Register via OTP (phone or email) | ✅ | After completing at least Q1–Q10 or from "Sign Up" link |
| View own clock results (5 mixes) | ✅ | Requires questionnaire complete + OTP registration |
| Drill into a clock's track breakdown | ✅ | Display-only; no copy/export |
| Fill and save Personal Details | ✅ | All lifecycle states; auto-save on focus-out |
| Fill and save Mortgage Details | ✅ | Tier 1/2/3 only; pre-populated from questionnaire |
| Edit additional income rows | ✅ | In Mortgage Details; tier 1/2/3 |
| Edit fixed expense rows | ✅ | In Mortgage Details; tier 1/2/3 |
| Sign authorization letters (download + upload in v1) | ✅ | After PERSONAL_DETAILS_COMPLETE; moves to AUTHORIZATION_SIGNED |
| Upload a required document | ✅ | Documents tab unlocked after AUTHORIZATION_SIGNED |
| Re-upload a rejected document | ✅ | Replaces the existing file; status resets to UPLOADED |
| View document status (UPLOADED / APPROVED / REJECTED / MISSING) | ✅ | Read-only |
| View document rejection reason | ✅ | Shown inline on the rejected document row |
| View Principal Approval tab (bank grid) | ✅ | After DOCUMENTS_APPROVED; tier 1/2/3 |
| Select preferred bank | ✅ | Principal Approval tab; one bank selectable; triggers BANK_SELECTED |
| Send messages to advisor | ✅ | Tier 2/3 only; Messages tab |
| Read advisor messages | ✅ | Tier 2/3 only |
| Book a calendar slot (Tier 3) | ✅ | From advisor's published availability |
| View post-mortgage dashboard | ✅ | After ACTIVE_MORTGAGE |
| Select or change service tier | ✅ | From tier selection screen; actual activation by admin |
| View own questionnaire answers | ✅ | Within personal area Mortgage Details tab |
| Export / copy mortgage calculation output | ❌ | UI renders clock results in a non-selectable display-only container; no copy button; right-click copy is suppressed on results panels |
| Download raw calculation data as file | ❌ | No export function on clock or calculation screens |
| View any other client's data | ❌ | |
| Access advisor dashboard | ❌ | |
| Access admin area | ❌ | |
| Approve or reject own documents | ❌ | Document status can only be changed by advisor or admin |
| Change system parameters | ❌ | |
| Change their own application lifecycle status directly | ❌ | Status advances automatically based on actions (e.g., uploading all docs) or is set by advisor/admin |
| Create tasks | ❌ | Tasks are advisor-only |
| View advisor's private notes or tasks | ❌ | Only document notes explicitly shared with client are visible |
| View other borrowers' personal details (co-borrowers) | ✅ | Only if they are listed on the same application |

---

## Prohibited Actions

1. **Export, copy, or screenshot-prompt mortgage calculation outputs.** The UI prevents text selection on all calculation result panels. There is no download or copy button on any clock or track breakdown screen.
2. **Approve or reject their own documents.** Document review is exclusively an advisor/admin action.
3. **View or interact with any other client's application.** Strict per-account data isolation.
4. **Access the advisor dashboard or admin area.** Route-level access control; these routes are inaccessible to client sessions.
5. **Change their own application lifecycle status.** Clients trigger transitions indirectly via actions (uploading docs, signing, selecting a bank); they cannot set status directly.
6. **Access clocks without completing the questionnaire.** The clock screen requires a completed questionnaire and a verified OTP session.

---

## Account Creation

- **Self-registration** via the public site: "New Mortgage" wizard, then "Create account to see your results" gate, or the "Sign Up" link on the home page.
- Client enters name + phone or name + email.
- OTP sent (6-digit code, valid for 10 minutes).
- Client enters OTP; max 5 attempts before lockout.
- On success: session created, role = CLIENT, application created with status = REGISTERED.
- If the client already completed the 10-question wizard before registering, their questionnaire answers are carried into the new application.
- If the phone/email is already registered: client is logged into the existing account instead of creating a new one (see flow-16).
- No passwords. Session expires after 24 hours of inactivity.

---

## Locked vs. Read-Only vs. Interactive States per Lifecycle Stage

The table below maps each Personal Area tab to its interaction state at key lifecycle stages. Applies to Tier 1/2/3 unless noted.

| Lifecycle Status | Personal Details | Mortgage Details | Documents | Principal Approval | Collaterals | Messages |
|---|---|---|---|---|---|---|
| REGISTERED | Interactive | Locked (no tier) | Locked | Locked | Locked | Locked |
| TIER_SELECTED | Interactive | Interactive | Locked | Locked | Locked | Tier 2/3: Interactive; Tier 1: Read-only prompt |
| PERSONAL_DETAILS_COMPLETE | Interactive | Interactive | Locked | Locked | Locked | same as above |
| AUTHORIZATION_SIGNED | Read-only* | Read-only* | Interactive | Locked | Locked | same as above |
| DOCUMENTS_SUBMITTED | Read-only* | Read-only* | Interactive (re-upload on rejected) | Locked | Locked | same as above |
| DOCUMENTS_APPROVED | Read-only* | Read-only* | Read-only | Interactive | Locked | same as above |
| PRINCIPAL_APPROVAL_REQUESTED | Read-only* | Read-only* | Read-only | Interactive (view only, bank not yet selectable) | Locked | same as above |
| PRINCIPAL_APPROVAL_RECEIVED | Read-only* | Read-only* | Read-only | Interactive (bank selection enabled) | Locked | same as above |
| BANK_SELECTED | Read-only* | Read-only* | Read-only | Read-only | Interactive (view only; advisor-managed) | same as above |
| MORTGAGE_SIGNED | Read-only* | Read-only* | Read-only | Read-only | Interactive (view only) | same as above |
| COLLATERALS_PENDING | Read-only* | Read-only* | Read-only | Read-only | Interactive (view only) | same as above |
| ACTIVE_MORTGAGE | Read-only | Read-only | Read-only | Read-only | Read-only | Tier 2/3: Interactive (ongoing support) |

*Read-only with edit unlock available: Client can request an edit by contacting their advisor via Messages (Tier 2/3) or via admin support contact (Tier 1). Edits after AUTHORIZATION_SIGNED require advisor/admin approval and may require re-signing authorization letters.

---

## Data Export Restriction — Implementation Notes

Clock results and track breakdowns must be rendered using CSS `user-select: none` on the results container, combined with disabling the browser context menu on those elements. No download, print, or share button appears on any calculation output screen. This prevents clients from easily extracting the proprietary calculation results for use outside the platform.

This restriction applies to:
- The 5-clock comparison view
- Individual clock drill-down (track breakdown, amortization chart)
- Monthly payment projection table

It does NOT apply to:
- The client's personal details form (they must be able to copy their own entered data)
- Document status information
- Messages

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Client refreshes mid-questionnaire | Each completed step is auto-saved to sessionStorage and backend (if registered) or sessionStorage only (if not yet registered). On refresh, the wizard resumes from the last completed step. |
| Client navigates back in the wizard | Data for all steps is retained. Client can edit any previously answered step; changing Q5 (number of borrowers) triggers a confirmation: "Changing the number of borrowers will reset your borrower details. Continue?" |
| Client enters an equity amount below the minimum threshold | Immediate inline error shown: "Minimum equity for this loan type is [X] NIS ([Y]% of property value). Please enter at least [X] NIS." |
| Client's oldest borrower age would make max term < 4 years | Error shown on Q6: "Based on the borrower's age, the maximum loan term is [N] years, which is below the minimum required of 4 years. A mortgage cannot be issued." Wizard cannot proceed. |
| Client tries to upload a file > allowed size | Error: "File too large. Maximum file size is [X] MB." Upload blocked. |
| Client uploads an unsupported file type | Error: "Unsupported file format. Accepted formats: PDF, JPG, PNG." Upload blocked. |
| Client selects a bank and then wants to change their selection | Bank selection can be changed (reverts to PRINCIPAL_APPROVAL_RECEIVED) until advisor marks MORTGAGE_SIGNED. After that, it is locked. |
| Client's session expires mid-form | On next visit, the OTP login screen is shown. After re-authentication, the client is returned to their personal area with all previously saved data intact. |
| Client registers with a phone number that already exists | System recognizes the existing account and sends an OTP for login. A message is shown: "This phone number is already registered. We sent you a login code." No new account is created. |
| Client is on Tier 1 and sends a message via the locked Messages tab | The Messages tab shows an upgrade prompt and has no compose field; client cannot send messages. |
| Client wants to see their clock after reaching ACTIVE_MORTGAGE | The original clock results remain viewable in the Clocks section (read-only) for reference. |
