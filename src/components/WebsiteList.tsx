import { IconWorld } from "@tabler/icons-react";
import { useState } from "react";
import { formatTime } from "@/db/utils";
import type { WebsiteActivity } from "@/types";

interface WebsiteListProps {
  websites: WebsiteActivity[];
  showAllThreshold?: number;
}

export function WebsiteList({ websites, showAllThreshold = 10 }: WebsiteListProps) {
  const [showAll, setShowAll] = useState(false);

  const sortedWebsites = [...websites].sort((a, b) => b.timeSpent - a.timeSpent);
  const displayWebsites = showAll ? sortedWebsites : sortedWebsites.slice(0, showAllThreshold);
  const hasMore = sortedWebsites.length > showAllThreshold;

  if (websites.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No websites visited yet</div>;
  }

  return (
    <div className="space-y-2">
      {displayWebsites.map((website, index) => (
        <div
          key={`${website.domain}-${index}`}
          className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800"
        >
          {/* Favicon */}
          <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full flex-shrink-0">
            {website.faviconUrl ? (
              <img
                src={website.faviconUrl}
                alt={website.domain}
                className="w-5 h-5 rounded"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "block";
                }}
              />
            ) : null}
            <IconWorld
              size={16}
              className="text-gray-400"
              style={{ display: website.faviconUrl ? "none" : "block" }}
            />
          </div>

          {/* Domain */}
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{website.domain}</div>
            <div className="text-gray-400 text-xs">
              {website.visitCount} visit{website.visitCount !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Time */}
          <div className="text-accent font-semibold text-sm">{formatTime(website.timeSpent)}</div>
        </div>
      ))}

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full p-3 text-sm text-accent hover:text-accent-light transition-colors"
        >
          Show all {sortedWebsites.length} websites
        </button>
      )}

      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full p-3 text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}
