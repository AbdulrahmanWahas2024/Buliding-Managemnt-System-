import React, { useState } from 'react';
import { X, Printer, Receipt, CheckCircle2, ShieldCheck, Building2, User, Calendar, DollarSign, Wallet } from 'lucide-react';
import { formatMoney, tafqeetNumber } from '../../../utils/formatters';
import { CollectionReceiptRecord } from '../../../types/erp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receipt: CollectionReceiptRecord | null;
  defaultMode?: 'a4' | 'thermal';
}

export const CollectionReceiptPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  receipt,
  defaultMode = 'a4'
}) => {
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>(defaultMode);

  if (!isOpen || !receipt) return null;

  const handlePrint = (mode: 'a4' | 'thermal') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const isCancelled = receipt.status === 'CANCELLED';
  const isReversed = receipt.status === 'REVERSED';

  const methodLabel = receipt.paymentMethod === 'CASH' ? 'نقدي (كاش)' :
                      receipt.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                      receipt.paymentMethod === 'CHECK' ? 'شيك مصرفي' : 'محفظة إلكترونية';

  const accountTypeLabel = receipt.accountType === 'RENT' ? 'إيجار عقاري' :
                           receipt.accountType === 'ELECTRICITY' ? 'استهلاك كهرباء' :
                           receipt.accountType === 'WATER' ? 'مياه ووايتات' : 'خدمات وصيانة';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Dynamic Print CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden animate-fadeIn print:max-h-none print:w-full print:border-none print:shadow-none print:rounded-none">
        {/* Modal Toolbar (Screen only) */}
        <div className="flex flex-wrap items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50 shrink-0 gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <span>طباعة سند القبض الرسمي</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200">
                  #{receipt.receiptNumber}
                </span>
                {isCancelled && (
                  <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">ملغى</span>
                )}
                {isReversed && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">معكوس</span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                مركز التحصيل: {receipt.centerName || 'المركز الرئيسي'} | الكاشير: {receipt.collectorName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint('a4')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة سند A4</span>
            </button>
            <button
              onClick={() => handlePrint('thermal')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>إيصال حراري</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:p-0 print:bg-white">
          <div 
            id="receipt-print-area" 
            className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 max-w-3xl mx-auto print:shadow-none print:border-none print:p-4 text-slate-800"
            dir="rtl"
          >
            {/* Header: Company and Voucher Title */}
            <div className="border-b-2 border-slate-800 pb-5 mb-5 flex items-start justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  شركة الوهاس لإدارة وتطوير العقارات
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  نظام إدارة الأملاك الذكي - قسم الحسابات والتحصيل المالي
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  الجمهورية اليمنية - صنعاء | هاتف: +967 777 000 000 | س.ت: 40291
                </p>
              </div>

              <div className="text-left font-mono">
                <div className="border-2 border-slate-900 px-4 py-2 rounded-xl text-center bg-slate-50">
                  <span className="block text-[11px] font-bold text-slate-500 font-sans">سند قـبـض رسمي</span>
                  <span className="block text-base font-black text-slate-900">{receipt.receiptNumber}</span>
                </div>
                <span className="block text-[11px] text-slate-500 mt-1 text-center font-sans">
                  التاريخ: {receipt.collectedAt ? receipt.collectedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                </span>
              </div>
            </div>

            {/* Status Alert if Cancelled or Reversed */}
            {(isCancelled || isReversed) && (
              <div className="mb-4 p-3 border-2 border-dashed border-rose-500 bg-rose-50 rounded-xl text-center text-xs font-bold text-rose-700">
                *** هذا السند {isCancelled ? 'ملغى' : 'معكوس الترحيل'} وغير صالح قانونياً أو محاسبياً ***
                {receipt.cancellationReason && <div className="mt-1 font-normal font-sans">السبب: {receipt.cancellationReason}</div>}
                {receipt.reversalReason && <div className="mt-1 font-normal font-sans">السبب: {receipt.reversalReason}</div>}
              </div>
            )}

            {/* Amount Banner */}
            <div className="bg-emerald-50 border-2 border-emerald-600/60 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-900 block mb-0.5">المبلغ المقبوض:</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800">
                  {formatMoney(receipt.amountPaid)} ر.ي
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-900 bg-white/80 px-3.5 py-2 rounded-lg border border-emerald-200">
                {tafqeetNumber(receipt.amountPaid, 'ريال يمني')}
              </div>
            </div>

            {/* Receipt Details Grid */}
            <div className="space-y-3.5 text-xs">
              <div className="flex border-b border-slate-200 pb-2">
                <span className="w-32 font-bold text-slate-600">وصلنا من الأخ/السيد:</span>
                <span className="font-bold text-slate-900 text-sm">{receipt.tenantName}</span>
                {receipt.tenantPhone && (
                  <span className="font-mono text-slate-500 mr-2">({receipt.tenantPhone})</span>
                )}
              </div>

              <div className="flex border-b border-slate-200 pb-2">
                <span className="w-32 font-bold text-slate-600">وذلك عن:</span>
                <span className="font-semibold text-slate-800">
                  سداد {accountTypeLabel} للوحدة رقم <strong>{receipt.unitNumber}</strong> في عقار <strong>{receipt.propertyName}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-2">
                <div className="flex">
                  <span className="w-32 font-bold text-slate-600">رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-slate-900">{receipt.invoiceNumber || receipt.invoiceId}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-bold text-slate-600">طريقة الدفع:</span>
                  <span className="font-bold text-slate-900">{methodLabel}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-2">
                <div className="flex">
                  <span className="w-32 font-bold text-slate-600">مركز التحصيل:</span>
                  <span className="font-semibold text-slate-800">{receipt.centerName || 'المركز الرئيسي'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-bold text-slate-600">الصندوق المستلم:</span>
                  <span className="font-semibold text-slate-800">{receipt.cashBoxName || 'الصندوق الرئيسي'}</span>
                </div>
              </div>

              {(receipt.checkNumber || receipt.transferReference || receipt.bankName) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-2 bg-slate-50 p-2.5 rounded-lg">
                  {receipt.bankName && (
                    <div className="flex">
                      <span className="w-24 font-bold text-slate-600">البنك:</span>
                      <span className="font-semibold">{receipt.bankName}</span>
                    </div>
                  )}
                  {receipt.checkNumber && (
                    <div className="flex">
                      <span className="w-24 font-bold text-slate-600">رقم الشيك:</span>
                      <span className="font-mono font-bold">{receipt.checkNumber}</span>
                    </div>
                  )}
                  {receipt.transferReference && (
                    <div className="flex">
                      <span className="w-24 font-bold text-slate-600">رقم الحوالة:</span>
                      <span className="font-mono font-bold">{receipt.transferReference}</span>
                    </div>
                  )}
                </div>
              )}

              {receipt.notes && (
                <div className="flex border-b border-slate-200 pb-2">
                  <span className="w-32 font-bold text-slate-600">ملاحظات:</span>
                  <span className="text-slate-700">{receipt.notes}</span>
                </div>
              )}
            </div>

            {/* Verification Bar & QR Section */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>سند معتمد ومرحل دفترياً بنظام Smart Property ERP</span>
                </div>
                <p>تم إثبات القيد بدفتر الأستاذ العام وتعديل الذمة المالية للمستأجر بصورة آلية.</p>
                <p className="font-mono text-[10px]">كود التحقق: {receipt.qrCodeContent || `VERIFIED-${receipt.receiptNumber}`}</p>
              </div>

              {/* Signatures */}
              <div className="flex items-center gap-8 text-center text-xs pt-4 sm:pt-0">
                <div>
                  <span className="block text-slate-500 mb-6 font-bold">أمين الصندوق (المحصل)</span>
                  <span className="font-bold text-slate-800 border-t border-slate-300 pt-1 px-4 block">
                    {receipt.collectorName || 'م. أحمد الوهاس'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-6 font-bold">الختم والاعتماد المالي</span>
                  <span className="border-t border-slate-300 pt-1 px-4 block text-slate-400">
                    ختم الإدارة المالية
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
