import { motion } from "framer-motion";
import { FileText, UserCheck, Building2, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: FileText, label: "Request Created", desc: "Receiver posts urgent blood need" },
  { icon: UserCheck, label: "Donor Accepts", desc: "Matching donor responds to alert" },
  { icon: Building2, label: "Hospital Confirms", desc: "Hospital verifies and prepares" },
  { icon: CheckCircle2, label: "Donation Complete", desc: "Life saved through donation" },
];

export default function ImpactTimeline() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">
            Donation <span className="text-primary">Journey</span>
          </h2>
          <p className="text-muted-foreground mt-2">Follow a successful blood donation from start to finish</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                className="flex-1 flex md:flex-col items-center gap-4 md:gap-0 relative"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[55%] w-[90%] border-t-2 border-dashed border-primary/20" />
                )}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    i === steps.length - 1
                      ? "bg-success text-success-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="md:text-center md:mt-3">
                  <p className="font-semibold text-sm text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
