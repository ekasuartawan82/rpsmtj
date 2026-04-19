export const rpsDocumentStyles = `
  @page {
    size: A4 landscape;
    margin: 18mm 12mm 18mm 12mm;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #eef4fb;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.45;
  }

  body {
    padding: 20px;
  }

  .document {
    max-width: 1160px;
    margin: 0 auto;
    background: #ffffff;
    padding: 20px 22px 28px;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  }

  .section {
    margin-top: 18px;
  }

  .section.keep-together {
    page-break-inside: avoid;
  }

  h1, h2, h3, h4, p {
    margin: 0;
  }

  .eyebrow {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #475569;
    font-weight: 700;
  }

  .doc-title {
    margin-top: 8px;
    font-size: 24px;
    line-height: 1.2;
    font-weight: 700;
    color: #0f172a;
  }

  .doc-subtitle {
    margin-top: 6px;
    font-size: 13px;
    color: #334155;
  }

  .page-header {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr) 180px;
    gap: 16px;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 2px solid #cbd5e1;
  }

  .logo-box {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 88px;
    border: 1px solid #dbe4ef;
    border-radius: 18px;
    background: #ffffff;
    overflow: hidden;
  }

  .logo-box img {
    max-width: 68px;
    max-height: 68px;
    object-fit: contain;
  }

  .doc-code-box {
    border: 1px solid #dbe4ef;
    border-radius: 18px;
    padding: 14px 16px;
    background: #f8fbff;
    text-align: center;
  }

  .doc-code-box strong {
    display: block;
    font-size: 13px;
    color: #0f172a;
  }

  .doc-code-box span {
    display: block;
    margin-top: 4px;
    color: #475569;
    font-size: 11px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
  }

  .meta-card {
    border: 1px solid #dbe4ef;
    border-radius: 16px;
    background: #f8fbff;
    padding: 12px;
  }

  .meta-card .label {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
  }

  .meta-card .value {
    margin-top: 8px;
    font-size: 13px;
    color: #0f172a;
    font-weight: 600;
  }

  .section-title {
    margin-bottom: 10px;
    font-size: 15px;
    line-height: 1.2;
    color: #0f172a;
    font-weight: 700;
  }

  .section-note {
    margin-bottom: 12px;
    color: #475569;
  }

  .two-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .content-card {
    border: 1px solid #dbe4ef;
    border-radius: 16px;
    background: #ffffff;
    padding: 14px;
  }

  .content-card h3 {
    font-size: 13px;
    color: #0f172a;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .list-block {
    display: grid;
    gap: 10px;
  }

  .list-item {
    border: 1px solid #dbe4ef;
    border-radius: 14px;
    background: #ffffff;
    padding: 12px 14px;
  }

  .list-item strong {
    color: #0f172a;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th, td {
    border: 1px solid #b8c6d8;
    padding: 6px 7px;
    vertical-align: top;
    text-align: left;
    word-break: break-word;
  }

  th {
    background: #e8f1fb;
    color: #0f172a;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  .table-wrap {
    border: 1px solid #dbe4ef;
    border-radius: 18px;
    overflow: hidden;
    background: #ffffff;
  }

  .compact-table {
    font-size: 10px;
  }

  .compact-table th,
  .compact-table td {
    padding: 5px 6px;
  }

  .meeting-table {
    font-size: 9.5px;
  }

  .meeting-table th {
    padding: 4px 3px;
    letter-spacing: 0.03em;
  }

  .meeting-table td {
    padding: 4px 5px;
  }

  .meeting-row-ets td,
  .meeting-row-eas td {
    background: #eef2ff;
    font-weight: 700;
  }

  .meeting-row-eas td {
    background: #ecfeff;
  }

  .meeting-row-extra td {
    background: #fefce8;
  }

  .extra-session-badge {
    display: inline-block;
    margin-left: 4px;
    padding: 1px 5px;
    background: #fbbf24;
    color: #78350f;
    border-radius: 4px;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    vertical-align: middle;
  }

  .text-muted {
    color: #64748b;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .footer-meta {
    border: 1px solid #dbe4ef;
    border-radius: 16px;
    background: #f8fbff;
    padding: 14px;
  }

  .footer-meta p + p {
    margin-top: 6px;
  }

  thead {
    display: table-header-group;
  }

  tr, td, th {
    page-break-inside: avoid;
  }

  h2, h3 {
    page-break-after: avoid;
  }

  /* Approval history: allow table to break across pages, but not rows */
  .approval-history table {
    page-break-inside: auto;
  }

  .approval-history tbody tr {
    page-break-inside: avoid;
  }

  .approval-history thead {
    page-break-after: auto;
  }

  @media print {
    body {
      background: #ffffff;
      padding: 0;
    }

    .document {
      max-width: none;
      padding: 0;
      box-shadow: none;
    }
  }
`;

