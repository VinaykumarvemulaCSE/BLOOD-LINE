import { motion } from "framer-motion";
import { Heart, Shield, Users, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="About Us — BloodLine" description="Learn about BloodLine's mission to save lives through real-time blood donation matching." />
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <Heart className="h-10 w-10 mx-auto text-primary fill-primary/20 mb-3" />
            <h1 className="text-3xl font-display font-bold text-foreground">About BloodLine</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              BloodLine is a real-time blood donation platform connecting donors, receivers, and
              hospitals to make emergency blood discovery fast, reliable, and life-saving.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Shield, title: "Our Mission", desc: "To eliminate preventable deaths caused by blood shortages by creating a seamless, real-time connection between blood donors and those in need." },
              { icon: Users, title: "Our Community", desc: "BloodLine brings together verified donors, trusted hospitals, and receivers into a secure ecosystem where every donation makes a difference." },
              { icon: Globe, title: "Our Vision", desc: "A world where no one dies waiting for blood. We aim to make blood available within minutes, not hours, through technology and community." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-card border border-border card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Privacy Policy summary */}
          <div className="bg-muted/50 rounded-2xl p-6 mb-6">
            <h2 className="font-display font-semibold text-foreground mb-3">Privacy & Safety</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• BloodLine only connects donors and receivers. Hospitals handle all medical procedures.</li>
              <li>• Your personal data is kept private and never shared with third parties.</li>
              <li>• All donors and hospitals are verified for safety and authenticity.</li>
              <li>• Users must confirm accurate health information before donating.</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-2xl p-6">
            <h2 className="font-display font-semibold text-foreground mb-3">Terms & Conditions</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Users must provide accurate health information and confirm eligibility before donation.</li>
              <li>• Hospitals are responsible for verifying blood compatibility before any transfusion.</li>
              <li>• BloodLine is a coordination platform and does not perform medical procedures.</li>
              <li>• Users agree to comply with local blood donation regulations and guidelines.</li>
            </ul>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
