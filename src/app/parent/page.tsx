import { AuthGate } from "@/components/auth-gate";
import { ParentApp } from "@/components/parent-app";

export default function ParentPage() {
  return (
    <AuthGate showAccountBar>
      <ParentApp />
    </AuthGate>
  );
}
