import { IconChevronLeft } from "@tabler/icons-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function PageHeader({ title, subtitle, onBack }: PageHeaderProps) {
  return (
    <div className="bg-black border-b border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <IconChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}
