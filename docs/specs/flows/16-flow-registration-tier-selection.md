# Flow: Registration and Tier Selection

## Purpose

Document the complete step-by-step flow for a new user completing registration and selecting a service tier. This flow is entered either from the clocks "Select This Mix" button (after the curious-user flow, flow-15), or directly from the home page "Sign Up" link. It covers OTP authentication, terms acceptance, tier selection, admin tier activation, advisor assignment, and the client's first entry into the personal area.

---

## Preconditions

- User arrives at the registration screen via one of:
  - "Complete Registration" prompt from the clocks "Select This Mix" action (flow-15 step 7).
  - "Sign Up" / "Get Started" link on the home page or navigation bar.
- If the user arrived from the wizard flow (flow-15), their questionnaire answers are retained in sessionStorage and will be pre-filled once the account is created.
- Tier selection is NOT available until after terms acceptance.
- System is operational; OTP provider (SMS/email) is available.

---

## Steps

### 1. Arrive at Registration Screen

1.1. The registration screen is presented with the title: "Create your SimpleSave account."
1.2. Two contact method options are offered (user picks one):
  - Phone number (with country code selector, defaults to Israel +972)
  - Email address
1.3. A "Full Name" field is shown above the contact field (required).
1.4. A link: "Already have an account? Sign in" is shown below the form.
1.5. IF user clicks "Sign in": they are taken to the login screen (OTP login with existing contact). This is not a new registration — see Step 2 note on duplicate detection.

---

### 2. OTP Send

2.1. User fills in name and phone/email, then clicks "Continue."
2.2. **Duplicate detection:** System looks up the provided phone/email in the user database.
  - IF phone/email already registered:
    - Do NOT create a new account.
    - Display: "This [phone number / email address] is already registered. We've sent you a login code instead."
    - Send a login OTP to the existing account's contact.
    - Proceed with OTP verification as a login (step 3).
    - After login, if the user arrived from the wizard with questionnaire data: offer to attach the new questionnaire data to their existing application, or start a new application.
  - IF phone/email not registered: create a pending registration record and send a new OTP.
2.3. System sends a 6-digit OTP:
  - Via SMS if phone was provided.
  - Via email if email was provided.
2.4. OTP is valid for 10 minutes.
2.5. User is navigated to the OTP entry screen.

---

### 3. OTP Entry and Verification

3.1. Screen shows: "Enter the 6-digit code sent to [masked contact]."
3.2. Input: 6 individual digit boxes (or a single 6-digit field). Auto-focus.
3.3. A countdown timer shows time remaining (10:00 counting down).
3.4. A "Resend Code" button is disabled for the first 60 seconds, then becomes active.
3.5. User enters the 6-digit code and clicks "Verify" (or auto-submits when all 6 digits are entered).
3.6. **IF correct code and within 10 minutes:**
  - Account is created (role = CLIENT) OR existing account is logged in.
  - Session token issued; session expires after 24 hours of inactivity.
  - IF questionnaire data was in sessionStorage: it is attached to the new/existing application.
  - Proceed to Step 4 (Terms and Conditions).
3.7. **IF wrong code:**
  - Error: "Incorrect code. [N] attempts remaining." (Max 5 attempts total.)
  - After 5 failed attempts: account is locked. Display: "Your account has been temporarily locked due to too many incorrect attempts. Please contact support or wait 30 minutes before trying again." Flow ends.
3.8. **IF code expired:**
  - Error: "Your code has expired."
  - "Resend Code" button is shown/activated.
3.9. **IF user clicks "Resend Code":**
  - Previous OTP is invalidated.
  - New OTP is generated and sent.
  - Resend button resets to 60-second disabled countdown.
  - A "Resend Code" action is rate-limited to 3 resends per session to prevent abuse. After 3 resends: "You've requested too many codes. Please wait 10 minutes before trying again."

---

### 4. Terms and Conditions

4.1. After successful OTP verification, the user is shown the Terms and Conditions screen.
4.2. The full terms text is displayed in a scrollable container.
4.3. A checkbox: "I have read and agree to the Terms of Service and Privacy Policy."
4.4. The "I Accept and Continue" button is disabled until the checkbox is checked.
4.5. A "View Privacy Policy" link opens the privacy policy in a new tab (or modal).
4.6. **IF user checks the checkbox and clicks "I Accept and Continue":**
  - Acceptance is recorded: timestamp, account ID, terms version.
  - Audit log entry created: TERMS_ACCEPTED.
  - Proceed to Step 5 (Tier Selection).
4.7. **IF user closes the browser or navigates away:**
  - Session exists; account is created but terms are not accepted.
  - Next time the user logs in, they are redirected back to the Terms screen and cannot proceed until acceptance.

---

### 5. Tier Selection Screen

5.1. User is shown the tier selection screen with 3 tier cards.
5.2. Each card displays:
  - Tier name and tagline (Hebrew)
  - List of included features (bullets)
  - Price (displayed as-is; payment is off-system in v1)
  - A "Select" button
5.3. A "Skip for now" link is shown below the cards.
5.4. The current application status is: REGISTERED (or QUESTIONNAIRE_COMPLETE if wizard was completed).

**Tier 1 — Mix + Principal Approval (מיקס + אישור עקרוני):**
- Features shown: Clock selection, personal details, documents submission, principal approval, bank selection.
- Price: [configured by admin].

**Tier 2 — Online Guidance (ליווי אונליין):**
- Features shown: All Tier 1 features + assigned advisor + messaging.
- Price: [configured by admin].

