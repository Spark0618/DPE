import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import OnboardingPage from "./pages/OnboardingPage";
import GroupPage from "./pages/GroupPage";
import GroupSettingsPage from "./pages/GroupSettingsPage";
import DocEditorPage from "./pages/DocEditorPage";
import DesignRoutes from "./designs/DesignRoutes";
import { hasUserProfile } from "./lib/identity";

function RequireProfile({ children }: { children: ReactNode }) {
  if (!hasUserProfile()) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/designs/*" element={<DesignRoutes />} />
      <Route path="/" element={<OnboardingPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireProfile>
            <DashboardPage />
          </RequireProfile>
        }
      />
      <Route
        path="/connections"
        element={
          <RequireProfile>
            <ConnectionsPage />
          </RequireProfile>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <RequireProfile>
            <GroupPage />
          </RequireProfile>
        }
      />
      <Route
        path="/groups/:groupId/settings"
        element={
          <RequireProfile>
            <GroupSettingsPage />
          </RequireProfile>
        }
      />
      <Route
        path="/groups/:groupId/docs/:docId"
        element={
          <RequireProfile>
            <DocEditorPage />
          </RequireProfile>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
