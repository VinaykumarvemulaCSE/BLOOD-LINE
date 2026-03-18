import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { verifyDonation } from "@/services/bloodService";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Package, Droplets, Activity,
  Plus, Minus, MessageSquare, CheckCircle2,
  Clock, AlertTriangle, User, ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface Inventory {
  [bloodType: string]: number;
}

interface BloodRequest {
  id: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  hospitalUid?: string;
  status: string;
  emergency: boolean;
  createdAt?: any;
  creatorName?: string;
  acceptedBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

const STATUS_COLOR: Record<string, string> = {
  active:    "bg-blue-500/10 text-blue-600",
  accepted:  "bg-yellow-500/10 text-yellow-700",
  completed: "bg-green-500/10 text-green-700",
  verified:  "bg-emerald-500/10 text-emerald-700",
};

export default function HospitalDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"inventory" | "requests" | "verify" | "messages">("inventory");
  const [inventory, setInventory] = useState<Inventory>({});
  const [allRequests, setAllRequests] = useState<BloodRequest[]>([]);
  const [verifying, setVerifying] = useState<string | null>(null);

  // Load/init inventory for this hospital
  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(doc(db, "hospital_inventory", profile.uid), (snap) => {
      if (snap.exists()) {
        setInventory(snap.data() as Inventory);
      } else {
        const init: Inventory = {};
        BLOOD_GROUPS.forEach((bg) => (init[bg] = 0));
        setDoc(doc(db, "hospital_inventory", profile.uid), init);
        setInventory(init);
      }
    });
    return unsub;
  }, [profile]);

  // Fetch all blood requests
  useEffect(() => {
    const q = query(collection(db, "blood_requests"));
    const unsub = onSnapshot(q, (snap) => {
      setAllRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest)));
    });
    return unsub;
  }, []);

  // Requests pending hospital verification (accepted + matching this hospital)
  const pendingVerification = allRequests.filter(
    (r) => r.status === "accepted" && (r.hospitalUid === profile?.uid || !r.hospitalUid)
  );
  const alreadyVerified = allRequests.filter((r) => r.verifiedBy === profile?.uid);

  const updateUnit = async (bg: string, delta: number) => {
    if (!profile) return;
    const newVal = Math.max(0, (inventory[bg] || 0) + delta);
    const updated = { ...inventory, [bg]: newVal };
    await setDoc(doc(db, "hospital_inventory", profile.uid), updated);
    toast.success(`${bg} updated to ${newVal} units`);
  };

  const handleVerify = async (req: BloodRequest) => {
    if (!profile) return;
    setVerifying(req.id);
    try {
      await verifyDonation(req.id, profile.uid, profile.name);
      // Deduct from inventory
      const newVal = Math.max(0, (inventory[req.bloodGroup] || 0) - req.units);
      await setDoc(doc(db, "hospital_inventory", profile.uid), {
        ...inventory,
        [req.bloodGroup]: newVal,
      });
      toast.success(`Donation verified! ${req.bloodGroup} inventory updated.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify donation.");
    } finally {
      setVerifying(null);
    }
  };

  const getStockStatus = (units: number) => {
    if (units === 0) return { label: "Out of Stock", cls: "bg-destructive/10 text-destructive" };
    if (units <= 3)  return { label: "Critical",     cls: "bg-primary/10 text-primary" };
    if (units <= 8)  return { label: "Low",           cls: "bg-amber-500/10 text-amber-600" };
    return                  { label: "Available",     cls: "bg-emerald-500/10 text-emerald-600" };
  };

  const tabs = [
    { key: "inventory", label: "Inventory",    icon: Package },
    { key: "requests",  label: "All Requests", icon: Droplets },
    { key: "verify",    label: `Verify Donations${pendingVerification.length ? ` (${pendingVerification.length})` : ""}`, icon: ShieldCheck },
    { key: "messages",  label: "Messages",     icon: MessageSquare },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Building2 className="h-7 w-7 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Hospital Dashboard</h1>
              <p className="text-sm text-muted-foreground">{profile.name} • {profile.city}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 overflow-x-auto border border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                } ${t.key === "verify" && pendingVerification.length > 0 ? "relative" : ""}`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >

              {/* Inventory Tab */}
              {tab === "inventory" && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {BLOOD_GROUPS.map((bg) => {
                    const units = inventory[bg] || 0;
                    const status = getStockStatus(units);
                    return (
                      <div key={bg} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl font-display font-bold text-foreground">{bg}</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-foreground mb-1">{units}</p>
                        <p className="text-xs text-muted-foreground mb-3">units available</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateUnit(bg, -1)} disabled={units === 0} className="flex-1">
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button size="sm" onClick={() => updateUnit(bg, 1)} className="flex-1 gradient-primary text-primary-foreground">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* All Requests Tab */}
              {tab === "requests" && (
                <div className="space-y-3">
                  {allRequests.length === 0 ? (
                    <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
                      <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No blood requests at this time</p>
                    </div>
                  ) : allRequests.map((req) => (
                    <div key={req.id} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className="bg-primary/10 text-primary">{req.bloodGroup}</Badge>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status] ?? "bg-muted text-muted-foreground"}`}>
                              {req.status}
                            </span>
                            {req.emergency && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Emergency</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{req.hospitalLocation} • {req.units} units</p>
                          {req.creatorName && <p className="text-xs text-muted-foreground mt-1">By: {req.creatorName}</p>}
                        </div>
                        {req.verifiedBy === profile.uid && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="h-3 w-3" /> Verified by you
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Verify Donations Tab */}
              {tab === "verify" && (
                <div className="space-y-6">
                  {/* Pending */}
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Pending Verification
                      {pendingVerification.length > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {pendingVerification.length}
                        </span>
                      )}
                    </h2>
                    {pendingVerification.length === 0 ? (
                      <div className="bg-card rounded-2xl p-10 shadow-sm border border-border text-center">
                        <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-sm">No donations pending verification</p>
                        <p className="text-xs text-muted-foreground mt-1">Donations appear here once a donor accepts a request</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingVerification.map((req) => (
                          <div
                            key={req.id}
                            className="bg-card rounded-2xl p-5 shadow-sm border border-yellow-200 bg-yellow-50/30"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Badge className="bg-primary/10 text-primary font-bold text-sm">{req.bloodGroup}</Badge>
                                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-yellow-500/10 text-yellow-700">
                                    Awaiting Verification
                                  </span>
                                  {req.emergency && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Emergency</Badge>}
                                </div>
                                <p className="text-sm font-medium text-foreground">{req.hospitalLocation}</p>
                                <p className="text-xs text-muted-foreground mt-1">{req.units} units • Requested by {req.creatorName}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {req.createdAt?.toDate?.()?.toLocaleDateString() ?? "—"}
                                </p>
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1 w-fit">
                                  <User className="h-3 w-3" /> Donor has accepted this request — verify the donation below
                                </div>
                              </div>
                              <Button
                                onClick={() => handleVerify(req)}
                                disabled={verifying === req.id}
                                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                {verifying === req.id ? "Verifying..." : "Verify Donation"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Already Verified */}
                  {alreadyVerified.length > 0 && (
                    <div>
                      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Verified by You
                      </h2>
                      <div className="space-y-2">
                        {alreadyVerified.map((req) => (
                          <div key={req.id} className="bg-card rounded-2xl p-4 shadow-sm border border-emerald-200/50 bg-emerald-50/20 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{req.bloodGroup} • {req.units} units</p>
                              <p className="text-xs text-muted-foreground">{req.hospitalLocation} • by {req.creatorName}</p>
                            </div>
                            <span className="text-xs text-emerald-600 font-medium">Verified</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Messages Tab */}
              {tab === "messages" && (
                <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Messages will appear here</p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
