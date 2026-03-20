import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, Activity, Building2, Droplets } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

function useFirestoreCount(collectionName: string, filterField?: string, filterValue?: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Always use a filter — unfiltered collection reads are blocked for guests by Firestore rules
    if (!filterField || !filterValue) return;
    const q = query(collection(db, collectionName), where(filterField, "==", filterValue));
    const unsub = onSnapshot(q, (snap) => setCount(snap.size), () => setCount(0));
    return unsub;
  }, [collectionName, filterField, filterValue]);
  return count;
}


function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    // Re-animate when target changes
    if (target !== prevTarget.current) { started.current = false; prevTarget.current = target; }
    
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const step = target / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export default function StatsSection() {
  const donors     = useFirestoreCount("users", "role", "donor");
  const activeRequests = useFirestoreCount("blood_requests", "status", "open");
  const hospitals  = useFirestoreCount("users", "role", "hospital");
  // Count completed donations — status is public readable per rules
  const donations  = useFirestoreCount("donations", "status", "verified");

  const stats = [
    { icon: Droplets, label: "Registered Donors",   target: donors,         suffix: "" },
    { icon: Activity, label: "Active Requests",     target: activeRequests, suffix: "" },
    { icon: Heart,    label: "Donations Verified",  target: donations,      suffix: "" },
    { icon: Building2, label: "Connected Hospitals", target: hospitals,     suffix: "" },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">
            Real-Time <span className="text-primary">Impact</span>
          </h2>
          <p className="text-muted-foreground mt-2">Live platform statistics, updated in real-time</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-card rounded-2xl p-6 shadow-card border border-border text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <Counter target={s.target} suffix={s.suffix} />
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
