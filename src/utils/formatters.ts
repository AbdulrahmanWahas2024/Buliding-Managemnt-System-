// Western Latin digits number formatters (strictly 0-9)
const latinNumberFormatter = new Intl.NumberFormat('en-US', {
  numberingSystem: 'latn',
  useGrouping: true,
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const latinDecimalsFormatter = new Intl.NumberFormat('en-US', {
  numberingSystem: 'latn',
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converts any Arabic-Indic (٠-٩) or Eastern Arabic-Indic (۰-۹) digits to Western digits (0-9).
 * Also normalizes Arabic decimal separator (٫) to '.' and thousands separator (٬) to ','.
 */
export const toWesternDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
};

export const toLatinDigits = toWesternDigits;

/**
 * Formats a number using Western digits (0-9).
 * e.g., formatNumber(125500) => "125,500"
 * e.g., formatNumber(1001, undefined, false) => "1001"
 */
export const formatNumber = (
  val: number | string | undefined | null,
  decimals?: number,
  useGrouping = true
): string => {
  if (val === undefined || val === null || val === '') return '0';
  const cleanStr = toWesternDigits(val).replace(/,/g, '');
  const num = Number(cleanStr);
  if (isNaN(num)) return toWesternDigits(String(val));

  if (decimals !== undefined) {
    return new Intl.NumberFormat('en-US', {
      numberingSystem: 'latn',
      useGrouping,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }

  if (!useGrouping) {
    return String(num);
  }

  return latinNumberFormatter.format(num);
};

/**
 * Formats monetary amounts using Western digits (0-9).
 * Defaults to 2 decimals for accounting standard precision.
 * e.g. formatMoney(125500) => "125,500.00"
 * e.g. formatMoney(125500, false) => "125,500"
 */
export const formatMoney = (
  val: number | string | undefined | null,
  forceDecimals = true
): string => {
  if (val === undefined || val === null || val === '') return forceDecimals ? '0.00' : '0';
  const cleanStr = toWesternDigits(val).replace(/,/g, '');
  const num = Number(cleanStr);
  if (isNaN(num)) return forceDecimals ? '0.00' : '0';

  if (forceDecimals) {
    return latinDecimalsFormatter.format(num);
  }

  if (num % 1 !== 0) {
    return latinDecimalsFormatter.format(num);
  }

  return latinNumberFormatter.format(num);
};

/**
 * Formats currency amount using Western digits and Arabic currency symbol.
 * e.g. formatCurrency(125500) => "125,500.00 ر.ي"
 */
export const formatCurrency = (
  val: number | string | undefined | null,
  currency = 'ر.ي',
  forceDecimals = true
): string => {
  const formatted = formatMoney(val, forceDecimals);
  return `${formatted} ${currency}`;
};

/**
 * Formats dates strictly as DD/MM/YYYY using Western digits (0-9).
 * e.g. formatDate("2026-09-27") => "27/09/2026"
 */
export const formatDate = (
  val: string | Date | undefined | null,
  separator: '/' | '-' = '/'
): string => {
  if (!val) return '-';
  const cleanVal = typeof val === 'string' ? toWesternDigits(val).trim() : val;
  if (!cleanVal) return '-';

  try {
    // If it matches YYYY-MM-DD
    if (typeof cleanVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cleanVal)) {
      const parts = cleanVal.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}${separator}${month.padStart(2, '0')}${separator}${year}`;
      }
    }

    // If it's already DD/MM/YYYY
    if (typeof cleanVal === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(cleanVal)) {
      return separator === '/' ? cleanVal : cleanVal.replace(/\//g, separator);
    }

    const d = typeof cleanVal === 'string' ? new Date(cleanVal) : cleanVal;
    if (isNaN(d.getTime())) {
      return toWesternDigits(String(cleanVal));
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${separator}${month}${separator}${year}`;
  } catch {
    return toWesternDigits(String(cleanVal));
  }
};

/**
 * Formats time using Western digits (0-9).
 * e.g. "01:28:45 PM"
 */
export const formatTime = (val?: Date | string | null): string => {
  const d = !val ? new Date() : (typeof val === 'string' ? new Date(toWesternDigits(val)) : val);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-US', {
    numberingSystem: 'latn',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Formats full timestamp using Western digits.
 * e.g. "27/09/2026 01:28 PM"
 */
export const formatDateTime = (val?: Date | string | null): string => {
  if (!val) return '-';
  const dateStr = formatDate(val);
  const timeStr = formatTime(val);
  if (dateStr === '-' || timeStr === '-') return dateStr;
  return `${dateStr} ${timeStr}`;
};

export const tafqeetNumber = (amount: number | string, currency = 'ريال يمني'): string => {
  const num = Math.floor(Math.abs(Number(toWesternDigits(amount) || 0)));
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
