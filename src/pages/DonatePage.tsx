import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, CheckCircle2, Clock, Shield, Droplets } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { getDaysUntilEligible, isEligibleToDonate } from "@/lib/bloodCompatibility";

const requirements = [
  "Age between 18-65 years",
  "Weight above 45 kg",
  "Hemoglobin above 12.5 g/dL",
  "No recent tattoos or piercings (within 6 months)",
  "No active infections or illnesses",
  "Minimum 90 days since last donation",
];

export default function DonatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const eligible = isEligibleToDonate(profile?.lastDonationDate || null);
  const daysLeft = getDaysUntilEligible(profile?.lastDonationDate || null);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Donate Blood — BloodLine" description="Find out if you are eligible to donate blood and learn about the donation process." />
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary shadow-primary flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Donate Blood</h1>
            <p className="text-muted-foreground mt-2">Your donation can save up to 3 lives</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Eligibility Requirements
              </h3>
              <ul className="space-y-2.5">
                {requirements.map((req) => (
                  <li key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Donation Process
              </h3>
              <ul className="space-y-3">
                {[
                  "Registration & health screening (10 min)",
                  "Blood donation (8-10 min)",
                  "Rest and refreshments (15 min)",
                  "Total time: ~45 minutes",
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center">
            {profile?.profileCompleted ? (
              profile.role === "donor" ? (
                <div className="grid gap-4 md:grid-cols-2 items-stretch">
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
                  <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Your Donation Eligibility
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {eligible ? "You are eligible to donate now." : `Next donation in ~${daysLeft} days.`}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard/donor")}
                  className="gradient-primary text-primary-foreground shadow-primary gap-2"
                >
                  <Droplets className="h-4 w-4" />
                  Go to Donor Dashboard
                </Button>
              </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 items-stretch">
                  <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
                    <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Donations are for Donors only
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You are currently signed in as <span className="font-semibold capitalize">{profile.role}</span>.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => navigate(`/dashboard/${profile.role}`)}
                    className="gradient-primary text-primary-foreground shadow-primary gap-2"
                  >
                    Go to {profile.role} Dashboard
                  </Button>
                </div>
              )
            ) : (
              <Button
                size="lg"
                onClick={() => navigate("/login?tab=register")}
                className="gradient-primary text-primary-foreground shadow-primary gap-2"
              >
                <Droplets className="h-4 w-4" />
                Register as Donor
              </Button>
            )}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
