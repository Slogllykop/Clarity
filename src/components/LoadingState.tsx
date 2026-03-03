import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";

export function LoadingState() {
  return (
    <div
      className="bg-black flex items-center justify-center"
      style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}
    >
      <div className="text-gray-400">Loading...</div>
    </div>
  );
}
