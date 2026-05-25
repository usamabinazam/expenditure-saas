'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { formatNumber } from '@/lib/utils';

export default function ViewStatementClient({ userEmail, school, statement }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const data = statement.data;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('pdfContent');
      const filename = `Expenditure_${statement.month_name}_${statement.year}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('pdfContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Statement</title>
          <style>
            body { font-family: 'Times New Roman', serif; color: #000; margin: 20mm; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 4px 6px; font-size: 10pt; }
            th { background: #d0d0d0; font-weight: bold; text-align: center; }
            .section-divider { background: #000 !important; color: white !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .subtotal { background: #b8b8b8 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .grand-total { background: #000 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @media print { @page { size: A4; margin: 15mm; } }
          </style>
        </head>
        <body>${printContent}</body>
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
                OFFICE OF THE {school.principal_designation} {school.name}
              </div>
              <div
                style={{
                  fontSize: '14pt',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  marginTop: '2px',
                }}
              >
                {school.district}
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11pt', margin: '10px 0 6px 0' }}>
              RECONCILIATION STATEMENT OF PAY AND ALLOWANCES FOR THE MONTH OF{' '}
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
                <u>{school.department}</u>
              </div>
              <div>
                <strong>DDO CODE</strong> &nbsp;&nbsp;&nbsp; <u>{school.ddo_code}</u>
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
                <tr>
                  <td colSpan="2" className="section-divider">PAYS</td>
                  <td colSpan="5" style={{ background: 'transparent', border: 'none' }}></td>
                </tr>
                {data.pays.map(renderTableRow)}
                {renderSubtotalRow('Total Pays', data.pays_subtotal)}

                <tr>
                  <td colSpan="2" className="section-divider">REGULAR ALLOWENCES</td>
                  <td colSpan="5" style={{ background: 'transparent', border: 'none' }}></td>
                </tr>
                {data.allowances.map(renderTableRow)}
                {renderSubtotalRow('Total Regular Allowances', data.allowances_subtotal)}

                {renderSubtotalRow('Total Pays + Regular Allowances', data.grand_total)}

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
              <strong>Dated:</strong> _______________
            </div>

            {/* Copy To section - with 4th item added */}
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
              <ol style={{ margin: '4px 0 0 0', paddingLeft: '25px' }}>
                <li>District Comptroller of Accounts, {school.district}.</li>
                <li>District Finance Office, {school.district}.</li>
                <li>District Education Office ({school.gender}) {school.district}.</li>
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
