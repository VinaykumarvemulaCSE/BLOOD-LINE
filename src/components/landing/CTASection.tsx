import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, Search } from "lucide-react";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="gradient-dark rounded-3xl p-8 md:p-16 text-center relative overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <Heart className="h-10 w-10 mx-auto text-primary fill-primary/20 mb-6" />
            <h2 className="text-3xl md:text-4xl font-display font-bold text-secondary-foreground mb-4">
              Join BloodLine Today
            </h2>
            <p className="text-secondary-foreground/60 max-w-lg mx-auto mb-8">
              Every drop counts. Register now and become part of a life-saving
              community that connects donors with those who need blood the most.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/login?tab=register")}
                className="gradient-primary text-primary-foreground shadow-primary gap-2"
              >
                <Heart className="h-4 w-4" />
                Register Now
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/find-blood")}
                className="border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 gap-2"
              >
                <Search className="h-4 w-4" />
                Find Blood
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
