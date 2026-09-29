import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Download, Building, Tag, Wrench, DollarSign } from 'lucide-react';
import { Expense, MaintenanceRequest, ExpenseCategory, Property, Vendor } from '../../../types/erp';
import { formatMoney, formatDate, formatTime, toWesternDigits } from '../../../utils/formatters';

export type ReportType = 'EXPENSES' | 'MAINTENANCE' | 'BY_CATEGORY' | 'BY_PROPERTY';

interface ReportPrintModalProps {
  reportType: ReportType;
  expenses: Expense[];
  maintenanceList: MaintenanceRequest[];
  categoryStats: any[];
  propertyStats: any[];
  totalExpensesAmount: number;
  totalMaintenanceActual: number;
  totalMaintenanceExpected: number;
  dateFrom?: string;
  dateTo?: string;
  propertyName?: string;
  onClose: () => void;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  reportType,
  expenses,
  maintenanceList,
  categoryStats,
  propertyStats,
  totalExpensesAmount,
  totalMaintenanceActual,
  totalMaintenanceExpected,
  dateFrom,
  dateTo,
  propertyName,
  onClose,
}) => {
  // Default orientation based on column count and width
  const defaultOrientation: 'portrait' | 'landscape' = 
    reportType === 'EXPENSES' || reportType === 'MAINTENANCE' ? 'landscape' : 'portrait';

  const [currentOrientation, setCurrentOrientation] = useState<'portrait' | 'landscape'>(defaultOrientation);

  useEffect(() => {
    // Add print class to document body so other app elements are cleanly hidden
    document.body.classList.add('is-printing-statement');

    // Automatically invoke real browser print dialog
    const timer = setTimeout(() => {
      window.print();
    }, 200);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('is-printing-statement');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'EXPENSES':
        return 'تقرير المصروفات التشغيلية والرأسمالية التفصيلي';
      case 'MAINTENANCE':
        return 'تقرير متابعة طلبات وتكاليف الصيانة الدورية والطارئة';
      case 'BY_CATEGORY':
        return 'تقرير تحليلي للمصروفات حسب بنود التصنيف المحاسبي';
      case 'BY_PROPERTY':
        return 'تقرير تحليلي للمصروفات التشغيلية حسب العقارات والمجمعات';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto statement-modal-overlay">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col my-auto max-h-[95vh] statement-modal-card"
        dir="rtl"
      >
        {/* Print Controls Top Bar (Hidden on Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-900 text-white gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm truncate block">
                معاينة وطباعة التقرير المالي الرسمي (قياس A4)
              </span>
              <span className="text-[10px] text-slate-400">
                {getReportTitle()} • التوجيه الحالي: {currentOrientation === 'landscape' ? 'أفقي (Landscape)' : 'عمودي (Portrait)'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setCurrentOrientation('portrait')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  currentOrientation === 'portrait' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                عمودي (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setCurrentOrientation('landscape')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  currentOrientation === 'landscape' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                أفقي (Landscape)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="فتح نافذة طباعة المتصفح (Ctrl+P)"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>طباعة التقرير الآن (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-white print:p-0 print:overflow-visible statement-printable-sheet flex-1">
          {/* Print Orientation and Stylesheet */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 ${currentOrientation};
                margin: ${currentOrientation === 'landscape' ? '10mm 10mm' : '10mm 12mm'};
              }
              body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print\\:hidden,
              aside,
              header,
              nav,
              button {
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

          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-emerald-700 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    🏢
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900">
                      نظام إدارة العقارات الذكي - Smart Property ERP
                    </h1>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                      الإدارة المالية والتشغيلية • تقارير المصروفات وخدمات الصيانة
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-left text-[11px] sm:text-xs text-slate-600 space-y-0.5 shrink-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">تقرير مالي رسمي معتمد</div>
                <div>تاريخ الاستخراج: <span className="font-mono font-bold text-slate-800">{formatDate(new Date())}</span></div>
                <div>وقت الإصدار: <span className="font-mono text-slate-800">{formatTime(new Date())}</span></div>
              </div>
            </div>

            {/* Report Title Bar */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">{getReportTitle()}</h2>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 mt-1 font-mono">
                  {dateFrom && <span>من تاريخ: <strong>{formatDate(dateFrom)}</strong></span>}
                  {dateTo && <span>إلى تاريخ: <strong>{formatDate(dateTo)}</strong></span>}
                  {propertyName && propertyName !== 'ALL' && <span>العقار: <strong>{propertyName}</strong></span>}
                </div>
              </div>

              <div className="text-left bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs">
                <span className="text-slate-500 text-[10px] block">إجمالي مبالغ التقرير:</span>
                <span className="font-black text-emerald-800 text-sm">
                  {formatMoney(reportType === 'MAINTENANCE' ? totalMaintenanceActual : totalExpensesAmount)} ر.ي
                </span>
              </div>
            </div>
          </div>

          {/* TABLE CONTENT BASED ON REPORT TYPE */}

          {/* 1. EXPENSES REPORT (Detailed) */}
          {reportType === 'EXPENSES' && (
            <table className="w-full text-right text-[11px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2 px-2.5 border border-slate-200 text-center w-12">#</th>
                  <th className="py-2 px-2.5 border border-slate-200">رقم السند</th>
                  <th className="py-2 px-2.5 border border-slate-200">التاريخ</th>
                  <th className="py-2 px-2.5 border border-slate-200">التصنيف المحاسبي</th>
                  <th className="py-2 px-2.5 border border-slate-200">البيان والشرح</th>
                  <th className="py-2 px-2.5 border border-slate-200">العقار / الوحدة</th>
                  <th className="py-2 px-2.5 border border-slate-200 text-left">المبلغ (ر.ي)</th>
                  <th className="py-2 px-2.5 border border-slate-200 text-center">طريقة الصرف</th>
                  <th className="py-2 px-2.5 border border-slate-200 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 font-bold">
                      لا توجد بيانات سندات مصروفات مطابقة للخيارات المحددة
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp, idx) => (
                    <tr key={exp.id} className="border-b border-slate-200 even:bg-slate-50/50">
                      <td className="py-1.5 px-2 text-center text-slate-500 font-mono">{toWesternDigits(idx + 1)}</td>
                      <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{toWesternDigits(exp.expenseNumber)}</td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-600">{formatDate(exp.expenseDate)}</td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800">{exp.categoryName}</td>
                      <td className="py-1.5 px-2.5 text-slate-700 max-w-xs">{exp.description}</td>
                      <td className="py-1.5 px-2.5 text-slate-700">
                        {exp.propertyName || 'مصروف عام'} {exp.unitNumber ? `(وحدة ${toWesternDigits(exp.unitNumber)})` : ''}
                      </td>
                      <td className="py-1.5 px-2.5 text-left font-mono font-bold text-slate-900">
                        {formatMoney(exp.amount)}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-600">
                        {exp.paymentMethod === 'CASH' ? 'نقداً' : exp.paymentMethod === 'BANK_TRANSFER' ? 'بنكي' : 'شيك'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold">
                        {exp.status === 'POSTED' ? 'مرحل' : exp.status === 'APPROVED' ? 'معتمد' : exp.status === 'REVERSED' ? 'معكوس' : exp.status === 'CANCELLED' ? 'ملغى' : 'مسودة'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={6} className="py-2.5 px-3 text-right">
                    إجمالي مبالغ المصروفات ({toWesternDigits(expenses.length)} سند):
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono text-emerald-400">
                    {formatMoney(totalExpensesAmount)} ر.ي
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 2. MAINTENANCE REPORT (Detailed) */}
          {reportType === 'MAINTENANCE' && (
            <table className="w-full text-right text-[11px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2 px-2 border border-slate-200 text-center w-10">#</th>
                  <th className="py-2 px-2.5 border border-slate-200">رقم البلاغ</th>
                  <th className="py-2 px-2.5 border border-slate-200">تاريخ الطلب</th>
                  <th className="py-2 px-2.5 border border-slate-200">العقار / الوحدة</th>
                  <th className="py-2 px-2.5 border border-slate-200">مقدم الطلب</th>
                  <th className="py-2 px-2.5 border border-slate-200">وصف المشكلة / العطل</th>
                  <th className="py-2 px-2 border border-slate-200 text-center">الأولوية</th>
                  <th className="py-2 px-2.5 border border-slate-200">الفني المكلف</th>
                  <th className="py-2 px-2.5 border border-slate-200 text-left">التكلفة التقديرية</th>
                  <th className="py-2 px-2.5 border border-slate-200 text-left">التكلفة الفعلية</th>
                  <th className="py-2 px-2 border border-slate-200 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-slate-400 font-bold">
                      لا توجد طلبات صيانة مطابقة للخيارات المحددة
                    </td>
                  </tr>
                ) : (
                  maintenanceList.map((mnt, idx) => (
                    <tr key={mnt.id} className="border-b border-slate-200 even:bg-slate-50/50">
                      <td className="py-1.5 px-2 text-center text-slate-500 font-mono">{toWesternDigits(idx + 1)}</td>
                      <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{toWesternDigits(mnt.maintenanceNumber)}</td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-600">{formatDate(mnt.requestDate)}</td>
                      <td className="py-1.5 px-2.5 text-slate-700">
                        {mnt.propertyName || 'عام'} {mnt.unitNumber ? `(وحدة ${toWesternDigits(mnt.unitNumber)})` : ''}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-800 font-medium">{mnt.requesterName}</td>
                      <td className="py-1.5 px-2.5 text-slate-700 max-w-xs">{mnt.problemDescription}</td>
                      <td className="py-1.5 px-2 text-center font-bold">
                        {mnt.priority === 'URGENT' ? 'عاجل' : mnt.priority === 'HIGH' ? 'عالي' : mnt.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-700">{mnt.vendorName || '-'}</td>
                      <td className="py-1.5 px-2.5 text-left font-mono text-slate-600">{formatMoney(mnt.expectedCost)}</td>
                      <td className="py-1.5 px-2.5 text-left font-mono font-bold text-emerald-800">{formatMoney(mnt.actualCost)}</td>
                      <td className="py-1.5 px-2 text-center font-bold">
                        {mnt.status === 'COMPLETED' ? 'مكتمل' : mnt.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : mnt.status === 'APPROVED' ? 'معتمد' : mnt.status === 'REVIEW' ? 'مراجعة' : mnt.status === 'CANCELLED' ? 'ملغى' : 'جديد'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={8} className="py-2.5 px-3 text-right">
                    إجمالي تكاليف أعمال الصيانة ({toWesternDigits(maintenanceList.length)} طلب):
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono text-slate-300">{formatMoney(totalMaintenanceExpected)}</td>
                  <td className="py-2.5 px-3 text-left font-mono text-amber-400">{formatMoney(totalMaintenanceActual)} ر.ي</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 3. BY CATEGORY REPORT */}
          {reportType === 'BY_CATEGORY' && (
            <table className="w-full text-right text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 border border-slate-200 text-center w-12">#</th>
                  <th className="py-2.5 px-3 border border-slate-200">كود التصنيف</th>
                  <th className="py-2.5 px-3 border border-slate-200">اسم التصنيف المحاسبي</th>
                  <th className="py-2.5 px-3 border border-slate-200">رمز الحساب بالأستاذ</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-center">عدد السندات</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-left">إجمالي المبلغ (ر.ي)</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-left">النسبة المئوية %</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((c, idx) => (
                  <tr key={c.id} className="border-b border-slate-200 even:bg-slate-50/50">
                    <td className="py-2 px-3 text-center text-slate-500 font-mono">{toWesternDigits(idx + 1)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{toWesternDigits(c.code)}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{c.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{toWesternDigits(c.accountCode || '5101')}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">{toWesternDigits(c.count)}</td>
                    <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">{formatMoney(c.amount)}</td>
                    <td className="py-2 px-3 text-left font-mono text-slate-700">{toWesternDigits(c.percent)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={5} className="py-2.5 px-3 text-right">الإجمالي الكلي:</td>
                  <td className="py-2.5 px-3 text-left font-mono text-emerald-400">{formatMoney(totalExpensesAmount)} ر.ي</td>
                  <td className="py-2.5 px-3 text-left font-mono">100%</td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 4. BY PROPERTY REPORT */}
          {reportType === 'BY_PROPERTY' && (
            <table className="w-full text-right text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 border border-slate-200 text-center w-12">#</th>
                  <th className="py-2.5 px-3 border border-slate-200">العقار / المجمع</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-center">عدد الوحدات</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-center">عدد السندات</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-left">تكاليف الصيانة (ر.ي)</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-left">المصروفات التشغيلية (ر.ي)</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-left">إجمالي المصروفات (ر.ي)</th>
                  <th className="py-2.5 px-3 border border-slate-200 text-left">النسبة المئوية %</th>
                </tr>
              </thead>
              <tbody>
                {propertyStats.map((p, idx) => (
                  <tr key={p.id} className="border-b border-slate-200 even:bg-slate-50/50">
                    <td className="py-2 px-3 text-center text-slate-500 font-mono">{toWesternDigits(idx + 1)}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-600">{toWesternDigits(p.unitsCount)}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">{toWesternDigits(p.expensesCount)}</td>
                    <td className="py-2 px-3 text-left font-mono text-amber-700 font-semibold">{formatMoney(p.maintenanceCost)}</td>
                    <td className="py-2 px-3 text-left font-mono text-slate-700">{formatMoney(p.operatingExp)}</td>
                    <td className="py-2 px-3 text-left font-mono font-black text-slate-900">{formatMoney(p.totalExpenses)}</td>
                    <td className="py-2 px-3 text-left font-mono text-slate-700">{toWesternDigits(p.percent)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={6} className="py-2.5 px-3 text-right">الإجمالي الكلي:</td>
                  <td className="py-2.5 px-3 text-left font-mono text-emerald-400">{formatMoney(totalExpensesAmount)} ر.ي</td>
                  <td className="py-2.5 px-3 text-left font-mono">100%</td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Official Signatures Footer */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="font-bold text-slate-800 mb-8">إعداد ومراجعة الحسابات</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-slate-600 font-medium">التوقيع / الختم</div>
            </div>
            <div>
              <div className="font-bold text-slate-800 mb-8">المشرف المالي والتشغيلي</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-slate-600 font-medium">التوقيع / الختم</div>
            </div>
            <div>
              <div className="font-bold text-slate-800 mb-8">اعتماد المدير العام</div>
              <div className="border-t border-dashed border-slate-400 pt-1 text-slate-600 font-medium">التوقيع / الختم الرسمي</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
