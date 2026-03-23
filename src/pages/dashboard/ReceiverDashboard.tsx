import { useState, useEffect } from "react";
import {
  createBloodRequest,
  subscribeToUserRequests,
  subscribeToHospitals,
  type HospitalEntry,
} from "@/services/bloodService";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Droplets, Plus, MapPin, MessageSquare,
  Clock, AlertTriangle, User, CheckCircle2, Building2, Send,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ProfileDetails from "@/components/ProfileDetails";
import SEO from "@/components/SEO";
import { toast } from "sonner";

interface BloodRequest {
  id: string;
  requestCode?: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  status: string;
  emergency: boolean;
  createdAt?: any;
  // Used for request-scoped messaging
  createdBy?: string;
  creatorName?: string;
  hospitalUid?: string | null;
  acceptedBy?: string;
  acceptedDonorName?: string;
  verifiedBy?: string | null;
  verifiedAt?: string;
  verifiedByName?: string;
}

interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderRole?: string;
  senderName?: string;
  participants: string[];
  message: string;
  timestamp?: any;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:      { label: "Open",      color: "bg-blue-500/10 text-blue-600" },
  accepted:  { label: "Accepted",  color: "bg-yellow-500/10 text-yellow-600" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600" },
  verified:  { label: "Verified ✓", color: "bg-emerald-500/10 text-emerald-600" },
};

const getMs = (t: any) => {
  if (!t) return 0;
  if (typeof t?.toDate === "function") return t.toDate().getTime();
  if (t instanceof Date) return t.getTime();
  if (typeof t === "string") return new Date(t).getTime();
  if (typeof t === "number") return t;
  return 0;
};


export default function ReceiverDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"overview" | "profile" | "requests" | "create" | "messages">("overview");
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [hospitals, setHospitals] = useState<HospitalEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState("");
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

  // Auto-select a request thread when switching to Messages tab
  useEffect(() => {
    if (!profile) return;
    if (tab !== "messages") return;
    if (!selectedRequestId && requests.length > 0) {
      setSelectedRequestId(requests[0].id);
    }
  }, [profile, tab, selectedRequestId, requests]);

  // Subscribe to request-scoped messages
  useEffect(() => {
    if (!profile || !selectedRequestId) return;

    const qMessages = query(
      collection(db, "messages"),
      where("requestId", "==", selectedRequestId),
    );

    return onSnapshot(qMessages, (snap) => {
      const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      mapped.sort((a, b) => getMs(a.timestamp) - getMs(b.timestamp));
      setThreadMessages(mapped);
    });
  }, [profile, selectedRequestId]);

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

  const sendMessage = async () => {
    if (!profile || !selectedRequestId || !newMessage.trim()) return;

    const req = requests.find((r) => r.id === selectedRequestId);
    if (!req) return;

    const hospitalParticipant = req.hospitalUid || req.verifiedBy || null;

    const participants = Array.from(
      new Set(
        [profile.uid, req.createdBy || profile.uid, req.acceptedBy || null, hospitalParticipant].filter(
          (x): x is string => typeof x === "string" && x.length > 0
        )
      )
    );

    try {
      await addDoc(collection(db, "messages"), {
        requestId: selectedRequestId,
        participants,
        senderId: profile.uid,
        senderRole: profile.role,
        senderName: profile.name,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
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
    { key: "overview", label: "Overview", icon: User },
    { key: "profile", label: "Profile", icon: User },
    { key: "requests", label: "My Requests", icon: Droplets },
    { key: "create",   label: "New Request", icon: Plus },
    { key: "messages", label: "Messages",    icon: MessageSquare },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Receiver Dashboard — BloodLine" />
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
          <div className="flex gap-2 bg-muted/60 rounded-2xl p-1.5 mb-8 overflow-x-auto border border-border/50 backdrop-blur-sm sticky top-20 z-10 scrollbar-hide">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
                  tab === t.key
                    ? "bg-card shadow-sm text-foreground border border-border/50 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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

              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border card-hover">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Patient Health</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-muted-foreground">Age</span>
                          <span className="font-semibold">{profile.age ?? "—"}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-muted-foreground">Weight</span>
                          <span className="font-semibold">{profile.weight ? `${profile.weight} kg` : "—"}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-muted-foreground">Health Status</span>
                          <span className="font-semibold">
                            {profile.healthConfirmed ? "Verified" : "Not verified"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border card-hover">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Request Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-muted-foreground">Blood Group</span>
                          <span className="font-semibold">{profile.bloodGroup}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-muted-foreground">City</span>
                          <span className="font-semibold">{profile.city || "—"}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-muted-foreground">Address</span>
                          <span className="font-semibold">{profile.address || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border card-hover">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Next Steps</h3>
                      <div className="space-y-3">
                        <Button
                          className="gradient-primary text-primary-foreground shadow-primary w-full"
                          onClick={() => setTab("create")}
                        >
                          Create New Request
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setTab("requests")}
                        >
                          View My Requests
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-2xl p-4 text-sm text-muted-foreground">
                    Tip: When a hospital verifies a donation, your request status will update in real time.
                  </div>
                </div>
              )}

              {tab === "profile" && (
                <ProfileDetails profile={profile} onEdit={() => navigate("/profile-setup")} />
              )}

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
              {tab === "messages" && (() => {
                const selectedReq = requests.find((r) => r.id === selectedRequestId);
                const getBubbleClass = (m: Message) => {
                  if (m.senderId === profile.uid) return "bg-primary text-primary-foreground ml-auto rounded-tr-none";
                  const role = m.senderRole || "";
                  if (role === "donor") return "bg-blue-100 text-blue-900 border border-blue-200 mr-auto rounded-tl-none";
                  if (role === "hospital") return "bg-emerald-100 text-emerald-900 border border-emerald-200 mr-auto rounded-tl-none";
                  if (role === "receiver") return "bg-pink-100 text-pink-900 border border-pink-200 mr-auto rounded-tl-none";
                  return "bg-muted text-foreground mr-auto rounded-tl-none";
                };
                return (
                <div className="bg-card rounded-2xl shadow-sm border border-border flex flex-col h-[500px] overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-semibold text-sm">Request Messaging</h3>
                        <select
                          value={selectedRequestId || ""}
                          onChange={(e) => setSelectedRequestId(e.target.value)}
                          className="text-sm rounded-lg border border-border bg-background px-3 py-1.5"
                          disabled={requests.length === 0}
                        >
                          {requests.length === 0 ? (
                            <option value="">No requests</option>
                          ) : (
                            requests.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.requestCode ? `${r.requestCode} · ` : ""}{r.bloodGroup} · {r.units} units · {r.status}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      {selectedReq && (
                        <p className="text-xs text-muted-foreground">
                          Chat with: <span className="text-blue-600 font-medium">{selectedReq.acceptedDonorName || "Donor"}</span>
                          {selectedReq.verifiedByName && <>, <span className="text-emerald-600 font-medium">{selectedReq.verifiedByName} (Hospital)</span></>}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {threadMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No messages for this request yet.
                      </div>
                    ) : (
                      threadMessages.map((m) => (
                        <div key={m.id} className={`max-w-[80%] rounded-2xl p-3 text-sm ${getBubbleClass(m)}`}>
                          <span className="text-[10px] font-medium opacity-80 block mb-0.5">{m.senderName || m.senderRole || "Unknown"}</span>
                          {m.message}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-border bg-background flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      className="bg-muted/50 border-none focus-visible:ring-1"
                    />
                    <Button onClick={sendMessage} size="icon" className="shrink-0 rounded-xl">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                );
              })()}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}