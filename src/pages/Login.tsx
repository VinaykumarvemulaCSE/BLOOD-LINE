import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Mail, Users } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

const DEMO_ROLES: { role: UserRole; label: string; emoji: string }[] = [
  { role: "donor", label: "Donor", emoji: "🩸" },
  { role: "receiver", label: "Receiver", emoji: "🏥" },
  { role: "hospital", label: "Hospital", emoji: "🏨" },
  { role: "admin", label: "Admin", emoji: "⚙️" },
];

export default function Login() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithEmail, registerWithEmail, loginWithGoogle, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
        toast.success("Welcome back!");
      } else {
        await registerWithEmail(email, password);
        toast.success("Account created! Please complete your profile.");
      }
      // Navigation is handled by App.tsx LoginRoute redirect
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google!");
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: UserRole) => {
    setLoading(true);
    try {
      await demoLogin(role);
      toast.success(`Demo ${role} login successful!`);
      navigate(`/dashboard/${role}`);
    } catch (err: any) {
      toast.error(err?.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Log In / Register — BloodLine" description="Sign in to your BloodLine account or create a new one to start saving lives." />
      <Navbar />
      <div className="pt-24 pb-16 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Heart className="h-10 w-10 mx-auto text-primary fill-primary/20 mb-3" />
            <h1 className="text-2xl font-display font-bold text-foreground">
              {tab === "login" ? "Welcome Back" : "Join BloodLine"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {tab === "login"
                ? "Sign in to your account"
                : "Create your account and start saving lives"}
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-card border border-border p-6 card-hover">
            {/* Tab switcher */}
            <div className="flex rounded-xl bg-muted p-1 mb-6">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "login"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                  }`}
              >
                Log In
              </button>
              <button
                onClick={() => setTab("register")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "register"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                  }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-primary-foreground shadow-primary gap-2"
              >
                <Mail className="h-4 w-4" />
                {tab === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-card text-muted-foreground">or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            {/* Demo Logins */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Demo Accounts (Portfolio)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ROLES.map((d) => (
                  <Button
                    key={d.role}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemo(d.role)}
                    disabled={loading}
                    className="text-xs gap-1"
                  >
                    {d.emoji} {d.label}
                  </Button>
                ))}
              </div>
              {/* <div className="mt-4 text-center text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
                <p className="font-medium mb-1 text-foreground/80">Manual Demo Login Credentials:</p>
                <p className="mb-0.5">Email: <span className="font-mono bg-background px-1 py-0.5 rounded border border-border">test.[role]@bloodline.app</span></p>
                <p>Password: <span className="font-mono bg-background px-1 py-0.5 rounded border border-border">BloodLine@Test2026</span></p>
                <p className="mt-1 text-[10px] opacity-70">(Admin uses your personal credentials)</p>
              </div> */}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
