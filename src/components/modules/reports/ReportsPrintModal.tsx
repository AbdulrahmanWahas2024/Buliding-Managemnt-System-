import React, { useEffect, useState } from 'react';
import { X, Printer, Download, Building2 } from 'lucide-react';
import { formatNumber, toWesternDigits } from '../../../utils/formatters';
import { 
  formatReportStatus, 
  formatAccountNature, 
  formatAccountType, 
  formatPropertyType, 
  formatUnitType, 
  formatPaymentMethod, 
  formatTransactionType, 
  formatPriority 
} from '../../../utils/reportFormatters';

interface ColumnDef {
  header: string;
  key: string;
  align?: 'right' | 'center' | 'left';
  render?: (val: any, row: any) => React.ReactNode;
}

interface ReportsPrintModalProps {
  reportTitle: string;
  reportSubtitle?: string;
  dateRangeText?: string;
  filterSummary?: string[];
  columns: ColumnDef[];
  data: any[];
  summaryCards?: { label: string; value: string | number; badge?: string }[];
  onClose: () => void;
  onExportExcel?: () => void;
}

export const ReportsPrintModal: React.FC<ReportsPrintModalProps> = ({
  reportTitle,
  reportSubtitle,
  dateRangeText,
  filterSummary = [],
  columns,
  data,
  summaryCards = [],
  onClose,
  onExportExcel
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    columns.length > 7 ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    document.body.classList.add('is-printing-statement');
    return () => {
      document.body.classList.remove('is-printing-statement');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-GB');
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:z-auto">
      {/* Container */}
      <div className={`bg-white rounded-2xl shadow-2xl flex flex-col w-full max-h-[96vh] print:max-h-none print:shadow-none print:rounded-none ${
        orientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl'
      }`}>
        {/* Controls Toolbar (Hidden in print) */}
        <div className="print:hidden p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">معاينة التقرير للطباعة الرسمية A4</h2>
              <p className="text-xs text-slate-500">جاهز للطباعة الورقية أو التصدير بتنسيق PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Orientation selector */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white text-xs">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  orientation === 'portrait' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                عمودي (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  orientation === 'landscape' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                أفقي (Landscape)
              </button>
            </div>

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المستند</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Sheet */}
        <div className="overflow-y-auto p-6 sm:p-8 print:p-4 print:overflow-visible flex-1 text-slate-900 font-sans" dir="rtl">
          {/* Printable Official Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-base font-black text-slate-900">نظام إدارة العقارات الذكي</h1>
                    <p className="text-[11px] text-slate-500 font-medium">Smart Property ERP - الإدارة العامة للأملاك والأصول</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-black text-slate-800">
                  تقرير رسمي معتمد
                </span>
                <p className="text-[11px] text-slate-500 mt-1">نسخة استخراج النظام</p>
              </div>

              <div className="text-left text-xs text-slate-600 space-y-0.5">
                <div><span className="font-semibold text-slate-800">تاريخ الطباعة:</span> {toWesternDigits(currentDate)}</div>
                <div><span className="font-semibold text-slate-800">وقت الطباعة:</span> {toWesternDigits(currentTime)}</div>
                <div><span className="font-semibold text-slate-800">عدد السجلات:</span> {toWesternDigits(data.length)}</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">{reportTitle}</h2>
                {reportSubtitle && (
                  <p className="text-xs text-slate-600 mt-0.5">{reportSubtitle}</p>
                )}
              </div>
              {dateRangeText && (
                <div className="text-xs bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md text-emerald-800 font-semibold">
                  الفترة: {toWesternDigits(dateRangeText)}
                </div>
              )}
            </div>

            {/* Active Filters Summary */}
            {filterSummary.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700">المحددات:</span>
                {filterSummary.map((f, i) => (
                  <span key={i} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                    {toWesternDigits(f)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Summary Cards (if present) */}
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 print:gap-2">
              {summaryCards.map((sc, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 print:bg-white">
                  <div className="text-[11px] text-slate-500 font-medium">{sc.label}</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {typeof sc.value === 'number' ? formatNumber(sc.value) : toWesternDigits(String(sc.value))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-400">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200 text-slate-800 font-black border-b border-slate-300">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`py-2.5 px-3 ${
                        col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-8 text-center text-slate-400">
                      لا توجد بيانات مطابقة لمعايير البحث الحالية
                    </td>
                  </tr>
                ) : (
                  data.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`hover:bg-slate-50/60 ${rIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-medium">
                        {toWesternDigits(rIdx + 1)}
                      </td>
                      {columns.map((col, cIdx) => {
                        const val = row[col.key];
                        let formattedFallback = toWesternDigits(val ?? '-');
                        if (typeof val === 'number') {
                          formattedFallback = formatNumber(val);
                        } else if (val) {
                          if (col.key === 'status' || col.key === 'contractStatus') {
                            formattedFallback = formatReportStatus(val);
                          } else if (col.key === 'accountType') {
                            formattedFallback = formatAccountType(val);
                          } else if (col.key === 'nature' || col.key === 'accountNature') {
                            formattedFallback = formatAccountNature(val);
                          } else if (col.key === 'paymentMethod') {
                            formattedFallback = formatPaymentMethod(val);
                          } else if (col.key === 'priority') {
                            formattedFallback = formatPriority(val);
                          } else if (col.key === 'transactionType') {
                            formattedFallback = formatTransactionType(val);
                          } else if (col.key === 'type') {
                            formattedFallback = row.buildingCount !== undefined ? formatPropertyType(val) : formatUnitType(val);
                          }
                        }

                        return (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 text-slate-700 ${
                              col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                            }`}
                          >
                            {col.render ? (
                              col.render(val, row)
                            ) : typeof val === 'number' ? (
                              <span className="font-semibold text-slate-900">{formattedFallback}</span>
                            ) : (
                              formattedFallback
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Printable Official Footer & Signatures */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500">
            <div>
              <p>تم استخراج هذا التقرير آلياً عبر نظام إدارة العقارات والأملاك الذكي ERP.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">التوقيع والختم المعتمد يمنح التقرير الصفة القانونية الكاملة.</p>
            </div>
            <div className="flex gap-8 text-center text-slate-700">
              <div className="w-28 pt-6 border-t border-dashed border-slate-400">
                <span className="font-bold">المحاسب المالي</span>
              </div>
              <div className="w-28 pt-6 border-t border-dashed border-slate-400">
                <span className="font-bold">مدير الأملاك</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
