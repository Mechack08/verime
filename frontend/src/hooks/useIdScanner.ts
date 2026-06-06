import { useState, useCallback, useRef } from "react";
import { extractFromId, IdScanError } from "@/lib/id-scanner";
import type { ScannedId } from "@verime/sdk/types";

export type ScanState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "success"; result: ScannedId }
  | { phase: "error"; message: string; retryable: boolean };

export function useIdScanner() {
  const [state, setState] = useState<ScanState>({ phase: "idle" });
  const attemptRef = useRef(0);

  const scan = useCallback(async (imageSource: string | ImageData) => {
    setState({ phase: "scanning" });
    attemptRef.current += 1;

    try {
      const result = await extractFromId(imageSource);

      if (result.isExpired) {
        setState({
          phase: "error",
          message: "This document appears to be expired. Use a valid, current ID.",
          retryable: false,
        });
        return;
      }

      setState({ phase: "success", result });
    } catch (err) {
      if (err instanceof IdScanError) {
        setState({
          phase: "error",
          message: err.message,
          retryable: err.code === "OCR_FAILED" || err.code === "PARSE_FAILED",
        });
      } else {
        setState({
          phase: "error",
          message: "An unexpected error occurred during scanning.",
          retryable: true,
        });
      }
    }
  }, []);

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  return { state, scan, reset, attempts: attemptRef.current };
}
