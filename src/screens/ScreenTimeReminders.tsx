import { IconBell, IconBellOff, IconChevronLeft } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import type { Settings } from "@/types";

interface ScreenTimeRemindersProps {
  onBack: () => void;
}

export function ScreenTimeReminders({ onBack }: ScreenTimeRemindersProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      const settings: Settings = response.settings || { reminderEnabled: false };
      setEnabled(settings.reminderEnabled);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = async () => {
    try {
      const newEnabled = !enabled;

      await chrome.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        payload: {
          reminderEnabled: newEnabled,
          reminderThresholds: [1800, 3600, 7200], // 30min, 1hr, 2hr
        },
      });

      setEnabled(newEnabled);

      // Request notification permission if enabling
      if (newEnabled) {
        const permission = await chrome.permissions.request({
          permissions: ["notifications"],
        });

        if (!permission) {
          // Revert if permission denied
          await chrome.runtime.sendMessage({
            type: "UPDATE_SETTINGS",
            payload: { reminderEnabled: false },
          });
          setEnabled(false);
          toast.error("Notification permission is required for screen time reminders");
        }
      }
    } catch (error) {
      console.error("Error toggling reminders:", error);
    }
  };

  if (loading) {
    return (
      <div
        className="bg-black flex items-center justify-center"
        style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}
      >
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      {/* Header */}
      <div className="bg-black border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
            <IconChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Screen Time Reminders</h2>
            <p className="text-xs text-gray-400 mt-1">Get notified about excessive usage</p>
          </div>
        </div>
      </div>

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        {/* Content */}
        <div className="p-6">
          {/* Toggle Card */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {enabled ? (
                    <IconBell size={24} className="text-accent" />
                  ) : (
                    <IconBellOff size={24} className="text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold">{enabled ? "Enabled" : "Disabled"}</h3>
                </div>
                <p className="text-sm text-gray-400">
                  {enabled
                    ? "You'll receive notifications when spending too much time on websites"
                    : "Enable to get reminders about your screen time"}
                </p>
              </div>

              <button
                onClick={handleToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-black ${
                  enabled ? "bg-accent" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-4">
            {/* Notification Intervals */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Notification Intervals</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-zinc-900 rounded-lg text-center border border-zinc-800">
                  <div className="text-lg font-bold text-accent">30m</div>
                  <div className="text-xs text-gray-400 mt-1">First reminder</div>
                </div>
                <div className="p-3 bg-zinc-900 rounded-lg text-center border border-zinc-800">
                  <div className="text-lg font-bold text-accent">1h</div>
                  <div className="text-xs text-gray-400 mt-1">Second reminder</div>
                </div>
                <div className="p-3 bg-zinc-900 rounded-lg text-center border border-zinc-800">
                  <div className="text-lg font-bold text-accent">2h</div>
                  <div className="text-xs text-gray-400 mt-1">Third reminder</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">How it works</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-900 rounded-lg">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                  <div className="text-sm text-gray-300">
                    Clarity automatically monitors your time spent on each website
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-900 rounded-lg">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                  <div className="text-sm text-gray-300">
                    Reminders help you stay aware of your browsing habits
                  </div>
                </div>
              </div>
            </div>

            {/* System Notifications Warning */}
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-yellow-500">System Notifications:</strong> Please ensure
                that system notifications for your browser are turned on in your OS settings.
                Otherwise, the screen time reminders will not work.
              </p>
            </div>

            {/* Privacy Note */}
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-accent">Privacy:</strong> All data stays local on your
                device. No information is sent to any server. Notifications are triggered
                automatically based on your browsing patterns.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
