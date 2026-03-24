import { useEffect, useState } from "react";
import { log } from "@/lib/logger";
import type { BlockedWebsite } from "@/types";

/**
 * Custom hook for managing blocked websites via chrome.runtime messages.
 */
export function useBlockedWebsites() {
  const [blockedWebsites, setBlockedWebsites] = useState<BlockedWebsite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBlockedWebsites = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_BLOCKED_WEBSITES" });
      setBlockedWebsites(response.blocked || []);
    } catch (error) {
      log.error("Error loading blocked websites", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedWebsites();
  }, []);

  const addBlockedWebsite = async (urlPattern: string): Promise<void> => {
    await chrome.runtime.sendMessage({
      type: "ADD_BLOCKED_URL",
      payload: { urlPattern },
    });
    await loadBlockedWebsites();
  };

  const removeBlockedWebsite = async (id: number): Promise<void> => {
    await chrome.runtime.sendMessage({
      type: "REMOVE_BLOCKED_URL",
      payload: { id },
    });
    await loadBlockedWebsites();
  };

  return {
    blockedWebsites,
    loading,
    addBlockedWebsite,
    removeBlockedWebsite,
    reloadBlockedWebsites: loadBlockedWebsites,
  };
}