**Tier 3 — Personal Advisor (יועץ אישי):**
- Features shown: All Tier 2 features + calendar booking + in-person or remote accompaniment.
- Price: [configured by admin].

---

### 6. User Selects a Tier or Skips

#### 6a. IF user clicks "Skip for now":

6a.1. Application status remains: REGISTERED (or QUESTIONNAIRE_COMPLETE).
6a.2. User is taken to the personal area hub.
6a.3. In the personal area:
  - Clocks tab: visible and interactive.
  - Personal Details tab: visible and interactive.
  - All other tabs: locked with "Select a tier to unlock this section" overlay and "Choose a Tier" button.
6a.4. A persistent banner at the top of the personal area: "You haven't selected a service tier yet. Choose a tier to unlock full access."

#### 6b. IF user selects Tier 1, 2, or 3:

6b.1. A modal is shown: "Thank you for choosing [Tier Name]. To activate your tier, please complete payment. Our team will contact you shortly to finalize the process."
6b.2. A "Contact Us" button is shown (opens a WhatsApp link or email to the SimpleSave team).
6b.3. Application status: remains REGISTERED. A pending tier selection is logged: `tier_requested = [1/2/3]`.
6b.4. Admin receives a notification: "Client [Name] has requested Tier [N]. Pending payment activation."
6b.5. User is taken to the personal area hub with the same locked state as if they had skipped, plus a note: "Your tier selection is pending activation. We'll notify you when it's ready."

---

### 7. Admin Activates Tier (Off-System Payment Confirmed)

7.1. Admin logs in to the Admin Dashboard.
7.2. Admin sees a "Pending Tier Activations" list.
7.3. Admin selects the client, confirms payment (off-system), and sets the client's tier to 1, 2, or 3.
7.4. Admin optionally enters a payment reference note.
7.5. Application status transitions to: **TIER_SELECTED**.
7.6. System sends a notification to the client: "Your [Tier Name] tier has been activated! Log in to continue your application."

#### 7a. IF Tier 1:

7a.1. No advisor is assigned.
7a.2. Client's personal area unlocks all Tier 1 tabs (per role-14 access gates).

#### 7b. IF Tier 2 or Tier 3:

7b.1. Admin assigns an advisor from the active advisor list.
7b.2. The assigned advisor receives a notification: "You have been assigned a new client: [Client Name]. Log in to review their application."
7b.3. The client receives a notification: "Your advisor [Advisor Name] has been assigned to your application. You can message them through your personal area."
7b.4. The client's personal area shows the advisor's name in the header: "Your Advisor: [Advisor Name]."
7b.5. Messages tab becomes fully functional for the client.

---

### 8. First Entry into Personal Area

8.1. Client logs in or is redirected after tier activation notification.
8.2. Personal area hub is shown with the appropriate tabs unlocked per tier.
8.3. If the wizard was completed (questionnaire data exists), the Mortgage Details tab is pre-populated with the wizard answers.
8.4. A first-time prompt is shown: "Welcome to your personal area. Start by completing your personal details." with a "Go to Personal Details" button.
8.5. Personal Details tab shows all mandatory fields with an empty-state indicator. Fields that can be pre-filled from the registration (name) are pre-filled.
8.6. Client begins filling personal details → this is the start of the Tier-specific flow (flow-18 for Tier 1, flow-19 for Tier 2).

---

## State Transitions

| Trigger | From Status | To Status |
|---|---|---|
| OTP verified (new user) | (none) | REGISTERED |
| OTP verified (returning user with questionnaire) | QUESTIONNAIRE_COMPLETE | REGISTERED (questionnaire data attached) |
| Terms accepted | REGISTERED | REGISTERED (terms_accepted flag set; no status change) |
| Admin activates tier | REGISTERED | TIER_SELECTED |
| Admin activates tier (questionnaire data present) | QUESTIONNAIRE_COMPLETE | TIER_SELECTED |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User arrives from wizard with questionnaire data and registers with an already-registered phone/email | Login OTP is sent. After login, system detects new questionnaire data in sessionStorage. Prompt: "We found a new mortgage calculation. Do you want to save it to your existing application or start a new one?" |
| User registers, accepts terms, then closes browser before selecting tier | On next login (OTP), user is taken directly to the tier selection screen (terms already accepted; status = REGISTERED). |
| User selects Tier 2, admin activates Tier 1 instead (e.g., payment issue) | Admin activates Tier 1 with a note. Client receives Tier 1 activation notification. Client can contact support to upgrade. |
| Admin assigns an advisor but the advisor has not yet set up their account | Assignment is recorded; advisor receives their invite OTP. Once they log in, they see the client in their dashboard. |
| User tries to complete registration flow from a different device after completing wizard on the first device | Questionnaire data is in sessionStorage on the first device only. If the second-device registration completes without questionnaire data, the personal area starts empty. Wizard data from device 1 is lost if never synced to backend. |
| OTP resend limit reached (3 resends) | User sees: "You've requested too many codes. Please wait 10 minutes before trying again." No further OTPs are sent for 10 minutes. |
| User is on Tier 3 and their assigned advisor is deactivated before the advisor sets up calendar availability | Admin is notified; admin reassigns immediately. Client receives notification that a new advisor has been assigned. |
| User registers with an email that has a typo | They receive an OTP to the wrong address and cannot verify. On re-attempt, they can change the email/phone before resending. The pending registration record is updated. |
