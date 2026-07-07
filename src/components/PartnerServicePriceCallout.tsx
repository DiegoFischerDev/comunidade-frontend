type Props = {
  price: string | null;
  priceOnRequest: boolean;
};

export function PartnerServicePriceCallout({ price, priceOnRequest }: Props) {
  const sentence = priceOnRequest
    ? 'Valor do serviço sob consulta.'
    : price
      ? `Valor do serviço ${price} €.`
      : 'Valor do serviço não informado.';

  return (
    <div className="mt-2 rounded-lg bg-page px-3 py-2 text-xs text-foreground/90">
      <p>{sentence}</p>
    </div>
  );
}
