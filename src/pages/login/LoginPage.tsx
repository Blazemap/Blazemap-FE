import { useSearchParams } from "react-router-dom";
import { AuthForm } from "@/components/auth";

export default function LoginPage() {
  const [params] = useSearchParams();
  const portal = params.get("portal") === "government" ? "government" : "citizen";
  return <AuthForm key={`${portal}:${params.toString()}`} mode="login" portal={portal} />;
}
