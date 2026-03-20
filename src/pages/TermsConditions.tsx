import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-foreground mb-4">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-6">
          This is a starter terms document for BloodLine. Replace this text with your final legal copy before production.
        </p>
        <div className="bg-card rounded-2xl p-6 border border-border space-y-4 text-sm text-muted-foreground">
          <p>
            BloodLine provides a platform for connecting donors, receivers, and hospitals. The platform is not a medical service and does not replace professional advice.
          </p>
          <p>
            By using the app, you agree to follow community guidelines and provide truthful information in your profile.
          </p>
          <p>
            Emergency SOS alerts should be used only in genuine emergencies.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

