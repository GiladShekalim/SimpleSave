# 50 — V2: AI-Assisted Document Validation

> **Status: DEFERRED TO V2**  
> V1 relies entirely on manual advisor review of uploaded documents. AI-assisted validation, OCR extraction, and automated classification are v2 deliverables. No implementation detail is required before v2 scoping begins.

---

## Purpose
Reduce advisor workload and accelerate the document review phase by automatically classifying uploaded documents, extracting key data fields, and flagging documents that do not match the expected type or contain inconsistent data. A human advisor always makes the final approval decision; AI provides a confidence-scored pre-check.

## Scope
- Applies to all document uploads in the `DOCUMENTS_SUBMITTED` workflow phase (screen 32 / screen 45 Documents tab)
- Runs asynchronously after upload; does not block the upload action
- Surfaces classification results and extracted fields to the advisor in the Documents tab
- Does not replace advisor review — all APPROVED / REJECTED decisions remain manual

---

## Deferred Items

### Document Classification Model
A machine learning model (or API-based service) that takes an uploaded document image or PDF and returns:

| Output | Description |
|---|---|
| `predicted_type` | One of the known document types (תלוש שכר, תדפיס חשבון בנק, תעודת זהות, כתב הסמכה, וכו') |
| `confidence_score` | 0.0–1.0 float |
| `is_match` | Boolean: `predicted_type == required_document_type` for this slot |

**Training data:** Anonymized historical document uploads (requires client consent and data processing agreement). In early v2 iterations, a general-purpose document classification API (e.g., AWS Textract, Google Document AI) may be used instead of a custom-trained model.

**Threshold:**
- `confidence >= 0.85`: auto-classify and show result to advisor as "בדיקה אוטומטית: [Type] (ביטחון גבוה)"
- `0.60 <= confidence < 0.85`: show result with "⚠ ביטחון בינוני — נדרשת בדיקה ידנית"
- `confidence < 0.60`: show "לא ניתן לסווג — נדרשת בדיקה ידנית"; no classification displayed

### Field Extraction
After successful classification, extract structured data fields from the document:

| Document Type | Extracted Fields |
|---|---|
| תלוש שכר (pay slip) | Employee name, employer name, net salary (הכנסה נטו), gross salary, pay period date |
| תדפיס עו"ש (bank statement) | Account holder name, account number, bank name, statement period, average monthly balance, total credits, total debits |
| שומת מס (tax assessment) | Taxpayer name, tax year, net income declared |
| אישור הכנסות מרואה חשבון | Accountant name, client name, annual income, declaration year |
| נסח טאבו | Property address, owner name(s), lien notes |

**Extraction output presented to advisor:**
- A side panel in the Documents tab (v2 enhancement to screen 45) showing extracted key-value pairs
- Fields that do not match client-declared data (e.g., extracted net income != `Borrower.net_income`) are highlighted in orange with label "אי-התאמה לנתוני הלקוח"
- Advisor can accept or override each extracted field

### Confidence Scoring and Fallback

| Confidence Level | Advisor UI | Required Action |
|---|---|---|
| HIGH (≥0.85, all fields extracted) | Green badge "✓ מסמך תקין — בדיקה אוטומטית" | Advisor can approve with one click |
| MEDIUM (0.60–0.84) | Yellow badge "⚠ דורש בדיקה" | Advisor must manually review before approving |
| LOW (<0.60) | Red badge "✗ לא סווג" | Advisor must manually review; no AI suggestion |
| MISMATCH (type mismatch) | Orange badge "⚠ סוג מסמך שגוי" | Advisor sees: "המסמך שהועלה נראה כ-[predicted_type] אך הצפוי הוא [required_type]." Client is notified to re-upload. |

### Fraud and Anomaly Detection (v2+, post-AI validation launch)
A secondary check layer for obvious document anomalies:
- Date anomalies: pay slip date in the future, or more than 6 months old
- Amount anomaly: extracted income more than 50% higher than declared income
- Duplicate detection: same document uploaded for two different required document slots

These generate advisor warnings but do NOT automatically reject the document.

### Privacy and Data Retention
- Uploaded documents are processed by the AI service in-memory; document content is not stored by the AI provider beyond the processing request
- All AI processing must occur within EU/IL data residency boundaries (service selection must comply)
- Client consent for AI processing must be collected as part of the v2 Terms of Service update

### Admin Controls (v2 Admin panel addition)
- Toggle AI validation on/off globally
- View AI processing success/failure rates per document type
- Configure confidence thresholds
- Review documents flagged as mismatches

---

## V2 Acceptance Criteria

1. Classification accuracy: `predicted_type == required_type` for ≥90% of correctly uploaded documents in a test set of 200 real documents (anonymized)
2. False positive rate (misclassifying a correct document as wrong type): <5%
3. Field extraction accuracy: extracted `net_income` from pay slips matches actual value within ±5% for ≥85% of test cases
4. Processing time: AI classification and extraction completes within 30 seconds of document upload for 95th percentile
5. Fallback coverage: 100% of documents with confidence <0.60 fall through to manual review with no automated action taken
6. Privacy compliance: AI service provider is confirmed as EU/IL compliant; legal review complete
7. Advisor adoption: after 3 months, >70% of HIGH-confidence documents are approved using the one-click path (no manual re-review)
8. Zero auto-approvals: the system never approves or rejects a document without an explicit advisor action — AI provides suggestions only
