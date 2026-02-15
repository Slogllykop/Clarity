import { IconBan, IconClock, IconShield } from "@tabler/icons-react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { formatTime } from "@/db/utils";
import "./index.css";

function BlockedPage() {
  const [reason, setReason] = useState<"timer" | "parental">("timer");
  const [domain, setDomain] = useState("");
  const [limit, setLimit] = useState(0);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const reasonParam = params.get("reason") as "timer" | "parental";
    const domainParam = params.get("domain");
    const limitParam = params.get("limit");

    if (reasonParam) setReason(reasonParam);
    if (domainParam) setDomain(domainParam);
    if (limitParam) setLimit(Number.parseInt(limitParam, 10));
  }, []);

  const openExtension = () => {
    chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          {reason === "timer" ? (
            <IconClock size={80} className="mx-auto text-accent" />
          ) : (
            <IconShield size={80} className="mx-auto text-accent" />
          )}
        </div>

        {/* Message */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {reason === "timer" ? "Time Limit Exceeded" : "Website Blocked"}
          </h1>

          {reason === "timer" ? (
            <div className="space-y-2">
              <p className="text-gray-400">You've reached your daily time limit for</p>
              <p className="text-xl font-semibold text-white">{domain}</p>
              {limit > 0 && (
                <p className="text-sm text-gray-500 mt-4">Daily limit: {formatTime(limit)}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-400">This website has been blocked by parental controls</p>
              <p className="text-xl font-semibold text-white">{domain}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 text-left">
            <IconBan size={24} className="text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-300">
                {reason === "timer"
                  ? "Your timer will reset tomorrow. You can disable the timer in the extension settings."
                  : "This website is permanently blocked. Contact your parent or guardian to unblock it."}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={openExtension}
            className="w-full py-3 bg-accent hover:bg-accent-dark text-black font-semibold rounded-lg transition-colors"
          >
            Open Clarity
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3 text-gray-400 hover:text-white transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Branding */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Blocked by <span className="text-accent font-semibold">Clarity</span>
          </p>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BlockedPage />
    </StrictMode>,
  );
}
