import { AuthGate } from "@/components/auth-gate";
import { HomeApp } from "@/components/home-app";

export default function PitchingPage() {
  return (
    <AuthGate>
      <HomeApp initialScreen="pitching" />
    </AuthGate>
  );
}
