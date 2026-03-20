import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Droplets, AlertTriangle, Clock, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface BloodRequest {
  id: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  status: string;
  emergency: boolean;
  createdAt: string;
  creatorName?: string;
}

export default function FindBlood() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const q = query(collection(db, "blood_requests"), where("status", "==", "open"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest)));
    });
    return unsub;
  }, []);

  const filtered = filter ? requests.filter((r) => r.bloodGroup === filter) : requests;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Find Blood</h1>
          <p className="text-muted-foreground mb-6">Browse active blood requests near you</p>

          {/* Filter */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              All
            </button>
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setFilter(bg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === bg ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {bg}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
                <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No active blood requests found</p>
                <p className="text-xs text-muted-foreground mt-1">Check back later or create a request</p>
              </div>
            ) : (
              filtered.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-5 shadow-card border border-border hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-primary/10 text-primary text-sm font-bold">{req.bloodGroup}</Badge>
                        {req.emergency && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" /> Emergency
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground font-medium">{req.units} units needed</p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {req.hospitalLocation}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {(() => { const ca = req.createdAt as any; return ca?.toDate ? ca.toDate().toLocaleDateString() : ca ? new Date(ca).toLocaleDateString() : "—"; })()}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
