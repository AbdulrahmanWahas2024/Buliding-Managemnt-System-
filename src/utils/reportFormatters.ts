/**
 * Smart Property ERP - Centralized Report Formatters & Arabic Translation Map
 * 
 * IMPORTANT ARCHITECTURE RULE:
 * Preserves all underlying database and API enum values unmodified (e.g. 'ASSET', 'POSTED', 'CASH').
 * Translates them strictly at the presentation and export layer to clear, professional Arabic.
 */

export const REPORT_LABELS = {
  accountNature: {
    DEBIT: 'مدين',
    CREDIT: 'دائن',
    ASSET: 'أصل',
    LIABILITY: 'التزام',
    EQUITY: 'حقوق الملكية',
    REVENUE: 'إيراد',
    EXPENSE: 'مصروف',
  } as Record<string, string>,

  accountType: {
    RENT: 'إيجارات دورية',
    ELECTRICITY: 'استهلاك وخدمات كهرباء',
    WATER: 'استهلاك وتوزيع مياه',
    EXPENSE: 'مصروفات تشغيلية',
    DEPOSIT: 'تأمينات وضمانات محتجزة',
    SERVICES: 'خدمات مشتركة وصيانة',
    ASSET: 'أصول',
    LIABILITY: 'التزامات',
    EQUITY: 'حقوق الملكية',
    REVENUE: 'إيرادات',
    MANUAL: 'قيد محاسبي يدوي',
  } as Record<string, string>,

  status: {
    ACTIVE: 'نشط',
    INACTIVE: 'غير نشط',
    OCCUPIED: 'مشغولة',
    VACANT: 'شاغرة',
    MAINTENANCE: 'تحت الصيانة',
    UNDER_MAINTENANCE: 'تحت الصيانة',
    RESERVED: 'محجوزة',
    DRAFT: 'مسودة',
    APPROVED: 'معتمد',
    POSTED: 'مرحل دفترياً',
    CANCELLED: 'ملغى',
    REVERSED: 'معكوس',
    PENDING: 'قيد الانتظار',
    PENDING_APPROVAL: 'قيد الاعتماد',
    COMPLETED: 'مكتمل',
    IN_PROGRESS: 'قيد التنفيذ',
    NEW: 'جديد',
    REVIEW: 'قيد التدقيق',
    PAID: 'مسددة بالكامل',
    PARTIAL: 'مسددة جزئياً',
    UNPAID: 'غير مسددة',
    OVERDUE: 'متأخرة السداد',
    BILLED: 'مفوتر',
    UNBILLED: 'غير مفوتر',
    INVOICED: 'مفوتر',
    CLOSED: 'مغلق',
    EXPIRED: 'منتهي',
    RENEWED: 'مجدد',
    SOLE: 'ملكية فردية',
    PARTNERSHIP: 'شراكة',
    WAQF: 'وقف',
    GOVERNMENT: 'حكومي',
  } as Record<string, string>,

  propertyType: {
    RESIDENTIAL: 'سكني',
    COMMERCIAL: 'تجاري',
    MIXED: 'مختلط (سكني وتجاري)',
    MARKET_COMPLEX: 'مجمع تجاري وبسطات',
    TOWER: 'برج استثماري',
  } as Record<string, string>,

  unitType: {
    APARTMENT: 'شقة سكنية',
    SHOP: 'محل تجاري',
    OFFICE: 'مكتب إداري',
    STALL: 'بسطة / كشك سوق',
    MARKET_STALL: 'بسطة سوق',
    WAREHOUSE: 'مستودع / مخزن',
    KIOSK: 'كشك تجاري',
    TEMPORARY: 'مؤقت',
  } as Record<string, string>,

  tenantType: {
    INDIVIDUAL: 'فردي',
    CORPORATE: 'شركة / تجاري',
    GOVERNMENT: 'جهة حكومية',
  } as Record<string, string>,

  paymentMethod: {
    CASH: 'نقدي (كاش)',
    BANK: 'بنكي',
    BANK_TRANSFER: 'تحويل بنكي',
    CHEQUE: 'شيك مصرفي',
    CHECK: 'شيك مصرفي',
    CARD: 'بطاقة إلكترونية',
    CREDIT_CARD: 'بطاقة دفع',
    OTHER: 'أخرى',
  } as Record<string, string>,

  transactionType: {
    INVOICE: 'فاتورة استحقاق',
    RECEIPT: 'سند تحصيل',
    EXPENSE: 'سند صرف مصروف',
    REVERSAL: 'عكس قيد محاسبي',
    ADJUSTMENT: 'تسوية محاسبية',
    MANUAL: 'قيد يدوي',
  } as Record<string, string>,

  priority: {
    LOW: 'منخفض',
    MEDIUM: 'متوسط',
    HIGH: 'مرتفع',
    URGENT: 'عاجل وطارئ',
  } as Record<string, string>,

  sourceModule: {
    MANUAL: 'قيد يدوي',
    EXPENSES: 'المصروفات',
    COLLECTIONS: 'التحصيل',
    RENT: 'الإيجارات',
    BILLING: 'فواتير الإيجار',
    WATER: 'تكاليف المياه',
    ELECTRICITY: 'فواتير الكهرباء',
    REVERSAL: 'عكس قيود',
  } as Record<string, string>,
};

