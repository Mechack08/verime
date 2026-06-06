/**
 * DocumentGuide — per-document-type scanning instructions with an MRZ diagram.
 *
 * The MRZ (Machine Readable Zone) is a set of fixed-width lines printed in
 * OCR-B font at the bottom of travel documents. It looks like a row of
 * capitals, digits, and "<" fill characters. Tesseract reads it accurately
 * because the font is specifically designed for OCR.
 *
 * Layouts:
 *   Passport (TD3) — data page, last two lines (44 chars each)
 *   National / EU ID card (TD1) — back of card, three lines (30 chars each)
 *   Other travel doc (TD2) — two lines, 36 chars each (uncommon)
 */

export type DocType = "passport" | "national_id" | "other";

interface DocumentGuideProps {
  docType: DocType;
}

const GUIDES: Record<
  DocType,
  { title: string; hold: string; mrz: string; lines: string[] }
> = {
  passport: {
    title: "Passport",
    hold: "Open to the photo page. Lay it flat or hold it steady. Point the camera at the bottom third of the page.",
    mrz: "Two lines of 44 characters — very bottom of the photo page.",
    lines: [
      "P<GBRSMITH<<JOHN<HENRY<<<<<<<<<<<<<<<<<<<<<",
      "1234567895GBR8001011M2501016<<<<<<<<<<<<<<<4",
    ],
  },
  national_id: {
    title: "National ID / EU ID Card",
    hold: "Flip the card to the back. Hold it level under good light. Point the camera at the lower two-thirds of the back face.",
    mrz: "Three lines of 30 characters across the back of the card.",
    lines: [
      "IDGBRSMITH<<JOHN<HENRY<<<<<<<<",
      "1234567895GBR8001011M250101<<<",
      "SMITH<<JOHN<HENRY<<<<<<<<<<<<<<",
    ],
  },
  other: {
    title: "Other travel document",
    hold: "Open to the biographical data page. Point the camera at the bottom section of the page.",
    mrz: "Two lines near the bottom — look for rows of capitals and < characters.",
    lines: [
      "V<GBRSMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<",
      "1234567895GBR8001011M2501016<<<<<<<5",
    ],
  },
};

export function DocumentGuide({ docType }: DocumentGuideProps) {
  const guide = GUIDES[docType];

  return (
    <div className="space-y-3">
      {/* How to hold the document */}
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        {guide.hold}
      </p>

      {/* MRZ diagram */}
      <div className="border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
            MRZ zone — aim here
          </span>
          <span className="text-xs text-[var(--color-text-subtle)]">
            {guide.mrz}
          </span>
        </div>

        {/* Visual representation of the MRZ strip */}
        <div className="border border-dashed border-[var(--color-violet)] p-2 space-y-1">
          {guide.lines.map((line, i) => (
            <div
              key={i}
              className="font-mono text-[0.6rem] tracking-widest text-[var(--color-text-subtle)] truncate"
              aria-hidden="true"
            >
              {line}
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--color-text-subtle)]">
          These characters are printed in a fixed-width OCR font specifically
          designed for machine reading. Keep the document still and avoid glare.
        </p>
      </div>

      {/* Tips */}
      <ul className="text-xs text-[var(--color-text-subtle)] space-y-1 list-none">
        {[
          "Use overhead or diffuse light — avoid direct lamp reflections on the card surface.",
          "Fill the camera frame with the document — the MRZ text should be clearly visible.",
          "Hold steady for 1–2 seconds before tapping Scan.",
        ].map((tip) => (
          <li key={tip} className="flex gap-1.5">
            <span className="text-[var(--color-violet-soft)] flex-none">›</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
