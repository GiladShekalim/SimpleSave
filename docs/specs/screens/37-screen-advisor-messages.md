# Screen 37 — Advisor Messages Tab

## Purpose

Provide a real-time chat-style communication channel between the client and their assigned advisor. Available to Tier 2 and Tier 3 clients. Tier 1 clients see a read-only locked state with an upgrade prompt.

---

## Who Sees This / Access

- **Tier 2 and Tier 3:** Full send/receive access
- **Tier 1:** Tab accessible, but write access locked — read-only with upgrade prompt
- **No tier:** Tab locked entirely with upgrade prompt
- **Advisors:** Full access via advisor dashboard client detail view (same thread, same interface)

---

## Layout Overview

Chat-style layout split into two vertical areas:

- **Message thread area (main body):** Scrollable, newest messages at the bottom. Takes up most of the available height.
- **Input area (sticky bottom):** Text input, attach file button, stage tag dropdown, and send button. Always visible.

**Thread header (above message area):**
- Client name + advisor name / "Connecting you with your advisor" if not yet assigned
- Application ID for reference

---

## Sections / Components

### Message Thread Area

**Date separator:**

Between messages from different calendar days, a centered horizontal rule with the date label:
- "היום" (Today) for the current date
- "אמש" (Yesterday) for the previous day
- Full date "יום ראשון, 15 ביוני 2026" for older dates

**Message bubble — client message:**

| Element | Details |
|---|---|
| Alignment | Right-aligned (Hebrew RTL convention) |
| Sender | "אני" (Me) label, no avatar |
| Message body | Text, Hebrew RTL, line breaks preserved |
| Timestamp | Small grey text, format "HH:mm" |
| Stage tag | IF the client tagged the message with a stage: small grey label below message body: "בנושא: [stage name]" |
| Attachment | IF attached: file icon + file name as clickable link → opens in new browser tab |

**Message bubble — advisor message:**

| Element | Details |
|---|---|
| Alignment | Left-aligned |
| Sender avatar | Circular photo (32×32px) OR initials avatar |
| Sender name | Advisor's full name |
| Message body | Text, Hebrew RTL |
| Timestamp | Small grey text, format "HH:mm" |
| Read receipt | Small "נקרא" / "Read" indicator below message (shown to advisor when client has read the message) |
| Attachment | IF attached: file icon + file name as link |

**Scroll behavior:**
- On tab open: auto-scroll to newest message
- "חזרה לתחתית" / "Back to bottom" floating button appears when user scrolls up more than 3 screens — disappears when at bottom

**Unread messages:**
- When client opens the tab with unread advisor messages: a divider line labeled "הודעות חדשות ↓" / "New messages ↓" appears above the first unread message
- All unread messages marked as read on view (read receipt sent to advisor)

---

### Input Area

Sticky at the bottom of the content area.

| Element | Details |
|---|---|
| Text input | Multi-line textarea, Hebrew RTL, placeholder: "כתוב הודעה..." / "Write a message..." Max 2000 characters. Character counter shown when > 1800 chars. Auto-grow up to 6 lines before scrolling internally. |
| Attach file button | Paperclip icon button. On click: opens OS file picker. Any file type, max 5MB per attachment. Preview shown inline before send: file name + X button to remove. |
| Stage tag dropdown | Optional. Label: "הודעה זו בנושא..." / "This message relates to..." Options: נתונים אישיים / Mortgage Details / Documents / Principal Approval / Other. Default: no selection. |
| Send button | "שלח" / Send. Enabled when: text input is non-empty OR an attachment is selected. Keyboard shortcut: Ctrl+Enter (or Cmd+Enter on Mac) also sends. |

**Attachment validation (client-side before upload):**

- File size > 5MB: error toast "הקובץ גדול מדי — מקסימום 5MB"
- Otherwise: attachment staged for send; shown as preview with file name + X remove button

---

### Thread Organization

- Single chronological thread per application — all messages in one list
- No topic-based sub-threads in v1
- Infinite scroll / pagination (load earlier messages in batches of 30 when scrolling up)

---

### Unread Badge

The Messages tab label in the sidebar/navigation shows a red badge with unread message count (from advisor to client).

Badge updates:
- Decrements as messages are read on screen
- Resets to 0 when client has scrolled through all new messages
- Updates on real-time push or polling (60-second poll fallback)

---

## Buttons

| Button | Location | Action | Conditions |
|---|---|---|---|
| שלח / Send | Input area | Sends message + attachment | Enabled when text or attachment present |
| Attach file (paperclip) | Input area | Opens file picker | Always enabled |
| Remove attachment (X) | Attachment preview | Removes staged attachment | Shown when attachment is staged |
| Back to bottom (floating) | Thread area | Scrolls to newest message | Shown when scrolled up > 3 screens |
| "שדרג עכשיו" / Upgrade Now | Locked state (Tier 1) | Navigates to tier selection | Shown in Tier 1 locked state |

---

## States

### No Tier — Locked

Full content area replaced by padlock overlay.

| Element | Content |
|---|---|
| Padlock icon | Large |
| Message | "בחרו בתכנית שירות כדי לגשת לתקשורת עם יועץ." / "Select a service plan to access advisor messaging." |
| CTA | "בחר תכנית" / Choose Plan → 46-screen-tier-selection-pricing.md |

---

### Tier 1 — Read-Only Locked

Tab is accessible. Thread is visible (read-only — cannot send).

| Element | Content |
|---|---|
| Input area | Replaced by amber upgrade banner: "שדרגו לרמת שירות 2 כדי לשלוח הודעות ליועץ שלכם." / "Upgrade to Tier 2 to send messages to your advisor." |
| "שדרג" button | Navigates to tier selection |
| Message thread | Visible in read-only mode (no send ability) |

---

### Tier 2 or 3 — No Messages Yet

Empty state in thread area:

| Element | Content |
|---|---|
| Illustration | Chat bubble illustration |
| Message | "אין הודעות עדיין. שאלו את היועץ שלכם כל שאלה." / "No messages yet. Ask your advisor anything." |
| Input area | Fully enabled |

---

### Tier 2 or 3 — Advisor Not Yet Assigned

Advisor has not been assigned by admin after tier selection.

| Element | Content |
|---|---|
| Thread header | "יועץ יוקצה לך בקרוב" / "Your advisor will be assigned soon" |
| Informational banner | "תוכלו לכתוב הודעות כבר עכשיו — הן ישלחו כאשר יועץ יוקצה אליכם." / "You can start writing messages now — they will be sent when your advisor is assigned." |
| Input area | Fully enabled (messages stored and sent upon assignment) |

---

### Sending in progress

- Send button shows spinner, disabled during upload/send
- Message appears immediately in thread as optimistic update with "שולח..." / "Sending..." state
- On server confirmation: timestamp applied, optimistic state removed
- On failure: error toast "ההודעה לא נשלחה. נסה שוב." + retry icon on the failed message bubble

---

## Advisor Permissions (in advisor dashboard)

The advisor sees the same thread view with these additions:
- Can send messages (same input area)
- Can see stage tags on client messages
- Unread messages from clients show a red badge on the client's row in the advisor client list
- No ability to delete messages (immutable audit trail requirement)

---

## Navigation

**Incoming paths:**
- 30-screen-personal-area-hub.md → Messages tab click

**Outgoing paths:**
- "Upgrade" CTA (Tier 1 or no tier) → 46-screen-tier-selection-pricing.md
- Attachment links → open in new browser tab
- No tab-level outbound navigation
