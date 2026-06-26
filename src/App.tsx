import { useApp } from "./hooks/useApp";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import { DashboardSkeleton } from "./components/Skeleton";

export default function App() {
  const {
    loading,
    token,
    user,
    org,
    assigned,
    merged,
    error,
    isLoadingPRs,
    showSettings,
    handleLogin,
    logout,
    handleTabChange,
    handleReload,
    openSettings,
    closeSettings,
    saveSettings,
  } = useApp();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (showSettings) {
    return <Settings org={org} onSave={saveSettings} onCancel={closeSettings} />;
  }

  return (
    <Dashboard
      user={user}
      assigned={assigned}
      merged={merged}
      isLoadingPRs={isLoadingPRs}
      error={error}
      onLogout={logout}
      onReload={handleReload}
      onTabChange={handleTabChange}
      onOpenSettings={openSettings}
    />
  );
}
