import { redirect } from 'next/navigation';
import { DASHBOARD_HOME_PATH } from '@/lib/dashboard-home';

/** O conteúdo de perfil foi integrado no dashboard principal. */
export default function ProfileRedirectPage() {
  redirect(DASHBOARD_HOME_PATH);
}
