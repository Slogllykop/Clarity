import { IconChevronLeft, IconClock, IconTrash, IconWorld } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { formatTime, getTodayDate } from "@/db/utils";
import type { WebsiteActivity, WebsiteTimer } from "@/types";

interface WebsiteTimersProps {
  onBack: () => void;
}

export function WebsiteTimers({ onBack }: WebsiteTimersProps) {
  const [websites, setWebsites] = useState<WebsiteActivity[]>([]);
  const [timers, setTimers] = useState<Map<string, WebsiteTimer>>(new Map());
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [timerValue, setTimerValue] = useState<number>(15); // in minutes
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load today's websites
      const websitesResponse = await chrome.runtime.sendMessage({
        type: "GET_WEBSITE_LIST",
        payload: { date: getTodayDate() },
      });

      // Load all timers
      const timersResponse = await chrome.runtime.sendMessage({
        type: "GET_ALL_TIMERS",
      });

      setWebsites(websitesResponse.websites || []);

      const timerMap = new Map();
      (timersResponse.timers || []).forEach((timer: WebsiteTimer) => {
        timerMap.set(timer.domain, timer);
      });
      setTimers(timerMap);
    } catch (error) {
      console.error("Error loading timer data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetTimer = async (domain: string) => {
    try {
      if (!timerValue || timerValue <= 0) {
        console.error("Invalid timer value");
        return;
      }

      const timeLimit = timerValue * 60; // Convert to seconds

      const response = await chrome.runtime.sendMessage({
        type: "UPDATE_TIMER",
        payload: {
          domain,
          timeLimit,
          enabled: true,
        },
      });

      if (response?.success) {
        await loadData();
        setEditingDomain(null);
        setTimerValue(15);
      }
    } catch (error) {
      console.error("Error setting timer:", error);
    }
  };

  const handleDisableTimer = async (domain: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: "DELETE_TIMER",
        payload: { domain },
      });

      await loadData();
    } catch (error) {
      console.error("Error disabling timer:", error);
    }
  };

  const sortedWebsites = [...websites].sort((a, b) => b.timeSpent - a.timeSpent);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
            <h2 className="text-xl font-bold">Website Timers</h2>
            <p className="text-xs text-gray-400 mt-1">Set daily time limits for websites</p>
          </div>
        </div>
      </div>

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        {/* Content */}
        <div className="p-6">
          {sortedWebsites.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <IconClock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No websites visited yet today</p>
              <p className="text-sm mt-2">Start browsing to set timers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedWebsites.map((website) => {
                const timer = timers.get(website.domain);
                const isEditing = editingDomain === website.domain;

                return (
                  <div key={website.domain} className="pb-4">
                    <div className="flex items-start gap-3">
                      {/* Favicon */}
                      <div className="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-full flex-shrink-0 mt-1">
                        {website.faviconUrl ? (
                          <img
                            src={website.faviconUrl}
                            alt={website.domain}
                            className="w-6 h-6 rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "block";
                            }}
                          />
                        ) : null}
                        <IconWorld
                          size={18}
                          className="text-gray-400"
                          style={{ display: website.faviconUrl ? "none" : "block" }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{website.domain}</div>
                        <div className="text-sm text-gray-400 mt-1">
                          Today: {formatTime(website.timeSpent)}
                        </div>

                        {/* Timer Status */}
                        {timer && (
                          <div className="mt-2 text-xs">
                            <span className="text-accent">
                              Limit: {formatTime(timer.timeLimit)}
                            </span>
                            {website.timeSpent >= timer.timeLimit && (
                              <span className="text-red-400 ml-2">• Exceeded</span>
                            )}
                          </div>
                        )}

                        {/* Timer Input */}
                        {isEditing && (
                          <div className="mt-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="1440"
                                value={timerValue}
                                onChange={(e) => setTimerValue(Number(e.target.value))}
                                onKeyPress={(e) =>
                                  e.key === "Enter" && handleSetTimer(website.domain)
                                }
                                className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-accent"
                                placeholder="15"
                              />
                              <span className="text-sm text-gray-400">minutes</span>
                              <button
                                onClick={() => handleSetTimer(website.domain)}
                                className="px-3 py-2 bg-accent hover:bg-accent-dark text-black text-sm font-medium rounded transition-colors"
                              >
                                Set
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDomain(null);
                                  setTimerValue(15);
                                }}
                                className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                            {website.timeSpent >= timerValue * 60 && (
                              <p className="text-xs text-amber-400">
                                ⚠️ Time already exceeded. Website will be blocked immediately.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {!timer && !isEditing && (
                          <button
                            onClick={() => {
                              setEditingDomain(website.domain);
                              setTimerValue(15);
                            }}
                            className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-black text-xs font-medium rounded transition-colors"
                          >
                            Add Timer
                          </button>
                        )}
                        {timer && !isEditing && (
                          <>
                            <button
                              onClick={() => {
                                setEditingDomain(website.domain);
                                setTimerValue(Math.ceil(timer.timeLimit / 60));
                              }}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded transition-colors"
                              title="Edit timer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDisableTimer(website.domain)}
                              className="p-2 text-red-400 hover:text-red-300 transition-colors"
                              title="Remove timer"
                            >
                              <IconTrash size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-accent">Note:</strong> Timers reset daily at midnight. When
              you exceed the time limit, the website will be blocked for the rest of the day.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
