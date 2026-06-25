# Screen 26 — Home Page

## Purpose

The Home page is the public-facing entry point for all visitors. It communicates SimpleSave's value proposition, directs new users to start the mortgage questionnaire, provides login access to existing users, and adapts its navigation and CTAs based on the user's logged-in state and role.

---

## Access / Who Sees This

- Anyone: unauthenticated visitors, returning clients, advisors, admins.
- Route: `/` (root)
- No authentication required to view the page.
- Content adapts based on auth state (see States section).

---

## Layout Overview

```
[Navigation Bar — full width, sticky top]
[Hero Section — full width, centered]
[About Section — full width, two columns on desktop, stacked on mobile]
[Footer — full width]
```

- Direction: RTL (right-to-left), Hebrew text throughout.
- Responsive: mobile-first. Single-column on mobile, max 1200px container on desktop.
- Font: defined by design system (see design-consultation spec).
- All visible text is Hebrew. English translations noted in parentheses for developer reference only.

---

## Components / Sections

### 1. Navigation Bar

Sticky to top. Visible on all pages of the site when user is not inside a role-specific dashboard (advisor dashboard, admin dashboard, personal area have their own nav).

| Element | Type | Required | Behavior / Conditional Visibility |
|---|---|---|---|
| **לוגו SimpleSave** (SimpleSave Logo) | Image + link | Yes | Always visible. Links to `/`. |
| **אודות** (About) | Text link | Yes | Always visible. Links to `/about`. |
| **שאלה / צור קשר** (Contact / Ask a Question) | Button (secondary) | Yes | Always visible. On click: opens WhatsApp link OR contact form modal, based on admin-configured destination. |
| **אזור אישי** (Personal Area) | Button (primary) | Yes | Always visible top-right. Behavior depends on auth state — see below. |

**"Personal Area" button behavior:**
- Not logged in → click opens OTP Login Modal (inline modal, not a new page).
- Logged in as Client → navigates to `/personal-area`.
- Logged in as Advisor → navigates to `/advisor`. Button label changes to "לוח יועץ" (Advisor Dashboard).
- Logged in as Admin → navigates to `/admin`. Button label changes to "לוח מנהל" (Admin Dashboard).

---

### 2. OTP Login Modal

Triggered when unauthenticated user clicks "Personal Area". This is a modal overlay, not a separate screen.

| Field | Type | Required | Validation | Conditional Visibility |
|---|---|---|---|---|
| **טלפון או אימייל** (Phone or Email) | Text input | Yes | Phone: Israeli format (05X-XXXXXXX or +972 5X...). Email: standard email format. Must match existing account. | Always shown in modal |
| **קוד אימות** (OTP Code) | 6-digit number input | Yes (after OTP sent) | Exactly 6 digits. Valid for 10 minutes. Max 5 attempts (lockout on 5th). | Shown after "Send OTP" clicked |

| Button | Action | Disabled State |
|---|---|---|
| **שלח קוד** (Send OTP) | Sends OTP to phone/email. Changes modal to show OTP input. | Disabled if phone/email field is empty or invalid format. |
| **אמת** (Verify) | Validates OTP. On success: logs in user, closes modal, navigates to role-appropriate destination. | Disabled if OTP input is empty or not 6 digits. |
| **שלח שוב** (Resend OTP) | Resends OTP. Cooldown: 60 seconds between resend attempts. | Disabled during cooldown. Shows countdown: "שלח שוב בעוד Xs". |
| **סגור** (Close) | Closes modal without logging in. | Never disabled. |

---

### 3. Hero Section

Full-width section, visually prominent. Large background image or gradient. Centered content.

| Element | Type | Required | Behavior / Conditional Visibility |
|---|---|---|---|
| **SimpleSave — פלטפורמת המשכנתא החכמה** (Headline) | H1 text | Yes | Always visible. |
| Sub-headline (1–2 sentences, Hebrew value proposition) | Paragraph text | Yes | Always visible. Example: "נגישות, שקיפות, ותמיכה מקצועית — כל הכלים שאתה צריך לקבל את המשכנתא הנכונה." |
| **משכנתא חדשה** (New Mortgage — Primary CTA) | Button (large, primary) | Yes | Always visible to unauthenticated users and logged-in clients. Hidden for logged-in advisors and admins (replaced by their dashboard button). On click: navigate to `/questionnaire`. |
| **לוח יועץ** (Advisor Dashboard) | Button (large, primary) | Conditional | Visible ONLY when logged in as Advisor. On click: navigate to `/advisor`. Replaces New Mortgage CTA. |
| **לוח מנהל** (Admin Dashboard) | Button (large, primary) | Conditional | Visible ONLY when logged in as Admin. On click: navigate to `/admin`. Replaces New Mortgage CTA. |
| **אזור אישי** (Personal Area — secondary CTA) | Button (secondary) | Conditional | Shown when logged in as Client. Supplements (does not replace) the New Mortgage CTA. On click: navigate to `/personal-area`. |

