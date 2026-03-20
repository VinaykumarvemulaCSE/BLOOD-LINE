import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const donorIcon = new L.DivIcon({
  html: '<div style="background:#6b7280;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3)"></div>',
  className: "",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const hospitalIcon = new L.DivIcon({
  html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3)"></div>',
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const emergencyIcon = new L.DivIcon({
  html: '<div style="background:#e11d48;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(225,29,72,0.5);animation:pulse 2s infinite"></div>',
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function LocationFinder({ onLocation }: { onLocation: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 13);
        onLocation(latitude, longitude);
      },
      () => {
        // Default: Hyderabad
        map.setView([17.385, 78.4867], 13);
        onLocation(17.385, 78.4867);
      }
    );
  }, []);
  return null;
}

interface MapProps {
  className?: string;
}

export default function BloodMap({ className = "" }: MapProps) {
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "blood_requests"), where("status", "==", "open"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  return (
    <div className={`rounded-2xl overflow-hidden border border-border shadow-card ${className}`}>
      <MapContainer
        center={[17.385, 78.4867]}
        zoom={13}
        className="w-full h-[400px] md:h-[500px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationFinder onLocation={(lat, lng) => setUserLoc([lat, lng])} />

        {userLoc && (
          <Marker position={userLoc}>
            <Popup>
              <div className="text-sm font-medium">📍 Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Show emergency requests as red markers with offset positions */}
        {requests.map((req, i) => {
          if (!userLoc) return null;
          // Scatter markers around user location
          const offset = (i + 1) * 0.005;
          const angle = (i * 137.5) * (Math.PI / 180);
          const lat = userLoc[0] + offset * Math.cos(angle);
          const lng = userLoc[1] + offset * Math.sin(angle);
          return (
            <Marker
              key={req.id}
              position={[lat, lng]}
              icon={req.emergency ? emergencyIcon : donorIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{req.bloodGroup} needed</p>
                  <p>{req.units} units • {req.hospitalLocation}</p>
                  {req.emergency && <p className="text-red-500 font-medium">🚨 Emergency</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
