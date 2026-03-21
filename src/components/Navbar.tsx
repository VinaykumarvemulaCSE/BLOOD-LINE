import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Heart, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Track scroll for navbar elevation
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const dashboardRoute = profile
    ? `/dashboard/${profile.role}`
    : "/profile-setup";

  const navLinks = NAV_LINKS.filter((l) => {
    if (l.to === "/donate" && profile?.role && profile.role !== "donor") return false;
    return true;
  });

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-white/70 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 group"
          aria-label="BloodLine - Home"
        >
          <div className="relative">
            <Heart className="h-7 w-7 text-primary fill-primary transition-transform duration-300 group-hover:scale-110" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
          </div>
          <span className="text-xl font-display font-bold text-secondary tracking-tight">
            Blood<span className="text-primary">Line</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5" role="navigation">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive(l.to)
                  ? "text-primary bg-primary/6"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              {l.label}
              {isActive(l.to) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {profile && (
                <div className="flex items-center gap-1.5 mr-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {profile.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground hidden lg:inline font-medium">
                    {profile.name}
                  </span>
                </div>
              )}
              <NotificationCenter />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(dashboardRoute)}
                className="gap-1.5 font-medium"
                aria-label="Go to dashboard"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => { await logout(); navigate("/"); }}
                className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                aria-label="Log out"
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
                className="font-medium"
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/login?tab=register")}
                className="gradient-primary text-primary-foreground shadow-primary gap-1.5 font-semibold"
              >
                <Heart className="h-3.5 w-3.5 fill-primary-foreground/60" />
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden border-t border-border bg-white/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {navLinks.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={l.to}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      isActive(l.to)
                        ? "text-primary bg-primary/8 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                    {isActive(l.to) && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                </motion.div>
              ))}

              <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    {profile && (
                      <div className="flex items-center gap-2 px-3 py-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {profile.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                        </div>
                      </div>
                    )}
                    <div className="px-2">
                      <NotificationCenter />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { navigate(dashboardRoute); setOpen(false); }}
                      className="gap-1.5 justify-start"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => { await logout(); navigate("/"); setOpen(false); }}
                      className="gap-1.5 justify-start text-destructive hover:bg-destructive/5"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { navigate("/login"); setOpen(false); }}
                      className="w-full"
                    >
                      Log in
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { navigate("/login?tab=register"); setOpen(false); }}
                      className="w-full gradient-primary text-primary-foreground gap-1.5"
                    >
                      <Heart className="h-3.5 w-3.5 fill-primary-foreground/60" />
                      Get Started Free
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
