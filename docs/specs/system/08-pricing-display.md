# 08 — Pricing Display

## Purpose

Define the three service tiers, their feature sets, the paywall logic, access gate enforcement per tier, admin tier management, and the tier selection screen UX for v1. No payment processing occurs in v1 — tier assignment is done manually by Admin after off-system payment.

## Overview

SimpleSave offers three service tiers, each unlocking a progressively fuller feature set. Prices are admin-configurable. The tier selection screen presents a comparison table with prices. Clicking "Select" on any tier surfaces a call-to-action to contact SimpleSave for purchase. The actual tier is then enabled by Admin. Access to personal area tabs is gated by the client's current tier assignment.

---

## Interface / Contract

### Tier Lookup Endpoint

**GET** `/pricing/tiers`

No authentication required (public endpoint for the tier selection screen).

**Response:**
```json
{
  "tiers": [
    {
      "tier_number": 1,
      "code": "mix_principal_approval",
      "name_he": "מיקס + אישור עקרוני",
      "price_ils": 2990,
      "price_display_he": "₪2,990",
      "is_recommended": false,
      "features": [
        { "label_he": "הצגת שעוני משכנתא", "included": true },
        ...
      ]
    },
    ...
  ],
  "contact_cta_he": "לרכישה, צרו קשר: 03-XXX-XXXX",
  "contact_url": "https://wa.me/972..."
}
```

### Admin: Set Client Tier

**POST** `/admin/clients/{user_id}/tier`

**Authorization:** Admin only.

**Body:**
```json
{
  "tier_number": 2,
  "reason": "Payment received via bank transfer"
}
```

**Response 200:**
```json
{
  "user_id": "uuid",
  "previous_tier": 1,
  "new_tier": 2,
  "set_at": "ISO-8601"
}
```

---

## Service Tier Definitions

### Tier 1 — Mix + Principal Approval (מיקס + אישור עקרוני)

**Target client:** Self-directed buyer who wants system tools and principal approval assistance but does not need an advisor.

**Included features:**

- All 5 mortgage clock displays (mix options) with full detail drill-down
- Personal details form (all fields)
- Document upload and management (all document types)
- Authorization letter generation, download, and upload-signed flow
- Principal approval request tracking (client can see which banks were submitted and responses received)
- Eligibility calculator result display
- In-app messaging system: read-only prompt to upgrade for advisor replies (client can send messages but receives no advisor response)
- Monthly mortgage update notifications (once ACTIVE_MORTGAGE)

**Not included:**

- Advisor assignment
- Advisor message responses
- Bank bid management (advisor enters bank offers)
- Calendar booking
- Bank selection guidance

**Advisor involvement:** None by default. If a client messages and an advisor decides to respond, that is at the advisor's discretion but is not a committed service offering at Tier 1.

---

### Tier 2 — Online Guidance (ליווי אונליין)

**Target client:** Buyer who wants professional guidance through messages without in-person meetings.

**Includes everything in Tier 1, PLUS:**

- Dedicated advisor assigned to the application
- Two-way in-app messaging with assigned advisor
- Advisor manages bank submission process (enters bank responses into system)
- Advisor guides bank selection: enters competing offers, recommends bank
- Advisor notified on all application events (documents, approvals)
- Bank bid management tab fully functional
- Credit issue escalation handling

**Not included:**

- Calendar booking for scheduled meetings
- In-person or video call advisor sessions (offered ad-hoc at advisor discretion but not committed)

---

### Tier 3 — Personal Advisor (יועץ אישי)

**Target client:** Buyer who wants full hands-on advisory service.

**Includes everything in Tier 2, PLUS:**

- Named dedicated advisor (same advisor throughout the process)
- Calendar booking tab: client can book meetings with advisor (initial meeting + ongoing)
- Meeting types: in-person at SimpleSave office, remote (video call link provided)
- Advisor proactively initiates contact at key lifecycle milestones
- Priority response SLA for messages (advisor-side commitment, not system-enforced in v1)

---

## Tier Comparison Display Table

The tier selection screen renders a feature comparison table. Feature rows are stored in `SystemParameter` or a `tier_features` table, editable by Admin.

| Feature | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| שעוני משכנתא | ✓ | ✓ | ✓ |
| טופס פרטים אישיים | ✓ | ✓ | ✓ |
| העלאת מסמכים | ✓ | ✓ | ✓ |
| כתבי הסמכה | ✓ | ✓ | ✓ |
| מעקב אישור עקרוני | ✓ | ✓ | ✓ |
| הודעות ליועץ (קריאה בלבד) | ✓ | — | — |
| הודעות דו-כיווניות עם יועץ | — | ✓ | ✓ |
| יועץ מוקצה | — | ✓ | ✓ |
| ניהול הצעות בנקים | — | ✓ | ✓ |
| ייעוץ בחירת בנק | — | ✓ | ✓ |
| הזמנת פגישות (לוח שנה) | — | — | ✓ |
| פגישה פנים אל פנים / זום | — | — | ✓ |
| יועץ אישי קבוע | — | — | ✓ |

The recommended tier is flagged in the `tiers` response (`is_recommended: true`) and displayed with a visual highlight (e.g., border, "מומלץ" badge). Admin configures which tier is recommended via SystemParameter.

---

## Pricing Configuration

Tier prices are stored in the `system_parameters` table:

| Parameter Key | Example Value | Description |
|---|---|---|
| `tier_1_price_ils` | `2990` | Tier 1 price in NIS |
| `tier_2_price_ils` | `5990` | Tier 2 price in NIS |
| `tier_3_price_ils` | `9990` | Tier 3 price in NIS |
| `recommended_tier` | `2` | Which tier gets the "מומלץ" badge |
| `contact_cta_phone` | `03-XXX-XXXX` | Phone shown on CTA |
| `contact_cta_whatsapp_url` | `https://wa.me/972...` | WhatsApp link for CTA |

