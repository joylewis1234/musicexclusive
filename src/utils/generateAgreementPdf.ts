import jsPDF from "jspdf";

interface AgreementSection {
  title: string;
  body: string[];
}

interface AgreementPdfOptions {
  documentTitle: string;
  effectiveDate: string;
  sections: AgreementSection[];
  fileName: string;
  footerNote?: string;
}

export const generateAgreementPdf = ({
  documentTitle,
  effectiveDate,
  sections,
  fileName,
  footerNote,
}: AgreementPdfOptions) => {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(documentTitle.toUpperCase(), contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 8 + 4;

  // Effective date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Effective Date: ${effectiveDate}`, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 10;

  // Divider
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Sections
  sections.forEach((section, idx) => {
    addPageIfNeeded(20);

    // Section heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${idx + 1}. ${section.title}`, margin, y);
    y += 6;

    // Section body paragraphs
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    section.body.forEach((paragraph) => {
      const isBullet = paragraph.startsWith("- ") || paragraph.startsWith("• ");
      const text = isBullet ? `  •  ${paragraph.replace(/^[-•]\s*/, "")}` : paragraph;
      const lines = doc.splitTextToSize(text, isBullet ? contentWidth - 6 : contentWidth);
      addPageIfNeeded(lines.length * 4.5 + 2);
      doc.text(lines, isBullet ? margin + 4 : margin, y);
      y += lines.length * 4.5 + 2;
    });

    y += 4;
  });

  // Footer note
  if (footerNote) {
    addPageIfNeeded(16);
    y += 4;
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const footerLines = doc.splitTextToSize(footerNote, contentWidth);
    doc.text(footerLines, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0);
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Music Exclusive™  —  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.setTextColor(0);
  }

  doc.save(fileName);
};

// ── Pre-built agreement configs ──

export const downloadArtistAgreementPdf = () => {
  generateAgreementPdf({
    documentTitle: "Music Exclusive\nArtist Participation Agreement (MVP Version)",
    effectiveDate: "January 31, 2025",
    fileName: "Music_Exclusive_Artist_Participation_Agreement.pdf",
    footerNote: "By using Music Exclusive as an Artist, you agree to this Agreement.",
    sections: [
      {
        title: "Platform Purpose",
        body: [
          "Music Exclusive is an artist-first music streaming and fan engagement platform where artists release exclusive music to fans before releasing to other digital streaming platforms.",
        ],
      },
      {
        title: "Definitions",
        body: [
          "\"Content\" means the sound recordings, compositions, cover art, images, metadata, and other materials you upload to Music Exclusive.",
          "\"Verified Stream\" means a legitimate fan-initiated stream that meets platform validation requirements and is not fraudulent or manipulated.",
        ],
      },
      {
        title: "Artist Eligibility",
        body: [
          "Company may approve or deny Artist participation at its sole discretion. Company may remove Artist access for violations of this Agreement, fraud, or abuse.",
        ],
      },
      {
        title: "Exclusivity Window",
        body: [
          "Artist agrees that each uploaded release may be exclusive to Music Exclusive for a minimum of three (3) weeks (or longer if Artist chooses).",
          "After the exclusivity period, Artist may distribute the release elsewhere. Music Exclusive retains the right to continue streaming the Content on the platform indefinitely unless otherwise agreed in writing.",
        ],
      },
      {
        title: "Rights Granted",
        body: [
          "Artist grants Company a non-exclusive, worldwide right to host, store, stream, display, and promote the Content solely in connection with operating and marketing the Music Exclusive platform.",
          "Artist retains ownership of all intellectual property rights in the Content.",
        ],
      },
      {
        title: "Artist Representations & Warranties",
        body: [
          "Artist represents and warrants:",
          "- Artist owns or controls all necessary rights to upload and monetize the Content",
          "- The Content does not infringe any third-party rights",
          "- Artist is responsible for any third-party royalty obligations (including publishers, writers, producers, or other rights holders)",
          "- Artist will not upload unlawful, infringing, or improper content",
        ],
      },
      {
        title: "Streaming Payments & Earnings (MVP)",
        body: [
          "Fans stream music using credits.",
          "- 1 credit = $0.20",
          "- Each stream costs 1 credit ($0.20)",
          "Revenue Split:",
          "- 50% to Artist ($0.10 per stream)",
          "- 50% to Music Exclusive ($0.10 per stream)",
          "Artist earnings will be tracked inside the Artist Dashboard.",
        ],
      },
      {
        title: "Payout Schedule",
        body: [
          "Artist payouts are issued weekly on Mondays for verified streams earned during the prior week.",
          "Company may delay payouts if fraud, streaming manipulation, chargebacks, or disputes are suspected.",
        ],
      },
      {
        title: "Weekly Transparency Report",
        body: [
          "Company will provide a weekly transparency report inside the Artist Earnings page showing:",
          "- Total verified streams",
          "- Total credits collected",
          "- Artist share",
          "- Platform share",
          "- Payout status (Pending/Paid)",
          "- Total payouts (lifetime)",
        ],
      },
      {
        title: "Fraud, Streaming Manipulation & Termination",
        body: [
          "Artist may not engage in streaming manipulation or artificial inflation of streams.",
          "If Company determines in its sole discretion that manipulation occurred, Company may:",
          "- Remove Content",
          "- Suspend or terminate Artist access",
          "- Withhold earnings tied to manipulation",
        ],
      },
      {
        title: "Termination",
        body: [
          "Company may terminate this Agreement and remove Artist access at any time for breach, fraud, abuse, or platform safety reasons.",
        ],
      },
      {
        title: "Limitation of Liability",
        body: [
          "To the maximum extent permitted by law, Company is not liable for indirect, incidental, or consequential damages arising from the Services.",
        ],
      },
      {
        title: "Dispute Resolution",
        body: [
          "Disputes shall be governed by applicable arbitration and dispute resolution terms consistent with the Company Terms of Use.",
        ],
      },
    ],
  });
};

export const downloadFanAgreementPdf = () => {
  generateAgreementPdf({
    documentTitle: "Music Exclusive\nFan Access Agreement (MVP Version)",
    effectiveDate: "January 31, 2025",
    fileName: "Music_Exclusive_Fan_Access_Agreement.pdf",
    footerNote: "By using Music Exclusive as a Fan, you agree to this Agreement.",
    sections: [
      {
        title: "Welcome",
        body: [
          "Welcome to Music Exclusive — where fans get early access to music before the world hears it.",
          "This Fan Access Agreement (\"Agreement\") is entered into between Music Exclusive (\"Company,\" \"we,\" or \"us\") and you (\"Fan,\" \"you,\" or \"your\"). This Agreement governs your access to the Music Exclusive platform (\"Services\").",
          "By creating an account, purchasing credits, or streaming music, you confirm you have read, understood, and agree to be bound by this Agreement.",
        ],
      },
      {
        title: "Stream Pricing",
        body: [
          "Each stream costs 1 credit ($0.20).",
          "Credits are purchased in advance and are non-transferable.",
          "Credit balances do not expire but are subject to the terms of this Agreement.",
        ],
      },
      {
        title: "Refund Policy",
        body: [
          "Once credits are used to stream, they cannot be refunded.",
          "Unused credit balances may be eligible for refund only in accordance with the Music Exclusive Refund Policy.",
          "All sales are final unless otherwise required by applicable law.",
        ],
      },
      {
        title: "Fair Use Policy",
        body: [
          "You agree not to engage in any of the following:",
          "- Fraudulent activity or misrepresentation",
          "- Stream manipulation or artificial inflation of play counts",
          "- Abuse of the platform, other users, or artists",
          "- Unauthorized sharing, redistribution, or downloading of exclusive content",
          "Violation of this Fair Use Policy may result in suspension or termination of your account and forfeiture of remaining credits.",
        ],
      },
      {
        title: "Account & Access",
        body: [
          "You are responsible for maintaining the security of your account credentials.",
          "You may not share, sell, or transfer your account access to another person.",
          "Company may suspend or terminate your account for violations of this Agreement.",
        ],
      },
      {
        title: "Intellectual Property",
        body: [
          "All content available on Music Exclusive is the intellectual property of the respective artists and rights holders.",
          "You may not copy, reproduce, distribute, or create derivative works from any content accessed through the platform.",
        ],
      },
      {
        title: "Limitation of Liability",
        body: [
          "To the maximum extent permitted by law, Company is not liable for indirect, incidental, or consequential damages arising from the Services.",
          "Company does not guarantee uninterrupted access to the platform or any specific content availability.",
        ],
      },
      {
        title: "Dispute Resolution",
        body: [
          "Disputes shall be governed by applicable arbitration and dispute resolution terms consistent with the Company Terms of Use.",
        ],
      },
    ],
  });
};
