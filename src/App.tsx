import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/AuthContext";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ProfileSetup from "@/pages/ProfileSetup";
import FindBlood from "@/pages/FindBlood";
import DonatePage from "@/pages/DonatePage";
import HospitalsPage from "@/pages/HospitalsPage";
import AboutPage from "@/pages/AboutPage";
import DonorDashboard from "@/pages/dashboard/DonorDashboard";
import ReceiverDashboard from "@/pages/dashboard/ReceiverDashboard";
import HospitalDashboard from "@/pages/dashboard/HospitalDashboard";
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import NotFound from "@/pages/NotFound";
import SOSButton from "@/components/SOSButton";

const queryClient = new QueryClient();

// Guard: must be logged in + profile complete + correct role
function AuthGuard({ requiredRole, children }: { requiredRole: UserRole; children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile?.profileCompleted) return <Navigate to="/profile-setup" replace />;
  // Redirect to correct dashboard if wrong role
  if (profile.role !== requiredRole) return <Navigate to={`/dashboard/${profile.role}`} replace />;
  return <>{children}</>;
}

// Guard: must be logged in (for profile setup)
function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Auto-redirect logged-in users away from login page
function LoginRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (user && profile?.profileCompleted) {
    return <Navigate to={`/dashboard/${profile.role}`} replace />;
  }
  if (user && !profile?.profileCompleted) {
    return <Navigate to="/profile-setup" replace />;
  }
  return <Login />;
}

// SOS button only shown when authenticated
function GlobalSOS() {
  const { user } = useAuth();
  return user ? <SOSButton /> : null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/profile-setup" element={<ProfileGuard><ProfileSetup /></ProfileGuard>} />
      <Route path="/find-blood" element={<FindBlood />} />
      <Route path="/donate" element={<DonatePage />} />
      <Route path="/hospitals" element={<HospitalsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/dashboard/donor" element={<AuthGuard requiredRole="donor"><DonorDashboard /></AuthGuard>} />
      <Route path="/dashboard/receiver" element={<AuthGuard requiredRole="receiver"><ReceiverDashboard /></AuthGuard>} />
      <Route path="/dashboard/hospital" element={<AuthGuard requiredRole="hospital"><HospitalDashboard /></AuthGuard>} />
      <Route path="/dashboard/admin" element={<AuthGuard requiredRole="admin"><AdminDashboard /></AuthGuard>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <GlobalSOS />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
