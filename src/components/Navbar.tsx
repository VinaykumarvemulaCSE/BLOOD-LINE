import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Heart, LogOut, LayoutDashboard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import NotificationCenter from "@/components/NotificationCenter";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/find-blood", label: "Find Blood" },
  { to: "/donate", label: "Donate Blood" },
  { to: "/hospitals", label: "Hospitals" },
  { to: "/about", label: "About" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardRoute = profile
    ? `/dashboard/${profile.role}`
    : "/profile-setup";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Heart className="h-7 w-7 text-primary fill-primary" />
          <span className="text-xl font-display font-bold text-secondary">
            Blood<span className="text-primary">Line</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {profile && (
                <span className="text-xs text-muted-foreground mr-1 hidden lg:inline">
                  {profile.name}
                </span>
              )}
              <NotificationCenter />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(dashboardRoute)}
                className="gap-1.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => { await logout(); navigate("/"); }}
                className="gap-1.5 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/login")}
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/login?tab=register")}
                className="gradient-primary text-primary-foreground shadow-primary"
              >
                Register
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    {profile && (
                      <div className="px-3 py-1 text-xs text-muted-foreground">
                        Signed in as <span className="font-medium text-foreground">{profile.name}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigate(dashboardRoute);
                        setOpen(false);
                      }}
                      className="gap-1.5 justify-start"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await logout();
                        navigate("/");
                        setOpen(false);
                      }}
                      className="gap-1.5 justify-start text-muted-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigate("/login");
                        setOpen(false);
                      }}
                    >
                      Log in
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        navigate("/login?tab=register");
                        setOpen(false);
                      }}
                      className="gradient-primary text-primary-foreground"
                    >
                      Register
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
