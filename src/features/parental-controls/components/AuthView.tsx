import { IconLock } from "@tabler/icons-react";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";

interface AuthViewProps {
  onBack: () => void;
  password: string;
  setPassword: (val: string) => void;
  error: string;
  onSubmit: () => void;
  onForgotPassword: () => void;
}

export function AuthView({
  onBack,
  password,
  setPassword,
  error,
  onSubmit,
  onForgotPassword,
}: AuthViewProps) {
  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <PageHeader title="Parental Controls" onBack={onBack} />

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
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
                onKeyPress={(e) => e.key === "Enter" && onSubmit()}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Enter password"
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
              Unlock
            </button>

            <button
              onClick={onForgotPassword}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
