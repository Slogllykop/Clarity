import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  index?: number;
}

export function FeatureCard({ icon, title, description, onClick, index = 0 }: FeatureCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full p-px rounded-2xl transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] text-left outline-none animate-in fade-in slide-in-from-bottom-4 fill-mode-both`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Animated glowing border background */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-zinc-800 via-zinc-900/50 to-zinc-800 opacity-100 transition-opacity duration-500 group-hover:from-emerald-500/50 group-hover:via-emerald-900/20 group-hover:to-zinc-800" />

      {/* Card Content Area */}
      <div className="relative flex items-center gap-4 h-full p-4 bg-zinc-950/90 backdrop-blur-xl rounded-[15px] transition-colors duration-500 overflow-hidden">
        {/* Subtle inner top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-zinc-700/50 to-transparent opacity-50" />

        {/* Icon Container */}
        <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 transition-all duration-500 group-hover:border-emerald-500/30 group-hover:bg-emerald-950/30 shrink-0">
          <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="text-zinc-400 group-hover:text-emerald-400 transition-colors duration-300 relative z-10">
            {icon}
          </div>
        </div>

        {/* Text Container */}
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-zinc-100 font-semibold tracking-tight text-[15px] group-hover:text-white transition-colors duration-300">
            {title}
          </h3>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed truncate group-hover:text-zinc-400 transition-colors duration-300">
            {description}
          </p>
        </div>

        {/* Arrow Indicator */}
        <div className="text-zinc-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Icon</title>
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}
