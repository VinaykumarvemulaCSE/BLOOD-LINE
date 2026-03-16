import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Droplets, Plus, MapPin, MessageSquare, Activity,
  Clock, AlertTriangle, User
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SOSButton from "@/components/SOSButton";
import { toast } from "sonner";

interface BloodRequest {
  id: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  status: string;
  emergency: boolean;
  createdAt: string;
  acceptedBy?: string;
}

export default function ReceiverDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"requests" | "create" | "messages">("requests");
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [form, setForm] = useState({
    bloodGroup: profile?.bloodGroup || "O+",
    units: 1,
    hospitalLocation: "",
    emergency: false,
  });

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, "blood_requests"),
      where("createdBy", "==", profile.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest)));
    });
    return unsub;
  }, [profile]);

  const createRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await addDoc(collection(db, "blood_requests"), {
        createdBy: profile.uid,
        creatorName: profile.name,
        bloodGroup: form.bloodGroup,
        units: form.units,
        hospitalLocation: form.hospitalLocation,
        status: "active",
        emergency: form.emergency,
        createdAt: new Date().toISOString(),
      });
      toast.success("Blood request created!");
      setTab("requests");
      setForm({ bloodGroup: profile.bloodGroup || "O+", units: 1, hospitalLocation: "", emergency: false });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create request");
    }
  };

  const tabs = [
    { key: "requests", label: "My Requests", icon: Droplets },
    { key: "create", label: "New Request", icon: Plus },
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
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Receiver Dashboard</h1>
              <p className="text-sm text-muted-foreground">{profile.name} • {profile.bloodGroup}</p>
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

          {tab === "requests" && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
                  <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-4">No blood requests yet</p>
                  <Button onClick={() => setTab("create")} className="gradient-primary text-primary-foreground gap-1">
                    <Plus className="h-4 w-4" /> Create Request
                  </Button>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="bg-card rounded-2xl p-5 shadow-card border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-primary/10 text-primary">{req.bloodGroup}</Badge>
                          <Badge variant={req.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                            {req.status}
                          </Badge>
                          {req.emergency && <Badge variant="destructive" className="text-xs">🚨 Emergency</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {req.hospitalLocation} • {req.units} units
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "create" && (
            <form onSubmit={createRequest} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-4 max-w-lg">
              <h3 className="font-display font-semibold text-foreground">Create Blood Request</h3>
              <div>
                <Label>Blood Group Needed</Label>
                <select
                  value={form.bloodGroup}
                  onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <Label>Units Required</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.units}
                  onChange={(e) => setForm((p) => ({ ...p, units: +e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Hospital Location</Label>
                <Input
                  value={form.hospitalLocation}
                  onChange={(e) => setForm((p) => ({ ...p, hospitalLocation: e.target.value }))}
                  required
                  className="mt-1"
                  placeholder="e.g., NIMS Hospital, Hyderabad"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.emergency}
                  onChange={(e) => setForm((p) => ({ ...p, emergency: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-primary" />
                  Mark as Emergency
                </span>
              </label>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-primary">
                Create Request
              </Button>
            </form>
          )}

          {tab === "messages" && (
            <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Messages from donors will appear here</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
