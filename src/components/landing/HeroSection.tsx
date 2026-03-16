import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, HeartHandshake } from "lucide-react";
import heroImg from "@/assets/hero.png";

function FloatingDrop({ delay, x, y }: { delay: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute w-4 h-5 rounded-full bg-primary/10"
      style={{
        left: x,
        top: y,
        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
      }}
      animate={{ y: [0, -15, 0] }}
      transition={{ duration: 3, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 gradient-hero overflow-hidden min-h-[90vh] flex items-center">
      {/* Floating drops */}
      <FloatingDrop delay={0} x="10%" y="20%" />
      <FloatingDrop delay={0.5} x="85%" y="15%" />
      <FloatingDrop delay={1} x="70%" y="70%" />
      <FloatingDrop delay={1.5} x="15%" y="75%" />
      <FloatingDrop delay={0.8} x="50%" y="10%" />

      {/* Heartbeat SVG */}
      <svg
        className="absolute bottom-0 left-0 w-full h-20 opacity-[0.06]"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,50 L200,50 L230,20 L260,80 L290,30 L320,70 L350,50 L600,50 L630,20 L660,80 L690,30 L720,70 L750,50 L1200,50"
          fill="none"
          stroke="hsl(347,77%,50%)"
          strokeWidth="2"
          className="animate-heartbeat-line"
          strokeDasharray="1000"
        />
      </svg>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Saving lives, one drop at a time
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-secondary leading-tight">
              Donate Blood.
              <br />
              <span className="text-primary">Save Lives.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg font-body">
              BloodLine connects blood donors, receivers, and hospitals through a
              real-time platform — making emergency blood discovery fast, reliable, and
              life-saving.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/find-blood")}
                className="gradient-primary text-primary-foreground shadow-primary gap-2"
              >
                <Search className="h-4 w-4" />
                Find Blood
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/login?tab=register")}
                className="gap-2"
              >
                <HeartHandshake className="h-4 w-4" />
                Become a Donor
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <img
                src={heroImg}
                alt="Blood donation illustration"
                className="w-full rounded-3xl shadow-card-hover"
              />
              {/* Floating stat cards */}
              <motion.div
                className="absolute -left-6 top-1/4 glass rounded-2xl p-3 shadow-card"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <HeartHandshake className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lives Saved</p>
                    <p className="text-sm font-bold text-foreground">10,000+</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="absolute -right-4 bottom-1/4 glass rounded-2xl p-3 shadow-card"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Donors Online</p>
                    <p className="text-sm font-bold text-foreground">2,500+</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
