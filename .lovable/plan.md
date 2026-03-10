

## Replace AgreementTextContent with Full 16-Section Agreement

### What changes
**Single file**: `src/components/artist/agreement/AgreementTextContent.tsx`

Replace all 14 existing sections with the 16 new sections provided, maintaining the same component structure (`const AgreementTextContent = () => (...)` with `export default`), same wrapper `div` classes, and same `section`/`h3`/`p`/`ul` markup patterns.

### Sections
1. Introduction
2. Platform Purpose
3. Definitions (5 defined terms in a list)
4. Term & Termination
5. Exclusivity Window
6. Rights Granted
7. Compensation & Streaming Rates (with highlighted rate box)
8. Payout Schedule & Payment Method (3 paragraphs)
9. Tax Information & Withholding (2 paragraphs)
10. Cash Bonus Program (milestone list + rules)
11. Exclusive Charts Bonus Program (genres list, prizes, rules)
12. Artist Representations & Warranties (items a–k)
13. Streaming Manipulation & Termination
14. Digital Watermarking & Content Protection
15. Limitation of Liability & Indemnification
16. Dispute Resolution & Governing Law

### Closing line
Replace the existing footer `div` with italic muted text: "By signing below, you confirm you have read, understood, and agree to all terms of this Artist Participation Agreement. Questions? Contact support@musicexclusive.co"

### No other files touched

