// app/ac-bills/ACBillsClient.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';

// ===== Data =====
const HEADS = {
  // Utilities — no deductions
  'A03303': {full:'Electricity Charges',    short:'Electricity', descPattern:'Electricity bill for the month of {month} {year}', deductions:{gst:0,  incomeTax:0,  stampDuty:0}},
  'A03301': {full:'Gas Charges',            short:'Gas',         descPattern:'Gas bill for the month of {month} {year}',         deductions:{gst:0,  incomeTax:0,  stampDuty:0}},
  'A03302': {full:'Water Charges',          short:'Water',       descPattern:'Water bill for the month of {month} {year}',       deductions:{gst:0,  incomeTax:0,  stampDuty:0}},
  'A03202': {full:'Telephone & Trunk Call', short:'Telephone',   descPattern:'Telephone bill for the month of {month} {year}',   deductions:{gst:0,  incomeTax:0,  stampDuty:0}},
  'A03201': {full:'Postage & Telegraph',    short:'Postage',     descPattern:'Postage & telegraph charges for the month of {month} {year}', deductions:{gst:0,  incomeTax:0,  stampDuty:0}},
  // Purchases — GST 18% + Income Tax 10% + Stamp Duty 2%
  'A03901': {full:'Stationery',                short:'Stationery', descPattern:'Purchase of stationery items - {month} {year}',         deductions:{gst:18, incomeTax:10, stampDuty:2}},
  'A03902': {full:'Printing & Publication',    short:'Printing',   descPattern:'Printing & publication expenses - {month} {year}',      deductions:{gst:18, incomeTax:10, stampDuty:2}},
  'A03933': {full:'Uniform & Liveries',        short:'Uniform',    descPattern:'Purchase of uniform & liveries - {month} {year}',       deductions:{gst:18, incomeTax:10, stampDuty:2}},
  'A03304': {full:'Hot & Cold Weather Charges', short:'Hot & Cold', descPattern:'Hot & cold weather expenses - {month} {year}',         deductions:{gst:18, incomeTax:10, stampDuty:2}},
  'A09601': {full:'Purchase of Machinery',     short:'Machinery',  descPattern:'Purchase of machinery - {month} {year}',                deductions:{gst:18, incomeTax:10, stampDuty:2}},
  'A09701': {full:'Purchase of Furniture',     short:'Furniture',  descPattern:'Purchase of furniture & fixtures - {month} {year}',     deductions:{gst:18, incomeTax:10, stampDuty:2}},
  'A03970': {full:'Other Contingency',         short:'Contingency', descPattern:'Other contingency expenditure - {month} {year}',       deductions:{gst:18, incomeTax:10, stampDuty:2}}
};

const DISTRICTS = {
  'abbottabad': { govtCode: 'ATD', businessArea: 'DGAD' },
  'haripur':    { govtCode: '',    businessArea: 'DGHU' },
};

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

const STORAGE_KEY = 'ac_bills_extras_v1';

