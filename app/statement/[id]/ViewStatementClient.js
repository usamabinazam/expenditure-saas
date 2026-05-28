'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { formatNumber } from '@/lib/utils';

export default function ViewStatementClient({ userEmail, school, statement }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const data = statement.data;

  // ============================================================
  // FILTER: Sirf wo heads dikhao jin mein koi value ho
  // (budget, this_month, ya previous - kuch bhi non-zero)
  // ============================================================
  const hasData = (item) => {
    const budget = parseFloat(item.budget) || 0;
    const thisMonth = parseFloat(item.this_month) || 0;
    const previous = parseFloat(item.previous) || 0;
    return budget !== 0 || thisMonth !== 0 || previous !== 0;
  };

  // Filtered sections - sirf heads with data
  const filteredPays = (data.pays || []).filter(hasData);
  const filteredAllowances = (data.allowances || []).filter(hasData);
  const filteredNonSalary = (data.non_salary || []).filter(hasData);

  // AUTO-FIT TO ONE A4 PAGE
  const calculateScaleFactor = (element) => {
    const A4_USABLE_HEIGHT_PX = 1010;
    const contentHeight = element.scrollHeight;
    if (contentHeight <= A4_USABLE_HEIGHT_PX) return 1.0;
    const scale = (A4_USABLE_HEIGHT_PX - 20) / contentHeight;
    return Math.max(0.5, scale);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('pdfContent');
      const filename = `Expenditure_${statement.month_name}_${statement.year}.pdf`;

      const scale = calculateScaleFactor(element);

      const originalTransform = element.style.transform;
      const originalTransformOrigin = element.style.transformOrigin;
      const originalWidth = element.style.width;

      if (scale < 1.0) {
        element.style.transform = `scale(${scale})`;
        element.style.transformOrigin = 'top left';
        element.style.width = `${100 / scale}%`;
      }

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          windowHeight: element.scrollHeight,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: { mode: 'avoid-all' },
      };

      await html2pdf().set(opt).from(element).save();

      element.style.transform = originalTransform;
      element.style.transformOrigin = originalTransformOrigin;
      element.style.width = originalWidth;
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('pdfContent');
    const scale = calculateScaleFactor(element);
    const printContent = element.innerHTML;
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Statement</title>
          <style>
            @page { size: A4; margin: 15mm; }
            html, body { margin: 0; padding: 0; }
            body { font-family: 'Times New Roman', serif; color: #000; }
            .print-container {
              transform: scale(${scale});
              transform-origin: top left;
              width: ${100 / scale}%;
            }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 4px 6px; font-size: 10pt; }
            th { background: #d0d0d0; font-weight: bold; text-align: center; }
            .section-divider { background: #000 !important; color: white !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .subtotal { background: #b8b8b8 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .grand-total { background: #000 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @media print {
              .print-container { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">${printContent}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const renderTableRow = (item) => (
    <tr key={item.code}>
      <td>
        <span style={{ fontSize: '9pt' }}>{item.code}</span>&nbsp;&nbsp;{item.name}
      </td>
      <td style={{ textAlign: 'right' }}>{item.budget ? formatNumber(item.budget) : ''}</td>
      <td style={{ textAlign: 'right' }}>{item.this_month ? formatNumber(item.this_month) : ''}</td>
      <td style={{ textAlign: 'right' }}>{item.previous ? formatNumber(item.previous) : ''}</td>
      <td style={{ textAlign: 'right' }}>{item.total ? formatNumber(item.total) : ''}</td>
      <td style={{ textAlign: 'right' }}>{item.saving ? formatNumber(item.saving) : ''}</td>
      <td style={{ textAlign: 'right' }}>{item.excess ? formatNumber(item.excess) : ''}</td>
    </tr>
  );

  const renderSubtotalRow = (label, sub) => (
    <tr className="subtotal">
      <td><strong>{label}</strong></td>
      <td style={{ textAlign: 'right' }}>{sub.budget ? formatNumber(sub.budget) : ''}</td>
      <td style={{ textAlign: 'right' }}><strong>{formatNumber(sub.this_month)}</strong></td>
      <td style={{ textAlign: 'right' }}>{sub.previous ? formatNumber(sub.previous) : ''}</td>
      <td style={{ textAlign: 'right' }}><strong>{formatNumber(sub.total)}</strong></td>
      <td style={{ textAlign: 'right' }}>{sub.saving ? formatNumber(sub.saving) : ''}</td>
      <td style={{ textAlign: 'right' }}><strong>{sub.excess ? formatNumber(sub.excess) : ''}</strong></td>
    </tr>
  );

  // Total visible rows (after filter)
  const totalRows = filteredPays.length + filteredAllowances.length + filteredNonSalary.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📄 {statement.month_name} {statement.year}
            </h1>
            <p className="text-gray-600">Reconciliation Statement</p>
          </div>
          <div className="flex gap-2">
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
          📄 <strong>Smart Display:</strong> Sirf {totalRows} heads dikhaye ja rahe hain jin mein data hai. Khaali heads automatically hide ho gaye.
        </div>

        {/* Summary cards */}
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

        {/* PDF Preview */}
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <div id="pdfContent" className="pdf-content">
            {/* Header */}
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

            {/* Table */}
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
                {/* PAYS section - only if has filtered rows */}
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

                {/* ALLOWANCES section - only if has filtered rows */}
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

                {/* NON-SALARY section - only if has filtered rows */}
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

                {/* Grand Total */}
                <tr className="grand-total">
                  <td><strong>GRAND TOTAL</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{data.grand_total.budget ? formatNumber(data.grand_total.budget) : ''}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{formatNumber(data.grand_total.this_month)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {data.grand_total.previous ? formatNumber(data.grand_total.previous) : ''}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{formatNumber(data.grand_total.total)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {data.grand_total.saving ? formatNumber(data.grand_total.saving) : ''}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>
                      {data.grand_total.excess ? formatNumber(data.grand_total.excess) : ''}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Dated - left side */}
            <div style={{ marginTop: '30px' }}>
              <strong>Endoresment No: _______________ Dated:_______________</strong> 
            </div>

            {/* Copy To section */}
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
                <li>District Comptroller of Accounts, {school.district.?toLowerCase()}.</li>
                <li>District Finance Office, {school.district.?toLowerCase()}.</li>
                <li>District Education Office ({school.gender.?toLowerCase()}) {school.district.?toLowerCase()}.</li>
                <li>Office/School Record.</li>
              </ol>
            </div>

            {/* Principal Signature - bottom right */}
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
    </div>
  );
}
