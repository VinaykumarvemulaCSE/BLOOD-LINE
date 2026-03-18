import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BLOOD_GROUPS } from "@/lib/bloodCompatibility";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Heart, CheckCircle2, ArrowLeft, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ProfileSetup() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [form, setForm] = useState({
    name: user?.displayName || "",
    phone: "",
    bloodGroup: "O+",
    city: "Hyderabad",
    address: "",
    role: "donor" as UserRole,
    age: 25,
    weight: 65,
    healthConfirmed: false,
    lastDonationDate: "",
  });

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("preview");
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile({
        uid: user.uid,
        name: form.name,
        email: user.email || "",
        phone: form.phone,
        bloodGroup: form.bloodGroup,
        city: form.city,
        address: form.address,
        role: form.role,
        age: form.age,
        weight: form.weight,
        healthConfirmed: form.healthConfirmed,
        lastDonationDate: form.lastDonationDate || null,
        donorAvailability: form.role === "donor",
        reputationScore: 50,
        profileCompleted: true,
        createdAt: new Date().toISOString(),
      });

      // Register hospital in the hospitals collection for the dropdown
      if (form.role === "hospital") {
        await setDoc(doc(db, "hospitals", user.uid), {
          uid: user.uid,
          name: form.name,
          city: form.city,
          address: form.address,
          phone: form.phone,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success("Profile completed! Welcome to BloodLine.");
      navigate(`/dashboard/${form.role}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const previewFields = [
    { label: "Full Name", value: form.name },
    { label: "Email", value: user?.email || "" },
    { label: "Phone", value: form.phone },
    { label: "Blood Group", value: form.bloodGroup },
    { label: "City", value: form.city },
    { label: "Address", value: form.address },
    { label: "Role", value: form.role },
    ...(form.role === "donor" ? [
      { label: "Age", value: String(form.age) },
      { label: "Weight", value: `${form.weight} kg` },
      { label: "Health Confirmed", value: form.healthConfirmed ? "Yes ✅" : "No ❌" },
      { label: "Last Donation", value: form.lastDonationDate || "Not specified" },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-8">
                <Heart className="h-10 w-10 mx-auto text-primary fill-primary/20 mb-3" />
                <h1 className="text-2xl font-display font-bold text-foreground">Complete Your Profile</h1>
                <p className="text-muted-foreground text-sm mt-1">Help us personalize your BloodLine experience</p>
              </div>

              <form onSubmit={handlePreview} className="bg-card rounded-2xl shadow-card border border-border p-6 space-y-5">
                {/* Role selection */}
                <div>
                  <Label className="text-sm font-semibold">I am a</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {(["donor", "receiver", "hospital", "admin"] as UserRole[]).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => set("role", r)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all capitalize ${
                          form.role === r
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} required className="mt-1" placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <select
                      id="bloodGroup"
                      value={form.bloodGroup}
                      onChange={(e) => set("bloodGroup", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} required className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Full Address</Label>
                  <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} required className="mt-1" />
                </div>

                {form.role === "donor" && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="age">Age</Label>
                        <Input id="age" type="number" value={form.age} onChange={(e) => set("age", +e.target.value)} min={18} max={65} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input id="weight" type="number" value={form.weight} onChange={(e) => set("weight", +e.target.value)} min={45} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="lastDonation">Last Donation Date (optional)</Label>
                      <Input id="lastDonation" type="date" value={form.lastDonationDate} onChange={(e) => set("lastDonationDate", e.target.value)} className="mt-1" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.healthConfirmed}
                        onChange={(e) => set("healthConfirmed", e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        I confirm that I am in good health and eligible to donate blood
                      </span>
                    </label>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground shadow-primary gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview & Confirm
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-8">
                <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-3" />
                <h1 className="text-2xl font-display font-bold text-foreground">Confirm Your Details</h1>
                <p className="text-muted-foreground text-sm mt-1">Review your profile before submitting</p>
              </div>

              <div className="bg-card rounded-2xl shadow-card border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {form.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground">{form.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary text-xs">{form.bloodGroup}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{form.role}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previewFields.map((f) => (
                    <div key={f.label} className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <span className="text-sm font-medium text-foreground capitalize">{f.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setStep("form")}
                    className="flex-1 gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Edit Details
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 gradient-primary text-primary-foreground shadow-primary gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {loading ? "Saving..." : "Confirm & Submit"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
