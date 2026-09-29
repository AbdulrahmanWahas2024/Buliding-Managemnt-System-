import React from 'react';
import { 
  X, DollarSign, Calendar, Building, Home, User, Wallet, FileText, 
  CheckCircle2, Clock, AlertTriangle, Printer, RotateCcw, XCircle, ArrowRightLeft, ShieldCheck,
  BookOpenCheck
} from 'lucide-react';
import { Expense } from '../../../types/erp';
import { formatMoney, formatDate, tafqeetNumber, toWesternDigits } from '../../../utils/formatters';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onPost: (expense: Expense) => void;
  onViewLedger?: (ledgerId: string) => void;
  onCancelPrompt: (expense: Expense) => void;
  onReversePrompt: (expense: Expense) => void;
  onPrint: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onViewMaintenance?: (maintenanceId: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  expense,
  onClose,
  onApprove,
  onPost,
  onViewLedger,
  onCancelPrompt,
  onReversePrompt,
  onPrint,
  onEdit,
  onViewMaintenance,
}) => {
  if (!isOpen || !expense) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">مرحل دفترياً ومغلق</span>;
      case 'APPROVED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">معتمد للصرف</span>;
      case 'REVERSED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">معكوس القيد دفترياً</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">ملغى</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">مسودة غير مرحلة</span>;
    }
  };

  const getPaymentMethodLabel = (m: string) => {
    switch (m) {
      case 'CASH':
      case 'CASH_BOX':
        return 'نقداً من الصندوق';
      case 'BANK_TRANSFER':
        return 'تحويل بنكي';
      case 'CHECK':
        return 'شيك مصرفي';
      default:
        return m;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">سند صرف مصروف: {toWesternDigits(expense.expenseNumber)}</h3>
                {getStatusBadge(expense.status)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تاريخ السند: {formatDate(expense.expenseDate)} • مسجل السند: {expense.createdBy || 'المشرف'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint(expense)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة السند</span>
            </button>
            {expense.status === 'DRAFT' && (
              <button
                onClick={() => onEdit(expense)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                تعديل
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Amount Showcase Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block">إجمالي مبلغ المصروف:</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                {formatMoney(expense.amount)} <span className="text-sm font-bold text-slate-600">ريال يمني</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-semibold">
                فقط {tafqeetNumber(expense.amount)} لا غير
              </p>
            </div>

            <div className="sm:text-left border-t sm:border-t-0 sm:border-r border-slate-200 pt-2 sm:pt-0 sm:pr-4">
              <span className="text-[11px] text-slate-500 block">التصنيف المحاسبي:</span>
              <span className="font-bold text-slate-800 text-sm block mt-0.5">{expense.categoryName}</span>
              <span className="font-mono text-[11px] text-slate-500 block">حساب: {toWesternDigits(expense.accountCode || '5101')}</span>
            </div>
          </div>

          {/* Posting Details / Status Ribbon */}
          {expense.status === 'POSTED' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  تم الترحيل المالي لدفتر الأستاذ العام بواسطة: <strong>{expense.postedBy}</strong> بتاريخ {formatDate(expense.postedAt)}
                </span>
              </div>
              {expense.ledgerId && (
                <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  قيد رقم: {toWesternDigits(expense.ledgerId)}
                </span>
              )}
            </div>
          )}

          {expense.status === 'REVERSED' && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تم عكس قيد هذا المصروف دفترياً بواسطة: {expense.reversedBy} بتاريخ {formatDate(expense.reversedAt)}</span>
              </div>
              {expense.reversalReason && (
                <p className="text-[11px] text-amber-800">سبب العكس الدفتري: {expense.reversalReason}</p>
              )}
            </div>
          )}

          {expense.status === 'CANCELLED' && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>تم إلغاء هذا المصروف بواسطة: {expense.cancelledBy} بتاريخ {formatDate(expense.cancelledAt)}</span>
              </div>
              {expense.cancellationReason && (
                <p className="text-[11px] text-rose-800">سبب الإلغاء: {expense.cancellationReason}</p>
              )}
            </div>
          )}

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1">
                تفاصيل السداد والصرف:
              </span>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">طريقة الصرف:</span>
                <span className="font-bold text-slate-800">{getPaymentMethodLabel(expense.paymentMethod)}</span>
              </div>
              {expense.cashBoxName && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">الصندوق النقدي:</span>
                  <span className="font-bold text-slate-800">{expense.cashBoxName}</span>
                </div>
              )}
              {expense.bankName && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">اسم البنك:</span>
                  <span className="text-slate-800">{expense.bankName}</span>
                </div>
              )}
              {expense.checkNumber && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">رقم الشيك:</span>
                  <span className="font-mono text-slate-800">{toWesternDigits(expense.checkNumber)}</span>
                </div>
              )}
              {expense.transferReference && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">مرجع الحوالة:</span>
                  <span className="font-mono text-slate-800">{toWesternDigits(expense.transferReference)}</span>
                </div>
              )}
            </div>

            {/* Location & Entity Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1">
                الارتباط والجهة المستفيدة:
              </span>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">العقار / المركز:</span>
                <span className="font-bold text-slate-800">{expense.propertyName || 'مصروف عام'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">المبنى / الجناح:</span>
                <span className="text-slate-800">{expense.buildingName || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">الوحدة:</span>
                <span className="font-bold text-amber-700">
                  {expense.unitNumber ? `وحدة ${toWesternDigits(expense.unitNumber)}` : 'مشترك / كامل العقار'}
                </span>
              </div>
              {expense.vendorName && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">المورد / الفني المستلم:</span>
                  <span className="font-bold text-slate-800">{expense.vendorName}</span>
                </div>
              )}
              {expense.maintenanceId && (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">مرتبط بطلب صيانة:</span>
                  <button
                    type="button"
                    onClick={() => onViewMaintenance && onViewMaintenance(expense.maintenanceId!)}
                    className="font-mono text-blue-600 hover:underline font-bold"
                  >
                    عرض الصيانة المرتبطة ←
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700 text-xs block mb-1">البيان والشرح المحاسبي:</span>
            <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
              {expense.description}
            </p>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
              <span className="font-bold text-amber-900 text-xs block mb-1">ملاحظات داخلية:</span>
              <p className="text-slate-700">{expense.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {expense.attachments && expense.attachments.length > 0 && (
            <div>
              <span className="font-bold text-slate-800 text-xs block mb-2">المرفقات والفواتير المؤيدة:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {expense.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-slate-700 truncate"
                  >
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate text-[11px]">مستند مؤيد {toWesternDigits(idx + 1)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {expense.status === 'DRAFT' && (
              <button
                onClick={() => onApprove(expense.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد المصروف</span>
              </button>
            )}

            {expense.status === 'APPROVED' && (
              <button
                onClick={() => onPost(expense)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>ترحيل مالي لدفتر الأستاذ العام</span>
              </button>
            )}

            {expense.status === 'POSTED' && (
              <>
                {onViewLedger && (
                  <button
                    onClick={() => onViewLedger(expense.ledgerId || `ledg-exp-${expense.id}`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                  >
                    <BookOpenCheck className="w-4 h-4" />
                    <span>عرض القيد بدفتر الأستاذ</span>
                  </button>
                )}
                <button
                  onClick={() => onPrint(expense)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة سند الصرف</span>
                </button>
                <button
                  onClick={() => onReversePrompt(expense)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>عكس القيد دفترياً</span>
                </button>
              </>
            )}

            {(expense.status === 'DRAFT' || expense.status === 'APPROVED') && (
              <button
                onClick={() => onCancelPrompt(expense)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold cursor-pointer"
              >
                إلغاء المصروف
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
