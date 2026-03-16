import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Package, Droplets, Activity, Plus, Minus, MessageSquare, User
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SOSButton from "@/components/SOSButton";
import { toast } from "sonner";

interface Inventory {
  [bloodType: string]: number;
}

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

export default function HospitalDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"inventory" | "requests" | "messages">("inventory");
  const [inventory, setInventory] = useState<Inventory>({});
  const [requests, setRequests] = useState<BloodRequest[]>([]);

  // Load/init inventory
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

  // Fetch all requests
  useEffect(() => {
    const q = query(collection(db, "blood_requests"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest)));
    });
    return unsub;
  }, []);

  const updateUnit = async (bg: string, delta: number) => {
    if (!profile) return;
    const newVal = Math.max(0, (inventory[bg] || 0) + delta);
    const updated = { ...inventory, [bg]: newVal };
    await setDoc(doc(db, "hospital_inventory", profile.uid), updated);
    toast.success(`${bg} updated to ${newVal} units`);
  };

  const getStockStatus = (units: number) => {
    if (units === 0) return { label: "Out of Stock", class: "bg-destructive/10 text-destructive" };
    if (units <= 3) return { label: "Critical", class: "bg-primary/10 text-primary" };
    if (units <= 8) return { label: "Low", class: "bg-warning/10 text-warning" };
    return { label: "Available", class: "bg-success/10 text-success" };
  };

  const tabs = [
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "requests", label: "Requests", icon: Droplets },
    { key: "messages", label: "Messages", icon: MessageSquare },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SOSButton />
      <div className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Building2 className="h-7 w-7 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Hospital Dashboard</h1>
              <p className="text-sm text-muted-foreground">{profile.name} • {profile.city}</p>
            </div>
          </div>

          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "inventory" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BLOOD_GROUPS.map((bg) => {
                const units = inventory[bg] || 0;
                const status = getStockStatus(units);
                return (
                  <motion.div
                    key={bg}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl p-5 shadow-card border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-display font-bold text-foreground">{bg}</span>
                      <Badge className={`text-xs ${status.class}`}>{status.label}</Badge>
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-1">{units}</p>
                    <p className="text-xs text-muted-foreground mb-3">units available</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUnit(bg, -1)}
                        disabled={units === 0}
                        className="flex-1"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateUnit(bg, 1)}
                        className="flex-1 gradient-primary text-primary-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
                  <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No blood requests at this time</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="bg-card rounded-2xl p-5 shadow-card border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-primary/10 text-primary">{req.bloodGroup}</Badge>
                          <Badge variant="secondary" className="text-xs capitalize">{req.status}</Badge>
                          {req.emergency && <Badge variant="destructive" className="text-xs">Emergency</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{req.hospitalLocation} • {req.units} units</p>
                        {req.creatorName && <p className="text-xs text-muted-foreground mt-1">By: {req.creatorName}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "messages" && (
            <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Messages will appear here</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
