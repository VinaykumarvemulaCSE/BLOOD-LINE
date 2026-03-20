import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth, DEMO_ACCOUNTS_EXPORT } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDaysUntilEligible, isEligibleToDonate } from "@/lib/bloodCompatibility";
import { acceptBloodRequest, completeDonation as completeBloodDonation, updateDonorAfterDonation } from "@/services/bloodService";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, CircleCheck as CheckCircle2, MessageSquare, User, Droplets, Calendar, Activity, Send, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProfileDetails from "@/components/ProfileDetails";

// --- TYPES ---
interface BloodRequest {
  id: string;
  createdBy: string;
  creatorName?: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  status: string;
  emergency: boolean;
  createdAt: string;
  acceptedBy?: string;
  acceptedDonorName?: string;
  hospitalUid?: string | null;
  verifiedBy?: string | null;
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

interface Donation {
  id: string;
  donorId: string;
  requestId: string;
  status: string;
  date?: string;
  completedAt?: string;
  verifiedAt?: string;
}

export default function DonorDashboard() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  // --- STATE ---
  const [tab, setTab] = useState<"profile" | "overview" | "requests" | "accepted" | "history" | "messages">("overview");
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const eligible = isEligibleToDonate(profile?.lastDonationDate || null);
  const daysLeft = getDaysUntilEligible(profile?.lastDonationDate || null);

  // Use Firebase Auth uid as source of truth (avoids stale profile.uid from older docs)
  const uid = auth.currentUser?.uid ?? user?.uid ?? profile?.uid;

  // --- EFFECTS (Real-time Listeners) ---
  useEffect(() => {
    if (!uid) return;

    const qRequests = query(collection(db, "blood_requests"), where("status", "==", "open"));
    const unsubRequests = onSnapshot(qRequests, (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest))));

