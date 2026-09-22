import React from 'react';
import { X, Printer, QrCode, CheckCircle2, Building2, ShieldCheck } from 'lucide-react';
import { PaymentReceipt } from '../../types/erp';

interface ReceiptPrintModalProps {
  receipt: PaymentReceipt | null;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  receipt,
  onClose,
}) => {
  if (!receipt) return null;

  const formatMoney = (val: number) => new Intl.NumberFormat('ar-YE').format(val);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Modal Controls (Hidden when printing) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">معاينة سند القبض الرسمي (جاهز للطباعة A4)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 text-right font-sans" id="printable-receipt">
          {/* Document Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">SMART PROPERTY ERP</h2>
              <p className="text-xs text-slate-600 font-medium">نظام إدارة العقارات والأملاك الذكي</p>
              <p className="text-[11px] text-slate-400">صنعاء - الجمهورية اليمنية</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-1 font-bold text-lg">
                ERP
              </div>
              <span className="text-[10px] font-mono text-slate-500">Official Document</span>
            </div>
            <div className="text-left">
              <div className="text-xs font-mono font-bold text-slate-900">سند قبض مالي</div>
              <div className="text-sm font-mono font-bold text-emerald-700">{receipt.receiptNumber}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">التاريخ: {receipt.date}</div>
            </div>
          </div>

          {/* Amount Ribbon */}
          <div className="my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">المبلغ المقبوض:</span>
            <div className="text-xl font-bold font-mono text-slate-950">
              {formatMoney(receipt.amountPaid)} <span className="text-xs text-slate-500 font-sans">ريال يمني</span>
            </div>
          </div>

          {/* Receipt Details Grid */}
          <div className="space-y-3 text-xs border border-slate-200 rounded-xl p-4 bg-white">
            <div className="grid grid-cols-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">استلمنا من الأخ/السادة:</span>
              <span className="col-span-2 font-bold text-slate-900">{receipt.tenantName}</span>
            </div>

            <div className="grid grid-cols-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">وذلك عن:</span>
              <span className="col-span-2 font-semibold text-slate-800">
                {receipt.accountType === 'RENT' && 'إيجار شهري / دوري'}
                {receipt.accountType === 'WATER' && 'مستحقات وايتات وخدمات مياه'}
                {receipt.accountType === 'ELECTRICITY' && 'استهلاك عداد كهرباء'}
                {receipt.accountType === 'SERVICES' && 'رسوم خدمات عامة وصيانة'}
                {' '} - {receipt.propertyName} (الوحدة {receipt.unitNumber})
              </span>
            </div>

            <div className="grid grid-cols-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">رقم الفاتورة المسددة:</span>
              <span className="col-span-2 font-mono font-bold text-slate-800">{receipt.invoiceNumber}</span>
            </div>

            <div className="grid grid-cols-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">طريقة السداد:</span>
              <span className="col-span-2 font-medium text-slate-800">
                {receipt.paymentMethod === 'CASH' && 'نقداً في الصندوق'}
                {receipt.paymentMethod === 'BANK_TRANSFER' && 'تحويل بنكي رسمي'}
                {receipt.paymentMethod === 'ELECTRONIC_WALLET' && 'محفظة إلكترونية'}
              </span>
            </div>

            <div className="grid grid-cols-3 py-1.5">
              <span className="text-slate-500 font-medium">ملاحظات التحصيل:</span>
              <span className="col-span-2 text-slate-600">{receipt.notes || 'سداد معتمد ومرحل إلى السجلات.'}</span>
            </div>
          </div>

          {/* Footer & QR Verification */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-slate-300 rounded-lg bg-white">
                <QrCode className="w-12 h-12 text-slate-800" />
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                <span className="font-semibold text-slate-600 block">رمز التحقق الإلكتروني QR</span>
                <span>سند قبض رسمي معتمد إلكترونياً</span>
                <span className="block font-mono mt-0.5">ERP-ID: {receipt.id}</span>
              </div>
            </div>

            <div className="text-center">
              <span className="text-xs text-slate-500 block mb-3">المحصل المعتمد:</span>
              <span className="text-xs font-bold text-slate-900 block">{receipt.collectorName}</span>
              <div className="w-28 border-b border-dashed border-slate-400 mt-2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
