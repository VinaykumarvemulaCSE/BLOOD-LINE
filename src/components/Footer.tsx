import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Heart, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleContactAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      // Save message to Firestore for admin to view
      const messagesRef = collection(db, "contact_messages");
      await addDoc(messagesRef, {
        email,
        message,
        createdAt: serverTimestamp(),
        read: false,
      });

      toast.success("Alert sent to Admin Panel successfully!");
      setEmail("");
      setMessage("");
    } catch (error: any) {
      console.error("Firebase Error:", error);
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-primary fill-primary" />
              <span className="text-lg font-display font-bold">
                Blood<span className="text-primary">Line</span>
              </span>
            </div>
            <p className="text-sm text-secondary-foreground/60">
              Connecting donors, receivers, and hospitals to save lives through real-time blood discovery.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Platform</h4>
            <div className="flex flex-col gap-2 text-sm text-secondary-foreground/60">
              <Link to="/find-blood" className="hover:text-primary transition-colors">Find Blood</Link>
              <Link to="/donate" className="hover:text-primary transition-colors">Donate Blood</Link>
              <Link to="/hospitals" className="hover:text-primary transition-colors">Hospitals</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-secondary-foreground/60">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            </div>
          </div>

          {/* Contact Admin */}
          <div>
            <h4 className="font-semibold mb-3 text-sm flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-primary" />
              Contact Admin
            </h4>
            <form onSubmit={handleContactAdmin} className="space-y-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-8 text-xs bg-secondary-foreground/5 border-secondary-foreground/10 text-secondary-foreground placeholder:text-secondary-foreground/40"
              />
              <textarea
                placeholder="Your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={2}
                className="w-full rounded-lg border border-secondary-foreground/10 bg-secondary-foreground/5 px-3 py-1.5 text-xs text-secondary-foreground placeholder:text-secondary-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                type="submit"
                size="sm"
                disabled={sending}
                className="w-full gradient-primary text-primary-foreground text-xs gap-1 h-7"
              >
                <Send className="h-3 w-3" />
                Send Message
              </Button>
            </form>
          </div>
        </div>
        <div className="border-t border-secondary-foreground/10 mt-8 pt-6 text-center text-xs text-secondary-foreground/40">
          © {new Date().getFullYear()} BloodLine. All rights reserved. Built with ❤️ to save lives.
        </div>
      </div>
    </footer>
  );
}
