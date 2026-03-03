import { IconShield } from "@tabler/icons-react";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";

interface SetupViewProps {
  onBack: () => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  securityQuestion: string;
  setSecurityQuestion: (val: string) => void;
  securityAnswer: string;
  setSecurityAnswer: (val: string) => void;
  error: string;
  onSubmit: () => void;
}

export function SetupView({
  onBack,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  securityQuestion,
  setSecurityQuestion,
  securityAnswer,
  setSecurityAnswer,
  error,
  onSubmit,
}: SetupViewProps) {
  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <PageHeader title="Set Up Parental Controls" onBack={onBack} />

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-8">
            <IconShield size={48} className="mx-auto mb-4 text-accent" />
            <p className="text-sm text-gray-400">
              Create a password to protect parental control settings
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Enter password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Confirm password"
              />
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <label className="block text-sm font-medium mb-2">Security Question</label>
              <input
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="e.g., What is your pet's name?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Security Answer</label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="Your answer"
              />
              <p className="text-xs text-gray-500 mt-1">Used to reset password if forgotten</p>
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
              Set Up Protection
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
