'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { formatNumber } from '@/lib/utils';

export default function ViewStatementClient({ userEmail, school, statement }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [printMode, setPrintMode] = useState('fit');

  const data = statement.data;

  const hasData = (item) => {
    const budget = parseFloat(item.budget) || 0;
    const thisMonth = parseFloat(item.this_month) || 0;
    const previous = parseFloat(item.previous) || 0;
    return budget !== 0 || thisMonth !== 0 || previous !== 0;
  };

  const filteredPays = (data.pays || []).filter(hasData);
  const filteredAllowances = (data.allowances || []).filter(hasData);
  const filteredNonSalary = (data.non_salary || []).filter(hasData);
  const totalRows = filteredPays.length + filteredAllowances.length + filteredNonSalary.length;

  // ============================================================
  // STYLE PRESETS - 1 page fit mode (compact)
  // ============================================================
  const getFitStyles = (rows) => {
    if (rows <= 10) return { fontSize: 10, rowPadding: '1px 5px', headerSize: 14, titleSize: 11 };
    if (rows <= 15) return { fontSize: 9, rowPadding: '1px 4px', headerSize: 13, titleSize: 10 };
    if (rows <= 20) return { fontSize: 8.5, rowPadding: '0.7px 4px', headerSize: 12, titleSize: 10 };
    if (rows <= 30) return { fontSize: 8, rowPadding: '0.5px 3px', headerSize: 12, titleSize: 9 };
    if (rows <= 40) return { fontSize: 7.5, rowPadding: '0.3px 3px', headerSize: 11, titleSize: 9 };
    return { fontSize: 7, rowPadding: '0.2px 2px', headerSize: 10, titleSize: 8 };
  };

  // ============================================================
  // SHARED HTML BUILDER - builds the full HTML for print/PDF
  // ============================================================
  // mode: 'fit' or 'normal'
  // useFor: 'print' or 'pdf' (currently same output but separated for future)
  const buildHTML = (mode, useFor) => {
    const element = document.getElementById('pdfContent');
    const printContent = element.innerHTML;

    let modeStyles = '';
    if (mode === 'fit') {
      const styles = getFitStyles(totalRows);
      modeStyles = `
        body { font-size: ${styles.fontSize}pt !important; }
        table td, table th, table td * {
          font-size: ${styles.fontSize}pt !important;
          padding: ${styles.rowPadding} !important;
          vertical-align: middle !important;
          line-height: 1.3 !important;
        }
        /* Header titles - full width stretched */
        .doc-title-1 { font-size: ${styles.headerSize}pt !important; }
        .doc-title-2 { font-size: ${styles.headerSize - 1}pt !important; }
        .doc-subtitle { font-size: ${styles.titleSize}pt !important; }
        /* Footer sections - DOUBLE the font for readability */
        .doc-endorsement { font-size: ${styles.titleSize + 2}pt !important; margin-top: 8px !important; }
        .doc-copy-section { font-size: ${styles.titleSize + 1}pt !important; margin-top: 6px !important; }
        .doc-copy-section ol { font-size: ${styles.titleSize + 1}pt !important; }
      `;
    } else {
      // Normal mode (multi-page) - readable defaults
      modeStyles = `
        body { font-size: 10pt !important; }
        table td, table th, table td * {
          font-size: 10pt !important;
          padding: 3px 5px !important;
          vertical-align: middle !important;
          line-height: 1.4 !important;
        }
        .doc-title-1 { font-size: 18pt !important; }
        .doc-title-2 { font-size: 14pt !important; }
        .doc-subtitle { font-size: 11pt !important; }
        .doc-endorsement { font-size: 11pt !important; margin-top: 12px !important; }
        .doc-copy-section { font-size: 10pt !important; margin-top: 10px !important; }
      `;
    }

    const filename = `Expenditure_${statement.month_name}_${statement.year}`;

    // Note: page margin = 10mm on ALL sides
    return `<!DOCTYPE html>
<html>
  <head>
    <title>${filename}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      html, body { margin: 0; padding: 0; }
      body { font-family: 'Times New Roman', serif; color: #000; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      th, td { 
        border: 1px solid #000;
        padding: 1.3px 2px;
        vertical-align: middle;
      }
      th { background: #d0d0d0; font-weight: bold; text-align: center; }
      .section-divider { background: #000 !important; color: white !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .subtotal { background: #b8b8b8 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .grand-total { background: #000 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; }
      ${modeStyles}
    </style>
  </head>
  <body>${printContent}</body>
</html>`;
  };

  // ============================================================
  // SHARED PDF GENERATOR using html2pdf
  // ============================================================
  const generatePDF = async (mode) => {
    const html2pdf = (await import('html2pdf.js')).default;
    const filename = `Expenditure_${statement.month_name}_${statement.year}.pdf`;

    // Render HTML in hidden container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '190mm'; // A4 width - 20mm margins
    tempContainer.style.background = '#fff';
    tempContainer.innerHTML = buildHTML(mode, 'pdf').replace(/<!DOCTYPE[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '');

    // Apply mode styles to the container
    if (mode === 'fit') {
      const styles = getFitStyles(totalRows);
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .pdf-content-clone { font-family: 'Times New Roman', serif; }
        .pdf-content-clone table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .pdf-content-clone th, .pdf-content-clone td { border: 1px solid #000; padding: ${styles.rowPadding}; vertical-align: middle; }
        .pdf-content-clone th { background: #d0d0d0; font-weight: bold; text-align: center; }
        .pdf-content-clone .section-divider { background: #000; color: white; font-weight: bold; text-align: center; }
        .pdf-content-clone .subtotal { background: #b8b8b8; font-weight: bold; }
        .pdf-content-clone .grand-total { background: #000; color: white; font-weight: bold; }
        .pdf-content-clone, .pdf-content-clone table td, .pdf-content-clone table th, .pdf-content-clone table td * {
          font-size: ${styles.fontSize}pt !important;
          line-height: 1.3 !important;
        }
        .pdf-content-clone .doc-title-1 { font-size: ${styles.headerSize}pt !important; }
        .pdf-content-clone .doc-title-2 { font-size: ${styles.headerSize - 1}pt !important; }
        .pdf-content-clone .doc-subtitle { font-size: ${styles.titleSize}pt !important; }
        .pdf-content-clone .doc-endorsement { font-size: ${styles.titleSize + 2}pt !important; margin-top: 8px !important; }
        .pdf-content-clone .doc-copy-section { font-size: ${styles.titleSize + 1}pt !important; margin-top: 6px !important; }
      `;
      tempContainer.insertBefore(styleEl, tempContainer.firstChild);
    } else {
      // Normal mode
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .pdf-content-clone { font-family: 'Times New Roman', serif; font-size: 10pt; }
        .pdf-content-clone table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .pdf-content-clone th, .pdf-content-clone td { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; font-size: 10pt; }
        .pdf-content-clone th { background: #d0d0d0; font-weight: bold; text-align: center; }
        .pdf-content-clone .section-divider { background: #000; color: white; font-weight: bold; text-align: center; }
        .pdf-content-clone .subtotal { background: #b8b8b8; font-weight: bold; }
        .pdf-content-clone .grand-total { background: #000; color: white; font-weight: bold; }
        .pdf-content-clone .doc-title-1 { font-size: 18pt; }
        .pdf-content-clone .doc-title-2 { font-size: 14pt; }
        .pdf-content-clone .doc-subtitle { font-size: 11pt; }
        .pdf-content-clone .doc-endorsement { font-size: 11pt; margin-top: 12px; }
        .pdf-content-clone .doc-copy-section { font-size: 10pt; margin-top: 10px; }
      `;
      tempContainer.insertBefore(styleEl, tempContainer.firstChild);
    }

    // Wrap content in clone class
    const original = document.getElementById('pdfContent');
    const clone = original.cloneNode(true);
    clone.classList.add('pdf-content-clone');
    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    const opt = {
      margin: 10, // 10mm on all sides
      filename,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true,
      },
      pagebreak: mode === 'fit'
        ? { mode: 'avoid-all' }
        : { mode: ['css', 'legacy'], avoid: ['tr'] },
    };

    await html2pdf().set(opt).from(clone).save();
    document.body.removeChild(tempContainer);
  };

  // ============================================================
  // 4 SEPARATE HANDLERS - independent customization
  // ============================================================

  // HANDLER 1: PDF Download - 1 Page Fit
  const handleDownloadPDFFit = async () => {
    setDownloading(true);
    try {
      await generatePDF('fit');
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // HANDLER 2: PDF Download - Multi-Page Normal
  const handleDownloadPDFNormal = async () => {
    setDownloading(true);
    try {
      await generatePDF('normal');
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // HANDLER 3: Print Preview - 1 Page Fit
  const handlePrintFit = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(buildHTML('fit', 'print'));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // HANDLER 4: Print Preview - Multi-Page Normal
  const handlePrintNormal = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(buildHTML('normal', 'print'));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // ============================================================
  // ROUTERS - call right handler based on current printMode
  // ============================================================
  const handleDownloadPDF = () => {
    if (printMode === 'fit') handleDownloadPDFFit();
    else handleDownloadPDFNormal();
  };

  const handlePrint = () => {
    if (printMode === 'fit') handlePrintFit();
    else handlePrintNormal();
  };

  // ============================================================
  // ROW RENDERERS
  // ============================================================
  const renderTableRow = (item) => (
    <tr key={item.code}>
      <td style={{ verticalAlign: 'middle', textAlign: 'left' }}>
        {item.code}&nbsp;&nbsp;{item.name}
      </td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{item.budget ? formatNumber(item.budget) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{item.this_month ? formatNumber(item.this_month) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{item.previous ? formatNumber(item.previous) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{item.total ? formatNumber(item.total) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{item.saving ? formatNumber(item.saving) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{item.excess ? formatNumber(item.excess) : ''}</td>
    </tr>
  );

  const renderSubtotalRow = (label, sub) => (
    <tr className="subtotal">
      <td style={{ verticalAlign: 'middle', textAlign: 'left' }}><strong>{label}</strong></td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{sub.budget ? formatNumber(sub.budget) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}><strong>{formatNumber(sub.this_month)}</strong></td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{sub.previous ? formatNumber(sub.previous) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}><strong>{formatNumber(sub.total)}</strong></td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{sub.saving ? formatNumber(sub.saving) : ''}</td>
      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}><strong>{sub.excess ? formatNumber(sub.excess) : ''}</strong></td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📄 {statement.month_name} {statement.year}
            </h1>
            <p className="text-gray-600">Reconciliation Statement</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md text-base"
            >
              🖨️ Print (Best Quality)
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold disabled:opacity-50"
            >
              {downloading ? '⏳ Generating...' : '⬇️ Download PDF'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-900">
          💡 <strong>Tip:</strong> Best quality ke liye <strong>"🖨️ Print"</strong> button use karein —
          Print dialog mein <strong>"Save as PDF"</strong> select karke clean PDF mil jata hai.
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-gray-800 mb-1">🖨️ Print Mode</div>
              <div className="text-xs text-gray-600">
                {printMode === 'fit'
                  ? `Sab content ek A4 page pe fit (${totalRows} heads)`
                  : 'Normal size, multiple pages pe distribute'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPrintMode('fit')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  printMode === 'fit'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📄 1 Page (Fit)
              </button>
              <button
                onClick={() => setPrintMode('normal')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  printMode === 'normal'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📑 Multi-Page (Normal)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
          📄 <strong>Smart Display:</strong> {totalRows} heads dikhaye ja rahe hain. Khaali heads auto-hide.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 uppercase">This Month</div>
            <div className="text-xl font-bold text-emerald-600">
              Rs. {formatNumber(data.grand_total.this_month)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 uppercase">Previous</div>
            <div className="text-xl font-bold text-blue-600">
              Rs. {formatNumber(data.grand_total.previous)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 uppercase">Grand Total</div>
            <div className="text-xl font-bold text-gray-800">
              Rs. {formatNumber(data.grand_total.total)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 uppercase">Excess</div>
            <div className="text-xl font-bold text-red-600">
              Rs. {formatNumber(data.grand_total.excess)}
            </div>
          </div>
        </div>

        {/* ============================================================
            PDF Content - this is what gets cloned for print/PDF
            ============================================================ */}
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <div id="pdfContent" className="pdf-content">
            
            {/* TITLE 1 - Office of the principal (school name) - FULL WIDTH STRETCH */}
            <div className="doc-title-1" style={{ 
              fontWeight: 'bold',
              textDecoration: 'underline',
              textAlign: 'justify',
              textAlignLast: 'justify',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              marginBottom: '4px',
              letterSpacing: '0.5px',
            }}>
              OFFICE OF THE {school.principal_designation?.toUpperCase()} {school.name?.toUpperCase()}  {school.district?.toUpperCase()}
            </div>

            
            {/* SUBTITLE - Reconciliation Statement - FULL WIDTH STRETCH */}
            <div className="doc-subtitle" style={{
              textAlign: 'justify',
              textAlignLast: 'justify',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              margin: '6px 0',
            }}>
              RECONCILIATION STATEMENT OF PAY &amp; ALLOWANCES FOR THE MONTH OF&nbsp;&nbsp;<em><strong>{data.month_year}</strong></em>
            </div>

            {/* Department + DDO row */}
            <div className="doc-subtitle" style={{
              display: 'flex',
              justifyContent: 'space-between',
              margin: '8px 0',
            }}>
              <div>
                <strong>NAME OF DEPARTMENT</strong> &nbsp;&nbsp;&nbsp;{' '}
                <u>{school.department?.toUpperCase()}</u>
              </div>
              <div>
                <strong>DDO CODE</strong> &nbsp;&nbsp;&nbsp; <u>{school.ddo_code?.toUpperCase()}</u>
              </div>
            </div>

            {/* MAIN TABLE */}
            <table>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: '28%' }}>Objects</th>
                  <th rowSpan="2" style={{ width: '11%' }}>Sanctioned<br />Budget</th>
                  <th colSpan="2">DEPARTMENTAL FIGURE</th>
                  <th rowSpan="2" style={{ width: '11%' }}>TOTAL</th>
                  <th rowSpan="2" style={{ width: '10%' }}>Saving</th>
                  <th rowSpan="2" style={{ width: '10%' }}>Excess</th>
                </tr>
                <tr>
                  <th style={{ width: '11%' }}>During this<br />Month</th>
                  <th style={{ width: '10%' }}>Previous</th>
                </tr>
              </thead>
              <tbody>
                {filteredPays.length > 0 && (
                  <>
                    <tr>
                      <td colSpan="2" className="section-divider">PAYS</td>
                      <td colSpan="5" style={{ background: 'transparent', border: 'none' }}></td>
                    </tr>
                    {filteredPays.map(renderTableRow)}
                    {renderSubtotalRow('Total Pays', data.pays_subtotal)}
                  </>
                )}

                {filteredAllowances.length > 0 && (
                  <>
                    <tr>
                      <td colSpan="2" className="section-divider">REGULAR ALLOWANCES</td>
                      <td colSpan="5" style={{ background: 'transparent', border: 'none' }}></td>
                    </tr>
                    {filteredAllowances.map(renderTableRow)}
                    {renderSubtotalRow('Total Regular Allowances', data.allowances_subtotal)}
                  </>
                )}

                {filteredNonSalary.length > 0 && (
                  <>
                    <tr>
                      <td colSpan="2" className="section-divider">NON-SALARY COMPONENTS</td>
                      <td colSpan="5" style={{ background: 'transparent', border: 'none' }}></td>
                    </tr>
                    {filteredNonSalary.map(renderTableRow)}
                    {renderSubtotalRow('Total Non-Salary Components', data.non_salary_subtotal)}
                  </>
                )}

                <tr className="grand-total">
                  <td style={{ verticalAlign: 'middle', textAlign: 'left' }}><strong>GRAND TOTAL</strong></td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    <strong>{data.grand_total.budget ? formatNumber(data.grand_total.budget) : ''}</strong>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    <strong>{formatNumber(data.grand_total.this_month)}</strong>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    {data.grand_total.previous ? formatNumber(data.grand_total.previous) : ''}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    <strong>{formatNumber(data.grand_total.total)}</strong>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    {data.grand_total.saving ? formatNumber(data.grand_total.saving) : ''}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    <strong>
                      {data.grand_total.excess ? formatNumber(data.grand_total.excess) : ''}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ENDORSEMENT - bigger font in fit mode */}
            <div className="doc-endorsement">
              <strong>Endorsement No: _______________ Dated: _______________</strong>
            </div>

            {/* COPY FOR INFORMATION - bigger font in fit mode */}
            <div className="doc-copy-section">
              <em style={{ fontStyle: 'italic', textDecoration: 'underline', fontWeight: 'bold' }}>
                Copy for information to the:
              </em>
              <ol style={{ textTransform: 'capitalize', margin: '4px 0 0 0', paddingLeft: '25px' }}>
                <li>District Comptroller of Accounts, {school.district?.toLowerCase()}.</li>
                <li>District Finance Office, {school.district?.toLowerCase()}.</li>
                <li>District Education Office ({school.gender?.toLowerCase()}) {school.district?.toLowerCase()}.</li>
                <li>Office/School Record.</li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .pdf-content table {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }
        .pdf-content table th,
        .pdf-content table td {
          border: 1px solid #000;
          padding: 1.3px 2px;
          font-size: 10pt;
          vertical-align: middle !important;
          line-height: 1.4;
        }
        .pdf-content table th {
          background: #d0d0d0;
          font-weight: bold;
          text-align: center;
        }
        .pdf-content .section-divider {
          background: #000 !important;
          color: white !important;
          font-weight: bold;
          text-align: center;
        }
        .pdf-content .subtotal {
          background: #b8b8b8 !important;
          font-weight: bold;
        }
        .pdf-content .grand-total {
          background: #000 !important;
          color: white !important;
          font-weight: bold;
        }
        /* On-screen preview sizes */
        .pdf-content .doc-title-1 { font-size: 18pt; }
        .pdf-content .doc-title-2 { font-size: 14pt; }
        .pdf-content .doc-subtitle { font-size: 11pt; }
        .pdf-content .doc-endorsement { font-size: 11pt; margin-top: 12px; }
        .pdf-content .doc-copy-section { font-size: 10pt; margin-top: 10px; }
      `}</style>
    </div>
  );
}
