import { redirect } from 'next/navigation';
import { DASHBOARD_HOME_PATH } from '@/lib/dashboard-home';

export default function LegacyServicosRedirectPage() {
  redirect(DASHBOARD_HOME_PATH);
}
