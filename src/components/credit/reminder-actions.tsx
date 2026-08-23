"use client";

import { useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";

function toWhatsAppDigits(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function ReminderActions({ phone, message }: { phone: string | null; message: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; the WhatsApp button still works.
    }
  }

  return (
    <div className="mt-2 flex gap-2">
      {phone && (
        <a
          href={`https://wa.me/${toWhatsAppDigits(phone)}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border px-2.5 text-xs font-medium text-text hover:border-primary/40"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border px-2.5 text-xs font-medium text-text hover:border-primary/40"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy message"}
      </button>
    </div>
  );
}
