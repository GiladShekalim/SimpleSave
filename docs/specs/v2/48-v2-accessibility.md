# 48 — V2: WCAG 2.1 AA Accessibility

> **Status: DEFERRED TO V2**  
> V1 delivers only baseline functional accessibility. Full WCAG 2.1 AA compliance is a v2 deliverable. No implementation detail is required before v2 scoping begins.

---

## Purpose
Ensure the SimpleSave web application meets WCAG 2.1 Level AA standards, making it fully accessible to users with visual, motor, cognitive, and auditory disabilities. This is a regulatory commitment and a commercial requirement (Israeli accessibility law — נגישות לאנשים עם מוגבלות באתרי אינטרנט).

## Scope
All client-facing, advisor-facing, and admin-facing screens. Covers the entire application after v1 screens are complete.

---

## Deferred Items

### ARIA Semantics
- All interactive elements must have descriptive `aria-label` or `aria-labelledby` attributes
- Dynamic content regions (loading states, modals, alerts) must use `aria-live` regions with appropriate politeness levels
- Icon-only buttons must have visually hidden text or `aria-label`
- Tab panels must use `role="tabpanel"` with associated `aria-controls`

### Keyboard Navigation
- All interactive elements (buttons, inputs, links, dropdowns, modals) must be reachable via Tab key in logical RTL order
- Modal dialogs must trap focus within the modal while open and return focus to the triggering element on close
- Date pickers and calendar grids must be fully keyboard-navigable (arrow keys for grid navigation)
- Custom dropdowns (Tier badge, advisor select, document type select) must respond to arrow keys, Enter, and Escape
- "Skip to main content" link must be the first focusable element on every page

### Color Contrast
- All text must meet minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text (>18pt or >14pt bold)
- Dark admin theme (`#0f1623` background / `#8a9bc0` secondary text) must be audited — secondary text may fall below 4.5:1 and will require a lighter value
- State badge colors (grey, blue, gold, orange, red, green) must be tested against both dark and light backgrounds
- Error states (red borders, red text) must not rely on color alone — must include an icon or text label

### Focus Management
- Focus must be programmatically moved to modal titles when modals open
- After form submission (save, confirm), focus must move to a success/error message or the next logical element
- After navigating between tabs (Personal Details, Documents, etc.), focus must move to the tab panel heading
- Tooltip triggers must be keyboard-accessible (focus triggers tooltip, Escape dismisses)

### RTL + Screen Reader Compatibility
- Hebrew text must be correctly announced by screen readers in RTL mode
- Mixed-direction text (Hebrew labels + English values such as email addresses, numbers) must use `dir` attributes correctly on mixed-content elements
- VoiceOver (macOS/iOS), NVDA (Windows), and TalkBack (Android) must be tested
- Table headers must use `<th scope="col/row">` so screen readers announce cell context
- The clocks/speedometer widget on the options screen (screen 28) must have a text alternative conveying the risk level and all numeric values

### Form Error Announcement
- Form validation errors must be announced to screen readers immediately on submit attempt
- `aria-invalid="true"` must be set on invalid inputs
- Error messages must be associated with their input via `aria-describedby`
- Required fields must be marked with `aria-required="true"` (not just a visual asterisk)
- The 10-question mortgage wizard (screen 27) must announce question progress: "שאלה X מתוך 10"

### Document Upload
- File input must be keyboard-accessible with a visible focus state
- Drag-and-drop upload must have a keyboard-accessible alternative (click to browse)
- Upload progress must be announced via `aria-live`

### Notifications and Alerts
- Toast notifications must use `role="alert"` with `aria-live="assertive"` for errors, `aria-live="polite"` for success messages
- SMS/email confirmation banners must be keyboard-dismissable

### Mobile Accessibility
- Touch target size minimum: 44×44px for all interactive elements
- Pinch-to-zoom must not be disabled (`user-scalable=no` is prohibited)

---

## V2 Acceptance Criteria

1. **Automated audit:** Zero critical (Priority 1) and zero major (Priority 2) issues reported by axe-core or Lighthouse Accessibility audit across all screens
2. **Manual keyboard test:** A QA engineer can complete the full mortgage application flow (questionnaire → registration → tier selection → personal details → documents → principal approval → bank selection) using only keyboard (no mouse)
3. **Screen reader test:** A QA engineer can complete the same flow using VoiceOver on Safari (macOS) and NVDA on Chrome (Windows) with no loss of information
4. **Contrast audit:** All text passes 4.5:1 contrast ratio verified via browser DevTools or a contrast checker tool
5. **RTL screen reader:** Hebrew text is correctly announced in right-to-left order by VoiceOver
6. **Modal focus trap:** Opening and closing any modal (Assign Advisor, State Transition, Reject Document, Confirm Booking) returns focus correctly
7. **Error announcement:** Form errors on all wizard steps and save forms are announced within 1 second of submit without requiring page scroll

---

## V2 Timeline Note
Accessibility work should begin in parallel with v2 feature development, not as a separate post-launch phase. Recommend allocating 2 development sprints for ARIA annotation + keyboard navigation, plus 1 sprint for screen reader testing and remediation.
