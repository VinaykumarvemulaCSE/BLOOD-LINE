import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/landing/HeroSection";
import TrustIndicators from "@/components/landing/TrustIndicators";
import StatsSection from "@/components/landing/StatsSection";
import HowItWorks from "@/components/landing/HowItWorks";
import BloodCompatibilityChart from "@/components/landing/BloodCompatibilityChart";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ImpactTimeline from "@/components/landing/ImpactTimeline";
import EmergencySection from "@/components/landing/EmergencySection";
import CTASection from "@/components/landing/CTASection";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TrustIndicators />
      <StatsSection />
      <HowItWorks />
      <BloodCompatibilityChart />
      <FeaturesSection />
      <ImpactTimeline />
      <EmergencySection />
      <CTASection />
      <Footer />
    </div>
  );
}
