import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Download, 
  Building2, 
  Calendar, 
  User, 
  Receipt, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  QrCode,
  FileText,
  Phone,
  Store
} from 'lucide-react';
import { Invoice } from '../../../types/erp';

interface InvoicePrintModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ 
  invoice, 
  onClose,
  autoPrint = true
}) => {
  const printedRef = useRef(false);

  useEffect(() => {
    if (!invoice) return;

    // Add print class to body to cleanly isolate printed document
    document.body.classList.add('is-printing-invoice');

    // Trigger browser print dialog after DOM layout completes
    let timer: any = null;
    if (autoPrint && !printedRef.current) {
      printedRef.current = true;
      timer = setTimeout(() => {
        window.print();
      }, 150);
    }

    return () => {
      if (timer) clearTimeout(timer);
      document.body.classList.remove('is-printing-invoice');
      printedRef.current = false;
    };
  }, [invoice?.id, autoPrint]);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isOverdue = invoice.status === 'OVERDUE' || (invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && new Date(invoice.dueDate) < new Date());

  const modalContent = (
    <div 
      id="invoice-print-portal"
      className="invoice-modal-portal"
      dir="rtl"
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden animate-fadeIn invoice-modal-overlay">
        {/* Container - on print, this will be full width and clean */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100vh-2rem)] invoice-modal-card">
          {/* Action bar - strictly hidden in print, sticky at top */}
          <div className="print:hidden flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/80 flex-shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  طباعة فاتورة الإيجار #{invoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  وثيقة رسمية متوافقة مع مقاس الطباعة القياسي A4
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المستند (Print)</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Sheet */}
          <div className="p-8 overflow-y-auto print:p-0 print:m-0 font-sans text-slate-800 invoice-printable-sheet">
            <div className="border border-slate-300 rounded-2xl p-6 sm:p-8 space-y-6 print:border-none print:p-0">
              {/* 1. Header & Company Brand */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                      ع
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        نظام إدارة العقارات الذكي
                      </h1>
                      <p className="text-xs text-slate-500 font-mono">
                        Smart Property Management ERP
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-medium pt-1">
                    إدارة الأملاك • إيجارات وعقارات • تحصيل ومحاسبة
                  </p>
                </div>

                <div className="text-left space-y-1">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-sm font-bold rounded-lg">
                    فاتورة إيجار رسمي
                  </span>
                  <p className="text-xs text-slate-500 font-mono">
                    رقم الفاتورة: <strong className="text-slate-900">{invoice.invoiceNumber}</strong>
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    تاريخ الإصدار: <span className="text-slate-700">{invoice.issueDate}</span>
                  </p>
                </div>
              </div>

              {/* 2. Parties Info (Tenant & Property) */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    بيانات المستأجر (الطرف الثاني):
                  </span>
                  <p className="font-bold text-sm text-slate-900">{invoice.tenantName}</p>
                  {invoice.tenantPhone && (
                    <p className="text-slate-600 font-mono">هاتف: {invoice.tenantPhone}</p>
                  )}
                  {invoice.tenantCode && (
                    <p className="text-slate-600 font-mono">كود المستأجر: {invoice.tenantCode}</p>
                  )}
                </div>

                <div className="space-y-1.5 border-r border-slate-200 pr-4">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                    بيانات العين المؤجرة والعقد:
                  </span>
                  <p className="font-bold text-sm text-slate-900">{invoice.propertyName}</p>
                  <p className="text-slate-700 font-medium">وحدة رقم: <strong className="font-mono">{invoice.unitNumber}</strong></p>
                  <p className="text-slate-600 font-mono">
                    رقم العقد: <strong>{invoice.contractNumber || invoice.contractId || '-'}</strong>
                  </p>
                </div>
              </div>

              {/* 3. Billing Period & Due Date Ribbon */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-center">
                <div>
                  <span className="text-emerald-800 block text-[11px]">فترة الفاتورة</span>
                  <strong className="text-slate-900 font-mono text-sm">{invoice.period || invoice.periodMonth}</strong>
                </div>
                <div>
                  <span className="text-emerald-800 block text-[11px]">تاريخ الاستحقاق</span>
                  <strong className={`font-mono text-sm ${isOverdue ? 'text-rose-700 font-bold' : 'text-slate-900'}`}>
                    {invoice.dueDate}
                  </strong>
                </div>
                <div>
                  <span className="text-emerald-800 block text-[11px]">حالة السداد</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                    invoice.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                    invoice.status === 'CANCELLED' ? 'bg-slate-200 text-slate-700' :
                    isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {invoice.status === 'PAID' ? 'مسددة بالكامل' :
                     invoice.status === 'PARTIAL' ? 'مسددة جزئياً' :
                     invoice.status === 'CANCELLED' ? 'فاتورة ملغاة' :
                     isOverdue ? 'متأخرة عن موعد السداد' : 'مستحقة السداد'}
                  </span>
                </div>
              </div>

              {/* 4. Financial Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">البيان / البند</th>
                      <th className="p-3">الفترة الزمنية</th>
                      <th className="p-3 text-left">المبلغ (ريال يمني)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 text-center font-mono">1</td>
                      <td className="p-3 font-semibold text-slate-900">
                        قيمة الإيجار الدوري للوحدة ({invoice.unitNumber})
                        <span className="text-[11px] text-slate-500 block font-normal">
                          وفقاً لبنود عقد الإيجار رقم {invoice.contractNumber || '-'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {invoice.billingPeriodStart && invoice.billingPeriodEnd 
                          ? `${invoice.billingPeriodStart} إلى ${invoice.billingPeriodEnd}`
                          : invoice.period || invoice.periodMonth}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-900">
                        {(invoice.baseRent || invoice.totalAmount).toLocaleString()} ريال
                      </td>
                    </tr>

                    {Number(invoice.additionalCharges || 0) > 0 && (
                      <tr>
                        <td className="p-3 text-center font-mono">2</td>
                        <td className="p-3 font-semibold text-slate-900">
                          رسوم وخدمات إضافية / صيانة دورية
                        </td>
                        <td className="p-3 font-mono text-slate-600">-</td>
                        <td className="p-3 text-left font-mono font-bold text-slate-900">
                          {Number(invoice.additionalCharges).toLocaleString()} ريال
                        </td>
                      </tr>
                    )}

                    {Number(invoice.discount || 0) > 0 && (
                      <tr className="bg-rose-50/30">
                        <td className="p-3 text-center font-mono">3</td>
                        <td className="p-3 font-semibold text-rose-800">
                          خصم أو تسوية معتمدة
                        </td>
                        <td className="p-3 font-mono text-rose-600">-</td>
                        <td className="p-3 text-left font-mono font-bold text-rose-700">
                          - {Number(invoice.discount).toLocaleString()} ريال
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Total Calculation Footer */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold text-slate-600">
                    <span>إجمالي المطالبة:</span>
                    <span className="font-mono">{invoice.totalAmount.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>المسدد فعلياً:</span>
                    <span className="font-mono">{invoice.paidAmount.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                    <span>الرصيد المتبقي المستحق:</span>
                    <span className={`font-mono ${invoice.remainingAmount > 0 ? 'text-rose-700 font-extrabold' : 'text-emerald-700'}`}>
                      {invoice.remainingAmount.toLocaleString()} ريال يمني
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes if present */}
              {invoice.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-0.5">
                  <span className="font-bold text-slate-700">ملاحظات الفاتورة:</span>
                  <p className="text-slate-600">{invoice.notes}</p>
                </div>
              )}

              {/* 5. Payment Details / Instructions */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="space-y-1 text-slate-600">
                  <span className="font-bold text-slate-800 block">طرق وتفاصيل السداد:</span>
                  <p>• نقداً لدى مكتب الإدارة أو المحصل المعتمد بموجب سند قبض رسمي.</p>
                  <p>• إيداع بنكي / حوالة مع تزويد الإدارة بالإشعار المالي فوراً.</p>
                  <p className="text-[11px] text-slate-500 pt-1 font-mono">
                    معرّف التحقق الإلكتروني: {invoice.id}
                  </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[90px]">
                    <span className="font-bold text-slate-700">المحاسب المالي</span>
                    <div className="text-slate-500 font-semibold">م. أحمد الوهاس</div>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[90px]">
                    <span className="font-bold text-slate-700">استلام المستأجر</span>
                    <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto mb-1"></div>
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                تم إصدار هذه الوثيقة آلياً من نظام إدارة العقارات الذكي - صالحة وموثقة لأغراض المحاسبة الرسمية.
              </div>
            </div>
          </div>

          {/* Modal Footer - strictly hidden in print */}
          <div className="print:hidden px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المستند</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
