import { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useIdScanner } from "@/hooks/useIdScanner";
import { useProofGenerator } from "@/hooks/useProofGenerator";
import { useWalletContext } from "@/contexts/WalletContext";
import { Topbar } from "@/components/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { DocumentGuide } from "@/components/DocumentGuide";
import type { DocType } from "@/components/DocumentGuide";
import { truncateHex, PRESET_PREDICATES, buildPredicate, validatePredicate } from "@/lib/utils";
import type { Predicate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
type Step = 1 | 2 | 3;

export default function Scan() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const birthYearRef = useRef<number>(0);

  const { state: scanState, scan, reset: resetScan } = useIdScanner();
  const { phase, error: proofError, result, generate, reset: resetProof } = useProofGenerator();
  const { wallet, status: walletStatus, connect } = useWalletContext();

  const [activeStep, setActiveStep] = useState<Step>(1);
  const [docType, setDocType] = useState<DocType>("passport");

  // Step 1 camera state
  const [webcamReady, setWebcamReady] = useState(false);
  // null  = showing live camera
  // string = frozen screenshot waiting for / running OCR
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const [selectedPredicate, setSelectedPredicate] = useState<Predicate | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  // When the user taps Capture: freeze the frame and immediately run OCR
  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    setCapturedImage(imageSrc);
    void scan(imageSrc);
  }, [scan]);

  // Retake: go back to live camera, clear previous result
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    resetScan();
  }, [resetScan]);

  // Advance when scan succeeds
  useEffect(() => {
    if (scanState.phase === "success" && activeStep === 1) {
      birthYearRef.current = scanState.result.birthYear;
      setActiveStep(2);
    }
  }, [scanState, activeStep]);

  // Reset camera when user changes document type
  const handleDocTypeChange = useCallback((t: DocType) => {
    setDocType(t);
    setCapturedImage(null);
    resetScan();
  }, [resetScan]);

  const handleSelectPreset = (p: Predicate) => {
    setSelectedPredicate(p);
    setCustomMode(false);
    setCustomError(null);
  };

  const handleCustomApply = () => {
    const min = parseInt(customMin, 10) || 0;
    const max = parseInt(customMax, 10) || 0;
    const err = validatePredicate(min, max);
    if (err) {
      setCustomError(err);
      return;
    }
    setCustomError(null);
    setSelectedPredicate(buildPredicate(min, max));
  };

  const handleGenerate = async () => {
    if (!selectedPredicate || birthYearRef.current === 0 || !wallet) return;
    await generate(birthYearRef.current, selectedPredicate, wallet);
  };

  const handleDone = () => {
    navigate("/credentials");
  };

  return (
    <div className="min-h-dvh app-bg">
      <Topbar />
      <main className="mx-auto max-w-xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] mb-1">
            Generate Credential
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Three steps. Nothing leaves your browser.
          </p>
          <StepProgress activeStep={activeStep} />
        </div>

        {/* ── Step 1 ── */}
        <section className={`vm-card p-5 sm:p-6 space-y-4 transition-opacity ${activeStep > 1 ? "opacity-60" : ""}`}>
          <StepHeader step={1} activeStep={activeStep} title="Scan your ID" />

          {activeStep === 1 && (
            <>
              {/* Document type selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
                  What are you scanning?
                </p>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { value: "passport", label: "Passport" },
                      { value: "national_id", label: "National / EU ID card" },
                      { value: "other", label: "Other travel doc" },
                    ] as { value: DocType; label: string }[]
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleDocTypeChange(value as DocType)}
                      className={[
                        "px-3 py-1.5 text-xs border rounded-full transition-colors cursor-pointer",
                        docType === value
                          ? "border-[var(--color-violet)] text-[var(--color-violet-soft)] bg-[var(--color-violet-ghost)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-border-strong)]",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-type instructions and MRZ diagram */}
              <DocumentGuide docType={docType} />

              {/* ── Camera / Captured frame ── */}
              <div className="relative aspect-video bg-[var(--color-void)] overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]">

                {/* Live camera — shown while no captured image */}
                {!capturedImage && (
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={1}
                    videoConstraints={{ facingMode: "environment" }}
                    className="w-full h-full object-cover"
                    onUserMedia={() => setWebcamReady(true)}
                    onUserMediaError={() => setWebcamReady(false)}
                  />
                )}

                {/* Frozen captured frame — shown after Capture is tapped */}
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured frame"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Waiting for camera permission */}
                {!webcamReady && !capturedImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--color-void)]/90">
                    <Spinner size={20} />
                    <span className="text-xs text-[var(--color-text-muted)]">Waiting for camera…</span>
                  </div>
                )}

                {/* MRZ target overlay — always visible */}
                <div className="absolute inset-x-4 bottom-4 h-[30%] border border-dashed border-[var(--color-violet)]/60 pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 text-center text-xs text-[var(--color-text-subtle)] py-1 bg-[var(--color-void)]/70">
                  {capturedImage
                    ? "Scanning this frame…"
                    : "Align the MRZ strip (bottom of document) inside the dashed box"}
                </div>

                {/* Scanning spinner overlay on captured frame */}
                {capturedImage && scanState.phase === "scanning" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-void)]/50">
                    <Spinner size={32} />
                  </div>
                )}
              </div>

              {/* Status / error */}
              {!capturedImage && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Position the document, then tap <strong>Capture</strong> to freeze the frame and read the MRZ.
                </p>
              )}

              {capturedImage && scanState.phase === "error" && (
                <ScanErrorMessage message={scanState.message} docType={docType} />
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!capturedImage ? (
                  <Button
                    variant="primary"
                    disabled={!webcamReady}
                    onClick={handleCapture}
                  >
                    Capture
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={scanState.phase === "scanning"}
                    onClick={handleRetake}
                  >
                    Retake
                  </Button>
                )}
              </div>
            </>
          )}

          {activeStep > 1 && (
            <p className="text-sm text-[var(--color-ok)] flex items-center gap-1.5">
              <span>✓</span> Document read. Year of birth confirmed.
            </p>
          )}
        </section>

        {/* ── Step 2 ── */}
        {activeStep >= 2 && (
          <section className={`vm-card p-5 sm:p-6 space-y-4 animate-rise transition-opacity ${activeStep > 2 ? "opacity-60" : ""}`}>
            <StepHeader step={2} activeStep={activeStep} title="Choose what to prove" />

            {activeStep === 2 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PREDICATES.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => handleSelectPreset(p)}
                      className={[
                        "px-3 py-1.5 text-xs border rounded-full transition-colors cursor-pointer",
                        selectedPredicate?.label === p.label
                          ? "border-[var(--color-violet)] text-[var(--color-violet-soft)] bg-[var(--color-violet-ghost)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <button
                  className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] underline cursor-pointer"
                  onClick={() => setCustomMode((v) => !v)}
                >
                  {customMode ? "Hide custom range" : "Custom range"}
                </button>

                {customMode && (
                  <div className="flex items-end gap-3">
                    <Input
                      label="Min age"
                      type="number"
                      min={0}
                      max={255}
                      value={customMin}
                      onChange={(e) => setCustomMin(e.target.value)}
                      className="w-24"
                    />
                    <Input
                      label="Max age (0 = none)"
                      type="number"
                      min={0}
                      max={255}
                      value={customMax}
                      onChange={(e) => setCustomMax(e.target.value)}
                      className="w-24"
                      {...(customError ? { error: customError } : {})}
                    />
                    <Button variant="secondary" size="sm" onClick={handleCustomApply}>
                      Apply
                    </Button>
                  </div>
                )}

                <Button
                  variant="primary"
                  disabled={!selectedPredicate}
                  onClick={() => setActiveStep(3)}
                >
                  Continue
                </Button>
              </>
            )}

            {activeStep > 2 && selectedPredicate && (
              <p className="text-sm text-[var(--color-ok)] flex items-center gap-1.5">
                <span>✓</span> {selectedPredicate.label}
              </p>
            )}
          </section>
        )}

        {/* ── Step 3 ── */}
        {activeStep >= 3 && (
          <section className="vm-card p-5 sm:p-6 space-y-4 animate-rise">
            <StepHeader step={3} activeStep={activeStep} title="Generate Proof" />

            {selectedPredicate && (
              <p className="text-sm text-[var(--color-text-muted)]">
                You are about to prove:{" "}
                <span className="text-[var(--color-ink)] font-medium">{selectedPredicate.label}</span>
              </p>
            )}

            {!wallet && phase === "idle" && (
              <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3 space-y-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  A connected wallet is required to generate a proof — the credential is
                  recorded on the Midnight ledger.
                </p>
                <Button
                  variant="primary"
                  loading={walletStatus === "connecting"}
                  onClick={() => connect()}
                >
                  {walletStatus === "error" ? "Retry Connect" : "Connect Wallet"}
                </Button>
              </div>
            )}

            {wallet && phase === "idle" && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Wallet connected — the proof will be recorded on-chain.
              </p>
            )}

            {wallet && phase === "idle" && (
              <Button variant="primary" onClick={handleGenerate}>
                Generate &amp; Record On-Chain
              </Button>
            )}

            {(phase === "deriving" || phase === "proving" || phase === "recording") && (
              <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <Spinner size={16} />
                {phase === "deriving" && "Deriving keys…"}
                {phase === "proving" && "Generating ZK proof…"}
                {phase === "recording" && "Recording on-chain…"}
              </div>
            )}

            {proofError && (
              <div className="text-sm text-[var(--color-fail)] border border-[var(--color-fail)]/30 bg-[var(--color-fail-soft)] px-3 py-3 rounded-[var(--radius)]">
                {proofError}
                <div>
                  <Button variant="ghost" size="sm" onClick={resetProof} className="mt-2">
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {phase === "done" && result && (
              <div className="space-y-3 animate-rise">
                <div className="flex items-center gap-2">
                  <Badge variant="ok">Proof recorded</Badge>
                  {result.isOnChain && <Badge variant="violet">On-chain</Badge>}
                </div>
                <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                  <div className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)] mb-1.5">
                    Commitment
                  </div>
                  <div
                    className="font-commit text-[var(--color-cyan-soft)]"
                    title={result.commitment}
                  >
                    {truncateHex(result.commitment)}
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Your ZK proof is on the Midnight ledger. Share the commitment
                  above with any verifier — they can confirm the predicate is
                  satisfied without learning your birth date.
                </p>
                <Button variant="primary" onClick={handleDone}>
                  View My Credentials
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function StepProgress({ activeStep }: { activeStep: Step }) {
  const labels = ["Scan", "Predicate", "Proof"];
  return (
    <div className="mt-5 flex items-center gap-2">
      {labels.map((label, i) => {
        const step = (i + 1) as Step;
        const done = step < activeStep;
        const current = step === activeStep;
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span
              className={[
                "inline-flex items-center gap-1.5 text-xs whitespace-nowrap",
                done || current ? "text-[var(--color-ink)]" : "text-[var(--color-text-subtle)]",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                  done
                    ? "border-[var(--color-ok)] bg-[var(--color-ok-soft)] text-[var(--color-ok)]"
                    : current
                    ? "border-[var(--color-violet)] bg-[var(--color-violet-ghost)] text-[var(--color-violet-soft)]"
                    : "border-[var(--color-border)] text-[var(--color-text-subtle)]",
                ].join(" ")}
              >
                {done ? "✓" : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {i < labels.length - 1 && (
              <span
                className={[
                  "h-px flex-1 transition-colors",
                  done ? "bg-[var(--color-ok)]/40" : "bg-[var(--color-border)]",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScanErrorMessage({ message, docType }: { message: string; docType: DocType }) {
  const tips: Record<string, string[]> = {
    "MRZ zone not detected": [
      docType === "passport"
        ? "Make sure the bottom two lines of the photo page fill the dashed box — these are the two long rows of letters and < symbols."
        : docType === "national_id"
        ? "Scan the back of the card. The MRZ (three rows of text) is on the reverse side, not the front."
        : "Ensure both rows of characters at the bottom of the document are inside the dashed box.",
      "Move the document closer — it should fill most of the frame.",
      "Tilt the document slightly if you see light reflections on the surface.",
    ],
    "check digits didn't validate": [
      "Hold the document flat and completely still — motion blur is the most common cause.",
      "Make sure the full width of the MRZ strip is visible — cropped edges cause read errors.",
      "Wipe the camera lens if the image looks soft or hazy.",
    ],
    OCR_FAILED: [
      "The image may be too dark or out of focus.",
      "Try moving to a brighter area or enabling your device's flashlight.",
    ],
  };

  const matchedKey = Object.keys(tips).find((k) => message.includes(k));
  const extraTips: string[] = (matchedKey !== undefined ? tips[matchedKey] : undefined) ?? [];

  return (
    <div className="border border-[var(--color-fail)]/30 bg-[var(--color-fail-soft)] px-3 py-3 space-y-2 rounded-[var(--radius)]">
      <p className="text-sm text-[var(--color-fail)]">{message}</p>
      {extraTips.length > 0 && (
        <ul className="text-xs text-[var(--color-text-muted)] space-y-1">
          {extraTips.map((tip) => (
            <li key={tip} className="flex gap-1.5">
              <span className="text-[var(--color-warn)] flex-none">›</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepHeader({
  step,
  activeStep,
  title,
}: {
  step: Step;
  activeStep: Step;
  title: string;
}) {
  const done = step < activeStep;
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "flex-none w-6 h-6 flex items-center justify-center text-xs font-semibold border rounded-[var(--radius-sm)]",
          done
            ? "border-[var(--color-ok)] text-[var(--color-ok)] bg-[var(--color-ok-soft)]"
            : step === activeStep
            ? "border-[var(--color-violet)] text-[var(--color-violet-soft)] bg-[var(--color-violet-ghost)]"
            : "border-[var(--color-border)] text-[var(--color-text-subtle)]",
        ].join(" ")}
      >
        {done ? "✓" : step}
      </span>
      <span className="text-sm font-semibold text-[var(--color-ink)]">{title}</span>
    </div>
  );
}
