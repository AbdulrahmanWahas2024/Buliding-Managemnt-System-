import React, { useState } from 'react';
import { X, Printer, Zap, Building2, User, Calendar, Receipt, FileText } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  defaultMode?: 'a5' | 'thermal';
}

export const ElectricityInvoicePrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoice,
  defaultMode = 'a5'
}) => {
  const [printMode, setPrintMode] = useState<'a5' | 'thermal'>(defaultMode);

  if (!isOpen || !invoice) return null;

  const handlePrint = (mode: 'a5' | 'thermal') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';
  const isReversed = invoice.status === 'REVERSED';

  const statusLabel = isPaid 
    ? 'مسدد بالكامل' 
    : isCancelled 
    ? 'فاتورة ملغاة' 
    : isReversed 
    ? 'قيد معكوس' 
    : 'مستحق السداد (مرحل للذمم)';

  const statusClass = isPaid
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : isCancelled
    ? 'text-slate-600 bg-slate-100 border-slate-300'
    : isReversed
    ? 'text-purple-700 bg-purple-50 border-purple-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs overflow-hidden print:p-0 print:bg-white print:static print:overflow-visible">
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
            visibility: hidden !important;
          }
          .print-section-active, .print-section-active * {
            visibility: visible !important;
          }
          .print-section-active {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          ${printMode === 'a5' ? `
            @page {
              size: A5 portrait;
              margin: 5mm;
            }
            #printable-invoice-a5 {
              width: 100% !important;
              padding: 4mm !important;
            }
          ` : `
            @page {
              size: 80mm auto;
              margin: 0;
            }
            #printable-invoice-thermal {
              width: 80mm !important;
              max-width: 80mm !important;
              padding: 4mm 3mm !important;
            }
          `}
        }
      `}</style>

      {/* Modal Dialog Card - Strictly contained within viewport */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100vh-2rem)] print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none print:overflow-visible animate-fadeIn">
        
        {/* Sticky Toolbar - Always visible at top */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-4 bg-slate-900 text-white flex-shrink-0 sticky top-0 z-10 print:hidden border-b border-slate-800">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold truncate">معاينة فاتورة استهلاك الكهرباء</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">طباعة قياسية A5 أو إيصال حراري 80mm</p>
              </div>
            </div>

            {/* Mobile close button (visible only on small screens) */}
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
            {/* Layout Mode Preview Tabs */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setPrintMode('a5')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${printMode === 'a5' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                نموذج A5
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('thermal')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${printMode === 'thermal' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                حراري 80mm
              </button>
            </div>

            {/* Print Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePrint('a5')}
                title="طباعة الفاتورة بحجم A5 القياسي"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">طباعة</span>
                <span>A5</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrint('thermal')}
                title="طباعة الفاتورة كإيصال على طابعة حرارية 80mm"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>حراري</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Body */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-3 sm:p-6 bg-slate-100/80 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          
          {/* ======================================================== */}
          {/* LAYOUT 1: STANDARD A5 INVOICE                            */}
          {/* ======================================================== */}
          <div
            id="printable-invoice-a5"
            className={`${printMode === 'a5' ? 'block print-section-active' : 'hidden print:hidden'} bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-6 md:p-8 text-slate-900 font-sans space-y-4 sm:space-y-5 w-full max-w-xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none`}
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Smart Property ERP</h1>
                      <p className="text-[10px] text-slate-500 font-semibold">إدارة العقارات والتحصيل المحاسبي</p>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200">
                      فاتورة استهلاك طاقة كهربائية
                    </span>
                    <div className="mt-1 text-xs text-slate-600 font-semibold">
                      دورة شهر: <span className="font-bold text-slate-900">{invoice.periodMonth || invoice.readingPeriodMonth || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:text-left font-mono text-[11px] sm:text-xs text-slate-700 space-y-1 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
                  <div>رقم الفاتورة: <span className="font-bold text-slate-900">{invoice.invoiceNumber || invoice.id}</span></div>
                  <div>تاريخ الإصدار: <span className="font-bold text-slate-900">{invoice.issueDate || invoice.readingDate || new Date().toISOString().slice(0, 10)}</span></div>
                  <div>تاريخ الاستحقاق: <span className="font-bold text-slate-900">{invoice.dueDate || invoice.issueDate || new Date().toISOString().slice(0, 10)}</span></div>
                  <div>
                    الحالة: 
                    <span className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant & Property Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <div className="text-slate-500 font-bold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>بيانات المستأجر:</span>
                </div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 pr-4">{invoice.tenantName || 'غير محدد'}</div>
                <div className="text-slate-600 pr-4">رقم الوحدة: <span className="font-mono font-bold text-slate-800">{invoice.unitNumber}</span></div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-500 font-bold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>بيانات العقار والعداد:</span>
                </div>
                <div className="font-bold text-slate-800 pr-4">{invoice.propertyName || 'العقار الرئيسي'}</div>
                <div className="text-slate-600 pr-4">
                  رقم العداد: <span className="font-mono font-bold text-slate-900">{invoice.meterNumber || '-'}</span>
                </div>
              </div>
            </div>

            {/* Meter Readings & Consumption Breakdown Table with horizontal scroll container */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-1.5">تفاصيل القراءة واحتساب الاستهلاك</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2 px-2.5 whitespace-nowrap">رقم العداد</th>
                      <th className="py-2 px-2.5 font-mono text-center whitespace-nowrap">القراءة السابقة</th>
                      <th className="py-2 px-2.5 font-mono text-center whitespace-nowrap">القراءة الحالية</th>
                      <th className="py-2 px-2.5 font-mono text-center whitespace-nowrap">صافي الاستهلاك</th>
                      <th className="py-2 px-2.5 font-mono text-center whitespace-nowrap">سعر الكيلوواط</th>
                      <th className="py-2 px-2.5 font-mono text-left whitespace-nowrap">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{invoice.meterNumber || '-'}</td>
                      <td className="py-2.5 px-2.5 font-mono text-center text-slate-600 whitespace-nowrap">
                        {Number(invoice.previousReading || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-center font-bold text-slate-900 whitespace-nowrap">
                        {Number(invoice.currentReading || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-center font-bold text-amber-700 bg-amber-50/50 whitespace-nowrap">
                        {Number(invoice.consumptionKwh || invoice.consumption || 0).toLocaleString()} ك.و/س
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-center text-slate-700 whitespace-nowrap">
                        {Number(invoice.ratePerKwh || invoice.ratePerKWh || 300).toLocaleString()} ر.ي
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-left font-black text-sm text-slate-900 whitespace-nowrap">
                        {formatMoney(invoice.totalAmount || 0)} ر.ي
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grand Totals Box */}
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">إجمالي المبلغ المستحق للدفع:</div>
                <div className="text-lg sm:text-xl font-black font-mono text-amber-400 mt-0.5">
                  {formatMoney(invoice.totalAmount || 0)} <span className="text-xs text-white font-normal">ريال يمني</span>
                </div>
              </div>

              <div className="text-left font-mono text-xs space-y-0.5">
                {Number(invoice.paidAmount || 0) > 0 && (
                  <div className="text-emerald-400">المبلغ المسدد: {formatMoney(invoice.paidAmount)} ر.ي</div>
                )}
                {invoice.remainingAmount !== undefined && (
                  <div className="text-rose-300 font-bold">المتبقي: {formatMoney(invoice.remainingAmount)} ر.ي</div>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                <span className="font-bold">ملاحظات: </span>
                <span>{invoice.notes}</span>
              </div>
            )}

            {/* Instructions */}
            <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-200 pt-3">
              <p>• يرجى سداد قيمة الفاتورة خلال فترة لا تتجاوز 7 أيام من تاريخ الاستحقاق لتجنب فصل الخدمة.</p>
              <p>• القراءات مأخوذة وموثقة آلياً في النظام المحاسبي المتكامل للعقار مع حفظ سجل التدقيق.</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 text-center pt-4 sm:pt-6 border-t border-slate-200 text-xs text-slate-600 mt-3 sm:mt-4 print:mt-8">
              <div>
                <div className="font-bold text-slate-800">توقيع المستلم (المستأجر)</div>
                <div className="mt-5 sm:mt-6 border-b border-dashed border-slate-400 w-2/3 mx-auto"></div>
                <div className="mt-1 text-[10px] text-slate-400">التوقيع والتاريخ</div>
              </div>
              <div>
                <div className="font-bold text-slate-800">المحصل المالي / إدارة العقار</div>
                <div className="mt-5 sm:mt-6 border-b border-dashed border-slate-400 w-2/3 mx-auto"></div>
                <div className="mt-1 text-[10px] text-slate-400">الختم والتوقيع</div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LAYOUT 2: 80mm THERMAL RECEIPT (VARIABLE HEIGHT)         */}
          {/* ======================================================== */}
          <div
            id="printable-invoice-thermal"
            className={`${printMode === 'thermal' ? 'block print-section-active' : 'hidden print:hidden'} bg-white rounded-lg border border-dashed border-slate-300 shadow-sm p-4 text-slate-900 font-mono text-xs w-[320px] max-w-full mx-auto print:border-none print:shadow-none print:p-0 print:w-[80mm]`}
            style={{ width: '80mm', maxWidth: '100%' }}
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-1">
              <div className="font-black text-sm tracking-tight text-slate-950">Smart Property ERP</div>
              <div className="text-[11px] font-bold text-slate-700">إدارة الأملاك والتحصيل المالي</div>
              <div className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold mt-1">
                إيصال استهلاك كهرباء (80mm)
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الفاتورة:</span>
                <span className="font-bold">{invoice.invoiceNumber || invoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التاريخ:</span>
                <span>{invoice.issueDate || invoice.readingDate || new Date().toISOString().slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">دورة الفوترة:</span>
                <span className="font-bold">{invoice.periodMonth || invoice.readingPeriodMonth || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الحالة:</span>
                <span className="font-bold">{statusLabel}</span>
              </div>
            </div>

            {/* Tenant and Property info */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">المستأجر:</span>
                <span className="font-bold">{invoice.tenantName || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">العقار:</span>
                <span>{invoice.propertyName || 'الرئيسي'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الوحدة:</span>
                <span className="font-bold">{invoice.unitNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم العداد:</span>
                <span className="font-bold">{invoice.meterNumber || '-'}</span>
              </div>
            </div>

            {/* Meter Reading details */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="font-bold text-center text-slate-800">بيانات الاستهلاك</div>
              <div className="flex justify-between">
                <span className="text-slate-500">القراءة السابقة:</span>
                <span>{Number(invoice.previousReading || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">القراءة الحالية:</span>
                <span>{Number(invoice.currentReading || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>صافي الاستهلاك:</span>
                <span>{Number(invoice.consumptionKwh || invoice.consumption || 0).toLocaleString()} ك.و/س</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>سعر الكيلوواط:</span>
                <span>{Number(invoice.ratePerKwh || invoice.ratePerKWh || 300).toLocaleString()} ر.ي</span>
              </div>
            </div>

            {/* Financial Total Box */}
            <div className="my-2.5 p-2 bg-slate-100 rounded text-center border border-slate-300">
              <div className="text-[10px] text-slate-600 font-bold">المبلغ الإجمالي المستحق</div>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {formatMoney(invoice.totalAmount || 0)} ر.ي
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                مرحّل لدفتر أستاذ المستأجر
              </div>
            </div>

            {/* Notes if present */}
            {invoice.notes && (
              <div className="py-1 text-[10px] text-slate-600 border-b border-dashed border-slate-200">
                <span className="font-bold">ملاحظات:</span> {invoice.notes}
              </div>
            )}

            {/* Barcode/Reference block */}
            <div className="pt-2 text-center space-y-1">
              <div className="font-mono text-[9px] tracking-widest text-slate-500">
                * {invoice.invoiceNumber || invoice.id} *
              </div>
              <div className="text-[9px] text-slate-500">
                شكراً لتعاونكم - يرجى الاحتفاظ بالإيصال
              </div>
              <div className="text-[8px] text-slate-400">
                نظام إلكتروني موثق محاسبياً
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
