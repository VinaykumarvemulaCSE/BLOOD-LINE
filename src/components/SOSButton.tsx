import { Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { sendSOSAlert } from "@/services/sosService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ADMIN_EMAIL = "kumarvinay072007@gmail.com";

export default function SOSButton() {
  const { user, profile } = useAuth();
  const [sending, setSending] = useState(false);

  const handleSOS = async () => {
    if (!user || !profile) {
      toast.error("Please log in to send an SOS alert.");
      return;
    }

    if (sending) return;
    setSending(true);

    try {
      const result = await sendSOSAlert(profile, user.uid);

      toast.success(
        `Emergency SOS sent! ${result.alertedDonors} compatible donors in ${profile.city} have been notified.`,
        { duration: 5000 }
      );
    } catch (err) {
      console.error("SOS error:", err);
      toast.error("Failed to send SOS alert. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.button
      onClick={handleSOS}
      className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-primary flex items-center justify-center animate-sos-pulse"
      whileTap={{ scale: 0.9 }}
      title="Emergency SOS - Broadcast to nearby donors"
      disabled={sending}
    >
      <Phone className={`h-6 w-6 ${sending ? "animate-spin" : ""}`} />
    </motion.button>
  );
}
