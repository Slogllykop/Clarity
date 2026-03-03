import { IconTrash } from "@tabler/icons-react";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { formatDate } from "@/db/utils";
import type { BlockedWebsite } from "@/types";

interface DashboardViewProps {
  onBack: () => void;
  blockedWebsites: BlockedWebsite[];
  newUrl: string;
  setNewUrl: (val: string) => void;
  error: string;
  onAddUrl: () => void;
  onRemoveUrl: (id: number) => void;
}

export function DashboardView({
  onBack,
  blockedWebsites,
  newUrl,
  setNewUrl,
  error,
  onAddUrl,
  onRemoveUrl,
}: DashboardViewProps) {
  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <PageHeader title="Parental Controls" subtitle="Block websites permanently" onBack={onBack} />

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        <div className="p-6">
          {/* Add URL Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Block Website</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && onAddUrl()}
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="e.g., youtube.com or facebook"
              />
              <button
                onClick={onAddUrl}
                className="px-6 py-3 bg-accent hover:bg-accent-dark text-black font-semibold rounded-lg transition-colors"
              >
                Block
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter a domain name or keyword to block. Partial matches will be blocked.
            </p>
          </div>

          {error ? (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          ) : null}

          {/* Blocked List */}
          <div>
            <h3 className="text-sm font-medium mb-3">
              Blocked Websites ({blockedWebsites.length})
            </h3>

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
                      onClick={() => blocked.id && onRemoveUrl(blocked.id)}
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
      </ScrollArea>
    </div>
  );
}
