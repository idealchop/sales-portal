export const phpCurrency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPhp(amount: number): string {
  return phpCurrency.format(amount);
}