// ===== Helpers =====
const fmt = (n) => Math.round(Number(n) || 0).toString();
const fmtComma = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const fmtRsSuffix = (n) => fmtComma(n) + '/-';
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default function ACBillsClient({ userEmail, school }) {
  // ===== State =====
  const [office, setOffice] = useState({
    ddoCode: '',
    schoolShort: '',
    schoolFull: '',
    district: '',
    designation: 'Principal',
    daoCode: '',
    preSerial: '',
    counterNo: '001',
    govtCode: 'ATD',
    businessArea: 'DGAD',
    functionCode: '092100',
    clCode: '01',
    cnCode: '01',
    documentCode: '',
    sanctionRules: 'Khyber Pakhtunkhwa Delegation of Financial Powers Rules, 2018 under schedule No. 2 (ii-k)',
    functionHierarchy: '09-Education Affairs & Services 092-Secondary Education Affairs & Services 0921 Lower Secondary Education Affairs & Services 092100 Administration',
  });

  const [voucherMonth, setVoucherMonth] = useState('JUNE');
  const [voucherYear, setVoucherYear] = useState('2026');
  const [headCode, setHeadCode] = useState('A03303');
  const [bankAccount, setBankAccount] = useState('Non Food');
  const [bills, setBills] = useState([{ month: 'JANUARY', amount: '' }]);
  const [annualBudget, setAnnualBudget] = useState('');
  const [revisedBudget, setRevisedBudget] = useState('');
  const [prevExp, setPrevExp] = useState('');
  const [salesTaxPct, setSalesTaxPct] = useState(0);
  const [incomeTaxPct, setIncomeTaxPct] = useState(0);
  const [stampDutyPct, setStampDutyPct] = useState(0);
  const [collapsed, setCollapsed] = useState({ coded: true, sanction: true });

  // ===== Effects =====

  // Pre-fill office from school prop (Supabase row)
  useEffect(() => {
    if (!school) return;
    setOffice(prev => ({
      ...prev,
      ddoCode: school.ddo_code || prev.ddoCode,
      schoolShort: school.short_name || school.name || prev.schoolShort,
      schoolFull: school.full_name || school.name || prev.schoolFull,
      district: school.district || prev.district,
      designation: school.designation || school.head_designation || prev.designation,
      daoCode: school.dao_code || prev.daoCode,
    }));
  }, [school]);

  // Load A/C Bills-specific extras from localStorage (the codes that don't live in `schools`)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setOffice(prev => ({ ...prev, ...data }));
      }
    } catch (e) {}
  }, []);

  // Save A/C Bills extras to localStorage
  useEffect(() => {
    try {
      const extras = {
        counterNo: office.counterNo,
        govtCode: office.govtCode,
        businessArea: office.businessArea,
        functionCode: office.functionCode,
        clCode: office.clCode,
        cnCode: office.cnCode,
        documentCode: office.documentCode,
        sanctionRules: office.sanctionRules,
        functionHierarchy: office.functionHierarchy,
        preSerial: office.preSerial,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
    } catch (e) {}
  }, [office.counterNo, office.govtCode, office.businessArea, office.functionCode, office.clCode, office.cnCode, office.documentCode, office.sanctionRules, office.functionHierarchy, office.preSerial]);

  // District change → auto-fill govt code & business area
  useEffect(() => {
    const data = DISTRICTS[office.district?.trim().toLowerCase()];
    if (data) {
      setOffice(prev => ({
        ...prev,
        govtCode: data.govtCode || prev.govtCode,
        businessArea: data.businessArea || prev.businessArea,
      }));
    }
  }, [office.district]);

  // Head change → auto-fill deduction rates
  useEffect(() => {
    const head = HEADS[headCode];
    if (!head) return;
    setSalesTaxPct(head.deductions.gst);
    setIncomeTaxPct(head.deductions.incomeTax);
    setStampDutyPct(head.deductions.stampDuty);
  }, [headCode]);

  // ===== Derived =====
  const head = HEADS[headCode];

  const total = useMemo(
    () => bills.reduce((s, b) => s + (Number(b.amount) || 0), 0),
    [bills]
  );

  const st = Math.round(total * (Number(salesTaxPct) || 0) / 100);
  const it = Math.round(total * (Number(incomeTaxPct) || 0) / 100);
  const sd = Math.round(total * (Number(stampDutyPct) || 0) / 100);
  const dTotal = st + it + sd;
  const net = total - dTotal;

  const annualNum = Number(annualBudget) || 0;
  const revisedNum = Number(revisedBudget) || 0;
  const prevExpNum = Number(prevExp) || 0;
  const bapBudget = revisedNum || annualNum;
  const balanceBefore = bapBudget - prevExpNum;
  const balanceAfter = balanceBefore - total;

  const visibleBills = bills.filter(b => Number(b.amount) > 0);

  // For Coded Proforma + Sanction
  const ddoFormatted = office.ddoCode ? office.ddoCode.replace(/^([A-Z]+)(\d+)$/, '$1-$2') : '';
  const officeHeader = office.schoolFull
    ? `OFFICE OF THE ${office.designation.toUpperCase()} ${office.schoolFull.toUpperCase()}`
    : '';
  const sigSchool = office.schoolShort
    ? `${office.schoolShort}${office.district ? ' ' + office.district : ''}`
    : '';

  // ===== Handlers =====
  const updateOffice = (field, value) => setOffice(prev => ({ ...prev, [field]: value }));

  const addBill = () => {
    const last = bills[bills.length - 1];
    const nextMonth = last ? MONTHS[(MONTHS.indexOf(last.month) + 1) % 12] : 'JANUARY';
    setBills([...bills, { month: nextMonth, amount: '' }]);
  };
  const removeBill = (i) => {
    const next = bills.filter((_, idx) => idx !== i);
    setBills(next.length ? next : [{ month: 'JANUARY', amount: '' }]);
  };
  const updateBill = (i, field, value) => {
    setBills(bills.map((b, idx) => idx === i ? { ...b, [field]: value } : b));
  };

  const handleClear = () => {
    if (!confirm('Clear all bills and budget figures?')) return;
    setBills([{ month: 'JANUARY', amount: '' }]);
    setAnnualBudget('');
    setRevisedBudget('');
    setPrevExp('');
    // Reset deductions from head profile
    setSalesTaxPct(head?.deductions.gst || 0);
    setIncomeTaxPct(head?.deductions.incomeTax || 0);
    setStampDutyPct(head?.deductions.stampDuty || 0);
  };

  const handlePrint = () => window.print();

  // ===== Render =====
  return (
    <>
      <div className="acb-no-print">
        <Navigation userEmail={userEmail} />
      </div>

      {/* Top bar */}
      <div className="acb-no-print bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold text-emerald-900">A/C Bills Generator</h1>
          <p className="text-xs text-emerald-700">Claim Voucher · Coded Proforma · Budget Availability · Sanction Order</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm text-emerald-800 bg-white border border-emerald-200 rounded hover:bg-emerald-50"
          >
            Clear
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm bg-emerald-700 text-white rounded hover:bg-emerald-800 font-medium"
          >
            Print all 4 documents
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] min-h-[calc(100vh-180px)] bg-gray-100">

        {/* ============ FORM PANEL ============ */}
        <aside className="acb-no-print bg-white border-r border-gray-200 p-5 overflow-y-auto lg:max-h-[calc(100vh-180px)] lg:sticky lg:top-0">

          <FormSection title="Voucher Period & Head">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Field label="Voucher Month">
                <select value={voucherMonth} onChange={e => setVoucherMonth(e.target.value)} className={inputCls}>
                  {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Year">
                <input type="number" value={voucherYear} onChange={e => setVoucherYear(e.target.value)} min="2020" max="2099" className={inputCls} />
              </Field>
            </div>
            <Field label="Expenditure Head">
              <select value={headCode} onChange={e => setHeadCode(e.target.value)} className={inputCls}>
                <optgroup label="Utilities — no deductions">
                  <option value="A03303">A03303 — Electricity Charges</option>
                  <option value="A03301">A03301 — Gas Charges</option>
                  <option value="A03302">A03302 — Water Charges</option>
                  <option value="A03202">A03202 — Telephone & Trunk Call</option>
                  <option value="A03201">A03201 — Postage & Telegraph</option>
                </optgroup>
                <optgroup label="Purchases — GST 18% + IT 10% + Stamp 2%">
                  <option value="A03901">A03901 — Stationery</option>
                  <option value="A03902">A03902 — Printing & Publication</option>
                  <option value="A03933">A03933 — Uniform & Liveries</option>
                  <option value="A03304">A03304 — Hot & Cold Weather Charges</option>
                  <option value="A09601">A09601 — Purchase of Machinery</option>
                  <option value="A09701">A09701 — Purchase of Furniture</option>
                  <option value="A03970">A03970 — Other Contingency</option>
                </optgroup>
              </select>
            </Field>
            <Field label="Bank Account Type">
              <select value={bankAccount} onChange={e => setBankAccount(e.target.value)} className={inputCls}>
                <option>Non Food</option>
                <option>Food</option>
              </select>
            </Field>
          </FormSection>

          <FormSection title="Bills">
            <div className="flex flex-col gap-2">
              {bills.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_32px] gap-1.5 items-center">
                  <select value={b.month} onChange={e => updateBill(i, 'month', e.target.value)} className={inputCls + ' !text-xs !py-1.5'}>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <input
                    type="number" placeholder="Amount" value={b.amount}
                    onChange={e => updateBill(i, 'amount', e.target.value)}
                    min="0"
                    className={inputCls + ' !text-xs !py-1.5 text-right tabular-nums'}
                  />
                  <button
                    onClick={() => removeBill(i)}
                    className="w-8 h-8 rounded text-red-700 bg-red-50 hover:bg-red-100 text-lg leading-none"
                    title="Remove"
                  >×</button>
                </div>
              ))}
            </div>
            <button onClick={addBill} className="mt-2 w-full py-2 border border-dashed border-gray-300 rounded text-sm text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400">
              + Add bill
            </button>
          </FormSection>

          <FormSection title="Budget Tracking">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Field label="Annual Budget">
                <input type="number" value={annualBudget} onChange={e => setAnnualBudget(e.target.value)} placeholder="0" min="0" className={inputCls + ' text-right tabular-nums'} />
              </Field>
              <Field label="Revised Budget">
                <input type="number" value={revisedBudget} onChange={e => setRevisedBudget(e.target.value)} placeholder="0" min="0" className={inputCls + ' text-right tabular-nums'} />
              </Field>
            </div>
            <Field label="Previous Expenditure (this fiscal year)">
              <input type="number" value={prevExp} onChange={e => setPrevExp(e.target.value)} placeholder="0" min="0" className={inputCls + ' text-right tabular-nums'} />
            </Field>

            <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded px-3 py-2 text-xs tabular-nums">
              <Row label="Bills total" value={fmt(total)} bold />
              {bapBudget > 0 && <Row label="Balance before claim" value={fmt(balanceBefore)} />}
              {dTotal > 0 && <Row label="Deductions" value={fmt(dTotal)} />}
              {bapBudget > 0 && (
                <Row
                  label="Balance after claim"
                  value={fmt(balanceAfter)}
                  total
                  negative={balanceAfter < 0}
                />
              )}
              <Row label="Net payable" value={fmt(net)} total />
            </div>
          </FormSection>

          <FormSection title="Deductions" hint="% of bills total — auto-fills from head">
            <DedRow label="Sales Tax (GST)" pct={salesTaxPct} setPct={setSalesTaxPct} amt={st} />
            <DedRow label="Income Tax" pct={incomeTaxPct} setPct={setIncomeTaxPct} amt={it} />
            <DedRow label="Stamp Duty" pct={stampDutyPct} setPct={setStampDutyPct} amt={sd} />
          </FormSection>

          <CollapsibleSection
            title="Office Details"
            hint="pre-filled from your school profile"
            collapsed={false}
          >
            <Field label="DDO Code">
              <input value={office.ddoCode} onChange={e => updateOffice('ddoCode', e.target.value)} placeholder="e.g. AD6234" className={inputCls} />
            </Field>
            <Field label="School Short Name">
              <input value={office.schoolShort} onChange={e => updateOffice('schoolShort', e.target.value)} placeholder="e.g. GHS Chunali" className={inputCls} />
            </Field>
            <Field label="School Full Name">
              <input value={office.schoolFull} onChange={e => updateOffice('schoolFull', e.target.value)} placeholder="e.g. Govt. High School Chunali" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="District">
                <input value={office.district} onChange={e => updateOffice('district', e.target.value)} placeholder="e.g. Abbottabad" className={inputCls} />
              </Field>
              <Field label="Designation">
                <input value={office.designation} onChange={e => updateOffice('designation', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="DAO Code">
                <input value={office.daoCode} onChange={e => updateOffice('daoCode', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Pre-printed Serial No.">
                <input value={office.preSerial} onChange={e => updateOffice('preSerial', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Coded Proforma Codes"
            hint="auto-fill from district"
            collapsed={collapsed.coded}
            onToggle={() => setCollapsed(c => ({ ...c, coded: !c.coded }))}
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label="Counter No.">
                <input value={office.counterNo} onChange={e => updateOffice('counterNo', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Govt. Code">
                <input value={office.govtCode} onChange={e => updateOffice('govtCode', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Business Area (Dep)">
                <input value={office.businessArea} onChange={e => updateOffice('businessArea', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Function Code">
                <input value={office.functionCode} onChange={e => updateOffice('functionCode', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="CL Code">
                <input value={office.clCode} onChange={e => updateOffice('clCode', e.target.value)} className={inputCls} />
              </Field>
              <Field label="CN Code">
                <input value={office.cnCode} onChange={e => updateOffice('cnCode', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Document Code (usually blank)">
              <input value={office.documentCode} onChange={e => updateOffice('documentCode', e.target.value)} className={inputCls} />
            </Field>
          </CollapsibleSection>

          <CollapsibleSection
            title="Sanction Order Text"
            hint="editable defaults"
            collapsed={collapsed.sanction}
            onToggle={() => setCollapsed(c => ({ ...c, sanction: !c.sanction }))}
          >
            <Field label="Financial Powers reference">
              <textarea
                value={office.sanctionRules}
                onChange={e => updateOffice('sanctionRules', e.target.value)}
                rows={2}
                className={inputCls + ' resize-y leading-snug'}
              />
            </Field>
            <Field label="Function hierarchy (in sanction body)">
              <textarea
                value={office.functionHierarchy}
                onChange={e => updateOffice('functionHierarchy', e.target.value)}
                rows={3}
                className={inputCls + ' resize-y leading-snug'}
              />
            </Field>
          </CollapsibleSection>

        </aside>

        {/* ============ PREVIEW PANEL ============ */}
        <section className="bg-gray-100 overflow-y-auto lg:max-h-[calc(100vh-180px)]">

          {/* Doc tabs */}
          <div className="acb-no-print sticky top-0 z-10 bg-gray-100 px-5 py-3 border-b border-gray-200 flex gap-1.5 flex-wrap">
            {[
              ['doc-voucher', 'Claim Voucher'],
              ['doc-coded', 'Coded Proforma'],
              ['doc-bap', 'Budget Availability'],
              ['doc-sanction', 'Sanction Order'],
            ].map(([id, label], i) => (
              <a key={id} href={`#${id}`} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded text-gray-600 hover:border-emerald-600 hover:text-emerald-800">
                <span className="inline-flex w-4 h-4 mr-1.5 rounded-full bg-emerald-50 text-emerald-700 items-center justify-center text-[10px] font-bold">{i + 1}</span>
                {label}
              </a>
            ))}
          </div>

          <div className="max-w-[794px] mx-auto p-5">

            {/* ============== DOC 1: CLAIM VOUCHER ============== */}
            <div className="acb-voucher acb-doc-voucher" id="doc-voucher">
              <div className="acb-page-marker">4 B</div>
              <h2 className="acb-v-title">Claim Voucher Form (SAP Computerized system)</h2>

              <div className="acb-v-top-row">
                <div className="acb-v-box-left">
                  <div>Pre-printed</div>
                  <div>Serial Number</div>
                  <div style={{ marginTop: '2px', fontWeight: 600 }}>{office.preSerial || '\u00A0'}</div>
                </div>
                <div className="acb-v-box-right">
                  <div className="top">DAO/AG Use only</div>
                  <div className="mid">&nbsp;</div>
                  <div className="bot">Claim Voucher Reference</div>
                </div>
              </div>

              <div className="acb-v-header-grid">
                <div className="labels">
                  <div>DDO Code</div><div>DDO Reference</div><div>Purchase Order/Contact No.</div><div>DAO Code</div><div>Date</div>
                </div>
                <div className="values">
                  <div>{office.ddoCode || '\u00A0'}</div>
                  <div>{office.schoolShort.toUpperCase() || '\u00A0'}</div>
                  <div>&nbsp;</div>
                  <div>{office.daoCode || '\u00A0'}</div>
                  <div>{voucherMonth} {voucherYear}</div>
                </div>
              </div>

              <div className="acb-v-payee-row">
                <div><div>Vendor Name</div><div className="underline"></div></div>
                <div><div>Alternate Payee</div><div className="underline"></div></div>
                <div><div>Imprest Float No.</div><div className="box"></div></div>
              </div>

              <table className="acb-v-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="col-sr">Serial<br />Number</th>
                    <th rowSpan={2}>Description</th>
                    <th rowSpan={2} className="col-amt">Amount</th>
                    <th colSpan={2}>Account Code 12</th>
                  </tr>
                  <tr><th className="col-obj">Object</th><th className="col-proj">Project</th></tr>
                </thead>
                <tbody>
                  <tr className="empty-row"><td className="col-sr">&nbsp;</td><td></td><td className="col-amt"></td><td></td><td></td></tr>
                  <tr className="head-row">
                    <td className="col-sr head-code">{headCode}</td>
                    <td className="head-desc">{head.full}</td>
                    <td className="col-amt"></td><td></td><td></td>
                  </tr>
                  {visibleBills.map((b, i) => {
                    const desc = head.descPattern.replace('{month}', b.month).replace('{year}', voucherYear);
                    return (
                      <tr key={i}>
                        <td className="col-sr">{i + 1}</td>
                        <td>{desc}</td>
                        <td className="col-amt">{fmt(b.amount)}</td>
                        <td></td><td></td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 6 - visibleBills.length) }).map((_, i) => (
                    <tr key={`pad-${i}`} className="empty-row"><td className="col-sr">&nbsp;</td><td></td><td className="col-amt"></td><td></td><td></td></tr>
                  ))}
                  <tr className="total-row"><td className="col-sr"></td><td>Total</td><td className="col-amt"></td><td></td><td></td></tr>
                  <tr className="gtotal-row"><td className="col-sr"></td><td>G.Total</td><td className="col-amt">{fmt(total)}</td><td></td><td></td></tr>
                </tbody>
              </table>

              <table className="acb-v-summary">
                <tbody>
                  <tr><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr><th>Object</th><th>Budget</th><th>PREV Exp:</th><th>This bill</th><th>Balance</th></tr>
                  <tr>
                    <td>{headCode}</td>
                    <td>{bapBudget ? fmt(bapBudget) : '\u00A0'}</td>
                    <td>{prevExpNum ? fmt(prevExpNum) : '\u00A0'}</td>
                    <td>{total ? fmt(total) : '\u00A0'}</td>
                    <td>{(bapBudget || prevExpNum || total) ? fmt(bapBudget - prevExpNum - total) : '\u00A0'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="acb-v-bottom">
                <div className="acb-v-deductions">
                  <table>
                    <tbody>
                      <tr className="label-row"><td colSpan={2}>Deductions</td></tr>
                      <tr><td>1&nbsp;&nbsp;Sales Tax</td><td className="col-amt">{fmt(st)}</td></tr>
                      <tr><td>2&nbsp;&nbsp;Income Tax</td><td className="col-amt">{fmt(it)}</td></tr>
                      <tr><td>3&nbsp;&nbsp;Stamp Duty</td><td className="col-amt">{fmt(sd)}</td></tr>
                      <tr className="total"><td>Total Deductions</td><td className="col-amt">{fmt(dTotal)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="acb-v-bank-box">
                  <div className="lbl">Bank Account</div>
                  <div className={`item ${bankAccount === 'Food' ? 'selected' : ''}`}>Food</div>
                  <div className={`item ${bankAccount === 'Non Food' ? 'selected' : ''}`}>Non Food</div>
                </div>
              </div>

              <div className="acb-v-net-row">
                <div className="label">Total (Net after deductions)</div>
                <div className="amt">{fmt(net)}</div>
                <div className="balance-label">Balance</div>
              </div>

              <div className="acb-v-appropriation">Appropriation <span className="line"></span></div>

              <div className="acb-v-footer">
                <div className="sig-row">
                  <div className="sig-field">Prepared By <span className="line"></span></div>
                  <div className="sig-field">Signature <span className="line"></span></div>
                  <div className="sig-field">Date <span className="line"></span></div>
                </div>
                <div className="sig-row">
                  <div className="sig-field">Approved By <span className="line"></span></div>
                  <div className="sig-field">Signature <span className="line"></span></div>
                  <div className="sig-field">Date <span className="line"></span></div>
                </div>
                <div className="stamp">Official<br />Stamp</div>
              </div>
            </div>

            {/* ============== DOC 2: CODED PROFORMA ============== */}
            <div className="acb-voucher acb-doc-coded" id="doc-coded">
              <h1 className="acb-cp-title">DISTRICT CODED CLASSIFICATION PROFORMA</h1>
              <div className="acb-cp-subtitle">{officeHeader || '\u00A0'}</div>

              <div className="acb-cp-subhead">
                <span className="lbl">SUB HEAD</span>
                <span className="val">{headCode}</span>
              </div>

              <CodedProformaFields office={office} />

              <div className="acb-cp-payment">
                <div>11 PAYMENT (DEBIT)</div>
                <div>DEDUCTION (CREDIT)</div>
              </div>

              <table className="acb-cp-table">
                <thead>
                  <tr>
                    <th className="col-obj">DETAILED OBJECT</th>
                    <th className="col-amt">AMOUNT</th>
                    <th className="col-head">DETAILED HEAD</th>
                    <th className="col-amt">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>{headCode}</td><td>{fmt(total)}</td><td>Sales Tax</td><td>{fmt(st)}</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td><td>Income Tax</td><td>{fmt(it)}</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td><td>Stamp Duty</td><td>{fmt(sd)}</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                </tbody>
              </table>

              <div className="acb-cp-totals">
                <div><span className="lbl">GROSS PAYMENT</span><span className="val">{fmt(total)}</span></div>
                <div><span className="lbl">TOTAL DEDUCTION</span><span className="val">{fmt(dTotal)}</span></div>
                <div><span className="lbl">NET PAYMENT RS,</span><span className="val">{fmt(net)}</span></div>
                <div></div>
              </div>

              <div className="acb-cp-signature">
                <div className="sig">
                  <div className="line">{office.designation}</div>
                </div>
              </div>
            </div>

            {/* ============== DOC 3: BUDGET AVAILABILITY ============== */}
            <div className="acb-voucher acb-doc-bap" id="doc-bap">
              <div className="acb-page-marker">4 AA</div>
              <h2 className="acb-bap-title">Budget Availability Review Clearance Form</h2>

              <div className="acb-bap-ddo">
                <span className="lbl">DDO Code:</span>
                <span className="val">{ddoFormatted || '\u00A0'}</span>
              </div>

              <div className="acb-bap-row">
                <div className="item">
                  <span className="lbl">Budget Head (Object):</span>
                  <span className="val">{headCode}</span>
                </div>
                <div className="item">
                  <span className="lbl">Budget Head Description</span>
                  <span className="val">{head.short.toUpperCase()}</span>
                </div>
              </div>

              <div className="acb-bap-row">
                <div className="item">
                  <span className="lbl">Annual Budget Amount:</span>
                  <span className="val">{annualNum ? fmtRsSuffix(annualNum) : '\u00A0'}</span>
                </div>
                <div className="item">
                  <span className="lbl">Revised Budget Amount:</span>
                  <span className="val">{revisedNum ? fmtRsSuffix(revisedNum) : '\u00A0'}</span>
                </div>
              </div>

              <div className="acb-bap-box">
                <div className="rupees">Rupees</div>
                <div className="acb-bap-line">
                  <span className="lbl">Budget Balance before this claim:</span>
                  <span className="val">{bapBudget ? fmtRsSuffix(balanceBefore) : '\u00A0'}</span>
                </div>
                <div className="acb-bap-line">
                  <span className="lbl">Total Amount of this claim:</span>
                  <span className="val">{total ? fmtRsSuffix(total) : '\u00A0'}</span>
                </div>
                <div className="acb-bap-line">
                  <span className="lbl">Budget Balance after this claim:</span>
                  <span className="val">{(bapBudget || total) ? fmtRsSuffix(balanceAfter) : '\u00A0'}</span>
                </div>
              </div>

              <div className="acb-bap-signatures">
                <div className="sig-line"><span className="lbl">Prepared By:</span><span className="line"></span><span className="lbl">Signature:</span><span className="line"></span><span className="lbl">Date:</span><span className="line"></span></div>
                <div className="sig-line"><span className="lbl">Checked By:</span><span className="line"></span><span className="lbl">Signature:</span><span className="line"></span><span className="lbl">Date:</span><span className="line"></span></div>
                <div className="sig-line"><span className="lbl">Approved By:</span><span className="line"></span><span className="lbl">Signature:</span><span className="line"></span><span className="lbl">Date:</span><span className="line"></span></div>
              </div>
            </div>

            {/* ============== DOC 4: SANCTION ORDER ============== */}
            <div className="acb-voucher acb-doc-sanction" id="doc-sanction">
              <div className="acb-s-header">
                <span>{officeHeader || '\u00A0'}</span>
                <span className="line2">{office.ddoCode ? `(${office.ddoCode})` : '\u00A0'}</span>
              </div>

              <div className="acb-s-label">SANCTION ORDER:</div>

              <p className="acb-s-para">
                Sanction to the incurrence of Expenditure and account of <b>{headCode}-{head.full.toUpperCase()}</b> amounting to <b>Rs. {fmtRsSuffix(total)}</b> is hereby accorded in term of {office.sanctionRules} in respect of <b>{office.ddoCode ? office.ddoCode + ' ' : ''}{office.schoolShort}{office.district ? ' District ' + office.district : ''}.</b>
              </p>
              <p className="acb-s-para">
                The Expenditure is involved under head <b>{office.functionHierarchy}, {headCode}-{head.full.toUpperCase()}.</b>
              </p>

              <div className="acb-s-sig">{office.designation}</div>

              <div className="acb-s-endst">
                <span>Endst No:</span>
                <span className="blank"></span>
                <span>/AC Bills dated A. Abad the</span>
                <span className="blank"></span>
                <span>/{voucherYear}</span>
              </div>

              <div className="acb-s-copy-label">Copy to the:</div>
              <ol className="acb-s-copy-list">
                <li>{office.district ? `District Comptroller of Accounts ${office.district}.` : 'District Comptroller of Accounts.'}</li>
              </ol>

              <div className="acb-s-sig">{office.designation}</div>
            </div>

          </div>
        </section>
      </div>
    </>
  );
}

// ===== Sub-components =====

const inputCls = "w-full px-2.5 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function Field({ label, children }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <label className="block text-[11px] text-gray-600 font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function FormSection({ title, hint, children }) {
  return (
    <div className="mb-4 pb-4 border-b border-gray-100 last:border-b-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-3 flex items-baseline gap-2">
        {title}
        {hint && <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">{hint}</span>}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function CollapsibleSection({ title, hint, collapsed, onToggle, children }) {
  return (
    <div className="mb-4 pb-4 border-b border-gray-100 last:border-b-0">
      <h3
        onClick={onToggle}
        className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-3 flex items-baseline gap-2 cursor-pointer select-none"
      >
        {title}
        {hint && <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">{hint}</span>}
        {onToggle && (
          <span className={`ml-auto text-gray-400 text-[10px] transition-transform ${collapsed ? '-rotate-90' : ''}`}>▾</span>
        )}
      </h3>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

function DedRow({ label, pct, setPct, amt }) {
  return (
    <div className="flex items-center gap-2.5 mb-2 last:mb-0">
      <label className="flex-none w-28 text-[11px] text-gray-600 font-medium">{label}</label>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="number" value={pct}
          onChange={e => setPct(e.target.value)}
          step="0.1" min="0" max="100"
          className="w-16 px-2 py-1.5 text-xs border border-gray-300 rounded text-right tabular-nums focus:outline-none focus:border-emerald-600"
        />
        <span className="text-[11px] text-gray-500">%</span>
        <span className="text-gray-400 mx-0.5">→</span>
        <span className="ml-auto text-sm text-emerald-800 font-semibold tabular-nums">{fmt(amt)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, bold, total, negative }) {
  return (
    <div className={`flex justify-between py-0.5 ${total ? 'border-t border-emerald-200 pt-1.5 mt-1 font-semibold text-emerald-900' : ''}`}>
      <span>{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${negative ? 'text-red-700' : ''}`}>{value}</span>
    </div>
  );
}

function CodedProformaFields({ office }) {
  const ddo = (office.ddoCode || '').toUpperCase();
  const docCode = (office.documentCode || '').toUpperCase();
  const govt = (office.govtCode || '').toUpperCase();
  const biz = (office.businessArea || '').toUpperCase();

  const rows = [
    { n: '1',  l: 'FUND CODE',            v: ddo,     cells: 8 },
    { n: '2',  l: 'DOCUMENT CODE',        v: docCode, cells: 6 },
    { n: '3',  l: 'COUNTER NO.',          v: office.counterNo, cells: 3 },
    { n: '4',  l: 'GOVT: CODE',           v: govt,    cells: 3 },
    { n: '5',  l: 'BUSSINESS AREA (DEP)', v: biz,     cells: 4 },
    { n: '6',  l: 'COST CENTRE/DDO CODE', v: ddo,     cells: 6 },
    { n: '7',  l: 'FUNCTION',             v: office.functionCode, cells: 6 },
    { n: '8',  l: 'VENDOR',               v: '',      cells: 8 },
    { n: '9',  l: 'CL CODE',              v: office.clCode, cells: 2 },
    { n: '10', l: 'CN CODE',              v: office.cnCode, cells: 2 },
  ];

  return (
    <div>
      {rows.map(r => {
        const chars = String(r.v || '').split('');
        return (
          <div key={r.n} className="acb-cp-row">
            <div className="acb-cp-num">{r.n}</div>
            <div className="acb-cp-label">{r.l}</div>
            <div className="acb-cp-cells">
              {Array.from({ length: r.cells }).map((_, i) => (
                <span key={i} className="acb-cp-cell">{chars[i] || ''}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
