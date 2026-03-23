import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, HeartHandshake, Zap, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero.png";

const BLOOD_TYPES = ["A+", "B+", "O+", "AB+", "O−"];

function FloatingBloodDrop({ delay, x, y, size = 1 }: { delay: number; x: string; y: string; size?: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/8 pointer-events-none"
      style={{
        left: x,
        top: y,
        width: `${16 * size}px`,
        height: `${20 * size}px`,
        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
      }}
      animate={{ y: [0, -18, 0], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 3.5 + delay * 0.5, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function ScrollingBloodTypes() {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      {BLOOD_TYPES.map((type, i) => (
        <motion.span
          key={type}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + i * 0.1 }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary font-display font-bold text-sm border border-primary/20"
        >
          {type}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="text-xs text-muted-foreground font-medium"
      >
        & more
      </motion.span>
    </div>
  );
}

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section
      className="relative pt-24 pb-20 md:pt-36 md:pb-28 overflow-hidden min-h-[92vh] flex items-center"
      aria-label="Hero section"
    >
      {/* Rich background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(347_77%_50%_/_0.08),transparent)]" />
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c0162e' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating drops */}
      <FloatingBloodDrop delay={0} x="8%" y="20%" size={1.2} />
      <FloatingBloodDrop delay={0.6} x="88%" y="18%" size={0.8} />
      <FloatingBloodDrop delay={1.1} x="75%" y="72%" size={1.5} />
      <FloatingBloodDrop delay={1.7} x="12%" y="78%" size={0.9} />
      <FloatingBloodDrop delay={0.9} x="52%" y="8%" size={1.1} />
      <FloatingBloodDrop delay={0.3} x="20%" y="45%" size={0.7} />

      {/* Heartbeat SVG */}
      <svg
        className="absolute bottom-0 left-0 w-full h-20 opacity-[0.07]"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,50 L200,50 L230,20 L260,80 L290,30 L320,70 L350,50 L600,50 L630,20 L660,80 L690,30 L720,70 L750,50 L1200,50"
          fill="none"
          stroke="hsl(347,77%,50%)"
          strokeWidth="2.5"
          className="animate-heartbeat-line"
          strokeDasharray="1000"
        />
      </svg>

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-7 border border-primary/20"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <Zap className="h-3 w-3" />
              Real-time blood discovery platform
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              className="text-5xl md:text-6xl lg:text-[5rem] font-display font-black text-secondary leading-[1.05] tracking-tight"
            >
              Donate Blood.
              <br />
              <span className="text-gradient relative inline-block mt-2">
                Save Lives.
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1.5 bg-primary/30 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg font-body leading-relaxed"
            >
              BloodLine connects donors, receivers, and hospitals through a
              real-time platform — making emergency blood discovery{" "}
              <span className="text-foreground font-semibold">fast, reliable, and life-saving.</span>
            </motion.p>

            {/* Blood types chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5"
            >
              <p className="text-xs text-muted-foreground font-medium mb-2">We support all blood types:</p>
              <ScrollingBloodTypes />
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                id="hero-find-blood"
                onClick={() => navigate("/find-blood")}
                className="gradient-primary text-primary-foreground shadow-primary gap-2 font-bold text-base px-8 h-14 rounded-xl group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <Search className="h-5 w-5" />
                Find Blood Now
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                id="hero-become-donor"
                onClick={() => navigate("/login?tab=register")}
                className="gap-2 font-bold text-base px-8 h-14 rounded-xl border-2 hover:bg-primary/5 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              >
                <HeartHandshake className="h-5 w-5 text-primary" />
                Become a Donor
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                {["#f87171", "#fb923c", "#a78bfa", "#34d399"].map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {["A+", "B+", "O-", "AB+"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">10,000+</span> lives saved and counting
              </p>
            </motion.div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            {/* Glow behind image */}
            <div className="absolute inset-8 bg-primary/10 rounded-full blur-3xl" />

            <div className="relative">
              <img
                src={heroImg}
                alt="Blood donation platform illustration showing a doctor and patient"
                className="w-full rounded-3xl shadow-card-hover relative z-10"
                loading="eager"
              />

              {/* Floating stat: Lives Saved */}
              <motion.div
                className="absolute -left-8 top-1/4 glass rounded-2xl p-4 shadow-card-hover z-20"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                    <HeartHandshake className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lives Saved</p>
                    <p className="text-base font-bold text-foreground font-display">10,000+</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating stat: Donors Online */}
              <motion.div
                className="absolute -right-6 bottom-1/4 glass rounded-2xl p-4 shadow-card-hover z-20"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-glow">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Donors Online</p>
                    <p className="text-base font-bold text-foreground font-display">2,500+</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating: Emergency badge */}
              <motion.div
                className="absolute top-6 right-4 glass rounded-full py-1.5 px-3 z-20 flex items-center gap-1.5"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-foreground">Live Requests</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