/**
 * Translates account nature to Arabic (e.g. DEBIT -> مدين, CREDIT -> دائن, ASSET -> أصل).
 */
export const formatAccountNature = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.accountNature[key] ?? val;
};

/**
 * Translates account type to Arabic (e.g. RENT -> إيجارات دورية, EXPENSE -> مصروفات تشغيلية).
 */
export const formatAccountType = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.accountType[key] ?? REPORT_LABELS.accountNature[key] ?? val;
};

/**
 * Translates any general status to Arabic (e.g. ACTIVE -> نشط, POSTED -> مرحل دفترياً).
 */
export const formatReportStatus = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.status[key] ?? val;
};

/**
 * Translates property type to Arabic (e.g. COMMERCIAL -> تجاري, MIXED -> مختلط).
 */
export const formatPropertyType = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.propertyType[key] ?? val;
};

/**
 * Translates unit type to Arabic (e.g. SHOP -> محل تجاري, APARTMENT -> شقة سكنية).
 */
export const formatUnitType = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.unitType[key] ?? val;
};

/**
 * Translates tenant type to Arabic (e.g. INDIVIDUAL -> فردي).
 */
export const formatTenantType = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.tenantType[key] ?? val;
};

/**
 * Translates payment method to Arabic (e.g. CASH -> نقدي (كاش), BANK_TRANSFER -> تحويل بنكي).
 */
export const formatPaymentMethod = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.paymentMethod[key] ?? val;
};

/**
 * Translates transaction type / source module to Arabic.
 */
export const formatTransactionType = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.transactionType[key] ?? REPORT_LABELS.sourceModule[key] ?? val;
};

/**
 * Translates maintenance priority to Arabic (e.g. HIGH -> مرتفع, URGENT -> عاجل وطارئ).
 */
export const formatPriority = (val: string | undefined | null): string => {
  if (!val) return '-';
  const key = String(val).trim().toUpperCase();
  return REPORT_LABELS.priority[key] ?? val;
};

export const formatContractStatus = formatReportStatus;
export const formatExpenseStatus = formatReportStatus;
export const formatMaintenanceStatus = formatReportStatus;

/**
 * Returns consistent status badge styling classes based on semantic status.
 */
export const getStatusBadgeStyle = (status: string | undefined | null): { bg: string; text: string; border: string } => {
  if (!status) return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  const s = String(status).toUpperCase();

  if (['ACTIVE', 'POSTED', 'PAID', 'COMPLETED', 'BILLED'].includes(s)) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  }
  if (['OCCUPIED', 'APPROVED'].includes(s)) {
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  }
  if (['VACANT', 'NEW', 'REVIEW', 'DRAFT', 'UNBILLED', 'PENDING', 'PENDING_APPROVAL'].includes(s)) {
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  }
  if (['MAINTENANCE', 'UNDER_MAINTENANCE', 'IN_PROGRESS', 'PARTIAL'].includes(s)) {
    return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
  }
  if (['CANCELLED', 'REVERSED', 'UNPAID', 'EXPIRED', 'OVERDUE'].includes(s)) {
    return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
  }

  return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
};