Note: "Mortgage Insurance" and "Refinancing" buttons are explicitly OUT OF SCOPE for v1 and must NOT appear.

---

### 4. About Section

Below hero. Communicates what SimpleSave is and how it works.

#### 4a. What is SimpleSave

| Element | Type | Required | Details |
|---|---|---|---|
| Section heading (Hebrew) | H2 | Yes | e.g., "מה זה SimpleSave?" |
| Bullet list (3–4 items, Hebrew) | Unordered list | Yes | Examples: "כלי לחישוב והמחשת תמהילי משכנתא", "ייעוץ מקצועי מותאם אישית", "ליווי מלא מהשאלון ועד החתימה", "מידע שקוף ובלתי תלוי על הצעות הבנקים" |

#### 4b. How It Works — 3 Steps

| Step | Icon | Title (Hebrew) | Description (Hebrew) |
|---|---|---|---|
| 1 | (icon) | הזן את הנתונים שלך | מלא שאלון קצר על הנכס וההכנסות שלך |
| 2 | (icon) | ראה את האפשרויות שלך | קבל 5 תמהילי משכנתא מחושבים עבורך |
| 3 | (icon) | קבל ליווי | בחר את רמת הסיוע המתאימה לך ועבוד עם המומחים שלנו |

---

### 5. Footer

| Element | Type | Details |
|---|---|---|
| Contact information | Text | Phone number, email address (admin-configured) |
| Legal disclaimer (Hebrew) | Paragraph text | Brief disclaimer about SimpleSave's advisory nature and regulatory compliance |
| Privacy Policy link | Link | Navigate to `/privacy-policy` |
| Copyright line | Text | "© [Year] SimpleSave. כל הזכויות שמורות." |

---

## Buttons

| Button | Location | Action on Click | Disabled States |
|---|---|---|---|
| אזור אישי (nav) | Navigation bar | If logged out: open OTP Login Modal. If logged in: navigate to role dashboard. | Never disabled. |
| שאלה / צור קשר | Navigation bar | Open WhatsApp link (new tab) or contact form modal per admin config. | Never disabled. |
| משכנתא חדשה | Hero section | Navigate to `/questionnaire`. | Not rendered for advisor/admin roles. |
| לוח יועץ | Hero section | Navigate to `/advisor`. | Only rendered for advisor role. |
| לוח מנהל | Hero section | Navigate to `/admin`. | Only rendered for admin role. |
| שלח קוד (OTP modal) | OTP Modal | Send OTP to entered phone/email. | Disabled if field empty or invalid format. |
| אמת (OTP modal) | OTP Modal | Verify OTP code and log in. | Disabled if OTP field empty or not 6 digits. |
| שלח שוב (OTP modal) | OTP Modal | Resend OTP code. | Disabled during 60-second cooldown. |

---

## Empty States

- Not applicable. The home page has no data-driven empty states — all sections contain static content.

---

## Error States

| Error | Display | Location |
|---|---|---|
| OTP send failure (server error) | "שגיאה בשליחת הקוד. אנא נסה שוב." | Below phone/email field in OTP modal |
| OTP invalid (wrong code) | "הקוד שהוזן שגוי. נסה שוב." | Below OTP input field in OTP modal. Attempt counter shown: "X מתוך 5 ניסיונות." |
| OTP expired | "פג תוקף הקוד. לחץ על 'שלח שוב' לקבלת קוד חדש." | Below OTP input in modal. Verify button disabled. |
| Account locked (5 failed attempts) | "החשבון נעול לזמן מה. אנא נסה שוב מאוחר יותר או פנה לתמיכה." | OTP modal. All fields disabled. | 
| Phone/email not found | "המספר/כתובת האימייל אינם מזוהים. האם ברצונך להירשם?" with link to start questionnaire. | Below phone/email field in OTP modal |
| Contact form submit failure | "שגיאה בשליחת ההודעה. אנא נסה שוב." | Inside contact form modal |
| WhatsApp link unavailable (misconfigured by admin) | "השירות אינו זמין כרגע. אנא פנה אלינו בדוא\"ל: [email]" | Contact button area |

---

## Navigation

| Destination | From | Trigger |
|---|---|---|
| `/questionnaire` | Hero "New Mortgage" CTA | Button click |
| `/personal-area` | Nav "Personal Area" (logged-in client) or Hero secondary CTA | Button click |
| `/advisor` | Nav (logged-in advisor) or Hero Advisor Dashboard CTA | Button click |
| `/admin` | Nav (logged-in admin) or Hero Admin Dashboard CTA | Button click |
| `/about` | Nav "About" link | Link click |
| `/privacy-policy` | Footer | Link click |
| OTP Modal | Nav "Personal Area" (logged-out) | Button click |
| Back to Home | From any page | Logo click in nav |
