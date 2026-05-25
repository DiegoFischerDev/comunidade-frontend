import { redirect } from 'next/navigation';

export default function LegacyPartnerCommissionsRedirectPage() {
  redirect('/dashboard/business');
}

