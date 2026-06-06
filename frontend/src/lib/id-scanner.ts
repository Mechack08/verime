import Tesseract from "tesseract.js";
import { parse } from "mrz";
import type { ScannedId } from "@verime/sdk/types";

export class IdScanError extends Error {
  constructor(
    message: string,
    public readonly code: "OCR_FAILED" | "PARSE_FAILED" | "EXPIRED" | "INVALID_DATE",
  ) {
    super(message);
    this.name = "IdScanError";
  }
}

// ── Image preprocessing ───────────────────────────────────────────────────────

async function cropAndEnhance(dataUrl: string, fraction = 0.35): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cropH = Math.floor(img.height * fraction);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }
      ctx.drawImage(img, 0, img.height - cropH, img.width, cropH, 0, 0, img.width, cropH);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = frame.data;
      const CONTRAST = 1.8;
      for (let i = 0; i < d.length; i += 4) {
        const grey = 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0);
        const v = Math.min(255, Math.max(0, CONTRAST * (grey - 128) + 128));
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(frame, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}

// ── MRZ check-digit utilities ─────────────────────────────────────────────────

/** ICAO 9303 check-digit algorithm. */
function mrzCheckDigit(s: string): number {
  const W = [7, 3, 1] as const;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const val =
      c === "<" ? 0
      : c >= "0" && c <= "9" ? c.charCodeAt(0) - 48
      : c >= "A" && c <= "Z" ? c.charCodeAt(0) - 55
      : 0;
    sum += val * W[i % 3]!;
  }
  return sum % 10;
}

/**
 * Characters that are commonly confused in MRZ OCR.
 * Key = what OCR produces, values = what it might actually be.
 */
const OCR_ALTS: Partial<Record<string, string[]>> = {
  "0": ["O", "D"], "O": ["0"],
  "1": ["I", "L"], "I": ["1"], "L": ["1"],
  "5": ["S"],      "S": ["5"],
  "8": ["B"],      "B": ["8"],
  "2": ["Z"],      "Z": ["2"],
  "6": ["G"],      "G": ["6"],
  "N": ["M"],      "M": ["N"],
  "D": ["0"],
};

/**
 * Uses the field's check digit as an oracle: try single-character OCR
 * substitutions until mrzCheckDigit(field) === expectedCheck.
 * Returns the corrected field string, or the original if no fix is found.
 */
function correctField(field: string, expectedCheck: number): string {
  if (mrzCheckDigit(field) === expectedCheck) return field;
  const chars = [...field];
  for (let i = 0; i < chars.length; i++) {
    const orig = chars[i]!;
    for (const alt of OCR_ALTS[orig] ?? []) {
      chars[i] = alt;
      if (mrzCheckDigit(chars.join("")) === expectedCheck) return chars.join("");
      chars[i] = orig;
    }
  }
  return field; // no single-char fix found
}

function padLines(lines: string[], len: number): string[] {
  return lines.map(l => l.length < len ? l.padEnd(len, "<") : l);
}

function tryParse(lines: string[]): ReturnType<typeof parse> | null {
  try { return parse(lines); } catch { return null; }
}

/**
 * TD3 (passport) field-level OCR repair.
 *
 * TD3 line 2 layout (44 chars):
 *   [0-8]   doc number (9)
 *   [9]     doc check
 *   [10-12] nationality (3)
 *   [13-18] DOB (6)
 *   [19]    DOB check
 *   [20]    sex (1)
 *   [21-26] expiry (6)
 *   [27]    expiry check
 *   [28-41] personal number (14)
 *   [42]    personal check
 *   [43]    composite check
 *
 * Each checked field is corrected independently. The composite check is
 * recomputed from the corrected fields.
 */
function repairTD3(rawLines: string[]): ReturnType<typeof parse> | null {
  const [l1, l2] = padLines(rawLines.slice(0, 2), 44);
  if (!l1 || !l2 || l1.length !== 44 || l2.length !== 44) return null;

  const docNum   = correctField(l2.slice(0, 9),  parseInt(l2[9]!,  10));
  const dob      = correctField(l2.slice(13, 19), parseInt(l2[19]!, 10));
  const expiry   = correctField(l2.slice(21, 27), parseInt(l2[27]!, 10));
  const personal = correctField(l2.slice(28, 42), parseInt(l2[42]!, 10));

  // Rebuild line 2 (43 chars, without composite check)
  const rebuilt =
    docNum        + l2[9]!  +   // doc num (9) + doc check (1)
    l2.slice(10, 13)         +   // nationality (3, no check digit)
    dob           + l2[19]! +   // DOB (6) + DOB check (1)
    l2[20]!                  +   // sex (1)
    expiry        + l2[27]! +   // expiry (6) + expiry check (1)
    personal      + l2[42]!;    // personal (14) + personal check (1)  → 43 chars

  // Recompute composite check from corrected fields
  const compositeInput =
    rebuilt.slice(0, 10) +  // doc num + check
    rebuilt.slice(13, 20) + // DOB + check
    rebuilt.slice(21, 28) + // expiry + check
    rebuilt.slice(28, 43);  // personal + check
  const composite = mrzCheckDigit(compositeInput).toString();

  return tryParse([l1, rebuilt + composite]);
}

