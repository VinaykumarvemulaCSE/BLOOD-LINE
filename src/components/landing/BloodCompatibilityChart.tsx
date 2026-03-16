import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BLOOD_GROUPS, COMPATIBILITY, CAN_RECEIVE_FROM, type BloodGroup } from "@/lib/bloodCompatibility";

export default function BloodCompatibilityChart() {
  const [selected, setSelected] = useState<BloodGroup | null>(null);

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">
            Blood <span className="text-primary">Compatibility</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            Click a blood type to see who it can donate to and receive from
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Blood group buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {BLOOD_GROUPS.map((bg) => (
              <motion.button
                key={bg}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelected(selected === bg ? null : bg)}
                className={`w-14 h-14 rounded-2xl font-display font-bold text-lg border-2 transition-all ${
                  selected === bg
                    ? "bg-primary text-primary-foreground border-primary shadow-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                {bg}
              </motion.button>
            ))}
          </div>

          {/* Compatibility display */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid md:grid-cols-2 gap-6"
              >
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
                  <h4 className="text-sm font-semibold text-primary mb-3">
                    {selected} can donate to:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {COMPATIBILITY[selected].map((bg) => (
                      <span
                        key={bg}
                        className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold"
                      >
                        {bg}
                      </span>
                    ))}
                  </div>
                  {selected === "O-" && (
                    <p className="text-xs text-success mt-3 font-medium">
                      ✨ Universal Donor — Can donate to all blood types!
                    </p>
                  )}
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
                  <h4 className="text-sm font-semibold text-success mb-3">
                    {selected} can receive from:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {CAN_RECEIVE_FROM[selected].map((bg) => (
                      <span
                        key={bg}
                        className="px-3 py-1.5 rounded-xl bg-success/10 text-success text-sm font-semibold"
                      >
                        {bg}
                      </span>
                    ))}
                  </div>
                  {selected === "AB+" && (
                    <p className="text-xs text-success mt-3 font-medium">
                      ✨ Universal Receiver — Can receive from all blood types!
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!selected && (
            <div className="text-center text-muted-foreground text-sm py-8 bg-muted/50 rounded-2xl">
              Select a blood type above to view compatibility
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
