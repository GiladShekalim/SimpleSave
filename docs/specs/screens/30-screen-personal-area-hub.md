# Screen 30 — Personal Area Hub

## Purpose

The main authenticated container for all client-side activity after login. Hosts 7 tabbed sections covering the full lifecycle from personal details through post-mortgage management. Acts as a persistent shell — tabs load content in the main body area without full page navigations.

---

## Who Sees This / Access

- Authenticated clients (any tier, including no tier)
- Advisors can preview a client's personal area hub from the advisor dashboard (read-only mode, with an "Advisor View" banner)

---

## Layout Overview

**Desktop (≥1024px):** Vertical sidebar on the left (240px wide) containing tab navigation. Main content area on the right fills remaining width.

**Tablet (768–1023px):** Horizontal tab bar at top, scrollable horizontally if tabs overflow.

**Mobile (<768px):** Bottom navigation bar showing icon + short label for each tab.

**Hub chrome (always visible):**
- Site logo / home link (top-left)
- Header bar (see Header section below)
- Active tab content in main area

---

## Sections / Components

### Header Section

Always rendered at the top of the personal area, above the tab content.

| Element | Details |
|---|---|
| Client name | Full name (First + Last) from personal details. Fallback: phone/email identifier if name not yet entered. |
| Application status badge | Hebrew status label reflecting current lifecycle stage (see Application Lifecycle table below) |
| Advisor name + photo | Shown only if Tier 2 or Tier 3 AND an advisor has been assigned. Photo is a circular avatar (48×48px). If no photo: initials avatar. |
| Application ID | Small grey text, format: "מספר בקשה: #00001" — for client reference and support |
| Notification bell icon | Top-right of header. Badge shows unread notification count (red dot). Click → opens notification list panel (slide-in from right, overlay) |

**Application lifecycle status labels (Hebrew):**

| Status Key | Hebrew Label |
|---|---|
| QUESTIONNAIRE_IN_PROGRESS | "שאלון בתהליך" |
| QUESTIONNAIRE_COMPLETE | "שאלון הושלם" |
| REGISTERED | "נרשמת בהצלחה" |
| TIER_SELECTED | "תכנית נבחרה" |
| PERSONAL_DETAILS_COMPLETE | "פרטים אישיים הושלמו" |
| AUTHORIZATION_SIGNED | "ייפויי כוח נחתמו" |
| DOCUMENTS_SUBMITTED | "מסמכים הוגשו" |
| DOCUMENTS_APPROVED | "מסמכים אושרו" |
| PRINCIPAL_APPROVAL_REQUESTED | "אישור עקרוני נשלח לבנקים" |
| PRINCIPAL_APPROVAL_RECEIVED | "אישור עקרוני התקבל" |
| BANK_SELECTED | "בנק נבחר" |
| MORTGAGE_SIGNED | "חוזה משכנתא נחתם" |
| COLLATERALS_PENDING | "בטחונות בהמתנה" |
| COLLATERALS_COMPLETE | "בטחונות הושלמו" |
| ACTIVE_MORTGAGE | "משכנתא פעילה" |

---

### Tab Navigation

7 tabs, always visible in sidebar/tab bar. Each tab has:
- Icon (SVG)
- Hebrew label
- Lock indicator (padlock icon overlay on icon) if tab is locked
- Unread badge (for Messages tab only, shows unread count)

**Tab definitions:**

| # | Hebrew Label | English Label | Screen Spec |
|---|---|---|---|
| 1 | נתונים אישיים | Personal Details | 31-screen-personal-details.md |
| 2 | נתוני משכנתא | Mortgage Details | 32-screen-mortgage-details.md |
| 3 | מסמכים | Documents | 33-screen-documents.md |
| 4 | אישור עקרוני | Principal Approval | 34-screen-principal-approval.md |
| 5 | בטחונות | Collaterals | 35-screen-collaterals.md |
| 6 | הודעות | Messages | 37-screen-advisor-messages.md |
| 7 | המשכנתא שלי | My Mortgage | 36-screen-post-mortgage-dashboard.md |

---

### Tab Lock State Matrix

| Tab | No Tier | Tier 1 | Tier 2 | Tier 3 | Additional Lifecycle Condition |
|---|---|---|---|---|---|
| Personal Details | Full access | Full access | Full access | Full access | Always unlocked |
| Mortgage Details | Full access | Full access | Full access | Full access | Always unlocked |
| Documents | Locked | Full access | Full access | Full access | Unlocks only after TIER_SELECTED |
| Principal Approval | Locked | Full access | Full access | Full access | Unlocks only after DOCUMENTS_APPROVED |
| Collaterals | Locked | Locked | Locked | Locked | Unlocks only after MORTGAGE_SIGNED |
| Messages | Locked | Read-only + upgrade prompt | Full access | Full access | Tier 2+ required |
| My Mortgage | Locked | Locked | Locked | Locked | Unlocks only after ACTIVE_MORTGAGE |

