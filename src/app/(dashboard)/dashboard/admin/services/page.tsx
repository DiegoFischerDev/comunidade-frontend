import { redirect } from 'next/navigation';

export default function LegacyAdminServicesRedirectPage() {
  redirect('/dashboard/admin/commissions');
}

