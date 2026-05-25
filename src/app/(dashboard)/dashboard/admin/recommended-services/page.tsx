import { redirect } from "next/navigation";

export default function LegacyAdminRecommendedServicesRedirect() {
  redirect("/servicos");
}
