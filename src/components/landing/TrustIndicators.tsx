import { motion } from "framer-motion";
import { ShieldCheck, Users, Building2 } from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "Verified Donors", desc: "Every donor is verified for safety" },
  { icon: Building2, label: "Trusted Hospitals", desc: "Partnered with leading hospitals" },
  { icon: Users, label: "Secure Platform", desc: "Your data is always protected" },
];

export default function TrustIndicators() {
  return (
    <section className="py-12 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
