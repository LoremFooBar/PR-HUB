import { useApp } from "./hooks/useApp";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import { DashboardSkeleton } from "./components/Skeleton";

export default function App() {
  const {
    loading,
    token,
    user,
    assigned,
    reviews,
    merged,
    error,
    isLoadingPRs,
    handleLogin,
    logout,
    handleTabChange,
    handleReload,
  } = useApp();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      user={user}
      assigned={assigned}
      reviews={reviews}
      merged={merged}
      isLoadingPRs={isLoadingPRs}
      error={error}
      onLogout={logout}
      onReload={handleReload}
      onTabChange={handleTabChange}
    />
  );
}
