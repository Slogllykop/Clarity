import { useState } from "react";

// Screen types
export type ScreenName =
  | "dashboard"
  | "activity-details"
  | "website-timers"
  | "parental-controls"
  | "screen-time-reminders"
  | "usage-analytics";

// Screen constants
export const SCREENS = {
  DASHBOARD: "dashboard" as const,
  ACTIVITY_DETAILS: "activity-details" as const,
  WEBSITE_TIMERS: "website-timers" as const,
  PARENTAL_CONTROLS: "parental-controls" as const,
  SCREEN_TIME_REMINDERS: "screen-time-reminders" as const,
  USAGE_ANALYTICS: "usage-analytics" as const,
} as const;

// Screen configuration type
interface ScreenConfig {
  initialScreen?: ScreenName;
}

export function useScreenNavigation(config: ScreenConfig = {}) {
  const { initialScreen = SCREENS.DASHBOARD } = config;
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(initialScreen);

  const navigate = (screen: ScreenName) => {
    setCurrentScreen(screen);
  };

  const goToDashboard = () => {
    setCurrentScreen(SCREENS.DASHBOARD);
  };

  return {
    currentScreen,
    navigate,
    goToDashboard,
    SCREENS,
  };
}
