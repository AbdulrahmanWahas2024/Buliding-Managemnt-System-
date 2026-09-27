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

export const tafqeetNumber = (amount: number | string, currency = 'ريال يمني'): string => {
  const num = Math.floor(Math.abs(Number(amount || 0)));
  if (num === 0) return `صفر ${currency} فقط لا غير`;

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
    'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const parts: string[] = [];

    if (h > 0) parts.push(hundreds[h]);

    if (rem > 0) {
      if (rem < 20) {
        parts.push(ones[rem]);
      } else {
        const o = rem % 10;
        const t = Math.floor(rem / 10);
        if (o > 0) {
          parts.push(`${ones[o]} و${tens[t]}`);
        } else {
          parts.push(tens[t]);
        }
      }
    }

    return parts.join(' و');
  }

  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  const resParts: string[] = [];

  if (billions > 0) {
    if (billions === 1) resParts.push('مليار');
    else if (billions === 2) resParts.push('ملياران');
    else if (billions <= 10) resParts.push(`${convertGroup(billions)} مليارات`);
    else resParts.push(`${convertGroup(billions)} مليار`);
  }

  if (millions > 0) {
    if (millions === 1) resParts.push('مليون');
    else if (millions === 2) resParts.push('مليونان');
    else if (millions <= 10) resParts.push(`${convertGroup(millions)} ملايين`);
    else resParts.push(`${convertGroup(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) resParts.push('ألف');
    else if (thousands === 2) resParts.push('ألفان');
    else if (thousands <= 10) resParts.push(`${convertGroup(thousands)} آلاف`);
    else resParts.push(`${convertGroup(thousands)} ألف`);
  }

  if (remainder > 0) {
    resParts.push(convertGroup(remainder));
  }

  return `فقط ${resParts.join(' و')} ${currency} لا غير`;
};
