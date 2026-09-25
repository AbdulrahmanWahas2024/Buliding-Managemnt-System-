export const formatMoney = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num);
};

export const formatNumber = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  return new Intl.NumberFormat('en-US').format(num);
};