    const qAccepted = query(
      collection(db, "blood_requests"), 
      where("acceptedBy", "==", uid),
      where("status", "in", ["accepted", "completed", "verified"])
    );
    const unsubAccepted = onSnapshot(
      qAccepted,
      (snap) => setAcceptedRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest))),
      (err) => console.error("Accepted requests listener error:", err)
    );

    const qDonations = query(collection(db, "donations"), where("donorId", "==", uid));
    const unsubDonations = onSnapshot(qDonations, (snap) => setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation))));

    return () => {
      unsubRequests();
      unsubAccepted();
      unsubDonations();
    };
  }, [uid]);

  // Auto-select first request in the thread list
  useEffect(() => {
    if (!profile) return;
    if (!selectedRequestId && acceptedRequests.length > 0) {
      setSelectedRequestId(acceptedRequests[0].id);
    }
  }, [profile, selectedRequestId, acceptedRequests]);

  // Subscribe to request-scoped messages
  useEffect(() => {
    if (!profile || !selectedRequestId) return;

    const qMessages = query(
      collection(db, "messages"),
      where("requestId", "==", selectedRequestId)
    );

    return onSnapshot(qMessages, (snap) => {
      const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      // Avoid Firestore `orderBy` index requirements; sort locally instead.
      const toMs = (t: any) => {
        if (!t) return 0;
        if (typeof t?.toDate === "function") return t.toDate().getTime();
        if (t instanceof Date) return t.getTime();
        if (typeof t === "string") return new Date(t).getTime();
        if (typeof t === "number") return t;
        return 0;
      };
      mapped.sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
      setThreadMessages(mapped);
    });
  }, [profile, selectedRequestId]);

  // --- MUTATIONS ---
  const acceptRequest = async (reqId: string) => {
    if (!profile || !uid) return;
    setAcceptingId(reqId);
    try {
      await acceptBloodRequest(reqId, uid, profile.name, profile.phone || "");
    } catch (err) {
      console.error("Failed to accept request:", err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCompleteDonation = async (req: BloodRequest) => {
    if (!profile || !uid) return;
    setCompletingId(req.id);
    try {
      await completeBloodDonation(req.id, uid, profile.bloodGroup);
    } catch (err) {
      console.error("Failed to complete donation:", err);
    } finally {
      setCompletingId(null);
    }
  };

  const sendMessage = async () => {
    if (!profile || !selectedRequestId || !newMessage.trim()) return;
    try {
      const req = acceptedRequests.find((r) => r.id === selectedRequestId);
      if (!req) return;

      const hospitalParticipant = req.hospitalUid || req.verifiedBy || null;
      const participants = Array.from(new Set([req.createdBy, uid, hospitalParticipant].filter((x): x is string => !!x)));

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
    }
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: User },
    { key: "overview", label: "Overview", icon: Activity },
    { key: "requests", label: "Requests", icon: Droplets },
    { key: "accepted", label: "Accepted", icon: CheckCircle2 },
    { key: "history", label: "History", icon: Calendar },
    { key: "messages", label: "Messages", icon: MessageSquare },
  ] as const;

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          
          {/* HEADER */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Welcome, {profile.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Badge variant="outline" className="text-xs font-semibold">{profile.bloodGroup}</Badge>
                <span>{profile.city}</span>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6 overflow-x-auto border border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  tab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* CONTENT AREA */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* PROFILE TAB */}
              {tab === "profile" && (
                <ProfileDetails profile={profile} onEdit={() => navigate("/profile-setup")} />
              )}

              {/* OVERVIEW TAB */}
              {tab === "overview" && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Eligibility Card */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col items-center justify-center col-span-full sm:col-span-1">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 w-full text-left">Donation Eligibility</h3>
                    <div className="relative w-32 h-32 mb-4">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="52" fill="none"
                          stroke={eligible ? "hsl(var(--success))" : "hsl(var(--primary))"}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 52}`}
                          strokeDashoffset={`${2 * Math.PI * 52 * (1 - (eligible ? 100 : ((90 - daysLeft) / 90) * 100) / 100)}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {eligible ? <CheckCircle2 className="h-8 w-8 text-success" /> : (
                          <>
                            <span className="text-2xl font-bold text-primary">{daysLeft}</span>
                            <span className="text-xs text-muted-foreground">days left</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-center text-sm font-medium">
                      {eligible ? <span className="text-success">Eligible to donate</span> : <span className="text-primary">Next donation in {daysLeft} days</span>}
                    </p>
                  </div>

                  {/* Profile Card */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">Profile Info</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Age</span><span className="font-semibold">{profile.age}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Weight</span><span className="font-semibold">{profile.weight} kg</span></div>
                      <div className="flex justify-between pt-1"><span className="text-muted-foreground">Rep Score</span><span className="font-semibold text-primary">{profile.reputationScore || 0}</span></div>
                    </div>
                  </div>

                  {/* Activity Stats Card */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg">
                        <Droplets className="h-5 w-5 text-primary" />
                        <div><p className="text-lg font-bold">{requests.length}</p><p className="text-xs text-muted-foreground">Active Requests</p></div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <div><p className="text-lg font-bold">{donations.filter(d => d.status === "completed").length}</p><p className="text-xs text-muted-foreground">Total Donations</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REQUESTS TAB */}
              {tab === "requests" && (
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-sm">
                      <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No active blood requests right now.</p>
                    </div>
                  ) : requests.map((req) => (
                    <div key={req.id} className="bg-card rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between hover:border-primary/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={req.emergency ? "bg-destructive hover:bg-destructive" : ""}>{req.bloodGroup}</Badge>
                          {req.emergency && <Badge variant="outline" className="text-destructive border-destructive text-xs">🚨 Emergency</Badge>}
                        </div>
                        <p className="text-sm font-medium">{req.hospitalLocation}</p>
                        <p className="text-xs text-muted-foreground mt-1">{req.units} units needed</p>
                      </div>
                      <Button onClick={() => acceptRequest(req.id)} disabled={!eligible || acceptingId === req.id} className="shadow-sm">
                        {acceptingId === req.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Heart className="h-4 w-4 mr-2" />}
                        {acceptingId === req.id ? "Accepting..." : "Accept"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* ACCEPTED TAB */}
              {tab === "accepted" && (
                <div className="space-y-3">
                  {acceptedRequests.length === 0 ? (
                    <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-sm">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">You haven't accepted any requests yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">Accept a request from the Requests tab to see it here.</p>
                    </div>
                  ) : acceptedRequests.map((req) => (
                    <div key={req.id} className="bg-card rounded-2xl p-5 shadow-sm border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>{req.bloodGroup}</Badge>
                          {req.status === "accepted" ? (
                            <Badge variant="outline" className="bg-background">In Progress</Badge>
                          ) : req.status === "completed" ? (
                            <Badge variant="outline" className="bg-background">Completed (Waiting Verification)</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-background">{req.status}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{req.hospitalLocation}</p>
                        <p className="text-xs text-muted-foreground mt-1">{req.units} units • Please visit the hospital ASAP</p>
                      </div>
                      {req.status === "accepted" ? (
                        <Button
                          onClick={() => handleCompleteDonation(req)}
                          disabled={completingId === req.id}
                          variant="default"
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                          {completingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {completingId === req.id ? "Marking..." : "Mark as Donated"}
                        </Button>
                      ) : (
                        <Button
                          disabled
                          variant="default"
                          className="w-full sm:w-auto bg-muted text-muted-foreground gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Waiting for next step
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* HISTORY TAB */}
              {tab === "history" && (() => {
                const formatRelativeTime = (raw: string) => {
                  if (!raw) return "—";
                  const d = new Date(raw);
                  const now = new Date();
                  const diffMs = now.getTime() - d.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  if (diffMins < 60) return `${diffMins}m ago`;
                  if (diffHours < 24) return `${diffHours}h ago`;
                  if (diffDays < 7) return `${diffDays}d ago`;
                  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
                };
                const sorted = [...donations].sort((a, b) => {
                  const da = new Date(a.verifiedAt || a.completedAt || a.date || 0).getTime();
                  const db = new Date(b.verifiedAt || b.completedAt || b.date || 0).getTime();
                  return db - da;
                });
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Total donations: {donations.filter(d => d.status === "verified").length} verified</p>
                      <Badge variant="outline" className="text-primary">Score: {profile?.reputationScore ?? 0}</Badge>
                    </div>
                    {sorted.length === 0 ? (
                      <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-sm">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">Your donation history will appear here.</p>
                      </div>
                    ) : sorted.map((donation) => {
                      const statusLabel =
                        donation.status === "scheduled" ? "Scheduled"
                        : donation.status === "completed" ? "Completed"
                        : donation.status === "verified" ? "Verified"
                        : donation.status;
                      const rawDate = donation.verifiedAt || donation.completedAt || donation.date || "";
                      const scoreEarned = donation.status === "verified" ? 10 : 0;
                      return (
                        <div
                          key={donation.id}
                          className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center gap-4"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{statusLabel}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(rawDate)}
                              {rawDate && (
                                <span className="ml-1 opacity-75">({new Date(rawDate).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })})</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {scoreEarned > 0 && (
                              <Badge variant="secondary" className="bg-success/20 text-success">+{scoreEarned} pts</Badge>
                            )}
                            <Badge variant="outline" className="capitalize">{donation.status}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* MESSAGES TAB */}
              {tab === "messages" && (() => {
                const selectedReq = acceptedRequests.find((r) => r.id === selectedRequestId);
                const getBubbleClass = (m: Message) => {
                  if (m.senderId === uid) return "bg-primary text-primary-foreground ml-auto rounded-tr-none";
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
                          disabled={acceptedRequests.length === 0}
                        >
                          {acceptedRequests.length === 0 ? (
                            <option value="">No accepted requests</option>
                          ) : (
                            acceptedRequests.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.bloodGroup} • {r.units} units
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      {selectedReq && (
                        <p className="text-xs text-muted-foreground">
                          Chat with: <span className="text-pink-600 font-medium">{selectedReq.creatorName || "Receiver"}</span>
                          {selectedReq.verifiedByName && <>, <span className="text-emerald-600 font-medium">{selectedReq.verifiedByName} (Hospital)</span></>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {threadMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No messages yet for this request.
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