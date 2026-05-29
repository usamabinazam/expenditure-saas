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

  // More aggressive font sizing for fit mode
  const getCompactStyles = (rows) => {
    if (rows <= 10) return { fontSize: 9, rowPadding: '2px 4px', headerSize: 14, titleSize: 10 };
    if (rows <= 15) return { fontSize: 8, rowPadding: '1.5px 4px', headerSize: 13, titleSize: 9 };
    if (rows <= 20) return { fontSize: 7, rowPadding: '1px 3px', headerSize: 12, titleSize: 8 };
    if (rows <= 30) return { fontSize: 6, rowPadding: '0.5px 3px', headerSize: 11, titleSize: 7 };
    if (rows <= 40) return { fontSize: 5.5, rowPadding: '0.5px 2px', headerSize: 10, titleSize: 6 };
    return { fontSize: 5, rowPadding: '0px 2px', headerSize: 9, titleSize: 6 };
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const original = document.getElementById('pdfContent');
      const filename = `Expenditure_${statement.month_name}_${statement.year}.pdf`;

      const clone = original.cloneNode(true);

      if (printMode === 'fit') {
        const styles = getCompactStyles(totalRows);

        const styleEl = document.createElement('style');
        styleEl.textContent = `
          .pdf-content {
            font-size: ${styles.fontSize}pt !important;
          }
          .pdf-content table, .pdf-content table td, .pdf-content table th {
            font-size: ${styles.fontSize}pt !important;
            padding: ${styles.rowPadding} !important;
            vertical-align: middle !important;
          }
          .pdf-content [style*="18pt"] {
            font-size: ${styles.headerSize}pt !important;
          }
          .pdf-content [style*="14pt"] {
            font-size: ${styles.titleSize + 1}pt !important;
          }
          .pdf-content [style*="11pt"] {
            font-size: ${styles.titleSize}pt !important;
          }
          .pdf-content [style*="10pt"] {
            font-size: ${styles.titleSize - 1}pt !important;
          }
          .pdf-content [style*="9pt"] {
            font-size: ${styles.titleSize - 2}pt !important;
          }
          .pdf-content [style*="marginTop"] {
            margin-top: 6px !important;
          }
        `;
        clone.insertBefore(styleEl, clone.firstChild);
      }

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '200mm'; // wider since margins reduced
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      const opt = {
        margin: 5, // 5mm = ~half inch ka half (Tight margins on all sides)
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: printMode === 'fit'
          ? { mode: 'avoid-all' }
          : { mode: ['css', 'legacy'], avoid: ['tr'] },
      };

      await html2pdf().set(opt).from(clone).save();

      document.body.removeChild(tempContainer);
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('pdfContent');
    const printContent = element.innerHTML;
    const printWindow = window.open('', '_blank');

    let compactStyles = '';
    if (printMode === 'fit') {
      const styles = getCompactStyles(totalRows);
      compactStyles = `
        body { font-size: ${styles.fontSize}pt !important; }
        table, table td, table th {
          font-size: ${styles.fontSize}pt !important;
          padding: ${styles.rowPadding} !important;
          vertical-align: middle !important;
        }
        [style*="18pt"] { font-size: ${styles.headerSize}pt !important; }
        [style*="14pt"] { font-size: ${styles.titleSize + 1}pt !important; }
        [style*="11pt"] { font-size: ${styles.titleSize}pt !important; }
        [style*="10pt"] { font-size: ${styles.titleSize - 1}pt !important; }
        [style*="marginTop"] { margin-top: 6px !important; }
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Statement</title>
          <style>
            @page { size: A4; margin: 5mm; }
            html, body { margin: 0; padding: 0; }
            body { font-family: 'Times New Roman', serif; color: #000; }
            table { border-collapse: collapse; width: 100%; }
            th, td { 
              border: 1px solid #000; 
              padding: 4px 6px; 
              font-size: 10pt;
              vertical-align: middle;
            }
            th { background: #d0d0d0; font-weight: bold; text-align: center; }
            .section-divider { background: #000 !important; color: white !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .subtotal { background: #b8b8b8 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .grand-total { background: #000 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tr { page-break-inside: avoid; }
            ${compactStyles}
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Row with proper vertical alignment
  const renderTableRow = (item) => (
    <tr key={item.code}>
      <td style={{ verticalAlign: 'middle' }}>
        <span style={{ fontSize: '9pt' }}>{item.code}</span>&nbsp;&nbsp;{item.name}
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
      <td style={{ verticalAlign: 'middle' }}><strong>{label}</strong></td>
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
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold disabled:opacity-50"
            >
              {downloading ? '⏳ Generating...' : '⬇️ Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
            >
              🖨️ Print
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
            >
              ← Back
            </button>
          </div>
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

        {/* PDF Content */}
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <div id="pdfContent" className="pdf-content">
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '18pt',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                }}
              >
                OFFICE OF THE {school.principal_designation?.toUpperCase()} {school.name?.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: '14pt',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  marginTop: '2px',
                }}
              >
                {school.district?.toUpperCase()}
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11pt', margin: '10px 0 6px 0' }}>
              RECONCILIATION STATEMENT OF PAY & ALLOWANCES FOR THE MONTH OF
              <br />
              <em>
                <strong>{data.month_year}</strong>
              </em>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                margin: '8px 0',
                fontSize: '11pt',
              }}
            >
              <div>
                <strong>NAME OF DEPARTMENT</strong> &nbsp;&nbsp;&nbsp;{' '}
                <u>{school.department?.toUpperCase()}</u>
              </div>
              <div>
                <strong>DDO CODE</strong> &nbsp;&nbsp;&nbsp; <u>{school.ddo_code?.toUpperCase()}</u>
              </div>
            </div>

            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: '28%', verticalAlign: 'middle' }}>Objects</th>
                  <th rowSpan="2" style={{ width: '11%', verticalAlign: 'middle' }}>Sanctioned<br />Budget</th>
                  <th colSpan="2" style={{ verticalAlign: 'middle' }}>DEPARTMENTAL FIGURE</th>
                  <th rowSpan="2" style={{ width: '11%', verticalAlign: 'middle' }}>TOTAL</th>
                  <th rowSpan="2" style={{ width: '10%', verticalAlign: 'middle' }}>Saving</th>
                  <th rowSpan="2" style={{ width: '10%', verticalAlign: 'middle' }}>Excess</th>
                </tr>
                <tr>
                  <th style={{ width: '11%', verticalAlign: 'middle' }}>During this<br />Month</th>
                  <th style={{ width: '10%', verticalAlign: 'middle' }}>Previous</th>
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
                  <td style={{ verticalAlign: 'middle' }}><strong>GRAND TOTAL</strong></td>
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

            <div style={{ marginTop: '30px' }}>
              <strong>Endorsement No: _______________ Dated: _______________</strong>
            </div>

            <div style={{ marginTop: '20px', fontSize: '10pt' }}>
              <em
                style={{
                  fontStyle: 'italic',
                  textDecoration: 'underline',
                  fontWeight: 'bold',
                }}
              >
                Copy for information to the:
              </em>
              <ol style={{ textTransform: 'capitalize', margin: '4px 0 0 0', paddingLeft: '25px' }}>
                <li>District Comptroller of Accounts, {school.district?.toLowerCase()}.</li>
                <li>District Finance Office, {school.district?.toLowerCase()}.</li>
                <li>District Education Office ({school.gender?.toLowerCase()}) {school.district?.toLowerCase()}.</li>
                <li>Office/School Record.</li>
              </ol>
            </div>

            <div
              style={{
                marginTop: '40px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    borderBottom: '1px solid #000',
                    width: '220px',
                    height: '50px',
                  }}
                ></div>
                <div style={{ marginTop: '5px' }}>
                  <strong>{school.principal_designation}</strong>
                </div>
                <div>{school.name}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Global styles for table */}
      <style jsx global>{`
        .pdf-content table {
          border-collapse: collapse;
          width: 100%;
        }
        .pdf-content table th,
        .pdf-content table td {
          border: 1px solid #000;
          padding: 4px 6px;
          font-size: 10pt;
          vertical-align: middle !important;
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
      `}</style>
    </div>
  );
}
