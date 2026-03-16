import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import emergencyImg from "@/assets/emergency.png";

export default function EmergencySection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <AlertTriangle className="h-3 w-3" />
              Emergency Feature
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              One-Tap <span className="text-primary">Emergency SOS</span>
            </h2>
            <p className="text-muted-foreground mb-6">
              In critical moments, every second counts. BloodLine's Emergency SOS
              instantly alerts all compatible donors in your area, sending push
              notifications with your blood type, location, and hospital details.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Instant alerts to compatible donors nearby
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Automatic blood type matching
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Real-time location sharing with hospitals
              </li>
            </ul>
            <Button
              onClick={() => navigate("/login")}
              className="gradient-primary text-primary-foreground shadow-primary"
            >
              Get Started
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex justify-center"
          >
            <img
              src={emergencyImg}
              alt="Emergency blood alert system"
              className="w-full max-w-md"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
