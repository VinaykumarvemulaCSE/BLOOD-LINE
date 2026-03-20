# 🩸 Blood-Line: Real-Time Blood Donation Platform

**Blood-Line** is a modern, full-stack, role-based platform designed to bridge the gap between blood donors, receivers, and hospitals in real-time. By streamlining emergency requests, verifying donations, and tracking hospital inventories, Blood-Line saves lives through immediate connectivity and transparency.

## 🌟 Key Features

### 👤 Role-Based Architecture
The platform intelligently adapts its interface and capabilities based on four distinct user roles:
- **Donors:** Can view their eligibility status, access active blood requests matching their blood type, and track their donation history/reputation score.
- **Receivers:** Can create new blood requests, manage their current needs, and trigger an **Emergency SOS** for immediate broadcasts.
- **Hospitals:** Manage internal blood inventories (stock tracking), verify completed donations for medical compliance, and monitor regional requests.
- **Admins:** Oversee the entire ecosystem with a comprehensive dashboard displaying total users, active requests, verified donations, and registered hospitals.

### ⚡ Real-Time Emergency SOS
Receivers can trigger an instant, system-wide SOS alert. This immediately curates an emergency broadcast localized by city, optimizing response times during critical situations.

### 🔒 Secure & Verified Workflows
To maintain the safety and integrity of the donation pipeline, Blood-Line separates the "donation pledge" from the "verified donation". Donors can mark requests as accepted, but their statistics and 90-day cooldown timers are intelligently updated *only after* a registered Hospital cryptographically signs off on the donation in the system.

---

## 📸 Platform Highlights

### The Donor Dashboard
*Donors see a clean UI displaying their real-time eligibility status, active requests from compatible receivers, and their community reputation score.*

### The Receiver Dashboard
*Receivers can initiate structured blood requests specifying blood groups and locations, and track responses in real-time.*

### The Hospital Dashboard
*Hospitals manage exact units of available blood types in their inventory and have the authority to efficiently verify physical donations.*

### The Admin Analytics
*Administrators have a bird's-eye view over all platform analytics, workflows, and user management.*

---

## 💻 Tech Stack

- **Frontend:** React + Vite, TypeScript 
- **Styling:** Tailwind CSS, Shadcn UI, Framer Motion (for fluid micro-animations)
- **Backend & Database:** Firebase Authentication (Email/Password & Google SSO), Cloud Firestore (NoSQL, Real-time Listeners)
- **Routing:** React Router v6
- **State Management:** React Context API & TanStack Query
- **Icons & Tooling:** Lucide React, Sonner (Toasts)

---

## 🛠️ Local Development

To run this project locally, simply clone the repository and run the following commands in your terminal:

```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

*Note: You will need to set up your own Firebase project and provide your `firebaseConfig` within `src/lib/firebase.ts` to connect to the backend services.*

---

## 🚀 Deployment (Vercel)

Deploying Blood-Line to Vercel is seamless since the frontend relies entirely on static hosting and client-side rendering connecting to Firebase.

1. Push your code to your GitHub repository.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Vercel will auto-detect the Vite framework. 
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**.

Within minutes, your life-saving platform will be live and accessible globally!
