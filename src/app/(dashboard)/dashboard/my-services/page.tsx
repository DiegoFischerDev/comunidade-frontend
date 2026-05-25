import { redirect } from "next/navigation";

export default function LegacyMyServicesRedirect() {
  redirect("/dashboard/business");
}
