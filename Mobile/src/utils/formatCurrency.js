export const formatCurrency = (amount, currencyCode = 'INR') => {
  if (amount === null || amount === undefined) return '';
  const num = Number(amount);
  if (isNaN(num)) return '';

  const absNum = Math.abs(num);
  let formatted = '';
  let suffix = '';

  if (absNum >= 10000000) {
    formatted = (absNum / 10000000).toFixed(2);
    suffix = 'Cr';
  } else if (absNum >= 100000) {
    formatted = (absNum / 100000).toFixed(2);
    suffix = 'L';
  } else if (absNum >= 1000) {
    formatted = (absNum / 1000).toFixed(2);
    suffix = 'K';
  } else {
    formatted = absNum.toFixed(2);
  }

  // Remove trailing .00 if present
  if (formatted.endsWith('.00')) {
    formatted = formatted.slice(0, -3);
  } else if (formatted.endsWith('0') && formatted.includes('.')) {
    formatted = formatted.slice(0, -1);
  }

  const sign = num < 0 ? '-' : '';

  // Get currency symbol
  let currencySymbol = '₹';
  if (currencyCode === 'USD') currencySymbol = '$';
  else if (currencyCode === 'EUR') currencySymbol = '€';
  else if (currencyCode === 'GBP') currencySymbol = '£';
  else if (currencyCode === 'INR') currencySymbol = '₹';
  else {
    try {
      const parts = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(0);
      currencySymbol = parts.find((p) => p.type === 'currency')?.value || currencyCode;
    } catch {
      currencySymbol = currencyCode;
    }
  }

  return `${sign}${currencySymbol}${formatted}${suffix}`;
};