Admin can edit all of these values. Changes take effect immediately on the next page load (no caching of pricing data for more than 5 minutes).

---

## Paywall Logic (v1)

### What happens when a client clicks "בחר תכנית" (Select Plan):

1. A modal or screen is shown:
   > "לרכישת התכנית, אנא צרו איתנו קשר:"
   > [Phone number] | [WhatsApp button] | [Email link]
   > "לאחר אישור התשלום, הגישה תפעל תוך שעות ספורות."

2. No payment form, no credit card processing, no Stripe/PayPal integration in v1.

3. Actual tier assignment is done manually by Admin in the client management screen.

### Admin Tier Assignment Flow:

1. Admin receives payment confirmation off-system (bank transfer, check, etc.).
2. Admin navigates to: Client Management → Client Record → "עדכון רמת שירות".
3. Admin selects the new tier from a dropdown and adds an optional reason note.
4. System sets `applications.tier = new_tier_number`, logs to AuditLog.
5. Client sees updated access on next page load (session re-check of tier).

---

## Access Gate Rules

The server enforces tier-based access on every API call to gated resources. The client application tier is stored in `applications.tier` (integer 0–3, where 0 = no tier selected).

### Tier 0 (No Tier Selected)

| Feature | Access |
|---|---|
| Clocks display tab | Full access |
| Personal details form | Full access |
| Documents tab | Locked — show lock icon + "נדרשת רכישת תכנית" |
| Messaging tab | Locked |
| Bank approvals tab | Locked |
| Calendar tab | Locked |
| All other tabs | Locked |

**Why clocks + personal details are unlocked at Tier 0:**
Clients need to see their mortgage options and complete basic details to understand what they're purchasing. This creates trust before the paywall.

### Tier 1

| Feature | Access |
|---|---|
| Clocks display + drill-down | Full access |
| Personal details form | Full access |
| Documents tab | Full access (upload, view status) |
| Authorization letters | Full access (download, upload signed) |
| Bank approvals tracking | Read-only view (see submitted banks, see approval responses) |
| Messaging tab | Visible but restricted: client can compose and send, receives auto-reply "ניתן לשוחח עם יועץ ב-Tier 2 ומעלה" |
| Bank bid management | Locked |
| Calendar tab | Locked |

### Tier 2

| Feature | Access |
|---|---|
| All Tier 1 features | Full access |
| Messaging tab | Full two-way messaging with advisor |
| Bank bid management | Full access (view advisor-entered bank offers, comparison) |
| Bank selection | Advisor-guided — client sees recommendation |
| Calendar tab | Locked |

### Tier 3

| Feature | Access |
|---|---|
| All Tier 2 features | Full access |
| Calendar tab | Full access — book meetings, view scheduled meetings, cancel/reschedule |

### API Enforcement

Server middleware reads `applications.tier` from the database on every request to a gated endpoint. It does not rely on the JWT claim for tier (tiers change after token issuance). If the client's tier does not meet the endpoint's minimum tier requirement, return:

```json
{
  "error": "TIER_INSUFFICIENT",
  "required_tier": 2,
  "current_tier": 1,
  "upgrade_cta_he": "שדרגו לתכנית ליווי אונליין לגישה מלאה"
}
```

HTTP status: 403 Forbidden.

---

## Tier Upgrade Path

- Client can upgrade to a higher tier at any time (admin enables after payment).
- All data already entered (borrower details, uploaded documents, messages) is fully preserved.
- On tier upgrade, the client's access is immediately expanded (next API call reflects new tier).
- Downgrade is not supported in v1. If a client needs to change tiers downward, Admin handles it manually and notes the reason.

---

## Locking UI Behavior

When a tab or feature is locked due to insufficient tier, the UI shows:

1. A lock icon (🔒) over the tab in the sidebar.
2. If the client navigates to the locked URL directly: show a full-screen gate card with:
   - Feature name
   - Brief description of what is unlocked at the required tier
   - "שדרג עכשיו" button that opens the contact CTA modal
3. Locked tabs are visible in the sidebar (not hidden) — they are grayed out with the lock icon. This creates awareness and encourages upgrade.

---

## Edge Cases

- **Advisor accesses a client at a lower tier:** Advisors can always access all features of their assigned clients regardless of tier. The tier gate applies only to client users.
- **Admin accesses any feature:** Admin bypass — no tier restriction for Admin users.
- **Client at Tier 0 who completed questionnaire but did not select tier:** Still gets clocks displayed (clocks are tier-0 unlocked). Questionnaire completion does not auto-assign a tier.
- **Client upgrades tier mid-application:** Access expands immediately. No re-submission of any data required. Advisor is assigned (for Tier 2/3 upgrades) by Admin within the same or next working day (manual process).
- **Two applications for the same client:** v1 assumption: one active application per client. If a second application exists, tier applies per-application. This edge case is noted for future spec.
- **Price change while client is on tier selection screen:** Client will see stale price until page refresh. No real-time price push in v1. The CTA (contact us) is the purchase path, so a stale display price has no transactional consequence.

---

## Dependencies

- `applications` table (tier field)
- `system_parameters` table (pricing, recommended tier, CTA config)
- `tier_features` table (feature checklist per tier, admin-editable)
- `users` table (role — admin/advisor bypass tier gate)
- AuditLog (`TIER_ASSIGNED` event with admin_user_id, client_user_id, old_tier, new_tier)
- Notification system (Trigger 2 — Advisor Assigned, fired when admin assigns advisor on Tier 2/3 activation)
