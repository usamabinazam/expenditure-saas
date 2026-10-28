'use client';

// ============================================================
// LOCAL STORE - Browser (localStorage) mein data save hota hai
// Koi login / server nahi. Har computer/browser ka apna data.
// ============================================================

import { useEffect, useState } from 'react';

const KEYS = {
  school: 'edudesk_school_v1',
  heads: 'edudesk_heads_v1',
  statements: 'edudesk_statements_v1',
};

// Standard KPK Education heads (default list)
const DEFAULT_HEADS = [
  // PAYS
  ['pays', 'A01101', 'Pay of Officers'],
  ['pays', 'A01102', 'Personal Pay'],
  ['pays', 'A01151', 'Pay of Other Staff'],
  ['pays', 'A01152', 'Personal Pay Staff'],
  // REGULAR ALLOWANCES
  ['allowances', 'A01202', 'House Rent Allowance'],
  ['allowances', 'A01203', 'Conveyance Allowance'],
  ['allowances', 'A01207', 'Washing Allowance'],
  ['allowances', 'A01208', 'Dress Allowance'],
  ['allowances', 'A0120D', 'Integrated Allowance'],
  ['allowances', 'A0120E', 'Housing Subsidy'],
  ['allowances', 'A01217', 'Medical Allowance'],
  ['allowances', 'A0121T', 'Adhoc Relief 2013'],
  ['allowances', 'A0122C', 'Adhoc Relief 2015'],
  ['allowances', 'A0122M', 'Adhoc Relief 2016'],
  ['allowances', 'A0122Y', 'Adhoc Relief 2017'],
  ['allowances', 'A0123G', 'Adhoc Relief 2018'],
  ['allowances', 'A01224', 'Entertainment Allowance'],
  ['allowances', 'A01229', 'Special Compensatory Allowance'],
  ['allowances', 'A01238', 'Charge Allowance'],
  ['allowances', 'A01250', 'Incentive Allowance'],
  ['allowances', 'A01253', 'Science Teaching Allowance'],
  ['allowances', 'A0124L', 'Weather Allowance'],
  ['allowances', 'A0124H', 'Special Allowance 2021'],
  ['allowances', 'A0124N', 'Disparity Reduction Allowance 2022'],
  ['allowances', 'A0124R', 'Adhoc Relief Allowance 2022'],
  ['allowances', 'A01270', 'Others Allowance (M.Phil/Ph.D)'],
  ['allowances', 'A01289', 'Teaching Allowance'],
  ['allowances', 'A0124X', 'Adhoc Relief Allowance 2023'],
  ['allowances', 'A0125E', 'Adhoc Relief Allowance 2024'],
  ['allowances', 'A0125P', 'Adhoc Relief Allowance 2025'],
  ['allowances', 'A0125Q', 'Disparity Reduction Allowance 2025'],
  ['allowances', 'A0122N', 'SPL. conv to disable'],
  ['allowances', 'A01239', 'Special Conveyance'],
  // NON-SALARY COMPONENTS
  ['non_salary', 'A03303', 'Electricity Charges'],
  ['non_salary', 'A03304', 'Hot & Cold Charges'],
  ['non_salary', 'A03201', 'Postage & Telegraph'],
  ['non_salary', 'A03805', 'Travelling Allowance'],
  ['non_salary', 'A03808', 'Conveyance Allowance (NS)'],
  ['non_salary', 'A03901', 'Stationary Charges'],
  ['non_salary', 'A03902', 'Printing & Publication'],
  ['non_salary', 'A03907', 'Newspaper'],
  ['non_salary', 'A13101', 'Machinery & Equipment'],
  ['non_salary', 'A13201', 'Furniture & Fixture'],
  ['non_salary', 'A13703', 'I.T Equipment'],
  ['non_salary', 'A09601', 'Telephone & Truck Call'],
  ['non_salary', 'A03970', 'Others (Hiring/Security)'],
  ['non_salary', 'A13370', 'Repair of Building'],
  ['non_salary', 'A13103', 'Repair of Machinery'],
  ['non_salary', 'A04114', 'Financial Assistance'],
];

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    alert('⚠️ Data save nahi ho saka. Browser storage full ya band hai.');
    return false;
  }
}

function buildDefaultHeads() {
  const order = {};
  return DEFAULT_HEADS.map(([section, code, name]) => {
    order[section] = (order[section] || 0) + 1;
    return {
      id: newId(),
      section,
      code,
      name,
      budget: 0,
      previous_expenditure: 0,
      display_order: order[section],
    };
  });
}

function sortHeads(heads) {
  const sectionOrder = { pays: 0, allowances: 1, non_salary: 2 };
  return [...heads].sort((a, b) =>
    (sectionOrder[a.section] ?? 9) - (sectionOrder[b.section] ?? 9) ||
    (a.display_order || 0) - (b.display_order || 0)
  );
}

// ---------- School ----------
export function getSchool() {
  return read(KEYS.school, null);
}

export function saveSchool(school) {
  return write(KEYS.school, { ...school, updated_at: new Date().toISOString() });
}

// ---------- Heads ----------
export function getHeads() {
  let heads = read(KEYS.heads, null);
  if (!heads) {
    heads = buildDefaultHeads();
    write(KEYS.heads, heads);
  }
  return sortHeads(heads);
}

export function saveHeads(heads) {
  return write(KEYS.heads, heads);
}

export function resetHeadsToDefault() {
  const heads = buildDefaultHeads();
  write(KEYS.heads, heads);
  return heads;
}

// ---------- Statements ----------
// Newest first (year desc, month desc)
export function getStatements() {
  const list = read(KEYS.statements, []);
  return [...list].sort((a, b) => b.year - a.year || b.month_num - a.month_num);
}

export function getStatement(id) {
  return read(KEYS.statements, []).find((s) => s.id === id) || null;
}

// Same month+year already exists → overwrite it
export function saveStatement({ year, month_num, month_name, data }) {
  const list = read(KEYS.statements, []);
  const now = new Date().toISOString();
  const existing = list.find((s) => s.year === year && s.month_num === month_num);

  let record;
  if (existing) {
    record = { ...existing, month_name, data, updated_at: now };
    const next = list.map((s) => (s.id === existing.id ? record : s));
    if (!write(KEYS.statements, next)) return null;
  } else {
    record = { id: newId(), year, month_num, month_name, data, created_at: now, updated_at: now };
    if (!write(KEYS.statements, [...list, record])) return null;
  }
  return record;
}

export function deleteStatement(id) {
  return write(KEYS.statements, read(KEYS.statements, []).filter((s) => s.id !== id));
}

// ============================================================
// HOOK - page load pe browser se data padhta hai
// (server pe localStorage nahi hota, isliye mount ke baad)
// ============================================================
export function useLocalData() {
  const [state, setState] = useState({ ready: false, school: null, heads: [], statements: [] });

  useEffect(() => {
    setState({
      ready: true,
      school: getSchool(),
      heads: getHeads(),
      statements: getStatements(),
    });
  }, []);

  return state;
}
