import { useState } from "react";
import { ActivityDetails } from "@/screens/ActivityDetails";
import { Dashboard } from "@/screens/Dashboard";
import { ParentalControls } from "@/screens/ParentalControls";
import { ScreenTimeReminders } from "@/screens/ScreenTimeReminders";
import { WebsiteTimers } from "@/screens/WebsiteTimers";

type Screen =
  | "dashboard"
  | "activity-details"
  | "website-timers"
  | "parental-controls"
  | "screen-time-reminders";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const goToDashboard = () => {
    setCurrentScreen("dashboard");
  };

  return (
    <div className="w-[400px] min-h-[500px] bg-black">
      {currentScreen === "dashboard" && <Dashboard onNavigate={navigate} />}
      {currentScreen === "activity-details" && <ActivityDetails onBack={goToDashboard} />}
      {currentScreen === "website-timers" && <WebsiteTimers onBack={goToDashboard} />}
      {currentScreen === "parental-controls" && <ParentalControls onBack={goToDashboard} />}
      {currentScreen === "screen-time-reminders" && <ScreenTimeReminders onBack={goToDashboard} />}
    </div>
  );
}

export default App;
