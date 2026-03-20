import { Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { sendSOSAlert } from "@/services/sosService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SOSButton() {
  const { user, profile } = useAuth();
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSOS = async () => {
    if (!user || !profile) {
      toast.error("Please log in to send an SOS alert.");
      return;
    }
    if (!profile.bloodGroup?.trim()) {
      toast.error("Please complete your profile with blood group to send SOS.");
      return;
    }
    if (!profile.city?.trim()) {
      toast.error("Please add your city in profile to find nearby donors.");
      return;
    }
    if (!profile.phone?.trim()) {
      toast.error("Please add your phone number so donors can contact you.");
      return;
    }

    if (sending) return;
    setConfirmOpen(false);
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
    <>
      <motion.button
        onClick={() => setConfirmOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-primary flex items-center justify-center animate-sos-pulse"
        whileTap={{ scale: 0.9 }}
        title="Emergency SOS - Broadcast to nearby donors"
        disabled={sending}
      >
        <Phone className={`h-6 w-6 ${sending ? "animate-spin" : ""}`} />
      </motion.button>

      {confirmOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setConfirmOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-24 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[61] bg-card border border-border rounded-2xl shadow-xl p-4"
          >
            <h4 className="font-semibold text-foreground mb-2">Send Emergency SOS?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Compatible donors in <span className="font-medium text-foreground">{profile.city}</span> will be notified immediately. Only use in genuine emergencies.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSOS}
                disabled={sending}
                className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send SOS"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}
