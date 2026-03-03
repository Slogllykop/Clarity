import { useEffect, useState } from "react";
import { hashPassword, verifyPassword } from "@/db/utils";
import type { BlockedWebsite, Settings } from "@/types";

export type ParentalView = "auth" | "setup" | "dashboard" | "reset";

export function useParentalControls() {
  const [view, setView] = useState<ParentalView>("auth");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blockedWebsites, setBlockedWebsites] = useState<BlockedWebsite[]>([]);

  // Auth states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [error, setError] = useState("");

  // Add URL state
  const [newUrl, setNewUrl] = useState("");

  // Reset state
  const [resetAnswer, setResetAnswer] = useState("");

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_SETTINGS",
      });
      const settingsData = response.settings;

      if (settingsData?.passwordHash) {
        setSettings(settingsData);
        setView("auth");
      } else {
        setView("setup");
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const loadBlockedWebsites = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_BLOCKED_WEBSITES",
      });
      setBlockedWebsites(response.blocked || []);
    } catch (err) {
      console.error("Error loading blocked websites:", err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSetup = async () => {
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      setError("Please provide a security question and answer");
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      const answerHash = await hashPassword(securityAnswer.toLowerCase().trim());

      await chrome.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        payload: {
          passwordHash,
          securityQuestion,
          securityAnswerHash: answerHash,
          reminderEnabled: false,
        },
      });

      await loadSettings();
      await loadBlockedWebsites();
      setView("dashboard");
      setPassword("");
      setConfirmPassword("");
      setSecurityQuestion("");
      setSecurityAnswer("");
    } catch (err) {
      setError("Failed to set up parental controls");
      console.error(err);
    }
  };

  const handleAuth = async () => {
    setError("");
    if (!settings?.passwordHash) return;

    try {
      const isValid = await verifyPassword(password, settings.passwordHash);
      if (isValid) {
        await loadBlockedWebsites();
        setView("dashboard");
        setPassword("");
      } else {
        setError("Incorrect password");
      }
    } catch (err) {
      setError("Authentication failed");
      console.error(err);
    }
  };

  const handleReset = async () => {
    setError("");
    if (!settings?.securityAnswerHash) return;

    try {
      const isValid = await verifyPassword(
        resetAnswer.toLowerCase().trim(),
        settings.securityAnswerHash,
      );
      if (isValid) {
        setView("setup");
        setResetAnswer("");
      } else {
        setError("Incorrect answer");
      }
    } catch (err) {
      setError("Reset failed");
      console.error(err);
    }
  };

  const handleAddBlockedUrl = async () => {
    setError("");
    if (!newUrl.trim()) {
      setError("Please enter a URL or domain");
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: "ADD_BLOCKED_URL",
        payload: { urlPattern: newUrl.trim() },
      });
      await loadBlockedWebsites();
      setNewUrl("");
    } catch (err) {
      setError("Failed to block URL. It may already be blocked.");
      console.error(err);
    }
  };

  const handleRemoveBlockedUrl = async (id: number) => {
    try {
      await chrome.runtime.sendMessage({
        type: "REMOVE_BLOCKED_URL",
        payload: { id },
      });
      await loadBlockedWebsites();
    } catch (err) {
      setError("Failed to remove blocked URL");
      console.error(err);
    }
  };

  return {
    // State
    view,
    setView,
    settings,
    blockedWebsites,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    securityQuestion,
    setSecurityQuestion,
    securityAnswer,
    setSecurityAnswer,
    error,
    newUrl,
    setNewUrl,
    resetAnswer,
    setResetAnswer,

    // Handlers
    handleSetup,
    handleAuth,
    handleReset,
    handleAddBlockedUrl,
    handleRemoveBlockedUrl,
  };
}
