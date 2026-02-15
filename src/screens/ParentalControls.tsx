import { IconChevronLeft, IconLock, IconShield, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { formatDate, hashPassword, verifyPassword } from "@/db/utils";
import type { BlockedWebsite, Settings } from "@/types";

interface ParentalControlsProps {
  onBack: () => void;
}

type View = "auth" | "setup" | "dashboard" | "reset";

export function ParentalControls({ onBack }: ParentalControlsProps) {
  const [view, setView] = useState<View>("auth");
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
      const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      const settingsData = response.settings;

      if (settingsData?.passwordHash) {
        setSettings(settingsData);
        setView("auth");
      } else {
        setView("setup");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadBlockedWebsites = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_BLOCKED_WEBSITES" });
      setBlockedWebsites(response.blocked || []);
    } catch (error) {
      console.error("Error loading blocked websites:", error);
    }
  };

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
    } catch (error) {
      setError("Failed to set up parental controls");
      console.error(error);
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
    } catch (error) {
      setError("Authentication failed");
      console.error(error);
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
    } catch (error) {
      setError("Reset failed");
      console.error(error);
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
    } catch (error) {
      setError("Failed to block URL. It may already be blocked.");
      console.error(error);
    }
  };

  const handleRemoveBlockedUrl = async (id: number) => {
    try {
      await chrome.runtime.sendMessage({
        type: "REMOVE_BLOCKED_URL",
        payload: { id },
      });

      await loadBlockedWebsites();
    } catch (error) {
      setError("Failed to remove blocked URL");
      console.error(error);
    }
  };

  // Setup View
  if (view === "setup") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 bg-black border-b border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
              <IconChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-bold">Set Up Parental Controls</h2>
          </div>
        </div>

        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-8">
            <IconShield size={48} className="mx-auto mb-4 text-accent" />
            <p className="text-sm text-gray-400">
              Create a password to protect parental control settings
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Enter password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Confirm password"
              />
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <label className="block text-sm font-medium mb-2">Security Question</label>
              <input
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="e.g., What is your pet's name?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Security Answer</label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Your answer"
              />
              <p className="text-xs text-gray-500 mt-1">Used to reset password if forgotten</p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSetup}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-black font-semibold rounded-lg transition-colors"
            >
              Set Up Protection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth View
  if (view === "auth") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 bg-black border-b border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
              <IconChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-bold">Parental Controls</h2>
          </div>
        </div>

        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-8">
            <IconLock size={48} className="mx-auto mb-4 text-accent" />
            <p className="text-sm text-gray-400">Enter password to access parental controls</p>
          </div>

          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAuth()}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAuth}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-black font-semibold rounded-lg transition-colors"
            >
              Unlock
            </button>

            <button
              onClick={() => setView("reset")}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reset View
  if (view === "reset") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 bg-black border-b border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("auth")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <IconChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-bold">Reset Password</h2>
          </div>
        </div>

        <div className="p-6 max-w-md mx-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Security Question</label>
              <div className="p-3 bg-zinc-900 rounded-lg text-gray-300 text-sm">
                {settings?.securityQuestion}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Answer</label>
              <input
                type="text"
                value={resetAnswer}
                onChange={(e) => setResetAnswer(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleReset()}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Enter your answer"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-black font-semibold rounded-lg transition-colors"
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 bg-black border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
            <IconChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Parental Controls</h2>
            <p className="text-xs text-gray-400 mt-1">Block websites permanently</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Add URL Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Block Website</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddBlockedUrl()}
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
              placeholder="e.g., youtube.com or facebook"
            />
            <button
              onClick={handleAddBlockedUrl}
              className="px-6 py-3 bg-accent hover:bg-accent-dark text-black font-semibold rounded-lg transition-colors"
            >
              Block
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter a domain name or keyword to block. Partial matches will be blocked.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Blocked List */}
        <div>
          <h3 className="text-sm font-medium mb-3">Blocked Websites ({blockedWebsites.length})</h3>

          {blockedWebsites.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No websites blocked yet</div>
          ) : (
            <div className="space-y-2">
              {blockedWebsites.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{blocked.urlPattern}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Added {formatDate(blocked.dateAdded.split("T")[0])}
                    </div>
                  </div>
                  <button
                    onClick={() => blocked.id && handleRemoveBlockedUrl(blocked.id)}
                    className="ml-3 p-2 text-red-400 hover:text-red-300 transition-colors"
                    title="Remove from block list"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
