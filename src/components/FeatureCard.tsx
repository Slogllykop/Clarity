import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

export function FeatureCard({ icon, title, description, onClick }: FeatureCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors text-left border border-zinc-800 hover:border-accent/50"
    >
      <div className="flex items-start gap-3">
        <div className="text-accent mt-1">{icon}</div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <p className="text-gray-400 text-xs mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}