/**
 * TD1 (ID card) field-level OCR repair.
 *
 * TD1 line 1 (30 chars): type(2)+country(3)+doc_num(9)+check(1)+optional(15)
 * TD1 line 2 (30 chars): DOB(6)+check(1)+sex(1)+expiry(6)+check(1)+nat(3)+optional(11)+composite(1)
 * TD1 line 3 (30 chars): name (no check digits)
 */
function repairTD1(rawLines: string[]): ReturnType<typeof parse> | null {
  const [l1, l2, l3] = padLines(rawLines.slice(0, 3), 30);
  if (!l1 || !l2 || !l3 || l1.length !== 30 || l2.length !== 30 || l3.length !== 30) return null;

  const docNum = correctField(l1.slice(5, 14), parseInt(l1[14]!, 10));
  const dob    = correctField(l2.slice(0, 6),  parseInt(l2[6]!,  10));
  const expiry = correctField(l2.slice(8, 14), parseInt(l2[14]!, 10));

  const newL1 = l1.slice(0, 5) + docNum + l1[14]! + l1.slice(15); // 30 chars
  const newL2pre = dob + l2[6]! + l2[7]! + expiry + l2.slice(14, 29); // 29 chars

  // TD1 composite covers l1[5..30) + l2[0..29)
  const composite = mrzCheckDigit(newL1.slice(5) + newL2pre).toString();

  return tryParse([newL1, newL2pre + composite, l3]);
}

// ── Main parse orchestrator ───────────────────────────────────────────────────

function parseMrz(rawLines: string[]): ReturnType<typeof parse> {
  // 1. Raw
  const r1 = tryParse(rawLines);
  if (r1) return r1;

  // 2. Global letter→digit substitution
  const r2 = tryParse(rawLines.map(l =>
    l.replace(/O/g, "0").replace(/I/g, "1").replace(/S/g, "5")
     .replace(/B/g, "8").replace(/Z/g, "2"),
  ));
  if (r2) return r2;

  // 3. TD3 field-level repair (passport, 2×44)
  if (rawLines.length >= 2) {
    const r3 = repairTD3(rawLines);
    if (r3) return r3;
  }

  // 4. TD1 field-level repair (ID card, 3×30)
  if (rawLines.length >= 3) {
    const r4 = repairTD1(rawLines);
    if (r4) return r4;
  }

  throw new IdScanError(
    "MRZ characters were read but check digits don't match — keep the document completely still and make sure the full bottom strip is inside the dashed box.",
    "PARSE_FAILED",
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function extractFromId(imageSource: string | ImageData): Promise<ScannedId> {
  const ocrInput: string | ImageData =
    typeof imageSource === "string"
      ? await cropAndEnhance(imageSource)
      : imageSource;

  let ocrText: string;
  try {
    const worker = await Tesseract.createWorker("eng");
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    });
    const result = await worker.recognize(ocrInput as Parameters<typeof worker.recognize>[0]);
    await worker.terminate();
    ocrText = result.data.text;
  } catch (err) {
    throw new IdScanError(`OCR engine error: ${String(err)}`, "OCR_FAILED");
  }

  const mrzLines = ocrText
    .split("\n")
    .map(l => l.replace(/\s+/g, "").toUpperCase())
    .filter(l => /^[A-Z0-9<]{30,44}$/.test(l));

  console.log("[id-scanner] raw OCR:", JSON.stringify(ocrText));
  console.log("[id-scanner] candidate MRZ lines:", mrzLines);

  if (mrzLines.length < 2) {
    throw new IdScanError(
      "MRZ strip not found — hold the bottom of your document flat inside the dashed box.",
      "PARSE_FAILED",
    );
  }

  const parsed = parseMrz(mrzLines);
  const { birthDate, expirationDate, documentCode } = parsed.fields;

  if (!birthDate) {
    throw new IdScanError("Birth date field missing from document MRZ.", "INVALID_DATE");
  }

  const birthYearShort = parseInt(birthDate.slice(0, 2), 10);
  const currentYear = new Date().getFullYear();
  const century = birthYearShort <= currentYear % 100 ? 2000 : 1900;
  const birthYear = century + birthYearShort;

  const expiryYear = expirationDate
    ? 2000 + parseInt(expirationDate.slice(0, 2), 10)
    : currentYear + 1;

  return {
    birthYear,
    documentType: documentCode ?? "UNKNOWN",
    expiryYear,
    isExpired: expiryYear < currentYear,
  };
}
