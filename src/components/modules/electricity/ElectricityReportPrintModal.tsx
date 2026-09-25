import React from 'react';
import { X, Printer, Zap, FileSpreadsheet, Building2, Calendar, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'meters' | 'readings' | 'consumption' | 'billing';
  data: any;
  filterSummary?: {
    property?: string;
    period?: string;
    dateRange?: string;
  };
}

export const ElectricityReportPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  reportType,
  data,
  filterSummary
}) => {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>(
    reportType === 'billing' || reportType === 'consumption' ? 'landscape' : 'portrait'
  );

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'meters': return 'تقرير العدادات الكهربائية وحالة التركيب';
      case 'readings': return 'تقرير قراءات العدادات واستهلاك الطاقة';
      case 'billing': return 'تقرير فواتير الكهرباء والتحصيل المحاسبي';
      case 'consumption':
      default:
        return 'تقرير استهلاك الكهرباء التفصيلي والرسوم المالية';
    }
  };

  const rows = data.rows || [];
  const summary = data.summary || {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden !important;
          }
          #electricity-printable-report, #electricity-printable-report * {
            visibility: visible !important;
          }
          #electricity-printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Container - A4 friendly */}
      <div 
        id="electricity-printable-report"
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[calc(100vh-2rem)] print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none print:overflow-visible"
      >
        {/* Modal Toolbar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 bg-slate-900 text-white flex-shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold">معاينة التقرير والطباعة A4</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">نظام إدارة العقارات الذكي - إدارة الطاقة والكهرباء</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Orientation Toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${orientation === 'portrait' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                عمودي (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${orientation === 'landscape' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                أفقي (Landscape)
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المستند (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Content - Scrollable on Screen */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 text-slate-900 font-sans space-y-6 print:p-0 print:overflow-visible">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Smart Property ERP</h1>
                    <p className="text-[11px] text-slate-500 font-semibold">نظام إدارة العقارات والأملاك والخدمات المتكامل</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-lg font-black text-slate-900">{getReportTitle()}</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    تاريخ استخراج التقرير: <span className="font-mono font-bold">{new Date().toLocaleString('ar-YE')}</span>
                  </p>
                </div>
              </div>

              <div className="text-left font-mono text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>نوع التقرير: <span className="font-bold text-slate-800">{reportType.toUpperCase()}</span></div>
                {filterSummary?.property && (
                  <div>العقار: <span className="font-bold text-slate-800">{filterSummary.property}</span></div>
                )}
                {filterSummary?.period && (
                  <div>فترة الفوترة: <span className="font-bold text-slate-800">{filterSummary.period}</span></div>
                )}
                <div>إجمالي السجلات: <span className="font-bold text-slate-800">{rows.length}</span></div>
              </div>
            </div>
          </div>

          {/* Summary KPI Strip */}
          {summary && Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              {summary.totalConsumption !== undefined && (
                <div>
                  <div className="text-slate-500 text-[11px]">إجمالي الاستهلاك</div>
                  <div className="text-base font-bold font-mono text-amber-700 mt-0.5">
                    {Number(summary.totalConsumption).toLocaleString()} <span className="text-xs font-normal">ك.و/س</span>
                  </div>
                </div>
              )}
              {summary.totalAmount !== undefined && (
                <div>
                  <div className="text-slate-500 text-[11px]">إجمالي المبالغ المحتسبة</div>
                  <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                    {formatMoney(summary.totalAmount)} <span className="text-xs font-normal">ر.ي</span>
                  </div>
                </div>
              )}
              {summary.totalBilled !== undefined && (
                <div>
                  <div className="text-slate-500 text-[11px]">إجمالي الفواتير الصادرة</div>
                  <div className="text-base font-bold font-mono text-blue-700 mt-0.5">
                    {formatMoney(summary.totalBilled)} <span className="text-xs font-normal">ر.ي</span>
                  </div>
                </div>
              )}
              {summary.totalRemaining !== undefined && (
                <div>
                  <div className="text-slate-500 text-[11px]">المتبقي غير المحصل</div>
                  <div className="text-base font-bold font-mono text-rose-700 mt-0.5">
                    {formatMoney(summary.totalRemaining)} <span className="text-xs font-normal">ر.ي</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {reportType === 'meters' ? (
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">رقم العداد</th>
                    <th className="py-2.5 px-3">العقار / المبنى</th>
                    <th className="py-2.5 px-3">الوحدة</th>
                    <th className="py-2.5 px-3">المستأجر الحالي</th>
                    <th className="py-2.5 px-3 font-mono text-center">النوع</th>
                    <th className="py-2.5 px-3 font-mono text-center">القراءة الحالية</th>
                    <th className="py-2.5 px-3 font-mono text-center">المعامل</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r: any, idx: number) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.meterNumber}</td>
                      <td className="py-2 px-3">{r.propertyName}</td>
                      <td className="py-2 px-3 font-mono font-semibold">{r.unitNumber || '-'}</td>
                      <td className="py-2 px-3">{r.tenantName || 'شاغر'}</td>
                      <td className="py-2 px-3 font-mono text-center text-slate-600">{r.meterType}</td>
                      <td className="py-2 px-3 font-mono text-center font-bold text-slate-800">{Number(r.currentReading).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-center">{r.multiplier}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.status === 'ACTIVE' ? 'نشط' : r.status === 'REPLACED' ? 'مستبدل' : 'معطل'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'readings' ? (
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">رقم العداد</th>
                    <th className="py-2.5 px-3">الوحدة / العقار</th>
                    <th className="py-2.5 px-3">المستأجر</th>
                    <th className="py-2.5 px-3">الفترة</th>
                    <th className="py-2.5 px-3 font-mono text-center">السابقة</th>
                    <th className="py-2.5 px-3 font-mono text-center">الحالية</th>
                    <th className="py-2.5 px-3 font-mono text-center">الاستهلاك</th>
                    <th className="py-2.5 px-3 font-mono text-center">التعرفة</th>
                    <th className="py-2.5 px-3 font-mono text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r: any, idx: number) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.meterNumber}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-800">{r.unitNumber}</span> - {r.propertyName}
                      </td>
                      <td className="py-2 px-3">{r.tenantName || '-'}</td>
                      <td className="py-2 px-3">{r.period}</td>
                      <td className="py-2 px-3 font-mono text-center text-slate-500">{Number(r.previousReading).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-center font-bold text-slate-800">{Number(r.currentReading).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-center font-bold text-amber-700">{Number(r.consumptionKwh).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-center text-slate-600">{r.ratePerKwh}</td>
                      <td className="py-2 px-3 font-mono text-left font-bold text-emerald-700">{formatMoney(r.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'billing' ? (
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">رقم الفاتورة</th>
                    <th className="py-2.5 px-3">المستأجر</th>
                    <th className="py-2.5 px-3">العقار والوحدة</th>
                    <th className="py-2.5 px-3">الفترة</th>
                    <th className="py-2.5 px-3 font-mono text-center">الاستهلاك</th>
                    <th className="py-2.5 px-3 font-mono text-left">الإجمالي</th>
                    <th className="py-2.5 px-3 font-mono text-left">المسدد</th>
                    <th className="py-2.5 px-3 font-mono text-left">المتبقي</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r: any, idx: number) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{r.invoiceNumber}</td>
                      <td className="py-2 px-3 font-semibold">{r.tenantName}</td>
                      <td className="py-2 px-3">{r.propertyName} ({r.unitNumber})</td>
                      <td className="py-2 px-3">{r.periodMonth}</td>
                      <td className="py-2 px-3 font-mono text-center font-bold text-amber-700">{Number(r.consumptionKwh || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-left font-bold text-slate-900">{formatMoney(r.totalAmount)}</td>
                      <td className="py-2 px-3 font-mono text-left text-emerald-700">{formatMoney(r.paidAmount)}</td>
                      <td className="py-2 px-3 font-mono text-left font-bold text-rose-700">{formatMoney(r.remainingAmount)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status === 'PAID' ? 'مسدد' : 'مستحق'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">العداد</th>
                    <th className="py-2.5 px-3">العقار / المبنى</th>
                    <th className="py-2.5 px-3">الوحدة</th>
                    <th className="py-2.5 px-3">المستأجر</th>
                    <th className="py-2.5 px-3">الفترة</th>
                    <th className="py-2.5 px-3 font-mono text-center">السابقة</th>
                    <th className="py-2.5 px-3 font-mono text-center">الحالية</th>
                    <th className="py-2.5 px-3 font-mono text-center">الاستهلاك</th>
                    <th className="py-2.5 px-3 font-mono text-center">التعرفة</th>
                    <th className="py-2.5 px-3 font-mono text-left">المبلغ المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r: any, idx: number) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.meterNumber}</td>
                      <td className="py-2 px-3">{r.propertyName}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.unitNumber}</td>
                      <td className="py-2 px-3">{r.tenantName || 'غير محدد'}</td>
                      <td className="py-2 px-3">{r.period}</td>
                      <td className="py-2 px-3 font-mono text-center text-slate-500">{Number(r.previousReading).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-center font-bold text-slate-800">{Number(r.currentReading).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-center font-bold text-amber-700">{Number(r.consumptionKwh).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-center text-slate-600">{r.ratePerKwh}</td>
                      <td className="py-2 px-3 font-mono text-left font-bold text-emerald-700">{formatMoney(r.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer & Signatures */}
          <div className="pt-8 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-3 gap-8 text-center mt-12 print:mt-16">
            <div>
              <div className="font-bold text-slate-800">المسؤول عن تسجيل القراءات</div>
              <div className="mt-8 border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
              <div className="mt-1 text-[11px] text-slate-500">التوقيع والتاريخ</div>
            </div>
            <div>
              <div className="font-bold text-slate-800">المحاسب المالي</div>
              <div className="mt-8 border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
              <div className="mt-1 text-[11px] text-slate-500">التوقيع والتاريخ</div>
            </div>
            <div>
              <div className="font-bold text-slate-800">اعتماد إدارة الأملاك</div>
              <div className="mt-8 border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
              <div className="mt-1 text-[11px] text-slate-500">الختم والتوقيع</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
