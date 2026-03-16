import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { UserProfile } from "@/contexts/AuthContext";

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const h = snap.docs
        .map((d) => d.data() as UserProfile)
        .filter((u) => u.role === "hospital");
      setHospitals(h);
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Hospitals</h1>
          <p className="text-muted-foreground mb-6">Partner hospitals on the BloodLine network</p>

          {hospitals.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No hospitals registered yet</p>
              <p className="text-xs text-muted-foreground mt-1">Hospitals can register to join the network</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {hospitals.map((h, i) => (
                <motion.div
                  key={h.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-5 shadow-card border border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{h.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {h.city}
                      </p>
                      {h.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {h.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
