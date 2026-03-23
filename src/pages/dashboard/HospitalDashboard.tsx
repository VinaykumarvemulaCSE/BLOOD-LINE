import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { verifyDonation, fulfillRequestFromInventory } from "@/services/bloodService";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Building2, Package, Droplets, Activity,
  Plus, Minus, MessageSquare, CheckCircle2,
  Clock, AlertTriangle, User, ShieldCheck, Send, Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ProfileDetails from "@/components/ProfileDetails";
import SEO from "@/components/SEO";
import { toast } from "sonner";

interface Inventory {
  [bloodType: string]: number;
}

interface BloodRequest {
  id: string;
  requestCode?: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  createdBy?: string;
  creatorName?: string;
  hospitalUid?: string;
  status: string;
  emergency: boolean;
  createdAt?: any;
  acceptedBy?: string;
  acceptedDonorName?: string;
  verifiedBy?: string;
  verifiedAt?: string;
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

const STATUS_COLOR: Record<string, string> = {
  open:      "bg-blue-500/10 text-blue-600",
  accepted:  "bg-yellow-500/10 text-yellow-700",
  completed: "bg-green-500/10 text-green-700",
  verified:  "bg-emerald-500/10 text-emerald-700",
};

const getMs = (t: any) => {
  if (!t) return 0;
  if (typeof t?.toDate === "function") return t.toDate().getTime();
  if (t instanceof Date) return t.getTime();
  if (typeof t === "string") return new Date(t).getTime();
  if (typeof t === "number") return t;
  return 0;
};


export default function HospitalDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"profile" | "inventory" | "requests" | "verify" | "messages">("inventory");
  const [inventory, setInventory] = useState<Inventory>({});
  const [allRequests, setAllRequests] = useState<BloodRequest[]>([]);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

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
      const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest));
      mapped.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
      setAllRequests(mapped);
    });
    return unsub;
  }, []);

  // Requests pending hospital verification (completed + matching this hospital)
  const pendingVerification = allRequests.filter(
    (r) => r.status === "completed" && (r.hospitalUid === profile?.uid || !r.hospitalUid)
  );
  const alreadyVerified = allRequests.filter((r) => r.verifiedBy === profile?.uid);
  const messagingRequests = Array.from(
    new Map([...pendingVerification, ...alreadyVerified].map((r) => [r.id, r])).values()
  );

  // Auto-select a request thread when switching to Messages tab
  useEffect(() => {
    if (!profile) return;
    if (tab !== "messages") return;
    if (!selectedRequestId && messagingRequests.length > 0) {
      setSelectedRequestId(messagingRequests[0].id);
    }
  }, [profile, tab, selectedRequestId, messagingRequests]);

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

  const updateUnit = async (bg: string, delta: number) => {
    if (!profile) return;
    const newVal = Math.max(0, (inventory[bg] || 0) + delta);
    const updated = { ...inventory, [bg]: newVal };
    await setDoc(doc(db, "hospital_inventory", profile.uid), updated);
    toast.success(`${bg} updated to ${newVal} units`);
  };

  const handleFulfill = async (req: BloodRequest) => {
    if (!profile) return;
    setFulfilling(req.id);
    try {
      await fulfillRequestFromInventory(req.id, profile.uid, profile.name);
      
      const newVal = Math.max(0, (inventory[req.bloodGroup] || 0) - req.units);
      await setDoc(doc(db, "hospital_inventory", profile.uid), {
        ...inventory,
        [req.bloodGroup]: newVal,
      });

      toast.success(`Request fulfilled! ${req.units} units deducted from inventory.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to fulfill request.");
    } finally {
      setFulfilling(null);
    }
  };

  const handleVerify = async (req: BloodRequest) => {
    if (!profile) return;
    setVerifying(req.id);
    try {
      await verifyDonation(req.id, profile.uid, profile.name);
      toast.success("Donation verified successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify donation.");
    } finally {
      setVerifying(null);
    }
  };

  const sendMessage = async () => {
    if (!profile || !selectedRequestId || !newMessage.trim()) return;
    const req = messagingRequests.find((r) => r.id === selectedRequestId);
    if (!req) return;

    const hospitalParticipant = req.hospitalUid || req.verifiedBy || profile.uid;
    const participants = Array.from(
      new Set(
        [req.createdBy || profile.uid, req.acceptedBy || null, hospitalParticipant, profile.uid].filter(
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

  const getStockStatus = (units: number) => {
    if (units === 0) return { label: "Out of Stock", cls: "bg-destructive/10 text-destructive" };
    if (units <= 3)  return { label: "Critical",     cls: "bg-primary/10 text-primary" };
    if (units <= 8)  return { label: "Low",           cls: "bg-amber-500/10 text-amber-600" };
    return                  { label: "Available",     cls: "bg-emerald-500/10 text-emerald-600" };
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: User },
    { key: "inventory", label: "Inventory",    icon: Package },
    { key: "requests",  label: "All Requests", icon: Droplets },
    { key: "verify",    label: `Verify Donations${pendingVerification.length ? ` (${pendingVerification.length})` : ""}`, icon: ShieldCheck },
    { key: "messages",  label: "Messages",     icon: MessageSquare },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Hospital Dashboard — BloodLine" />
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
          <div className="flex gap-2 bg-muted/60 rounded-2xl p-1.5 mb-8 overflow-x-auto border border-border/50 backdrop-blur-sm sticky top-20 z-10 scrollbar-hide">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
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

              {/* Profile Tab */}
              {tab === "profile" && (
                <ProfileDetails profile={profile} onEdit={() => navigate("/profile-setup")} />
              )}

              {/* Inventory Tab */}
              {tab === "inventory" && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {BLOOD_GROUPS.map((bg) => {
                    const units = inventory[bg] || 0;
                    const status = getStockStatus(units);
                    return (
                      <div key={bg} className="bg-card rounded-2xl p-5 shadow-sm border border-border card-hover">
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
                        <div className="flex flex-col items-end gap-2">
                          {req.status === "open" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleFulfill(req)}
                                disabled={fulfilling === req.id || (inventory[req.bloodGroup] || 0) < req.units}
                                className="shrink-0 gradient-primary text-primary-foreground shadow-primary gap-1.5"
                              >
                                {fulfilling === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                                {fulfilling === req.id ? "Fulfilling..." : "Fulfill from Stock"}
                              </Button>
                              {(inventory[req.bloodGroup] || 0) < req.units && (
                                <span className="text-[10px] text-destructive font-medium">Insufficient {req.bloodGroup} stock</span>
                              )}
                            </>
                          )}
                          {req.verifiedBy === profile.uid && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="h-3 w-3" /> Verified by you
                            </div>
                          )}
                        </div>
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
                                  <User className="h-3 w-3" /> Donation completed — verify the request below
                                </div>
                              </div>
                              <Button
                                onClick={() => handleVerify(req)}
                                disabled={verifying === req.id}
                                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                              >
                                {verifying === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
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
              {tab === "messages" && (() => {
                const selectedReq = messagingRequests.find((r) => r.id === selectedRequestId);
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
                          disabled={messagingRequests.length === 0}
                        >
                          {messagingRequests.length === 0 ? (
                            <option value="">No requests</option>
                          ) : (
                            messagingRequests.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.requestCode ? `${r.requestCode} · ` : ""}{r.bloodGroup} · {r.units} units · {r.status}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      {selectedReq && (
                        <p className="text-xs text-muted-foreground">
                          Chat with: <span className="text-pink-600 font-medium">{selectedReq.creatorName || "Receiver"}</span>
                          , <span className="text-blue-600 font-medium">{selectedReq.acceptedDonorName || "Donor"}</span>
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
