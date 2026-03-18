import { useState, useEffect } from "react";
import { collection, query, where, addDoc, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getDaysUntilEligible, isEligibleToDonate } from "@/lib/bloodCompatibility";
import { acceptBloodRequest, completeDonation as completeBloodDonation, updateDonorAfterDonation } from "@/services/bloodService";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, CircleCheck as CheckCircle2, MessageSquare, User, Droplets, Calendar, Activity, Send, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";

// --- TYPES ---
interface BloodRequest {
  id: string;
  createdBy: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  status: string;
  emergency: boolean;
  createdAt: string;
  acceptedBy?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
}

interface Donation {
  id: string;
  donorId: string;
  requestId: string;
  status: string;
  date?: string;
}

export default function DonorDashboard() {
  const { profile, updateProfile } = useAuth();

  // --- STATE ---
  const [tab, setTab] = useState<"overview" | "requests" | "accepted" | "history" | "messages">("overview");
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const eligible = isEligibleToDonate(profile?.lastDonationDate || null);
  const daysLeft = getDaysUntilEligible(profile?.lastDonationDate || null);

  // --- EFFECTS (Real-time Listeners) ---
  useEffect(() => {
    if (!profile) return;

    const qRequests = query(collection(db, "blood_requests"), where("status", "==", "active"),);
    const unsubRequests = onSnapshot(qRequests, (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest))));

    const qAccepted = query(collection(db, "blood_requests"), where("acceptedBy", "==", profile.uid));
    const unsubAccepted = onSnapshot(qAccepted, (snap) => setAcceptedRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest))));

    const qDonations = query(collection(db, "donations"), where("donorId", "==", profile.uid));
    const unsubDonations = onSnapshot(qDonations, (snap) => setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation))));

    const qMessages = query(collection(db, "messages"), where("receiverId", "==", profile.uid),);
    const unsubMessages = onSnapshot(qMessages, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))));

    return () => {
      unsubRequests();
      unsubAccepted();
      unsubDonations();
      unsubMessages();
    };
  }, [profile]);

  // --- MUTATIONS ---
  const acceptRequest = async (reqId: string) => {
    if (!profile) return;
    try {
      await acceptBloodRequest(reqId, profile.uid, profile.name, profile.phone);
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleCompleteDonation = async (req: BloodRequest) => {
    if (!profile) return;
    try {
      await completeBloodDonation(req.id, profile.uid, profile.bloodGroup);
      await updateDonorAfterDonation(updateProfile, profile.reputationScore || 0);
    } catch (err) {
      console.error("Failed to complete donation:", err);
    }
  };

  const sendMessage = async () => {
    if (!profile || !newMessage.trim()) return;
    try {
      await addDoc(collection(db, "messages"), {
        senderId: profile.uid,
        receiverId: "admin", // Assuming a central admin/hospital chat for this scope
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const tabs = [
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
                      <Button onClick={() => acceptRequest(req.id)} disabled={!eligible} className="shadow-sm">
                        <Heart className="h-4 w-4 mr-2" /> Accept
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
                    </div>
                  ) : acceptedRequests.map((req) => (
                    <div key={req.id} className="bg-card rounded-2xl p-5 shadow-sm border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>{req.bloodGroup}</Badge>
                          <Badge variant="outline" className="bg-background">In Progress</Badge>
                        </div>
                        <p className="text-sm font-medium">{req.hospitalLocation}</p>
                        <p className="text-xs text-muted-foreground mt-1">{req.units} units • Please visit the hospital ASAP</p>
                      </div>
                      <Button onClick={() => handleCompleteDonation(req)} variant="default" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Mark as Donated
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* HISTORY TAB (Rebuilt) */}
              {tab === "history" && (
                <div className="space-y-3">
                  {donations.length === 0 ? (
                    <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-sm">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Your donation history will appear here.</p>
                    </div>
                  ) : donations.map((donation) => (
                    <div key={donation.id} className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center gap-4 opacity-80">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Donation Completed</p>
                        <p className="text-xs text-muted-foreground">{new Date(donation.date || "").toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto capitalize">{donation.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* MESSAGES TAB (Rebuilt) */}
              {tab === "messages" && (
                <div className="bg-card rounded-2xl shadow-sm border border-border flex flex-col h-[500px] overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-sm">Support Chat</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No messages yet. Reach out for support!
                      </div>
                    ) : messages.map((m) => (
                      <div key={m.id} className={`max-w-[80%] rounded-2xl p-3 text-sm ${m.senderId === profile.uid ? "bg-primary text-primary-foreground ml-auto rounded-tr-none" : "bg-muted text-foreground mr-auto rounded-tl-none"}`}>
                        {m.message}
                      </div>
                    ))}
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
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}