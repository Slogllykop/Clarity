import { AuthView } from "./components/AuthView";
import { DashboardView } from "./components/DashboardView";
import { ResetView } from "./components/ResetView";
import { SetupView } from "./components/SetupView";
import { useParentalControls } from "./hooks/useParentalControls";

interface ParentalControlsProps {
  onBack: () => void;
}

export function ParentalControls({ onBack }: ParentalControlsProps) {
  const ctrl = useParentalControls();

  switch (ctrl.view) {
    case "setup":
      return (
        <SetupView
          onBack={onBack}
          password={ctrl.password}
          setPassword={ctrl.setPassword}
          confirmPassword={ctrl.confirmPassword}
          setConfirmPassword={ctrl.setConfirmPassword}
          securityQuestion={ctrl.securityQuestion}
          setSecurityQuestion={ctrl.setSecurityQuestion}
          securityAnswer={ctrl.securityAnswer}
          setSecurityAnswer={ctrl.setSecurityAnswer}
          error={ctrl.error}
          onSubmit={ctrl.handleSetup}
        />
      );

    case "auth":
      return (
        <AuthView
          onBack={onBack}
          password={ctrl.password}
          setPassword={ctrl.setPassword}
          error={ctrl.error}
          onSubmit={ctrl.handleAuth}
          onForgotPassword={() => ctrl.setView("reset")}
        />
      );

    case "reset":
      return (
        <ResetView
          securityQuestion={ctrl.settings?.securityQuestion}
          resetAnswer={ctrl.resetAnswer}
          setResetAnswer={ctrl.setResetAnswer}
          error={ctrl.error}
          onSubmit={ctrl.handleReset}
          onBack={() => ctrl.setView("auth")}
        />
      );

    case "dashboard":
      return (
        <DashboardView
          onBack={onBack}
          blockedWebsites={ctrl.blockedWebsites}
          newUrl={ctrl.newUrl}
          setNewUrl={ctrl.setNewUrl}
          error={ctrl.error}
          onAddUrl={ctrl.handleAddBlockedUrl}
          onRemoveUrl={ctrl.handleRemoveBlockedUrl}
        />
      );

    default:
      return null;
  }
}
