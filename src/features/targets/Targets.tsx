import { IconTarget, IconTargetOff } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { log } from "@/lib/logger";
import type { Settings, TargetSettings } from "@/types";

interface TargetsProps {
  onBack: () => void;
}

export function Targets({ onBack }: TargetsProps) {
  const [enabled, setEnabled] = useState(false);
  const [targetHours, setTargetHours] = useState(8);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      const settings: Settings = response.settings || { reminderEnabled: false };
      const target = settings.targetSettings;
      if (target) {
        setEnabled(target.enabled);
        setTargetHours(target.targetHours || 8);
      }
    } catch (error) {
      log.error("Error loading target settings", error);
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

      const newTargetSettings: TargetSettings = {
        enabled: newEnabled,
        targetHours,
      };

      await chrome.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        payload: {
          targetSettings: newTargetSettings,
        },
      });

      setEnabled(newEnabled);

      if (newEnabled) {
        const permission = await chrome.permissions.request({
          permissions: ["notifications"],
        });

        if (!permission) {
          await chrome.runtime.sendMessage({
            type: "UPDATE_SETTINGS",
            payload: {
              targetSettings: { enabled: false, targetHours },
            },
          });
          setEnabled(false);
          toast.error("Notification permission is required for daily targets");
          return;
        }

        toast.success("Daily target enabled! You'll be notified each day.");
      }
    } catch (error) {
      log.error("Error toggling target", error);
    }
  };

  const handleSaveTarget = async () => {
    if (targetHours <= 0 || targetHours > 24) {
      toast.error("Please enter a valid target between 1 and 24 hours");
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        payload: {
          targetSettings: { enabled, targetHours },
        },
      });

      toast.success(`Target set to ${targetHours} hours per day`);
    } catch (error) {
      log.error("Error saving target", error);
      toast.error("Failed to save target");
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      {/* Header */}
      <PageHeader title="Daily Targets" subtitle="Set a daily screen time goal" onBack={onBack} />

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        <div className="p-6 max-w-100">
          {/* Toggle Card */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {enabled ? (
                    <IconTarget size={24} className="text-accent" />
                  ) : (
                    <IconTargetOff size={24} className="text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold">{enabled ? "Enabled" : "Disabled"}</h3>
                </div>
                <p className="text-sm text-gray-400">
                  {enabled
                    ? "You'll receive a daily notification about your usage"
                    : "Enable to get daily target notifications"}
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

          {/* Target Input */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3">Daily Target (hours)</h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                className="w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-center text-lg font-bold focus:outline-none focus:border-accent"
              />
              <span className="text-sm text-gray-400">hours per day</span>
              <button
                onClick={handleSaveTarget}
                className="px-4 py-3 bg-accent hover:bg-accent-dark text-black text-sm font-semibold rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Stay below this daily screen time to meet your target.
            </p>
          </div>

          {/* Info Section */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3">How it works</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-900 rounded-lg">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <div className="text-sm text-gray-300">
                    Set a daily screen time target (e.g., 8 hours). Clarity will track your total
                    browsing time each day.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-900 rounded-lg">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <div className="text-sm text-gray-300">
                    Each day, you'll receive a notification summarizing whether you stayed under or
                    went over your target the previous day.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-900 rounded-lg">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <div className="text-sm text-gray-300">
                    This feature only sends notifications - it does not block any websites or change
                    your browsing behavior.
                  </div>
                </div>
              </div>
            </div>

            {/* System Notifications Warning */}
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-yellow-500">System Notifications:</strong> Please ensure
                that system notifications for your browser are turned on in your OS settings. The
                daily notification is sent once per day (at midnight or when you open your browser).
              </p>
            </div>

            {/* Privacy Note */}
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-accent">Privacy:</strong> All data stays local on your
                device. No information is sent to any server.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
