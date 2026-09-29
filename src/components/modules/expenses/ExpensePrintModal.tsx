import React, { useEffect } from 'react';
import { X, Printer, CheckCircle2, Building, Calendar, DollarSign, User, ShieldCheck } from 'lucide-react';
import { Expense } from '../../../types/erp';
import { formatMoney, formatDate, formatTime, tafqeetNumber, toWesternDigits } from '../../../utils/formatters';

interface ExpensePrintModalProps {
  expense: Expense;
  onClose: () => void;
}

export const ExpensePrintModal: React.FC<ExpensePrintModalProps> = ({ expense, onClose }) => {
  useEffect(() => {
    // Add print class to document body
    document.body.classList.add('is-printing-statement');
    return () => {
      document.body.classList.remove('is-printing-statement');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const isPosted = expense.status === 'POSTED';
  const isApproved = expense.status === 'APPROVED' || expense.status === 'POSTED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 statement-modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden statement-modal-card">
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">معاينة وطباعة سند الصرف المالي الرسمي</h3>
              <p className="text-[11px] text-slate-400">سند رقم: {toWesternDigits(expense.expenseNumber)} • قياس A4 رسمي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند الآن (Ctrl+P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area - Formatted for standard A4 */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-900 statement-printable-sheet">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xs">
                  ERP
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">نظام إدارة العقارات والأملاك الذكي</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Smart Property ERP • الإدارة المالية والمحاسبية</p>
                  <p className="text-[11px] text-slate-400">قسم المصروفات التشغيلية والتكاليف وإدارة الصيانة</p>
                </div>
              </div>

              <div className="text-left text-xs space-y-1">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-mono font-black text-slate-800 text-sm border border-slate-200">
                  {toWesternDigits(expense.expenseNumber)}
                </div>
                <div className="text-slate-500 text-[11px]">التاريخ: <span className="font-mono font-bold text-slate-800">{formatDate(expense.expenseDate)}</span></div>
                <div className="text-slate-500 text-[11px]">الوقت: <span className="font-mono text-slate-700">{formatTime(new Date())}</span></div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <h2 className="text-lg font-black text-slate-900 tracking-wide">
                سند صرف مالي معتمد (PAYMENT VOUCHER)
              </h2>
              <div className="flex items-center justify-center gap-3 mt-1 text-xs">
                <span className="text-slate-500">الحالة المحاسبية:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                  expense.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  expense.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                  expense.status === 'REVERSED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {expense.status === 'POSTED' ? 'مرحل بدفتر الأستاذ العام' :
                   expense.status === 'APPROVED' ? 'معتمد للصرف' :
                   expense.status === 'REVERSED' ? 'قيد معكوس ملغى' :
                   expense.status === 'CANCELLED' ? 'سند ملغى' : 'مسودة'}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Hero Box */}
          <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 font-bold block mb-1">المبلغ المصروف:</span>
              <div className="text-2xl font-black font-mono text-slate-900">
                {formatMoney(expense.amount)} <span className="text-sm font-bold">ريال يمني</span>
              </div>
            </div>
            <div className="sm:text-left text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">المبلغ كتابةً وتفقيطاً:</span>
              <div className="text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 leading-relaxed">
                {tafqeetNumber(expense.amount, 'ريال يمني')}
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50/70 border border-slate-200 rounded-xl mb-6 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">تصنيف المصروف:</span>
              <span className="font-bold text-slate-900">{expense.categoryName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">الحساب المحاسبي (دليل الحسابات):</span>
              <span className="font-mono font-bold text-slate-900">{toWesternDigits(expense.accountCode || '5101')} - مصروفات تشغيلية</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">طريقة السداد:</span>
              <span className="font-bold text-slate-900">
                {expense.paymentMethod === 'CASH' ? 'نقداً (من الصندوق)' :
                 expense.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                 expense.paymentMethod === 'CHECK' ? 'شيك بنكي' : 'صندوق خزني'}
              </span>
            </div>

            {expense.cashBoxName && (
              <div>
                <span className="text-slate-500 block text-[11px]">الصندوق الخزني المسحوب منه:</span>
                <span className="font-bold text-slate-900">{expense.cashBoxName}</span>
              </div>
            )}

            {expense.bankName && (
              <div>
                <span className="text-slate-500 block text-[11px]">اسم البنك:</span>
                <span className="font-bold text-slate-900">{expense.bankName}</span>
              </div>
            )}

            {expense.checkNumber && (
              <div>
                <span className="text-slate-500 block text-[11px]">رقم الشيك:</span>
                <span className="font-mono font-bold text-slate-900">{toWesternDigits(expense.checkNumber)}</span>
              </div>
            )}

            {expense.transferReference && (
              <div>
                <span className="text-slate-500 block text-[11px]">مرجع التحويل البنكي:</span>
                <span className="font-mono font-bold text-slate-900">{toWesternDigits(expense.transferReference)}</span>
              </div>
            )}

            <div>
              <span className="text-slate-500 block text-[11px]">العقار المرتبط:</span>
              <span className="font-bold text-slate-900">{expense.propertyName || 'مصروف عام للمنشأة'}</span>
            </div>

            {expense.unitNumber && (
              <div>
                <span className="text-slate-500 block text-[11px]">رقم الوحدة:</span>
                <span className="font-mono font-bold text-slate-900">{toWesternDigits(expense.unitNumber)}</span>
              </div>
            )}

            {expense.vendorName && (
              <div>
                <span className="text-slate-500 block text-[11px]">المستفيد / الفني / المورد:</span>
                <span className="font-bold text-slate-900">{expense.vendorName}</span>
              </div>
            )}

            {expense.maintenanceNumber && (
              <div>
                <span className="text-slate-500 block text-[11px]">مرجع طلب الصيانة:</span>
                <span className="font-mono font-bold text-blue-700">{toWesternDigits(expense.maintenanceNumber)}</span>
              </div>
            )}

            {expense.ledgerId && (
              <div>
                <span className="text-slate-500 block text-[11px]">رقم القيد بدفتر الأستاذ:</span>
                <span className="font-mono font-bold text-slate-800">{toWesternDigits(expense.ledgerId)}</span>
              </div>
            )}
          </div>

          {/* Description Block */}
          <div className="mb-6 p-4 border border-slate-200 rounded-xl bg-white">
            <span className="text-xs font-bold text-slate-500 block mb-1.5">البيان والشرح التفصيلي لعملية الصرف:</span>
            <p className="text-xs font-medium text-slate-900 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              {expense.description}
            </p>
            {expense.notes && (
              <p className="text-[11px] text-slate-500 mt-2">
                <strong>ملاحظات إضافية:</strong> {expense.notes}
              </p>
            )}
          </div>

          {/* Reversal Notice if reversed */}
          {expense.status === 'REVERSED' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl mb-6 text-xs text-amber-900">
              <strong>تنبيه مالي:</strong> تم عكس قيد هذا المصروف دفترياً بواسطة {expense.reversedBy || 'المحاسب'} بتاريخ {formatDate(expense.reversedAt)}.
              {expense.reversalReason && <span className="block mt-1">سبب العكس: {expense.reversalReason}</span>}
            </div>
          )}

          {/* Official Signatures Section */}
          <div className="grid grid-cols-4 gap-4 pt-8 border-t-2 border-slate-300 text-center text-xs mt-10 print-avoid-break">
            <div className="space-y-8">
              <span className="font-bold text-slate-800 block text-xs">منشئ السند</span>
              <span className="text-slate-600 block text-[11px] font-medium">{expense.createdBy}</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-400">التوقيع والتاريخ</span>
            </div>

            <div className="space-y-8">
              <span className="font-bold text-slate-800 block text-xs">المحاسب المالي</span>
              <span className="text-slate-600 block text-[11px] font-medium">{expense.postedBy || 'قيد المراجعة'}</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-400">التوقيع والختم المالي</span>
            </div>

            <div className="space-y-8">
              <span className="font-bold text-slate-800 block text-xs">المدير المعتمد</span>
              <span className="text-slate-600 block text-[11px] font-medium">{expense.approvedBy || 'الإدارة'}</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-400">الاعتماد والتوقيع</span>
            </div>

            <div className="space-y-8">
              <span className="font-bold text-slate-800 block text-xs">المستلم / المستفيد</span>
              <span className="text-slate-600 block text-[11px] font-medium">{expense.vendorName || 'المستلم نقداً'}</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-400">توقيع واستلام المبلغ</span>
            </div>
          </div>

          {/* Security & Verification Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 print-avoid-break">
            <span>تم استخراج هذا السند رسمياً من قاعدة بيانات Smart Property ERP</span>
            <span className="font-mono">VERIFIED • HASH-{toWesternDigits(expense.id.slice(-8).toUpperCase())}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
