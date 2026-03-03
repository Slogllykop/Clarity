interface TimerInputRowProps {
  timerValue: number;
  intervalValue: number;
  onTimerValueChange: (value: number) => void;
  onIntervalValueChange: (value: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  warningMessage?: string;
}

export function TimerInputRow({
  timerValue,
  intervalValue,
  onTimerValueChange,
  onIntervalValueChange,
  onSubmit,
  onCancel,
  warningMessage,
}: TimerInputRowProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max="1440"
          step="1"
          value={timerValue}
          onChange={(e) => onTimerValueChange(Math.floor(Number(e.target.value)))}
          onKeyPress={(e) => e.key === "Enter" && onSubmit()}
          className="w-16 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-accent"
          placeholder="15"
        />
        <span className="text-xs text-gray-400">min</span>
        <span className="text-xs text-gray-500">/</span>
        <input
          type="number"
          min="1"
          max="24"
          step="1"
          value={intervalValue}
          onChange={(e) => onIntervalValueChange(Math.floor(Number(e.target.value)))}
          className="w-14 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-accent"
          placeholder="24"
        />
        <span className="text-xs text-gray-400">hrs</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          className="px-3 py-2 bg-accent hover:bg-accent-dark text-black text-sm font-medium rounded transition-colors"
        >
          Set
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
      {warningMessage ? <p className="text-xs text-amber-400">⚠️ {warningMessage}</p> : null}
    </div>
  );
}
