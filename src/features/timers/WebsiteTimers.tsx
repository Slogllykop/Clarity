import { IconClock, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { useTimers } from "@/hooks/useTimers";
import { WebsiteTimerCard } from "./components/WebsiteTimerCard";

interface WebsiteTimersProps {
  onBack: () => void;
}

export function WebsiteTimers({ onBack }: WebsiteTimersProps) {
  const { timers, loading, sortedWebsites, allTimersWithActivity, setTimer, deleteTimer } =
    useTimers();

  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [timerValue, setTimerValue] = useState<number>(15);
  const [intervalValue, setIntervalValue] = useState<number>(24);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSetTimer = async (domain: string) => {
    const minutes = Math.floor(timerValue);
    const interval = Math.floor(intervalValue);
    if (!minutes || minutes <= 0) return;
    if (!interval || interval <= 0 || interval > 24) return;

    const timeLimit = minutes * 60;
    const success = await setTimer(domain, timeLimit, interval);

    if (success) {
      setEditingDomain(null);
      setTimerValue(15);
      setIntervalValue(24);
    }
  };

  const startEditing = (domain: string, existingMinutes = 15, existingInterval = 24) => {
    setEditingDomain(domain);
    setTimerValue(existingMinutes);
    setIntervalValue(existingInterval);
  };

  const cancelEditing = () => {
    setEditingDomain(null);
    setTimerValue(15);
    setIntervalValue(24);
  };

  const websitesWithoutTimers = useMemo(() => {
    const withoutTimers = sortedWebsites.filter((website) => !timers.has(website.domain));

    if (!searchQuery.trim()) return withoutTimers;

    const query = searchQuery.toLowerCase().trim();
    return withoutTimers.filter((website) => website.domain.toLowerCase().includes(query));
  }, [sortedWebsites, timers, searchQuery]);

  if (loading) return <LoadingState />;

  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <PageHeader
        title="Website Timers"
        subtitle="Set daily time limits for websites"
        onBack={onBack}
      />

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        <div className="p-6 max-w-100">
          {/* Active Timers Section */}
          {allTimersWithActivity.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <IconClock size={16} className="text-accent" />
                Active Timers ({allTimersWithActivity.length})
              </h3>
              <div className="space-y-3 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                {allTimersWithActivity.map((website) => {
                  const timer = timers.get(website.domain);
                  return (
                    <WebsiteTimerCard
                      key={website.domain}
                      domain={website.domain}
                      timeSpent={website.timeSpent}
                      intervalTimeSpent={website.intervalTimeSpent}
                      faviconUrl={website.faviconUrl}
                      timer={timer}
                      isEditing={editingDomain === website.domain}
                      timerValue={timerValue}
                      intervalValue={intervalValue}
                      onTimerValueChange={setTimerValue}
                      onIntervalValueChange={setIntervalValue}
                      onEdit={() =>
                        startEditing(
                          website.domain,
                          Math.ceil(timer!.timeLimit / 60),
                          timer!.intervalHours || 24,
                        )
                      }
                      onDelete={() => deleteTimer(website.domain)}
                      onSubmit={() => handleSetTimer(website.domain)}
                      onCancel={cancelEditing}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Websites Section */}
          {websitesWithoutTimers.length === 0 && allTimersWithActivity.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <IconClock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No websites visited yet today</p>
              <p className="text-sm mt-2">Start browsing to set timers</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Add Timer to Website</h3>

                {/* Search Box */}
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconSearch size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search websites..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                      aria-label="Clear search"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="img"
                        aria-label="Close icon"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>

              {websitesWithoutTimers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <IconSearch size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No websites found matching "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-xs text-accent hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {websitesWithoutTimers.map((website) => (
                    <WebsiteTimerCard
                      key={website.domain}
                      domain={website.domain}
                      timeSpent={website.timeSpent}
                      faviconUrl={website.faviconUrl}
                      isEditing={editingDomain === website.domain}
                      timerValue={timerValue}
                      intervalValue={intervalValue}
                      onTimerValueChange={setTimerValue}
                      onIntervalValueChange={setIntervalValue}
                      onEdit={() => startEditing(website.domain)}
                      onSubmit={() => handleSetTimer(website.domain)}
                      onCancel={cancelEditing}
                      isNewTimer
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-accent">Note:</strong> Timers work within rolling interval
              windows. The default interval is 24 hours (daily). You can set custom intervals (e.g.,
              15 min per 6 hours). When you exceed the time limit within the current interval, the
              website will be blocked until the next interval.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
