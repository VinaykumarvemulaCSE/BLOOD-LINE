import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getDaysUntilEligible, isEligibleToDonate, BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Heart, CheckCircle2, Clock, MapPin, MessageSquare,
  User, Droplets, Calendar, Activity
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SOSButton from "@/components/SOSButton";

interface BloodRequest {
  id: string;
  createdBy: string;
  bloodGroup: string;
  units: number;
  hospitalLocation: string;
  status: string;
  emergency: boolean;
  createdAt: string;
  creatorName?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
}

export default function DonorDashboard() {
  const { profile, updateProfile } = useAuth();

  // ✅ FIX: added "accepted"
  const [tab, setTab] = useState<"overview" | "requests" | "history" | "messages" | "accepted">("overview");

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [acceptedRequests, setAcceptedRequests] = useState<BloodRequest[]>([]);

  const eligible = isEligibleToDonate(profile?.lastDonationDate || null);
  const daysLeft = getDaysUntilEligible(profile?.lastDonationDate || null);
  const eligibilityPercent = profile?.lastDonationDate
    ? Math.min(100, ((90 - daysLeft) / 90) * 100)
    : 100;

  // Fetch matching blood requests
  useEffect(() => {
    if (!profile) return;

    const q1 = query(
      collection(db, "blood_requests"),
      where("status", "==", "active")
    );

    const unsub1 = onSnapshot(q1, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as BloodRequest[];

      setRequests(data);
    });

    return () => unsub1();
  }, [profile]);

  // Accepted requests
  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, "blood_requests"),
      where("acceptedBy", "==", profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as BloodRequest[];

      setAcceptedRequests(data);
    });

    return () => unsub();
  }, [profile]);

  // Fetch messages
  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", profile.uid),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
    return unsub;
  }, [profile]);

  const acceptRequest = async (reqId: string) => {
    if (!profile) return;

    try {
      await updateDoc(doc(db, "blood_requests", reqId), {
        status: "accepted",
        acceptedBy: profile.uid,
      });

      await addDoc(collection(db, "donations"), {
        donorId: profile.uid,
        requestId: reqId,
        bloodGroup: profile.bloodGroup,
        date: new Date().toISOString(),
        status: "scheduled",
      });

    } catch (err) {
      console.error(err);
    }
  };

  const availableRequests = requests.filter(
    (r) => r.status === "active"
  );

  const sendMessage = async () => {
    if (!profile || !chatWith || !newMessage.trim()) return;
    await addDoc(collection(db, "messages"), {
      senderId: profile.uid,
      receiverId: chatWith,
      message: newMessage,
      timestamp: new Date().toISOString(),
    });
    setNewMessage("");
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "requests", label: "Requests", icon: Droplets },
    { key: "accepted", label: "Accepted", icon: CheckCircle2 },
    { key: "history", label: "History", icon: Calendar },
    { key: "messages", label: "Messages", icon: MessageSquare },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SOSButton />
      <div className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                Welcome, {profile.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">{profile.bloodGroup}</Badge>
                <span>{profile.city}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 overflow-x-auto">
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
          {tab === "overview" && (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

    {/* Eligibility Card */}
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border col-span-full sm:col-span-1">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">
        Donation Eligibility
      </h3>

      <div className="flex items-center justify-center mb-4">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={eligible ? "hsl(var(--success))" : "hsl(var(--primary))"}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - (profile?.lastDonationDate ? Math.min(100, ((90 - daysLeft) / 90) * 100) : 100) / 100)}`}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {eligible ? (
              <CheckCircle2 className="h-8 w-8 text-success" />
            ) : (
              <>
                <span className="text-2xl font-bold text-primary">
                  {daysLeft}
                </span>
                <span className="text-xs text-muted-foreground">
                  days left
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-sm font-medium">
        {eligible ? (
          <span className="text-success">
            You are eligible to donate blood
          </span>
        ) : (
          <span className="text-primary">
            You can donate again in {daysLeft} days
          </span>
        )}
      </p>
    </div>

    {/* Profile Card */}
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        Profile
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Blood Group</span>
          <span className="font-semibold">{profile.bloodGroup}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">City</span>
          <span className="font-semibold">{profile.city}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Age</span>
          <span className="font-semibold">{profile.age}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Weight</span>
          <span className="font-semibold">{profile.weight} kg</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Rep Score</span>
          <span className="font-semibold">
            {profile.reputationScore || 0}
          </span>
        </div>
      </div>
    </div>

    {/* Activity Card */}
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        Activity
      </h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold">{requests.length}</p>
            <p className="text-xs text-muted-foreground">
              Active Requests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold">{messages.length}</p>
            <p className="text-xs text-muted-foreground">
              Messages
            </p>
          </div>
        </div>
      </div>
    </div>

  </div>
)}

          {/* ACCEPTED TAB (unchanged UI) */}
          {tab === "accepted" && (
            <div className="space-y-3">
              {acceptedRequests.length === 0 ? (
                <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">
                    No accepted requests yet
                  </p>
                </div>
              ) : (
                acceptedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-card rounded-2xl p-5 shadow-card border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge>{req.bloodGroup}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            Accepted
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {req.units} units • {req.hospitalLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Requests Tab */}
          {tab === "requests" && (
            <div className="space-y-3">
              {/* ✅ FIX */}
              {availableRequests.length === 0 ? (
                <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
                  <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No active blood requests at this time</p>
                </div>
              ) : (
                availableRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl p-5 shadow-card border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={req.emergency ? "bg-primary text-primary-foreground" : ""}>
                            {req.bloodGroup}
                          </Badge>
                          {req.emergency && (
                            <Badge variant="destructive" className="text-xs">🚨 Emergency</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {req.units} units needed • {req.hospitalLocation}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => acceptRequest(req.id)}
                        disabled={!eligible}
                        className="gradient-primary text-primary-foreground text-xs"
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}