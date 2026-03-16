import { Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
      // Create an SOS alert document in Firestore
      await addDoc(collection(db, "sos_alerts"), {
        userId: user.uid,
        userName: profile.name,
        userPhone: profile.phone,
        bloodGroup: profile.bloodGroup,
        city: profile.city,
        role: profile.role,
        adminEmail: ADMIN_EMAIL,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      // Also create a notification for admin
      await addDoc(collection(db, "notifications"), {
        type: "sos_emergency",
        message: `🚨 SOS Alert from ${profile.name} (${profile.bloodGroup}) in ${profile.city}. Phone: ${profile.phone}. Needs immediate blood assistance!`,
        adminEmail: ADMIN_EMAIL,
        userId: user.uid,
        read: false,
        createdAt: new Date().toISOString(),
      });

      toast.success(
        `🚨 Emergency SOS sent! Admin (${ADMIN_EMAIL}) has been notified. Nearby compatible donors will also be alerted.`
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
      title="Emergency SOS"
      disabled={sending}
    >
      <Phone className={`h-6 w-6 ${sending ? "animate-spin" : ""}`} />
    </motion.button>
  );
}
