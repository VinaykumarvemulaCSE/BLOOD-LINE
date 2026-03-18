import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, type UserProfile } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Users, Droplets, Activity, BarChart3, Trash2,
  UserX, CheckCircle2, Building2, TrendingUp, Clock, ShieldCheck,
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
  creatorName?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  acceptedBy?: string;
  createdAt?: any;
}

interface Donation {
  id: string;
  donorId: string;
  requestId: string;
  status: string;
  bloodGroup?: string;
  verifiedAt?: string;
}

const STATUS_COLOR: Record<string, string> = {
  active:    "bg-blue-500/10 text-blue-600",
  accepted:  "bg-yellow-500/10 text-yellow-700",
  completed: "bg-green-500/10 text-green-700",
  verified:  "bg-emerald-500/10 text-emerald-700",
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"overview" | "users" | "requests" | "analytics">("overview");
  const [users, setUsers]       = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => d.data() as UserProfile));
    });
    const unsub2 = onSnapshot(collection(db, "blood_requests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest)));
    });
    const unsub3 = onSnapshot(collection(db, "donations"), (snap) => {
      setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation)));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const deactivateUser = async (uid: string) => {
    await updateDoc(doc(db, "users", uid), { donorAvailability: false });
    toast.success("User deactivated");
  };

  const deleteRequest = async (id: string) => {
    await deleteDoc(doc(db, "blood_requests", id));
    toast.success("Request deleted");
  };

  // Workflow funnel summary
  const activeCount   = requests.filter((r) => r.status === "active").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const verifiedCount = requests.filter((r) => r.status === "verified").length;

  const stats = [
    { icon: Users,        label: "Total Users",     value: users.length,     color: "bg-primary/10 text-primary" },
    { icon: Droplets,     label: "Blood Requests",  value: requests.length,  color: "bg-destructive/10 text-destructive" },
    { icon: CheckCircle2, label: "Donations",       value: donations.length, color: "bg-emerald-500/10 text-emerald-600" },
    { icon: Building2,    label: "Hospitals",       value: users.filter((u) => u.role === "hospital").length, color: "bg-amber-500/10 text-amber-600" },
  ];

  const tabs = [
    { key: "overview",   label: "Overview",   icon: Activity },
    { key: "users",      label: "Users",      icon: Users },
    { key: "requests",   label: "Requests",   icon: Droplets },
    { key: "analytics",  label: "Analytics",  icon: BarChart3 },
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
              <Shield className="h-7 w-7 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform Management & Analytics</p>
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

              {/* === Overview === */}
              {tab === "overview" && (
                <div className="space-y-6">
                  {/* Stat Cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                      <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="bg-card rounded-2xl p-5 shadow-sm border border-border"
                      >
                        <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                          <s.icon className="h-5 w-5" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Workflow Funnel */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Blood Request Workflow
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Active",    count: activeCount,    color: "bg-blue-500",    desc: "Awaiting donor" },
                        { label: "Accepted",  count: acceptedCount,  color: "bg-amber-500",   desc: "Donor assigned" },
                        { label: "Completed", count: completedCount, color: "bg-green-500",   desc: "Donation done" },
                        { label: "Verified",  count: verifiedCount,  color: "bg-emerald-600", desc: "Hospital verified" },
                      ].map((stage) => (
                        <div key={stage.label} className="flex flex-col items-center text-center p-4 bg-muted/30 rounded-xl">
                          <div className={`w-12 h-12 ${stage.color} rounded-full flex items-center justify-center mb-2`}>
                            <span className="text-white font-bold text-lg">{stage.count}</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                          <p className="text-xs text-muted-foreground">{stage.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent verified donations */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Recently Verified Donations
                    </h3>
                    {requests.filter((r) => r.status === "verified").length === 0 ? (
                      <p className="text-sm text-muted-foreground">No verified donations yet</p>
                    ) : (
                      <div className="space-y-2">
                        {requests.filter((r) => r.status === "verified").slice(0, 5).map((req) => (
                          <div key={req.id} className="flex items-center gap-3 p-3 bg-emerald-50/30 rounded-xl border border-emerald-100">
                            <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{req.bloodGroup} • {req.units} units</p>
                              <p className="text-xs text-muted-foreground">{req.hospitalLocation} • by {req.creatorName}</p>
                            </div>
                            {req.verifiedByName && (
                              <p className="text-xs text-emerald-600">✓ {req.verifiedByName}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === Users === */}
              {tab === "users" && (
                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Blood</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.uid} className="border-b border-border hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{u.name}</td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="text-xs capitalize">{u.role}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-primary/10 text-primary text-xs">{u.bloodGroup}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{u.city}</td>
                            <td className="px-4 py-3">
                              <Button size="sm" variant="ghost" onClick={() => deactivateUser(u.uid)}
                                className="text-destructive hover:text-destructive h-8 w-8 p-0">
                                <UserX className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No users yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === Requests === */}
              {tab === "requests" && (
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
                      <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No requests to manage</p>
                    </div>
                  ) : requests.map((req) => (
                    <div key={req.id} className="bg-card rounded-2xl p-5 shadow-sm border border-border flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="bg-primary/10 text-primary">{req.bloodGroup}</Badge>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status] ?? "bg-muted text-muted-foreground"}`}>
                            {req.status}
                          </span>
                          {req.emergency && <Badge variant="destructive" className="text-xs">Emergency</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{req.hospitalLocation} • {req.units} units</p>
                        {req.creatorName && <p className="text-xs text-muted-foreground mt-0.5">By: {req.creatorName}</p>}
                        {req.verifiedByName && (
                          <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Verified by {req.verifiedByName}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteRequest(req.id)}
                        className="text-destructive h-8 w-8 p-0 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* === Analytics === */}
              {tab === "analytics" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Users by role */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">Users by Role</h3>
                    {(["donor", "receiver", "hospital", "admin"] as const).map((role) => {
                      const count = users.filter((u) => u.role === role).length;
                      const percent = users.length > 0 ? (count / users.length) * 100 : 0;
                      return (
                        <div key={role} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-foreground">{role}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Request workflow funnel */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">Request Workflow Status</h3>
                    {[
                      { status: "active",    label: "Active (Awaiting Donor)" },
                      { status: "accepted",  label: "Accepted (Donor Assigned)" },
                      { status: "completed", label: "Completed (Donation Done)" },
                      { status: "verified",  label: "Verified (Hospital Confirmed)" },
                    ].map(({ status, label }) => {
                      const count = requests.filter((r) => r.status === status).length;
                      return (
                        <div key={status} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                          <span className="text-sm text-foreground">{label}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLOR[status] ?? ""}`}>{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Donations summary */}
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border sm:col-span-2">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">Donation Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Scheduled",  count: donations.filter((d) => d.status === "scheduled").length,  color: "bg-blue-500/10 text-blue-600" },
                        { label: "Completed",  count: donations.filter((d) => d.status === "completed").length,  color: "bg-green-500/10 text-green-700" },
                        { label: "Verified",   count: donations.filter((d) => d.status === "verified").length,   color: "bg-emerald-500/10 text-emerald-700" },
                      ].map(({ label, count, color }) => (
                        <div key={label} className={`rounded-xl p-4 text-center ${color}`}>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
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
