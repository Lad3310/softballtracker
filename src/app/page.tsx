import { AuthGate } from "@/components/auth-gate";
import { HomeApp } from "@/components/home-app";

export default function Home() {
  return (
    <AuthGate>
      <HomeApp />
    </AuthGate>
  );
}
