import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle2, RotateCw } from 'lucide-react';
import { formatMoney, formatDate, formatTime, toWesternDigits } from '../../../utils/formatters';

export interface PrintColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'right' | 'left' | 'center';
}

interface StatementPrintModalProps {
  title: string;
  subtitle?: string;
  metadata: {
    label: string;
    value: string;
  }[];
  openingBalance?: number;
  transactions: {
    date: string;
    reference: string;
    description: string;
    accountType?: string;
    debit: number;
    credit: number;
    runningBalance: number;
    status?: string;
    [key: string]: any;
  }[];
  totals: {
    totalDebits: number;
    totalCredits: number;
    closingBalance: number;
  };
  onClose: () => void;
  orientation?: 'portrait' | 'landscape';
  columns?: PrintColumn[];
}

export const StatementPrintModal: React.FC<StatementPrintModalProps> = ({
  title,
  subtitle,
  metadata,
  openingBalance,
  transactions,
  totals,
  onClose,
  orientation = 'portrait',
  columns
}) => {
  const [currentOrientation, setCurrentOrientation] = useState<'portrait' | 'landscape'>(orientation);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    // Add print class to body so only this report is printed cleanly
    document.body.classList.add('is-printing-statement');

    // Automatically trigger browser system print dialog per requirement:
    // "Clicking 'طباعة' must open the browser's real print dialog.
    // Use: window.print() ... Do NOT merely open a visual preview without invoking printing."
    const timer = setTimeout(() => {
      window.print();
    }, 180);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('is-printing-statement');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto statement-modal-overlay">
      {/* Container with responsive max height and clean scroll */}
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl lg:max-w-6xl overflow-hidden flex flex-col my-auto max-h-[94vh] statement-modal-card"
        dir="rtl"
      >
        {/* Modal Controls Top Bar (Hidden on Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-900 text-white gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-blue-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm truncate">معاينة التقرير والطباعة الرسمية (A4)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setCurrentOrientation('portrait')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentOrientation === 'portrait' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                عمودي (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setCurrentOrientation('landscape')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentOrientation === 'landscape' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                أفقي (Landscape)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm min-h-[36px]"
              title="فتح نافذة طباعة المتصفح (Ctrl+P)"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة المستند الآن</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-4 sm:p-8 lg:p-10 overflow-y-auto bg-white print:p-0 print:overflow-visible statement-printable-sheet">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 ${currentOrientation};
                margin: 10mm 12mm;
              }
              body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              table thead {
                display: table-header-group !important;
              }
              table tfoot {
                display: table-footer-group !important;
              }
              table, tr, td, th {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}} />

          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 bg-blue-700 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                    🏢
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900">نظام إدارة العقارات الذكي - Smart Property ERP</h1>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">الإدارة المالية والحسابات العامة • قسم كشوفات الحسابات ودفتر الأستاذ</p>
                  </div>
                </div>
              </div>

              <div className="text-left text-[11px] sm:text-xs text-slate-600 space-y-0.5 shrink-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">كشف مالي رسمي معتمد</div>
                <div>تاريخ الاستخراج: <span className="font-mono font-bold text-slate-800">{formatDate(new Date())}</span></div>
                <div>وقت الإصدار: <span className="font-mono text-slate-800">{formatTime(new Date())}</span></div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide">{title}</h2>
              {subtitle && <p className="text-xs text-slate-600 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs">
            {metadata.map((m, idx) => (
              <div key={idx} className="space-y-0.5 min-w-0">
                <span className="text-slate-500 block text-[11px] truncate">{m.label}:</span>
                <span className="font-bold text-slate-900 font-mono break-words">{toWesternDigits(m.value)}</span>
              </div>
            ))}
          </div>

          {/* Opening Balance Notification if exists */}
          {openingBalance !== undefined && (
            <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl mb-4 text-xs print-avoid-break">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-950">الرصيد الافتتاحي (قبل بداية فترة الكشف):</span>
                <span className="text-blue-700 text-[11px] hidden sm:inline">مجموع المستحقات غير المسددة السابقة</span>
              </div>
              <div className="font-mono font-bold text-sm text-blue-900">
                {formatMoney(openingBalance)} <span className="text-xs font-normal">ر.ي</span>
              </div>
            </div>
          )}

          {/* Transactions / Balances Table */}
          <div className="border border-slate-300 rounded-xl overflow-x-auto mb-6">
            <table className="w-full text-xs text-right border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                  {columns && columns.length > 0 ? (
                    <>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      {columns.map((col, idx) => (
                        <th 
                          key={idx} 
                          className={`py-2.5 px-3 ${col.width || ''} text-${col.align || 'right'}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-24">التاريخ</th>
                      <th className="py-2.5 px-3 w-32">المرجع</th>
                      <th className="py-2.5 px-3">البيان والشرح التفصيلي</th>
                      <th className="py-2.5 px-3 w-28 text-left">مدين (ر.ي)</th>
                      <th className="py-2.5 px-3 w-28 text-left">دائن (ر.ي)</th>
                      <th className="py-2.5 px-3 w-32 text-left">الرصيد المستحق (ر.ي)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={columns ? columns.length + 1 : 7} className="py-8 text-center text-slate-400">
                      لا توجد حركات مالية مسجلة خلال الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      {columns && columns.length > 0 ? (
                        columns.map((col, cIdx) => {
                          const val = tx[col.key];
                          const isNumeric = typeof val === 'number';
                          return (
                            <td 
                              key={cIdx} 
                              className={`py-2 px-3 text-${col.align || 'right'} ${
                                isNumeric ? 'font-mono font-bold' : ''
                              } ${
                                col.key === 'debit' && val > 0 ? 'text-amber-700' :
                                col.key === 'credit' && val > 0 ? 'text-emerald-700' :
                                col.key === 'closing' || col.key === 'runningBalance' ? 'text-slate-900 font-black' :
                                'text-slate-800'
                              }`}
                            >
                              {isNumeric ? (val !== 0 ? formatMoney(val) : '-') : (toWesternDigits(val) || '-')}
                            </td>
                          );
                        })
                      ) : (
                        <>
                          <td className="py-2 px-3 font-mono text-slate-700">{formatDate(tx.date)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{toWesternDigits(tx.reference)}</td>
                          <td className="py-2 px-3 text-slate-800">{tx.description}</td>
                          <td className="py-2 px-3 text-left font-mono font-bold text-amber-700">
                            {tx.debit > 0 ? formatMoney(tx.debit) : '-'}
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-bold text-emerald-700">
                            {tx.credit > 0 ? formatMoney(tx.credit) : '-'}
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                            {formatMoney(tx.runningBalance)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {/* Summary Footer Row */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-900">
                  <td colSpan={columns ? Math.max(1, columns.length - 3) + 1 : 4} className="py-2.5 px-4 text-right">
                    إجمالي حركات الفترة والرصيد الختامي المستحق:
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono text-amber-400">
                    {formatMoney(totals.totalDebits)}
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono text-emerald-400">
                    {formatMoney(totals.totalCredits)}
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono text-cyan-300 text-sm">
                    {formatMoney(totals.closingBalance)}
                  </td>
                  {columns && columns.length > 4 && (
                    <td colSpan={columns.length - 4}></td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Closing Financial Balance Hero Box */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print-avoid-break">
            <div>
              <span className="text-xs text-slate-500 block">صافي الرصيد الختامي المستحق:</span>
              <span className="text-sm font-bold text-slate-900">
                {totals.closingBalance > 0 
                  ? 'رصيد مدين (مستحق السداد لصالح المنشأة)' 
                  : totals.closingBalance < 0 
                  ? 'رصيد دائن (مستحق لصالح الطرف / أمانات)' 
                  : 'الحساب خالص ومسدد بالكامل'}
              </span>
            </div>
            <div className="text-left font-mono font-black text-xl text-slate-900">
              {formatMoney(Math.abs(totals.closingBalance))} <span className="text-xs font-normal">ريال يمني</span>
            </div>
          </div>

          {/* Official Signatures Section */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-dashed border-slate-300 text-center text-xs print-avoid-break">
            <div className="space-y-6">
              <span className="font-bold text-slate-700 block">إعداد / المحاسب المالي</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
              <span className="text-[11px] text-slate-400">التوقيع والختم</span>
            </div>
            <div className="space-y-6">
              <span className="font-bold text-slate-700 block">المراجعة والتدقيق المالي</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
              <span className="text-[11px] text-slate-400">التوقيع والختم</span>
            </div>
            <div className="space-y-6">
              <span className="font-bold text-slate-700 block">اعتماد الإدارة المالية / المدير العام</span>
              <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
              <span className="text-[11px] text-slate-400">التوقيع والختم الرسمي</span>
            </div>
          </div>

          {/* Document Footer Note */}
          <div className="mt-8 text-center text-[10px] text-slate-400 print-avoid-break">
            تم استخراج هذا الكشف آلياً من نظام Smart Property ERP المحاسبي • كافة الأرصدة والقيود مطابقة دفترياً مع قاعدة البيانات
          </div>
        </div>
      </div>
    </div>
  );
};
