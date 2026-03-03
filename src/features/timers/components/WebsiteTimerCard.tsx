import { IconTrash } from "@tabler/icons-react";
import { FaviconImage } from "@/components/FaviconImage";
import { formatTime } from "@/db/utils";
import type { WebsiteTimer } from "@/types";
import { TimerInputRow } from "./TimerInputRow";

interface WebsiteTimerCardProps {
  domain: string;
  timeSpent: number;
  intervalTimeSpent?: number;
  faviconUrl?: string | null;
  timer?: WebsiteTimer;
  isEditing: boolean;
  timerValue: number;
  intervalValue: number;
  onTimerValueChange: (value: number) => void;
  onIntervalValueChange: (value: number) => void;
  onEdit: () => void;
  onDelete?: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  /** If true, shows "Add Timer" button instead of Edit/Delete */
  isNewTimer?: boolean;
}

export function WebsiteTimerCard({
  domain,
  timeSpent,
  intervalTimeSpent,
  faviconUrl,
  timer,
  isEditing,
  timerValue,
  intervalValue,
  onTimerValueChange,
  onIntervalValueChange,
  onEdit,
  onDelete,
  onSubmit,
  onCancel,
  isNewTimer = false,
}: WebsiteTimerCardProps) {
  const warningMessage =
    timeSpent >= timerValue * 60
      ? "Time already exceeded. Website will be blocked immediately."
      : undefined;

  const isExceeded =
    timer && intervalTimeSpent !== undefined ? intervalTimeSpent >= timer.timeLimit : false;

  return (
    <div className="pb-4 last:pb-0 border-b border-zinc-800 last:border-0">
      <div className="flex items-start gap-3">
        {/* Favicon */}
        <div className="mt-1">
          <FaviconImage faviconUrl={faviconUrl} domain={domain} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white truncate">{domain}</div>
          <div className="text-sm text-gray-400 mt-1">Today: {formatTime(timeSpent)}</div>

          {/* Interval Time */}
          {timer && intervalTimeSpent !== undefined && !isEditing ? (
            <div className="text-sm text-gray-400">
              Interval: {formatTime(intervalTimeSpent)} / {formatTime(timer.timeLimit)}
            </div>
          ) : null}

          {/* Timer Status */}
          {timer && !isEditing ? (
            <div className="mt-2 text-xs">
              <span className="text-accent">
                Limit: {formatTime(timer.timeLimit)}
                {timer.intervalHours && timer.intervalHours < 24
                  ? ` / ${timer.intervalHours}h`
                  : " / day"}
              </span>
              {isExceeded ? <span className="text-red-400 ml-2">• Exceeded</span> : null}
            </div>
          ) : null}

          {/* Timer Input */}
          {isEditing ? (
            <TimerInputRow
              timerValue={timerValue}
              intervalValue={intervalValue}
              onTimerValueChange={onTimerValueChange}
              onIntervalValueChange={onIntervalValueChange}
              onSubmit={onSubmit}
              onCancel={onCancel}
              warningMessage={warningMessage}
            />
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!isEditing ? (
            isNewTimer ? (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-black text-xs font-medium rounded transition-colors"
              >
                Add Timer
              </button>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded transition-colors"
                  title="Edit timer"
                >
                  Edit
                </button>
                {onDelete ? (
                  <button
                    onClick={onDelete}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    title="Remove timer"
                  >
                    <IconTrash size={18} />
                  </button>
                ) : null}
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
