import React, { useEffect, useState } from 'react';
import { 
  X, Receipt, FileText, ArrowRightLeft, User, Building, Home, 
  Calendar, CheckCircle2, AlertTriangle, QrCode, Clock, ShieldCheck 
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatMoney, formatDate, toWesternDigits } from '../../../utils/formatters';

interface TransactionDetailModalProps {
  transactionId: string | null;
  onClose: () => void;
  onViewInvoice?: (invoiceId: string) => void;
  onViewTenant?: (tenantId: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transactionId,
  onClose,
  onViewInvoice,
  onViewTenant,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) return;
    setLoading(true);
    setError(null);
    api.getTransactionDetails(transactionId)
      .then((res: any) => setData(res))
      .catch((err: any) => setError(err.message || 'فشل تحميل بيانات القيد المالي'))
      .finally(() => setLoading(false));
  }, [transactionId]);

  if (!transactionId) return null;

  const getAccountBadge = (type: string) => {
    switch (type) {
      case 'RENT':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold">إيجار عقاري</span>;
      case 'ELECTRICITY':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold">كهرباء وعدادات</span>;
      case 'WATER':
        return <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-md text-xs font-bold">مياه ووايتات</span>;
      case 'DEPOSIT':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-bold">تأمين وضمان</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-bold">{type}</span>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'COLLECTIONS':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold">حركة تحصيل سند قبض</span>;
      case 'RENT_BILLING':
        return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs font-bold">فوترة إيجار دورية</span>;
      case 'ELECTRICITY':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold">فوترة استهلاك كهرباء</span>;
      case 'WATER':
        return <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-md text-xs font-bold">توزيع تكاليف مياه</span>;
      case 'REVERSAL':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-md text-xs font-bold">عكس قيد / إلغاء سند</span>;
      case 'OPENING_BALANCE':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-bold">رصيد افتتاحي مرحل</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-bold">{source}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">بطاقة تفاصيل القيد والحركة المالية</h2>
              <p className="text-xs text-slate-500">
                المعرف المحاسبي: <span className="font-mono font-bold text-slate-700">{transactionId}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">جاري جلب تفاصيل الحركة المالية من قاعدة البيانات...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Financial Movement Hero */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-inner">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">المبلغ المدين (زيادة الذمة)</span>
                  <div className={`text-xl font-bold font-mono ${data.debit > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {formatMoney(data.debit)} <span className="text-xs font-normal">ر.ي</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">المبلغ الدائن (سداد / تسوية)</span>
                  <div className={`text-xl font-bold font-mono ${data.credit > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {formatMoney(data.credit)} <span className="text-xs font-normal">ر.ي</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">الرصيد بعد الحركة</span>
                  <div className="text-xl font-bold font-mono text-cyan-300">
                    {formatMoney(data.balanceAfter)} <span className="text-xs font-normal">ر.ي</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">تاريخ المعاملة</span>
                  <div className="text-sm font-bold flex items-center gap-1.5 text-slate-200 mt-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">{formatDate(data.date)}</span>
                  </div>
                </div>
              </div>

              {/* Main Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Right Card: Movement & Account */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">بيانات القيد المحاسبي</h3>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">المرجع المالي:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{toWesternDigits(data.reference)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">نوع الحساب:</span>
                    <div>{getAccountBadge(data.accountType)}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">مصدر الحركة:</span>
                    <div>{getSourceBadge(data.sourceModule)}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">حالة الترحيل:</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">
                      {data.status === 'POSTED' ? 'مرحّل معتمد' : data.status}
                    </span>
                  </div>
                  <div className="text-sm pt-1">
                    <span className="text-slate-500 block text-xs mb-1">البيان والشرح التفصيلي:</span>
                    <p className="font-medium text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed text-xs">
                      {data.description}
                    </p>
                  </div>
                </div>

                {/* Left Card: Tenant, Property & Unit */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">الطرف المرتبط (المستأجر والوحدة)</h3>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>المستأجر:</span>
                    </span>
                    <span className="font-bold text-slate-900">{data.tenant?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">كود المستأجر / الهاتف:</span>
                    <span className="font-mono text-slate-700 text-xs">{toWesternDigits(data.tenant?.code)} • {toWesternDigits(data.tenant?.phone) || 'لا يوجد'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>العقار:</span>
                    </span>
                    <span className="font-bold text-slate-800">{data.property?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      <span>رقم الوحدة:</span>
                    </span>
                    <span className="font-bold text-slate-800 font-mono">{toWesternDigits(data.unit?.unitNumber) || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>المستخدم المنفذ:</span>
                    </span>
                    <span className="text-slate-700 font-medium text-xs">{data.user?.name}</span>
                  </div>
                </div>
              </div>

              {/* Linked Invoice Info if exists */}
              {data.linkedInvoice && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-700" />
                      <h4 className="text-xs font-bold text-blue-900">الفاتورة المستندية المرتبطة بهذا القيد</h4>
                    </div>
                    {onViewInvoice && data.linkedInvoice.id && (
                      <button 
                        onClick={() => onViewInvoice(data.linkedInvoice.id)}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        عرض الفاتورة الكاملة
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-slate-500 block">رقم الفاتورة:</span>
                      <span className="font-mono font-bold text-slate-900">{toWesternDigits(data.linkedInvoice.invoiceNumber)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-slate-500 block">فترة الاستحقاق:</span>
                      <span className="font-bold text-slate-900">{data.linkedInvoice.periodMonth || 'حالية'}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-slate-500 block">قيمة الفاتورة الإجمالية:</span>
                      <span className="font-mono font-bold text-blue-700">{formatMoney(data.linkedInvoice.totalAmount)} ر.ي</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-slate-500 block">المتبقي على الفاتورة:</span>
                      <span className="font-mono font-bold text-rose-700">{formatMoney(data.linkedInvoice.remainingAmount)} ر.ي</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Payment Receipt Info if exists */}
              {data.linkedPayment && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-emerald-900">سند القبض والتحصيل المرتبط</h4>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">
                      {data.linkedPayment.status === 'COMPLETED' ? 'محصل ومعتمد' : data.linkedPayment.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="bg-white p-2 rounded border border-emerald-100">
                      <span className="text-slate-500 block">رقم السند:</span>
                      <span className="font-mono font-bold text-slate-900">{toWesternDigits(data.linkedPayment.receiptNumber)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-100">
                      <span className="text-slate-500 block">طريقة السداد:</span>
                      <span className="font-bold text-slate-900">
                        {data.linkedPayment.paymentMethod === 'CASH' ? 'نقدي (كاش)' :
                         data.linkedPayment.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                         data.linkedPayment.paymentMethod === 'CHECK' ? 'شيك بنكي' : 'محفظة إلكترونية'}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-100">
                      <span className="text-slate-500 block">المحصل / أمين الصندوق:</span>
                      <span className="font-bold text-slate-900">{data.linkedPayment.collectorName || 'غير محدد'}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-100">
                      <span className="text-slate-500 block">رمز الاستجابة السريعة:</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate block" title={data.linkedPayment.qrCodeContent}>
                        {data.linkedPayment.qrCodeContent ? 'معتمد رسمياً' : 'غير متوفر'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Reversal or Original Movement */}
              {data.linkedTransaction && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-700" />
                    <h4 className="text-xs font-bold text-amber-900">
                      {data.linkedTransaction.type === 'ORIGINAL_TRANSACTION' 
                        ? 'الحركة الأصلية المعكوسة بهذا القيد' 
                        : 'قيد العكس المرتبط بهذه الحركة'}
                    </h4>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 block">{data.linkedTransaction.reference}</span>
                      <span className="text-slate-500">{data.linkedTransaction.description}</span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-slate-400 text-[10px] block">{formatDate(data.linkedTransaction.date)}</span>
                      <span className="font-bold text-slate-800">
                        {data.linkedTransaction.debit > 0 ? `مدين: ${formatMoney(data.linkedTransaction.debit)}` : `دائن: ${formatMoney(data.linkedTransaction.credit)}`} ر.ي
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/80">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>وقت الإنشاء بالنظام: {data?.createdAt || 'غير محدد'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            إغلاق البطاقة
          </button>
        </div>
      </div>
    </div>
  );
};
