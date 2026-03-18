import { useState, useEffect } from "react";
import {
  createBloodRequest,
  subscribeToUserRequests,
  subscribeToHospitals,
  type HospitalEntry,
} from "@/services/bloodService";
import { useAuth } from "@/contexts/AuthContext";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Droplets, Plus, MapPin, MessageSquare,
  Clock, AlertTriangle, User, CheckCircle2, Building2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface BloodRequest {
  id: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  status: string;
  emergency: boolean;
  createdAt?: any;
  acceptedBy?: string;
  verifiedAt?: string;
  verifiedByName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: "Active",    color: "bg-blue-500/10 text-blue-600" },
  accepted:  { label: "Accepted",  color: "bg-yellow-500/10 text-yellow-600" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600" },
  verified:  { label: "Verified ✓", color: "bg-emerald-500/10 text-emerald-600" },
};

export default function ReceiverDashboard() {
  const { profile } = useAuth();

  const [tab, setTab] = useState<"requests" | "create" | "messages">("requests");
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [hospitals, setHospitals] = useState<HospitalEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: "O+",
    units: 1,
    hospitalLocation: "",
    hospitalUid: "",
    emergency: false,
  });

  // Load profile blood group
  useEffect(() => {
    if (profile) {
      setForm((prev) => ({ ...prev, bloodGroup: profile.bloodGroup || "O+" }));
    }
  }, [profile]);

  // Subscribe to this user's requests
  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToUserRequests(profile.uid, (data: any) => setRequests(data));
    return () => unsub?.();
  }, [profile]);

  // Subscribe to hospital list
  useEffect(() => {
    const unsub = subscribeToHospitals(setHospitals);
    return () => unsub?.();
  }, []);

  const createRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.hospitalLocation) {
      toast.error("Please select a hospital");
      return;
    }
    setSubmitting(true);
    const clientId = "req-" + Date.now();
    try {
      await createBloodRequest(profile, form, clientId);
      toast.success("Blood request created successfully!");
      setTab("requests");
      setForm({
        bloodGroup: profile.bloodGroup || "O+",
        units: 1,
        hospitalLocation: "",
        hospitalUid: "",
        emergency: false,
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHospitalSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uid = e.target.value;
    const hospital = hospitals.find((h) => h.uid === uid);
    setForm((prev) => ({
      ...prev,
      hospitalUid: uid,
      hospitalLocation: hospital ? `${hospital.name}, ${hospital.city}` : "",
    }));
  };

  const tabs = [
    { key: "requests", label: "My Requests", icon: Droplets },
    { key: "create",   label: "New Request", icon: Plus },
    { key: "messages", label: "Messages",    icon: MessageSquare },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Receiver Dashboard</h1>
              <p className="text-sm text-muted-foreground">{profile.name} • {profile.bloodGroup}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 border border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
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

              {/* My Requests */}
              {tab === "requests" && (
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
                      <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground mb-4">No blood requests yet</p>
                      <Button onClick={() => setTab("create")} className="gradient-primary text-primary-foreground gap-1">
                        <Plus className="h-4 w-4" /> Create Request
                      </Button>
                    </div>
                  ) : (
                    requests.map((req) => {
                      const statusCfg = STATUS_CONFIG[req.status] ?? { label: req.status, color: "bg-muted text-muted-foreground" };
                      return (
                        <div key={req.id} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge className="bg-primary/10 text-primary font-bold">{req.bloodGroup}</Badge>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                                  {statusCfg.label}
                                </span>
                                {req.emergency && (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Emergency
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {req.hospitalLocation} • {req.units} units
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {req.createdAt?.toDate?.()?.toLocaleDateString() ?? "Just now"}
                              </p>
                              {req.verifiedByName && (
                                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Verified by {req.verifiedByName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Create Request */}
              {tab === "create" && (
                <form
                  onSubmit={createRequest}
                  className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-5 max-w-lg"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                      <Droplets className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">Create Blood Request</h3>
                      <p className="text-xs text-muted-foreground">Fill details to find a matching donor</p>
                    </div>
                  </div>

                  {/* Blood Group */}
                  <div>
                    <Label className="text-sm font-medium">Blood Group Needed</Label>
                    <select
                      value={form.bloodGroup}
                      onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  {/* Units */}
                  <div>
                    <Label className="text-sm font-medium">Units Required</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={form.units}
                      onChange={(e) => setForm((p) => ({ ...p, units: +e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  {/* Hospital Dropdown from Firestore */}
                  <div>
                    <Label className="text-sm font-medium">Select Hospital</Label>
                    {hospitals.length > 0 ? (
                      <select
                        value={form.hospitalUid}
                        onChange={handleHospitalSelect}
                        required
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">— Select a registered hospital —</option>
                        {hospitals.map((h) => (
                          <option key={h.uid} value={h.uid}>
                            {h.name} — {h.city}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                          <Building2 className="h-3 w-3 shrink-0" />
                          No hospitals registered yet — enter location manually
                        </div>
                        <Input
                          value={form.hospitalLocation}
                          onChange={(e) => setForm((p) => ({ ...p, hospitalLocation: e.target.value }))}
                          required
                          placeholder="e.g., NIMS Hospital, Hyderabad"
                        />
                      </div>
                    )}
                    {form.hospitalLocation && hospitals.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {form.hospitalLocation}
                      </p>
                    )}
                  </div>

                  {/* Emergency */}
                  <label className="flex items-center gap-3 cursor-pointer bg-muted/30 rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={form.emergency}
                      onChange={(e) => setForm((p) => ({ ...p, emergency: e.target.checked }))}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      Mark as Emergency Request
                    </span>
                  </label>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full gradient-primary text-primary-foreground shadow-sm gap-2"
                  >
                    <Droplets className="h-4 w-4" />
                    {submitting ? "Creating..." : "Create Blood Request"}
                  </Button>
                </form>
              )}

              {/* Messages */}
              {tab === "messages" && (
                <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Messages from donors will appear here</p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}