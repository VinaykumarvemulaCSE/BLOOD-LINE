import { useState, useEffect } from "react";
import { collection, query, getDocs, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, type UserProfile } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Users, Droplets, Activity, BarChart3, Trash2,
  UserX, CheckCircle2, Building2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"overview" | "users" | "requests" | "analytics">("overview");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => d.data() as UserProfile));
    });
    const unsub2 = onSnapshot(collection(db, "blood_requests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsub3 = onSnapshot(collection(db, "donations"), (snap) => {
      setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const stats = [
    { icon: Users, label: "Total Users", value: users.length, color: "bg-primary/10 text-primary" },
    { icon: Droplets, label: "Blood Requests", value: requests.length, color: "bg-destructive/10 text-destructive" },
    { icon: CheckCircle2, label: "Donations", value: donations.length, color: "bg-success/10 text-success" },
    { icon: Building2, label: "Hospitals", value: users.filter((u) => u.role === "hospital").length, color: "bg-warning/10 text-warning" },
  ];

  const tabs = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "users", label: "Users", icon: Users },
    { key: "requests", label: "Requests", icon: Droplets },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Shield className="h-7 w-7 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform Management</p>
            </div>
          </div>

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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl p-5 shadow-card border border-border"
                >
                  <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {tab === "users" && (
            <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
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
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-xs capitalize">{u.role}</Badge></td>
                        <td className="px-4 py-3"><Badge className="bg-primary/10 text-primary text-xs">{u.bloodGroup}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{u.city}</td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deactivateUser(u.uid)}
                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No users registered yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="bg-card rounded-2xl p-12 shadow-card border border-border text-center">
                  <Droplets className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No requests to manage</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="bg-card rounded-2xl p-5 shadow-card border border-border flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/10 text-primary">{req.bloodGroup}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{req.status}</Badge>
                        {req.emergency && <Badge variant="destructive" className="text-xs">Emergency</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{req.hospitalLocation} • {req.units} units</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteRequest(req.id)} className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "analytics" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Users by Role</h3>
                {["donor", "receiver", "hospital", "admin"].map((role) => {
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
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Request Status</h3>
                {["active", "accepted", "completed"].map((status) => {
                  const count = requests.filter((r) => r.status === status).length;
                  return (
                    <div key={status} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <span className="capitalize text-sm text-foreground">{status}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
