/** Utilizador com anuidade ativa ou admin. */
export function isActiveMember(
  user:
    | {
        role?: string;
        tier?: string;
        membershipExpiresAt?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.tier !== 'MEMBER') return false;
  if (!user.membershipExpiresAt) return false;
  return new Date(user.membershipExpiresAt) > new Date();
}
