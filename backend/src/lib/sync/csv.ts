// Tiny RFC4180-ish CSV parser (no dependency).
// - Auto-detects comma vs semicolon delimiter (TR Excel exports use ';').
// - Handles quoted fields, escaped quotes ("") and embedded newlines.
// - First non-empty row is treated as the header; returns objects keyed by
//   lower-cased, trimmed header names.

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function detectDelimiter(firstLine: string): "," | ";" {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function splitRecords(input: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore — handled by the \n branch
    } else {
      field += ch;
    }
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}

export function parseCsv(input: string): ParsedCsv {
  const trimmed = input.replace(/^﻿/, "").trim(); // strip BOM
  if (trimmed === "") return { headers: [], rows: [] };

  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);

  const records = splitRecords(trimmed, delimiter).filter(
    (r) => r.length > 0 && r.some((c) => c.trim() !== ""),
  );
  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0].map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < records.length; i++) {
    const rec = records[i];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (rec[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return { headers, rows };
}

/** Parse a possibly-localized number ("1.234,56" or "1234.56" or "1,234.56"). */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (s === "") return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (s === "") return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // comma is the decimal separator → drop dots, comma→dot
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // dot is decimal (or none) → drop thousands commas
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
