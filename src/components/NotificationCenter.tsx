import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, X, TriangleAlert as AlertTriangle, Info, CircleCheck as CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  message: string;
  userId: string;
  requestId?: string;
  read: boolean;
  priority?: string;
  bloodGroup?: string;
  location?: string;
  phone?: string;
  createdAt: any;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });

    return unsub;
  }, [user]);

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
  };

  const getIcon = (type: string, priority?: string) => {
    if (priority === "critical" || type === "sos_alert") {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (priority === "high" || type === "emergency_request") {
      return <AlertTriangle className="h-4 w-4 text-primary" />;
    }
    if (type === "donation_verified") {
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
    return <Info className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-4 top-20 w-96 max-h-[80vh] bg-card border border-border rounded-2xl shadow-card-hover z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={markAllAsRead}
                      className="text-xs h-7"
                    >
                      Mark all read
                    </Button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.read && markAsRead(notif.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          notif.read
                            ? "bg-muted/30 border-border/50 opacity-60"
                            : "bg-card border-border hover:bg-muted/50"
                        } ${
                          notif.priority === "critical"
                            ? "border-l-4 border-l-destructive"
                            : notif.priority === "high"
                            ? "border-l-4 border-l-primary"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getIcon(notif.type, notif.priority)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{notif.message}</p>
                            {notif.bloodGroup && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge className="bg-primary/10 text-primary text-xs">
                                  {notif.bloodGroup}
                                </Badge>
                                {notif.location && (
                                  <span className="text-xs text-muted-foreground">{notif.location}</span>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {notif.createdAt?.toDate?.()?.toLocaleString() || "Just now"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
