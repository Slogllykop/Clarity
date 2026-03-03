import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";

interface ResetViewProps {
  securityQuestion?: string;
  resetAnswer: string;
  setResetAnswer: (val: string) => void;
  error: string;
  onSubmit: () => void;
  onBack: () => void;
}

export function ResetView({
  securityQuestion,
  resetAnswer,
  setResetAnswer,
  error,
  onSubmit,
  onBack,
}: ResetViewProps) {
  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <PageHeader title="Reset Password" onBack={onBack} />

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        <div className="p-6 max-w-md mx-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Security Question</label>
              <div className="p-3 bg-zinc-900 rounded-lg text-gray-300 text-sm">
                {securityQuestion}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Answer</label>
              <input
                type="text"
                value={resetAnswer}
                onChange={(e) => setResetAnswer(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && onSubmit()}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Enter your answer"
              />
            </div>

            {error ? (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            ) : null}

            <button
              onClick={onSubmit}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-black font-semibold rounded-lg transition-colors"
            >
              Reset Password
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
