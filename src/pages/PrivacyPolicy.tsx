import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Privacy Policy — BloodLine" description="Privacy policy for the BloodLine healthcare platform." />
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">
          This is a starter privacy policy for BloodLine. Replace this text with your final legal copy before production.
        </p>
        <div className="bg-card rounded-2xl p-6 border border-border space-y-4 text-sm text-muted-foreground">
          <p>
            We collect only the information needed to connect donors, receivers, and hospitals in order to fulfill blood request workflows.
          </p>
          <p>
            Data is stored in Firestore and used to power real-time updates, messaging, and emergency alerts (SOS).
          </p>
          <p>
            You can request deletion or correction of your profile data by contacting the administrator.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

