'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { parsePayrollPDF, matchToBudgetHeads } from '@/lib/pdfParser';
import { formatNumber } from '@/lib/utils';

export default function PDFUploader({ budgetHeads, onAmountsExtracted }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ============================================================
  // HANDLE FILE UPLOAD
  // ============================================================
  const handleFile = async (file) => {
    setError('');
    setParseResult(null);

    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Sirf PDF file upload karein');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('PDF size 10MB se kam hona chahiye');
      return;
    }

    setIsProcessing(true);

    try {
      // Parse PDF
      const { amounts, summary } = await parsePayrollPDF(file);

      if (Object.keys(amounts).length === 0) {
        setError('PDF se koi data extract nahi hua. Kya yeh sahi Payroll Summary PDF hai?');
        setIsProcessing(false);
        return;
      }

      // Match to user's budget heads
      const matchResult = matchToBudgetHeads(amounts, budgetHeads);

      setParseResult({
        amounts,
        summary,
        ...matchResult,
        fileName: file.name,
      });

      setShowReview(true);
    } catch (err) {
      console.error('PDF parse error:', err);
      setError('PDF parse nahi ho saka: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // ============================================================
  // CONFIRM USE - send amounts to parent
  // ============================================================
  const handleUseValues = () => {
    if (!parseResult) return;

    // Build amounts object: { code: amount }
    const formAmounts = {};
    parseResult.matchedHeads.forEach(item => {
      formAmounts[item.code] = item.amount;
    });

    onAmountsExtracted(formAmounts);
    setShowReview(false);
    setParseResult(null);
  };

  const handleClose = () => {
    setShowReview(false);
    setParseResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group matched heads by section for display
  const groupBySection = (matchedHeads) => {
    const groups = { pays: [], allowances: [], non_salary: [] };
    matchedHeads.forEach(item => {
      if (groups[item.section]) {
        groups[item.section].push(item);
      }
    });
    return groups;
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {/* UPLOAD BOX */}
      <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-dashed border-blue-300 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-3xl">⚡</div>
          <div className="flex-1">
            <div className="font-bold text-gray-800 flex items-center gap-2">
              Auto-Fill from Payroll PDF
              <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
                NEW!
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              AGP/Treasury ki Payroll Summary PDF upload karein - 2 ghante ka kaam 5 second mein!
            </div>
          </div>
        </div>

        {/* Drag-Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 rounded-lg p-6 text-center transition-all cursor-pointer
            ${isDragging 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
          
          {isProcessing ? (
            <div>
              <div className="text-4xl mb-2 animate-pulse">⏳</div>
              <div className="font-medium text-gray-700">
                PDF parse ho raha hai...
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Bas 2-3 second lagenge
              </div>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📎</div>
              <div className="font-medium text-gray-700">
                PDF yahan drag karo ya <span className="text-emerald-700 underline">click karke browse karo</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Email se aati hai jo PAYROLL_SUMMARY_PDF___... wali file - wahi upload karein
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mt-3 text-sm">
            ❌ {error}
          </div>
        )}
      </div>

      {/* ============================================================
          REVIEW MODAL - Shows after PDF parsed
          ============================================================ */}
      {showReview && parseResult && (
        <ReviewModal
          parseResult={parseResult}
          onConfirm={handleUseValues}
          onClose={handleClose}
          groupBySection={groupBySection}
        />
      )}
    </>
  );
}

// ============================================================
// REVIEW MODAL - Shows what was found
// ============================================================
function ReviewModal({ parseResult, onConfirm, onClose, groupBySection }) {
  const grouped = groupBySection(parseResult.matchedHeads);
  
  const sectionIcons = {
    pays: '💰',
    allowances: '🎁',
    non_salary: '🛠️',
  };
  
  const sectionLabels = {
    pays: 'PAYS',
    allowances: 'ALLOWANCES',
    non_salary: 'NON-SALARY',
  };

  // Calculate totals
  const matchedTotal = parseResult.matchedHeads.reduce((sum, h) => sum + h.amount, 0);
  const missingTotal = parseResult.missingCodes.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                ✅ PDF Parsed!
              </h2>
              <div className="text-sm text-gray-600 mt-1">
                File: <span className="font-mono">{parseResult.fileName}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-xs text-emerald-700 font-bold uppercase">Matched Heads</div>
              <div className="text-2xl font-bold text-emerald-900">
                {parseResult.matchedHeads.length}
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                Total: Rs. {formatNumber(matchedTotal)}
              </div>
            </div>
            <div className={`border rounded-lg p-3 ${
              parseResult.missingCodes.length > 0 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`text-xs font-bold uppercase ${
                parseResult.missingCodes.length > 0 ? 'text-amber-700' : 'text-gray-500'
              }`}>
                Missing in Budget Heads
              </div>
              <div className={`text-2xl font-bold ${
                parseResult.missingCodes.length > 0 ? 'text-amber-900' : 'text-gray-400'
              }`}>
                {parseResult.missingCodes.length}
              </div>
              {parseResult.missingCodes.length > 0 && (
                <div className="text-xs text-amber-700 mt-1">
                  Total: Rs. {formatNumber(missingTotal)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          
          {/* MATCHED HEADS - Section by section */}
          {parseResult.matchedHeads.length > 0 ? (
            <div className="mb-6">
              <h3 className="font-bold text-gray-800 mb-3">
                ✅ Yeh values fill ho jayengi:
              </h3>
              
              {['pays', 'allowances', 'non_salary'].map(section => {
                const items = grouped[section];
                if (!items || items.length === 0) return null;
                
                const sectionTotal = items.reduce((sum, i) => sum + i.amount, 0);
                
                return (
                  <div key={section} className="mb-4 bg-gray-50 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                      <div className="font-bold text-sm text-gray-700">
                        {sectionIcons[section]} {sectionLabels[section]}
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        Rs. {formatNumber(sectionTotal)}
                      </div>
                    </div>
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        {items.map(item => (
                          <tr key={item.code} className="hover:bg-white">
                            <td className="px-4 py-2 font-mono text-xs text-gray-600 w-24">
                              {item.code}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-800">
                              {item.name}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-emerald-700">
                              Rs. {formatNumber(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
              ⚠️ Koi code match nahi hua tumhare Budget Heads se. Pehle <Link href="/heads" className="underline font-bold">Manage Heads</Link> mein codes add karein.
            </div>
          )}

          {/* MISSING CODES WARNING */}
          {parseResult.missingCodes.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
              <div className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <span>Yeh Codes Tumhare Budget Heads Mein Nahi Hain:</span>
              </div>
              <div className="text-sm text-amber-800 mb-3">
                Yeh codes PDF mein mile lekin <strong>Manage Heads</strong> mein nahi hain. 
                Yeh values <strong>fill nahi hongi</strong>. Agar yeh use karne hain to pehle 
                <Link href="/heads" className="underline font-bold mx-1">Manage Heads</Link> mein add karein.
              </div>
              
              <div className="bg-white rounded border border-amber-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-amber-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-bold text-amber-900">Code</th>
                      <th className="text-right px-3 py-2 font-bold text-amber-900">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {parseResult.missingCodes.map(item => (
                      <tr key={item.code}>
                        <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatNumber(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Link 
                href="/heads" 
                className="inline-block mt-3 text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-medium"
              >
                📋 Manage Heads Kholne
              </Link>
            </div>
          )}

          {/* INFO BANNER */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            💡 <strong>Tip:</strong> "Use These Values" click karne ke baad bhi tum form mein 
            manually edit kar sakte ho submit se pehle.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t p-6 rounded-b-xl flex gap-3 justify-end flex-wrap">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
          >
            ✗ Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={parseResult.matchedHeads.length === 0}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ Use These Values ({parseResult.matchedHeads.length})
          </button>
        </div>
      </div>
    </div>
  );
}
