import { useEffect, useState } from "react";
import type { Settings } from "@/types";

/**
 * Custom hook for loading and saving extension settings via chrome.runtime messages.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      setSettings(response.settings || null);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (payload: Partial<Settings>) => {
    try {
      await chrome.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        payload,
      });
      // Reload to get the merged state
      await loadSettings();
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return { settings, loading, updateSettings, reloadSettings: loadSettings };
}
