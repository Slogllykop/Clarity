import { EXTENSION_MAX_HEIGHT, EXTENSION_WIDTH } from "@/constants/layout";
import { SCREENS, useScreenNavigation } from "@/hooks/useScreenNavigation";
import { ActivityDetails } from "@/screens/ActivityDetails";
import { Dashboard } from "@/screens/Dashboard";
import { ParentalControls } from "@/screens/ParentalControls";
import { ScreenTimeReminders } from "@/screens/ScreenTimeReminders";
import { UsageAnalytics } from "@/screens/UsageAnalytics";
import { WebsiteTimers } from "@/screens/WebsiteTimers";

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
      {renderScreen()}
    </div>
  );
}

export default App;
