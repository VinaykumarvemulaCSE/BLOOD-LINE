import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Mail, Chrome, Users } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

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
    } catch (err: any) {
      toast.error(err?.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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

          <div className="bg-card rounded-2xl shadow-card border border-border p-6">
            {/* Tab switcher */}
            <div className="flex rounded-xl bg-muted p-1 mb-6">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === "login"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setTab("register")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === "register"
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
              <Chrome className="h-4 w-4" />
              Google
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
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
