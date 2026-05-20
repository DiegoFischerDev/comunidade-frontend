import { MembershipCheckoutView } from '@/components/membership/MembershipCheckoutView';
import { fetchMembershipAmounts } from '@/lib/membership-checkout';

export default async function MembershipCheckoutPage() {
  const initialAmounts = await fetchMembershipAmounts();
  return <MembershipCheckoutView initialAmounts={initialAmounts} />;
}
