import type { ReactNode } from "react";
import { type UserProfile } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Droplets, MapPin, Phone, ShieldCheck, Scale } from "lucide-react";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{value ?? "—"}</p>
    </div>
  );
}

export default function ProfileDetails({
  profile,
  onEdit,
}: {
  profile: UserProfile;
  onEdit: () => void;
}) {
  const lastDonation =
    profile.lastDonationDate && profile.lastDonationDate !== ""
      ? new Date(profile.lastDonationDate).toLocaleDateString()
      : "—";

  return (
    <div className="bg-card rounded-2xl p-5 mb-6 shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              {profile.name} • {profile.role}
            </span>
            <Badge variant="secondary" className="text-xs capitalize">
              {profile.bloodGroup}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {profile.phone || "—"} • {profile.city || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Email" value={profile.email} />
        <Field label="Phone" value={profile.phone} />
        <Field label="City" value={profile.city} />
        <Field label="Address" value={profile.address} />

        {profile.role === "donor" && (
          <>
            <Field label="Age" value={profile.age ? `${profile.age} years` : "—"} />
            <Field label="Weight" value={profile.weight ? `${profile.weight} kg` : "—"} />
            <Field label="Health Confirmed" value={profile.healthConfirmed ? "Yes" : "No"} />
            <Field label="Last Donation" value={lastDonation} />
            <Field label="Availability" value={profile.donorAvailability ? "Available" : "Not available"} />
            <Field
              label="Reputation Score"
              value={typeof profile.reputationScore === "number" ? profile.reputationScore : "—"}
            />
          </>
        )}

        {profile.role === "receiver" && (
          <>
            <Field label="Age" value={profile.age ? `${profile.age} years` : "—"} />
            <Field label="Weight" value={profile.weight ? `${profile.weight} kg` : "—"} />
            <Field label="Blood Group" value={profile.bloodGroup} />
            <Field label="Health Verified" value={profile.healthConfirmed ? "Yes" : "No"} />
          </>
        )}

        {profile.role === "hospital" && (
          <>
            <Field label="Blood Group" value={profile.bloodGroup} />
            <Field label="Hospital Verified" value={profile.healthConfirmed ? "Yes" : "No"} />
          </>
        )}

        {profile.role === "admin" && (
          <>
            <Field label="Admin Access" value="Enabled" />
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/70 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
          <Droplets className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <p className="text-xs">Blood Group</p>
            <p className="text-sm font-semibold text-foreground truncate">{profile.bloodGroup}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
          <MapPin className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <p className="text-xs">Location</p>
            <p className="text-sm font-semibold text-foreground truncate">{profile.city || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
          <Phone className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <p className="text-xs">Contact</p>
            <p className="text-sm font-semibold text-foreground truncate">{profile.phone || "—"}</p>
          </div>
        </div>
        {profile.role === "donor" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
            <Calendar className="h-4 w-4 text-primary" />
            <div className="min-w-0">
              <p className="text-xs">Last Donation</p>
              <p className="text-sm font-semibold text-foreground truncate">{lastDonation}</p>
            </div>
          </div>
        )}
      </div>

      {profile.role === "donor" && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          <Scale className="h-4 w-4 text-primary" />
          <span>
            Eligibility: {profile.lastDonationDate ? "Based on last donation date" : "Set last donation date"}
          </span>
        </div>
      )}

      {profile.healthConfirmed !== undefined && profile.role !== "admin" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>{profile.healthConfirmed ? "Health confirmed" : "Health not confirmed"}</span>
        </div>
      )}
    </div>
  );
}

