import { useState, useEffect, type FormEvent } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, type UserProfile } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  Shield, Users, Droplets, Activity, BarChart3, Trash2,
  User, UserX, CheckCircle2, Building2, TrendingUp, Clock, ShieldCheck, Bell, Inbox, Mail, MailOpen,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ProfileDetails from "@/components/ProfileDetails";
import SEO from "@/components/SEO";
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


interface ContactMessage {
  id: string;
  email: string;
  message: string;
  read: boolean;
  createdAt?: any;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<
    "profile" | "overview" | "notifications" | "users" | "requests" | "analytics" | "messages"
  >("overview");
  const [users, setUsers]       = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);

  // Admin -> send notification panel
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notifUserId, setNotifUserId] = useState("");
  const [notifType, setNotifType] = useState("admin_alert");
  const [notifPriority, setNotifPriority] = useState<"low" | "high" | "critical">("high");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifBloodGroup, setNotifBloodGroup] = useState("");
  const [notifLocation, setNotifLocation] = useState("");
  const [notifPhone, setNotifPhone] = useState("");
  const [notifSendToAll, setNotifSendToAll] = useState(false);

  // Only start listeners once admin profile is confirmed to avoid permission-denied errors
  useEffect(() => {
    if (!profile || profile.role !== "admin") return;

    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ ...d.data(), uid: (d.data() as any)?.uid ?? d.id } as UserProfile)));
    });
    const unsub2 = onSnapshot(collection(db, "blood_requests"), (snap) => {
      const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BloodRequest));
      mapped.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
      setRequests(mapped);
    });
    const unsub3 = onSnapshot(collection(db, "donations"), (snap) => {
      setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation)));
    });
    const unsub4 = onSnapshot(
      query(collection(db, "contact_messages"), orderBy("createdAt", "desc")),
      (snap) => {
        setContactMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactMessage)));
      }
    );
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [profile]);

  const deactivateUser = async (uid: string) => {
    await updateDoc(doc(db, "users", uid), { donorAvailability: false });
    toast.success("User deactivated");
  };

  const sendAdminNotification = async (e: FormEvent) => {
    e.preventDefault();
    if (!notifSendToAll && !notifUserId) return toast.error("Select a user or enable Send to All");
    if (!notifMessage.trim()) return toast.error("Enter a message");

    setSendingNotification(true);
    try {
      const buildData = (userId: string): Record<string, unknown> => {
        const data: Record<string, unknown> = {
          userId,
          type: notifType,
          message: notifMessage.trim(),
          read: false,
          priority: notifPriority,
          createdAt: serverTimestamp(),
        };
        if (notifBloodGroup.trim()) data.bloodGroup = notifBloodGroup.trim();
        if (notifLocation.trim()) data.location = notifLocation.trim();
        if (notifPhone.trim()) data.phone = notifPhone.trim();
        return data;
      };

      if (notifSendToAll) {
        const targetUsers = users.filter((u) => u.uid && u.role !== "admin");
        if (targetUsers.length === 0) {
          toast.error("No users to notify");
          return;
        }
        await Promise.all(targetUsers.map((u) => addDoc(collection(db, "notifications"), buildData(u.uid))));
        toast.success(`Notification sent to ${targetUsers.length} users`);
      } else {
        await addDoc(collection(db, "notifications"), buildData(notifUserId));
        toast.success("Notification sent");
      }
      setNotifMessage("");
      setNotifBloodGroup("");
      setNotifLocation("");
      setNotifPhone("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send notification");
    } finally {
      setSendingNotification(false);
    }
  };

  const deleteRequest = async (id: string) => {
    await deleteDoc(doc(db, "blood_requests", id));
    toast.success("Request deleted");
  };

  // Workflow funnel summary
  const activeCount   = requests.filter((r) => r.status === "open").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const verifiedCount = requests.filter((r) => r.status === "verified").length;

  const stats = [
    { icon: Users,        label: "Total Users",     value: users.length,     color: "bg-primary/10 text-primary" },
    { icon: Droplets,     label: "Blood Requests",  value: requests.length,  color: "bg-destructive/10 text-destructive" },
    { icon: CheckCircle2, label: "Donations",       value: donations.length, color: "bg-emerald-500/10 text-emerald-600" },
    { icon: Building2,    label: "Hospitals",       value: users.filter((u) => u.role === "hospital").length, color: "bg-amber-500/10 text-amber-600" },
  ];

  const unreadMessages = contactMessages.filter((m) => !m.read).length;

  const tabs = [
    { key: "profile",       label: "Profile",       icon: User },
    { key: "overview",      label: "Overview",      icon: Activity },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "users",         label: "Users",         icon: Users },
    { key: "requests",      label: "Requests",      icon: Droplets },
    { key: "analytics",     label: "Analytics",     icon: BarChart3 },
    { key: "messages",      label: "Messages",      icon: Inbox, badge: unreadMessages },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin Dashboard — BloodLine" />
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
                className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {(t as any).badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {(t as any).badge}
                  </span>
                )}
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

              {/* === Profile === */}
              {tab === "profile" && (
                <ProfileDetails profile={profile} onEdit={() => navigate("/profile-setup")} />
              )}

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
                        className="bg-card rounded-2xl p-5 shadow-sm border border-border card-hover"
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
                        { label: "Open",      count: activeCount,    color: "bg-blue-500",    desc: "Awaiting donor" },
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

              {/* === Notifications (Admin Sender) === */}
              {tab === "notifications" && (
                <div className="space-y-6">
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      Send Notification
                    </h3>

                    <form onSubmit={sendAdminNotification} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">User</Label>
                          <select
                            value={notifUserId}
                            onChange={(e) => setNotifUserId(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                            required={!notifSendToAll}
                            disabled={notifSendToAll}
                          >
                            <option value="">Select user</option>
                            {users.filter((u) => u.role !== "admin").map((u) => (
                              <option key={u.uid} value={u.uid}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={notifSendToAll}
                              onChange={(e) => setNotifSendToAll(e.target.checked)}
                              className="rounded accent-primary"
                            />
                            Send to all users
                          </label>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Priority</Label>
                          <select
                            value={notifPriority}
                            onChange={(e) => setNotifPriority(e.target.value as any)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Type</Label>
                        <select
                          value={notifType}
                          onChange={(e) => setNotifType(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                        >
                          <option value="admin_alert">Admin Alert</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Message</Label>
                        <textarea
                          value={notifMessage}
                          onChange={(e) => setNotifMessage(e.target.value)}
                          required
                          rows={3}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                          placeholder="Write a notification message..."
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Blood Group (optional)</Label>
                          <Input
                            value={notifBloodGroup}
                            onChange={(e) => setNotifBloodGroup(e.target.value)}
                            placeholder="e.g., A+"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Location (optional)</Label>
                          <Input
                            value={notifLocation}
                            onChange={(e) => setNotifLocation(e.target.value)}
                            placeholder="e.g., Hyderabad"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Phone (optional)</Label>
                        <Input
                          value={notifPhone}
                          onChange={(e) => setNotifPhone(e.target.value)}
                          placeholder="Contact number"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={sendingNotification}
                        className="w-full gradient-primary text-primary-foreground shadow-primary"
                      >
                        {sendingNotification ? "Sending..." : "Send Notification"}
                      </Button>
                    </form>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-2xl p-4 text-sm text-muted-foreground">
                    Tip: After sending, the recipient will see this inside their notification bell (real-time).
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
                      { status: "open",      label: "Open (Awaiting Donor)" },
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

              {/* === Contact Messages Inbox === */}
              {tab === "messages" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Inbox className="h-4 w-4 text-primary" />
                      Contact Inbox
                      {unreadMessages > 0 && (
                        <span className="bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadMessages} unread
                        </span>
                      )}
                    </h3>
                  </div>

                  {contactMessages.length === 0 ? (
                    <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
                      <Mail className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No messages yet</p>
                    </div>
                  ) : (
                    contactMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`bg-card rounded-2xl p-5 shadow-sm border transition-colors ${
                          msg.read ? "border-border opacity-70" : "border-primary/30 bg-primary/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              msg.read ? "bg-muted" : "bg-primary/10"
                            }`}>
                              {msg.read
                                ? <MailOpen className="h-4 w-4 text-muted-foreground" />
                                : <Mail className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{msg.email}</p>
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{msg.message}</p>
                              {msg.createdAt && (
                                <p className="text-xs text-muted-foreground/60 mt-2">
                                  {msg.createdAt?.toDate?.().toLocaleString() ?? ""}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {!msg.read && (
                              <Button
                                size="sm" variant="outline"
                                className="h-8 text-xs"
                                onClick={async () => {
                                  await updateDoc(doc(db, "contact_messages", msg.id), { read: true });
                                }}
                              >
                                Mark read
                              </Button>
                            )}
                            <Button
                              size="sm" variant="ghost"
                              className="text-destructive h-8 w-8 p-0"
                              onClick={async () => {
                                await deleteDoc(doc(db, "contact_messages", msg.id));
                                toast.success("Message deleted");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
