import { AuthGate } from "@/components/auth-gate";
import { HomeApp } from "@/components/home-app";

export default function HittingPage() {
  return (
    <AuthGate>
      <HomeApp initialScreen="lesson" />
    </AuthGate>
  );
}
