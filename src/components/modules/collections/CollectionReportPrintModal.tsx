import React, { useState } from 'react';
import { X, Printer, FileText, CheckCircle2, ShieldCheck, Building2, User, Calendar, DollarSign } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportType: string;
  data: {
    rows: any[];
    summary: any;
  } | null;
  filterSummary: {
    property?: string;
    center?: string;
    cashBox?: string;
    period?: string;
    paymentMethod?: string;
  };
}

export const CollectionReportPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  reportType,
  data,
  filterSummary
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    reportType === 'property' || reportType === 'daily' ? 'landscape' : 'portrait'
  );

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'daily': return 'تقرير التحصيل والقبض اليومي المفصل';
      case 'cashier': return 'تقرير التحصيل حسب أمناء الصناديق (الكاشير)';
      case 'center': return 'تقرير التحصيل حسب مراكز وفروع التحصيل';
      case 'property': return 'تقرير إيرادات التحصيل حسب العقارات والأصول';
      case 'payment_method': return 'تقرير التحصيل حسب طرق وقنوات الدفع';
      case 'cancelled': return 'تقرير سندات القبض الملغاة والمعكوسة رقابياً';
      case 'receivables': return 'تقرير الذمم المدينة والمبالغ المستحقة غير المحصلة';
      default: return 'تقرير التحصيل المالي العام';
    }
  };

  const rows = data.rows || [];
  const summary = data.summary || {};

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
          #report-print-container, #report-print-container * {
            visibility: visible;
          }
          #report-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 12mm;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden animate-fadeIn print:max-h-none print:w-full print:border-none print:shadow-none print:rounded-none">
        {/* Toolbar (Screen only) */}
        <div className="flex flex-wrap items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50 shrink-0 gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {getReportTitle()}
              </h3>
              <p className="text-[11px] text-slate-500">
                معاينة جاهزة للطباعة الورقية وتصدير PDF الرسمية A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  orientation === 'portrait' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                }`}
              >
                طولي (A4 Portrait)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  orientation === 'landscape' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                }`}
              >
                عرضي (A4 Landscape)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:p-0 print:bg-white">
          <div 
            id="report-print-container" 
            className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-none print:p-4 text-slate-800"
            dir="rtl"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900">
                  شركة الوهاس لإدارة وتطوير العقارات
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  نظام إدارة الأملاك الذكي - إدارة التحصيل والمقبوضات الخزنية
                </p>
                <h2 className="text-sm font-black text-emerald-800 mt-2">
                  {getReportTitle()}
                </h2>
              </div>

              <div className="text-left font-mono text-[11px] text-slate-500">
                <span className="block font-bold text-slate-700 font-sans">تاريخ التقرير:</span>
                <span>{new Date().toISOString().slice(0, 10)}</span>
                <span className="block mt-1 font-sans">الوقت: {new Date().toLocaleTimeString('ar-YE')}</span>
              </div>
            </div>

            {/* Filter Summary Ribbon */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">العقار:</span>
                <span className="font-bold text-slate-800">{filterSummary.property || 'كافة العقارات'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">مركز التحصيل:</span>
                <span className="font-bold text-slate-800">{filterSummary.center || 'كافة المراكز'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الصندوق الخزني:</span>
                <span className="font-bold text-slate-800">{filterSummary.cashBox || 'كافة الصناديق'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الفترة / التاريخ:</span>
                <span className="font-bold text-slate-800">{filterSummary.period || 'كافة الفترات'}</span>
              </div>
            </div>

            {/* Summary Highlights */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-emerald-800">إجمالي المحصل الصافي</span>
                  <span className="block text-base font-black text-emerald-950 font-mono mt-0.5">
                    {formatMoney(summary.netCollected || 0)} ر.ي
                  </span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-blue-800">عدد السندات المحصلة</span>
                  <span className="block text-base font-black text-blue-950 font-mono mt-0.5">
                    {summary.totalReceipts || rows.length} سند
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-rose-800">سندات ملغاة</span>
                  <span className="block text-base font-black text-rose-950 font-mono mt-0.5">
                    {formatMoney(summary.totalCancelled || 0)} ر.ي
                  </span>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-purple-800">سندات معكوسة</span>
                  <span className="block text-base font-black text-purple-950 font-mono mt-0.5">
                    {formatMoney(summary.totalReversed || 0)} ر.ي
                  </span>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="p-2 border border-slate-700">#</th>
                    {reportType === 'daily' ? (
                      <>
                        <th className="p-2 border border-slate-700">التاريخ</th>
                        <th className="p-2 border border-slate-700 text-center">عدد السندات</th>
                        <th className="p-2 border border-slate-700 text-left">نقدياً (كاش)</th>
                        <th className="p-2 border border-slate-700 text-left">حوالات وبنوك</th>
                        <th className="p-2 border border-slate-700 text-left">ملغى / معكوس</th>
                        <th className="p-2 border border-slate-700 text-left">الإجمالي المحصل</th>
                      </>
                    ) : reportType === 'cashier' ? (
                      <>
                        <th className="p-2 border border-slate-700">أمين الصندوق (الكاشير)</th>
                        <th className="p-2 border border-slate-700 text-center">عدد السندات</th>
                        <th className="p-2 border border-slate-700 text-left">التحصيل النقدي</th>
                        <th className="p-2 border border-slate-700 text-left">التحصيل غير النقدي</th>
                        <th className="p-2 border border-slate-700 text-left">إجمالي المحصل</th>
                      </>
                    ) : reportType === 'property' ? (
                      <>
                        <th className="p-2 border border-slate-700">العقار</th>
                        <th className="p-2 border border-slate-700 text-center">عدد السندات</th>
                        <th className="p-2 border border-slate-700 text-left">تحصيل الإيجار</th>
                        <th className="p-2 border border-slate-700 text-left">تحصيل الكهرباء</th>
                        <th className="p-2 border border-slate-700 text-left">تحصيل المياه</th>
                        <th className="p-2 border border-slate-700 text-left">إجمالي المحصل</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border border-slate-700">رقم السند</th>
                        <th className="p-2 border border-slate-700">التاريخ</th>
                        <th className="p-2 border border-slate-700">المستأجر</th>
                        <th className="p-2 border border-slate-700">العقار والوحدة</th>
                        <th className="p-2 border border-slate-700">النوع</th>
                        <th className="p-2 border border-slate-700">طريقة الدفع</th>
                        <th className="p-2 border border-slate-700 text-left">المبلغ</th>
                        <th className="p-2 border border-slate-700 text-center">الحالة</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500 font-bold border">
                        لا توجد بيانات مطابقة لمعايير التقرير
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 border border-slate-200 text-slate-500 text-center">{idx + 1}</td>
                        {reportType === 'daily' ? (
                          <>
                            <td className="p-2 border border-slate-200 font-mono font-bold">{row.date}</td>
                            <td className="p-2 border border-slate-200 text-center">{row.receipt_count}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{formatMoney(row.cash_amount)}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{formatMoney(row.non_cash_amount)}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono text-rose-600">{formatMoney(Number(row.cancelled_amount || 0) + Number(row.reversed_amount || 0))}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono font-bold text-emerald-800">{formatMoney(row.total_collected)}</td>
                          </>
                        ) : reportType === 'cashier' ? (
                          <>
                            <td className="p-2 border border-slate-200 font-bold">{row.collector_name || 'غير محدد'}</td>
                            <td className="p-2 border border-slate-200 text-center">{row.receipt_count}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{formatMoney(row.cash_amount)}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{formatMoney(row.non_cash_amount)}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono font-bold text-emerald-800">{formatMoney(row.total_collected)}</td>
                          </>
                        ) : reportType === 'property' ? (
                          <>
                            <td className="p-2 border border-slate-200 font-bold">{row.property_name}</td>
                            <td className="p-2 border border-slate-200 text-center">{row.receipt_count}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{formatMoney(row.rent_amount)}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{formatMoney(row.electricity_amount)}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{formatMoney(row.water_amount)}</td>
                            <td className="p-2 border border-slate-200 text-left font-mono font-bold text-emerald-800">{formatMoney(row.total_collected)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border border-slate-200 font-mono font-bold">{row.receipt_number || row.receiptNumber}</td>
                            <td className="p-2 border border-slate-200 font-mono">{(row.collected_at || row.collectedAt || '').slice(0, 10)}</td>
                            <td className="p-2 border border-slate-200 font-semibold">{row.tenant_name || row.tenantName}</td>
                            <td className="p-2 border border-slate-200">{row.property_name || row.propertyName} ({row.unit_number || row.unitNumber})</td>
                            <td className="p-2 border border-slate-200 font-semibold">
                              {(row.account_type || row.accountType) === 'RENT' ? 'إيجار' :
                               (row.account_type || row.accountType) === 'ELECTRICITY' ? 'كهرباء' :
                               (row.account_type || row.accountType) === 'WATER' ? 'مياه' : 'خدمات'}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {(row.payment_method || row.paymentMethod) === 'CASH' ? 'نقدي' :
                               (row.payment_method || row.paymentMethod) === 'BANK_TRANSFER' ? 'تحويل' :
                               (row.payment_method || row.paymentMethod) === 'CHECK' ? 'شيك' : 'محفظة'}
                            </td>
                            <td className="p-2 border border-slate-200 text-left font-mono font-bold">
                              {formatMoney(row.amount_paid || row.amountPaid)} ر.ي
                            </td>
                            <td className="p-2 border border-slate-200 text-center">
                              {(row.status === 'CANCELLED') ? (
                                <span className="text-rose-600 font-bold">ملغى</span>
                              ) : (row.status === 'REVERSED') ? (
                                <span className="text-purple-600 font-bold">معكوس</span>
                              ) : (
                                <span className="text-emerald-700 font-bold">معتمد</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="mt-10 pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <span className="block font-bold text-slate-600 mb-6">المحاسب المالي</span>
                <span className="border-t border-slate-400 pt-1 block font-bold text-slate-800">
                  م. أحمد الوهاس
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-600 mb-6">أمين الصندوق الرئيسي</span>
                <span className="border-t border-slate-400 pt-1 block font-bold text-slate-800">
                  عصام العديني
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-600 mb-6">المدير المالي والاعتماد</span>
                <span className="border-t border-slate-400 pt-1 block font-bold text-slate-800">
                  الختم والاعتماد الرسمي
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