**Lock overlay behavior:**

When a locked tab is clicked, the tab becomes active but the main content area shows a lock overlay instead of the tab's content.

Lock overlay layout (centered in content area):
- Padlock icon (large, 64px)
- Lock reason message (one of two variants):
  - **Tier lock:** "שדרגו את התכנית שלכם כדי לגשת לתכונה זו" / "Upgrade your plan to access this feature" + "שדרג עכשיו" (Upgrade Now) button → navigates to 46-screen-tier-selection-pricing.md
  - **Lifecycle lock:** "השלימו את השלב הקודם כדי לפתוח תכונה זו" / "Complete previous steps to unlock this feature" + "חזרה ל[שם שלב]" (Return to [step name]) button linking to the appropriate tab

**Messages tab — Tier 1 special state:**
- Tab is accessible (not hard-locked), but content area shows: read-only view of any existing messages (client cannot send) + yellow banner: "כדי לשלוח הודעות ליועץ, שדרגו לרמת שירות 2 או 3" / "Upgrade to Tier 2 or 3 to message your advisor" + "שדרג" button.

---

### Alert Banners

Shown below the header, above tab content. Only one banner visible at a time (priority order):

| Priority | Trigger Condition | Banner Text | Action |
|---|---|---|---|
| 1 (highest) | Authorization letters generated and not yet uploaded | "נדרשת פעולה: יש לחתום ולהעלות ייפויי כוח" | Link → Documents tab, scrolls to auth letters section |
| 2 | A document has been rejected by advisor | "מסמך נדחה: [document name]. לחצו לתיקון." | Link → Documents tab, scrolls to rejected document row |
| 3 | All required documents approved | "כל המסמכים אושרו! ניתן להמשיך לאישור עקרוני." | Link → Principal Approval tab |
| 4 | Tier selected but personal details incomplete | "השלימו את הפרטים האישיים שלכם כדי להמשיך." | Link → Personal Details tab |

Banners are dismissible (X button on right). Dismissed state stored in session (re-appears on next login if condition still true).

---

### My Applications Section

Shown if the client has more than one application (edge case in v1 but architecture must support it).

Rendered as a collapsible section at the top of the sidebar (above tab list) or as a dropdown in the header.

**Application card (per application):**
- Application ID
- Property address (if entered) or "כתובת לא הוזנה" placeholder
- Application status badge
- Created date
- "View" button → loads that application's data into all tabs

**"Start New Application" button:**
- Below application list
- Confirmation dialog: "Starting a new application will not affect your current one. Continue?"
- On confirm: navigates to questionnaire wizard (first step)

---

## Buttons

| Button | Action | Conditions |
|---|---|---|
| Tab items (1–7) | Switch active tab | Always clickable; if locked, shows lock overlay instead of content |
| Notification bell | Opens notification panel | Always enabled |
| "Upgrade Now" (on lock overlay) | Navigates to 46-screen-tier-selection-pricing.md | Shown only when lock reason is tier |
| "Start New Application" | Opens questionnaire wizard | Always shown (with confirmation dialog) |
| Alert banner action links | Navigate to relevant tab | Shown when banner is visible |
| "Advisor View" banner close | Collapses advisor view mode indicator | Only in advisor preview mode |

---

## States

### First Login (no data entered)

After registration, client lands here for the first time. The Personal Details tab is auto-selected. A prominent onboarding prompt displays at top of content area:

"ברוך הבא לאזור האישי שלך! התחל בהשלמת הפרטים האישיים שלך."
/ "Welcome to your personal area! Start by completing your personal details."

Progress stepper (horizontal): Personal Details → Mortgage Details → Documents → Principal Approval → [etc.] — current step highlighted.

### Loading

Tab content loads asynchronously. While loading:
- Main content area shows skeleton shimmer placeholders
- Tab label shows a small spinner

### Advisor not yet assigned (Tier 2/3)

Header shows advisor slot as: "יועץ יוקצה בקרוב" / "Advisor will be assigned soon" (greyed out avatar with clock icon).

### Error

If tab content fails to load: error card in main content area with "שגיאה בטעינת הנתונים. נסה שוב." and Retry button.

---

## Navigation

**Incoming paths:**
- 29-screen-registration.md → after registration complete
- 46-screen-tier-selection-pricing.md → after tier selected/skipped
- 28-screen-clocks-options.md → "Select Mix" (registered with tier)
- Direct URL `/app` with valid session cookie

**Outgoing paths:**
- Each tab → respective screen (31 through 37)
- "Upgrade" buttons → 46-screen-tier-selection-pricing.md
- "Start New Application" → questionnaire wizard
- Logo → home / landing page
- Logout button (in header dropdown) → clears session → home page
