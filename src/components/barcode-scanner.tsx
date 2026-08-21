"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type DetectorLike = {
  new (opts: { formats: string[] }): { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
};

async function getDetectorClass(): Promise<DetectorLike | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ("BarcodeDetector" in globalThis) return (globalThis as any).BarcodeDetector;
  try {
    const mod = await import("barcode-detector/pure");
    return mod.BarcodeDetector as unknown as DetectorLike;
  } catch {
    return null;
  }
}

export function BarcodeScanner({ onScan, onClose }: { onScan: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const DetectorClass = await getDetectorClass();
      if (!DetectorClass) {
        setError("Barcode scanning is not supported in this browser.");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setError("Could not access the camera. Check your permissions.");
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new DetectorClass({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
      });

      async function tick() {
        if (cancelled || doneRef.current || !video || video.readyState < 2) {
          if (!cancelled && !doneRef.current) requestAnimationFrame(tick);
          return;
        }
        try {
          const results = await detector.detect(video);
          if (results.length > 0 && !doneRef.current) {
            doneRef.current = true;
            stream.getTracks().forEach((t) => t.stop());
            onScan(results[0].rawValue);
            return;
          }
        } catch {
          /* frame decode failures are normal */
        }
        if (!cancelled && !doneRef.current) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full bg-white/20 p-2 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error ? (
          <div className="rounded-[12px] bg-surface p-6 text-center">
            <p className="text-sm text-text-secondary">{error}</p>
            <button type="button" onClick={onClose} className="mt-4 text-sm font-medium text-primary">
              Close
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full rounded-[12px]" playsInline muted />
            <p className="mt-3 text-center text-sm text-white/80">Point the camera at a barcode</p>
          </>
        )}
      </div>
    </div>
  );
}
