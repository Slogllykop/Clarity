import { IconWorld } from "@tabler/icons-react";

interface FaviconImageProps {
  faviconUrl: string | null | undefined;
  domain: string;
  size?: "sm" | "md";
}

export function FaviconImage({ faviconUrl, domain, size = "md" }: FaviconImageProps) {
  const containerSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const imgSize = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <div
      className={`${containerSize} flex items-center justify-center bg-zinc-800 rounded-full shrink-0`}
    >
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt={domain}
          className={`${imgSize} rounded`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "block";
          }}
        />
      ) : null}
      <IconWorld
        size={iconSize}
        className="text-gray-400"
        style={{ display: faviconUrl ? "none" : "block" }}
      />
    </div>
  );
}
