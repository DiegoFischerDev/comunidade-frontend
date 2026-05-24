import { RafacallCheckoutView } from '@/components/rafacall/RafacallCheckoutView';
import { fetchRafacallAmounts } from '@/lib/rafacall-checkout';

export default async function RafacallCheckoutPage() {
  const initialAmounts = await fetchRafacallAmounts();
  return <RafacallCheckoutView initialAmounts={initialAmounts} />;
}
