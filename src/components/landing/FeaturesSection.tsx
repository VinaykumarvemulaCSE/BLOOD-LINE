import { motion } from "framer-motion";
import { AlertTriangle, MessageSquare, MapPin, Package } from "lucide-react";

const features = [
  { icon: AlertTriangle, title: "Emergency SOS", desc: "One-tap emergency alerts to nearby compatible donors" },
  { icon: MessageSquare, title: "Real-time Messaging", desc: "Instant communication between donors, receivers & hospitals" },
  { icon: MapPin, title: "Nearby Discovery", desc: "Find compatible donors and hospitals on an interactive map" },
  { icon: Package, title: "Inventory Tracking", desc: "Hospitals manage and display live blood stock levels" },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">
            Platform <span className="text-primary">Features</span>
          </h2>
          <p className="text-muted-foreground mt-2">Everything you need for life-saving blood coordination</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-card rounded-2xl p-6 shadow-card border border-border hover:shadow-card-hover transition-shadow group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
