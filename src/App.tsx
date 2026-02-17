import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { EXTENSION_MAX_HEIGHT, EXTENSION_WIDTH } from "@/constants/layout";
import { SCREENS, useScreenNavigation } from "@/hooks/useScreenNavigation";

// Lazy load features
const Dashboard = lazy(() =>
  import("@/features/dashboard/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const ActivityDetails = lazy(() =>
  import("@/features/activity/ActivityDetails").then((module) => ({
    default: module.ActivityDetails,
  })),
);
const WebsiteTimers = lazy(() =>
  import("@/features/timers/WebsiteTimers").then((module) => ({ default: module.WebsiteTimers })),
);
const ParentalControls = lazy(() =>
  import("@/features/parental-controls/ParentalControls").then((module) => ({
    default: module.ParentalControls,
  })),
);
const ScreenTimeReminders = lazy(() =>
  import("@/features/reminders/ScreenTimeReminders").then((module) => ({
    default: module.ScreenTimeReminders,
  })),
);
const UsageAnalytics = lazy(() =>
  import("@/features/analytics/UsageAnalytics").then((module) => ({
    default: module.UsageAnalytics,
  })),
);

function App() {
  const { currentScreen, navigate, goToDashboard } = useScreenNavigation();

  const renderScreen = () => {
    switch (currentScreen) {
      case SCREENS.DASHBOARD:
        return <Dashboard onNavigate={navigate} />;
      case SCREENS.ACTIVITY_DETAILS:
        return <ActivityDetails onBack={goToDashboard} />;
      case SCREENS.WEBSITE_TIMERS:
        return <WebsiteTimers onBack={goToDashboard} />;
      case SCREENS.PARENTAL_CONTROLS:
        return <ParentalControls onBack={goToDashboard} />;
      case SCREENS.SCREEN_TIME_REMINDERS:
        return <ScreenTimeReminders onBack={goToDashboard} />;
      case SCREENS.USAGE_ANALYTICS:
        return <UsageAnalytics onBack={goToDashboard} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div
      className="bg-black"
      style={{
        width: `${EXTENSION_WIDTH}px`,
        height: `${EXTENSION_MAX_HEIGHT}px`,
        maxHeight: `${EXTENSION_MAX_HEIGHT}px`,
        overflow: "hidden",
      }}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full text-white">Loading...</div>
        }
      >
        {renderScreen()}
      </Suspense>
      <Toaster position="bottom-center" richColors />
    </div>
  );
}

export default App;
