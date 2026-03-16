import { motion } from "framer-motion";
import { UserPlus, Search, HeartHandshake } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Register & Create Profile",
    desc: "Sign up and complete your profile with blood group and health details.",
  },
  {
    icon: Search,
    title: "Find Blood or Create Request",
    desc: "Search for compatible donors nearby or post an emergency blood request.",
  },
  {
    icon: HeartHandshake,
    title: "Donor Responds & Saves Lives",
    desc: "Compatible donors get notified, respond, and coordinate the donation.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-muted-foreground mt-2">Three simple steps to save a life</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-primary/20" />
              )}
              <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary shadow-primary flex items-center justify-center mb-4">
                <step.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-xs font-bold text-primary mb-1">Step {i + 1}</div>
              <h3 className="font-display font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
