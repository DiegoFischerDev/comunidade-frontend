import { redirect } from 'next/navigation';

/** O conteúdo de perfil foi integrado no dashboard principal. */
export default function ProfileRedirectPage() {
  redirect('/dashboard');
}
