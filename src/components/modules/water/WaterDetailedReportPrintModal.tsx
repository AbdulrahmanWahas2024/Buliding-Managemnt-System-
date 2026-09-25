import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Droplets, Calendar, Building2, CheckCircle2, ShieldCheck, Eye, Layers } from 'lucide-react';

interface WaterDetailedReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    reportType: string;
    filters: any;
    generatedAt: string;
    summary: {
      totalPeriodsCount: number;
      totalTankersCount: number;
      totalTankersCost: number;
      totalPumpElectricityCost: number;
      totalSewerCost: number;
      totalMaintenanceCost: number;
      totalCleaningCost: number;
      totalLaborCost: number;
      totalOtherCost: number;
      netTotalWaterCost: number;
      totalDistributedAmount: number;
      totalPostedAmount: number;
      totalDifferenceAmount: number;
      participatingUnitsCount: number;
      participatingTenantsCount: number;
    };
    monthlyBreakdown?: Array<{
      monthIndex: number;
      monthName: string;
      periodsCount: number;
      tankerCount: number;
      tankerCost: number;
      operatingCost: number;
      totalCost: number;
      distributedAmount: number;
      postedAmount: number;
      status: string;
    }>;
    periods: any[];
    tankers: any[];
    expenses: any[];
    charges: any[];
  };
  propertyName?: string;
}

export const WaterDetailedReportPrintModal: React.FC<WaterDetailedReportPrintModalProps> = ({
  isOpen,
  onClose,
  reportData,
  propertyName = 'جميع العقارات'
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('is-printing-invoice');
      return () => {
        document.body.classList.remove('is-printing-invoice');
      };
    } else {
      document.body.classList.remove('is-printing-invoice');
    }
  }, [isOpen]);

  if (!isOpen || !reportData) return null;

  const { summary, periods, tankers, expenses, charges, monthlyBreakdown, reportType, filters, generatedAt } = reportData;

  const getReportTypeTitle = () => {
    switch (reportType) {
      case 'daily': return 'تقرير استهلاك وتكاليف المياه اليومي';
      case 'monthly': return 'تقرير تكاليف واستهلاك المياه الشهري';
      case 'annual': return 'التقرير السنوي الشامل لاستهلاك وتكاليف المياه';
      case 'range': return 'تقرير تكاليف المياه لفترة زمنية محددة';
      case 'detailed': return 'التقرير التفصيلي الشامل لدورات وتوريدات وتوزيع المياه والذمم';
      default: return 'تقرير تكاليف المياه';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'POSTED': return 'مرحل للذمم';
      case 'CALCULATED': return 'تم الاحتساب';
      case 'DRAFT': return 'مسودة';
      case 'CLOSED': return 'مغلقة';
      case 'CANCELLED': return 'ملغاة';
      default: return status;
    }
  };

  const getCategoryArabic = (cat: string) => {
    switch (cat) {
      case 'PUMP_ELECTRICITY': return 'كهرباء مضخات';
      case 'SEWER': return 'صرف صحي وبيارات';
      case 'MAINTENANCE': return 'صيانة خزانات وشبكة';
      case 'CLEANING': return 'تنظيف وتعقيم';
      case 'LABOR': return 'أجور وعمالة';
      case 'TREATMENT': return 'معالجة وكلور';
      default: return 'مصاريف تشغيلية';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const printContent = (
    <div
      id="water-report-print-portal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex flex-col items-center py-6 px-3 sm:px-6"
      dir="rtl"
    >
      {/* Dynamic Print CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 10mm;
          }
          #water-report-print-portal {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .print-controls-bar {
            display: none !important;
          }
          .water-report-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
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
          .signature-section {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Floating Action Controls Bar (Hidden during print) */}
      <div className="print-controls-bar w-full max-w-5xl bg-white border border-slate-200/90 rounded-2xl shadow-xl p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs sticky top-3 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-slate-800 font-bold block text-sm">{getReportTypeTitle()}</strong>
            <span className="text-[11px] text-slate-500">طباعة A4 الرسمية متوافقة مع الأرشفة والحسابات</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Orientation switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-white text-cyan-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              طولي (Portrait)
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-white text-cyan-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرضي (Landscape)
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير / حفظ PDF</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Printable Document Sheet */}
      <div 
        className={`water-report-sheet bg-white border border-slate-300 rounded-2xl shadow-2xl p-8 text-slate-800 transition-all font-sans ${
          orientation === 'landscape' ? 'w-full max-w-[297mm]' : 'w-full max-w-[210mm]'
        }`}
      >
        {/* Header Ribbon */}
        <div className="border-b-2 border-slate-800 pb-5 mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-700 text-white flex items-center justify-center font-black text-lg">
                  💧
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    سمارت لإدارة الأملاك والعقارات (Smart Property ERP)
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    نظام إدارة دورات وايتات المياه والتحصيل المالي والتشغيلي
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left space-y-0.5 text-xs text-slate-600">
              <div className="font-bold text-slate-900 font-mono text-sm">
                كود المستند: <span className="font-mono text-cyan-800">REP-WAT-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}</span>
              </div>
              <div>تاريخ التوليد: <span className="font-mono font-medium">{new Date().toLocaleString('ar-YE')}</span></div>
              <div>العملة المعتمدة: <strong className="font-bold text-slate-800">الريال اليمني (ر.ي)</strong></div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4">
              <span className="bg-cyan-50 border border-cyan-200 text-cyan-900 px-3 py-1 rounded-lg font-black text-sm">
                {getReportTypeTitle()}
              </span>
              <span className="text-slate-600 font-medium">
                العقار: <strong className="text-slate-900">{propertyName}</strong>
              </span>
            </div>

            <div className="text-slate-500 font-mono text-[11px]">
              {filters?.startDate && filters?.endDate && (
                <span>الفترة من: {filters.startDate} إلى: {filters.endDate}</span>
              )}
              {filters?.month && <span>الشهر المختار: {filters.month}</span>}
              {filters?.year && <span>السنة: {filters.year}</span>}
              {filters?.date && <span>التاريخ: {filters.date}</span>}
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 block text-[11px]">إجمالي دورات المياه</span>
            <strong className="text-base font-bold text-slate-900 font-mono">{summary.totalPeriodsCount} دورة</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">{summary.totalTankersCount} وايت ماء مسجل</span>
          </div>

          <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl">
            <span className="text-cyan-800 block text-[11px] font-medium">إجمالي تكلفة الوايتات</span>
            <strong className="text-base font-bold text-cyan-950 font-mono">{summary.totalTankersCost.toLocaleString()} ر.ي</strong>
            <span className="text-[10px] text-cyan-700 block mt-0.5">تكلفة التوريدات الميدانية</span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <span className="text-amber-800 block text-[11px] font-medium">مصاريف التشغيل والكهرباء</span>
            <strong className="text-base font-bold text-amber-950 font-mono">
              {(summary.netTotalWaterCost - summary.totalTankersCost).toLocaleString()} ر.ي
            </strong>
            <span className="text-[10px] text-amber-700 block mt-0.5">صيانة، مضخات، وصرف صحي</span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-emerald-800 block text-[11px] font-medium">صافي التكلفة الإجمالية</span>
            <strong className="text-base font-bold text-emerald-950 font-mono">{summary.netTotalWaterCost.toLocaleString()} ر.ي</strong>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              مرحل للذمم: {summary.totalPostedAmount.toLocaleString()} ر.ي
            </span>
          </div>
        </div>

        {/* Section 1: Annual Monthly Breakdown (if Annual Report) */}
        {reportType === 'annual' && monthlyBreakdown && monthlyBreakdown.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              <span>جدول حركة واستهلاك وتكاليف المياه الشهرية للسنة المالية ({filters?.year || new Date().getFullYear()})</span>
            </h3>

            <table className="w-full text-right border-collapse text-[11px]">
              <thead className="bg-slate-100 border border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-2 border border-slate-300">الشهر</th>
                  <th className="p-2 border border-slate-300 text-center">عدد الدورات</th>
                  <th className="p-2 border border-slate-300 text-center">عدد الوايتات</th>
                  <th className="p-2 border border-slate-300 text-left">تكلفة الوايتات</th>
                  <th className="p-2 border border-slate-300 text-left">مصاريف التشغيل</th>
                  <th className="p-2 border border-slate-300 text-left">إجمالي التكلفة</th>
                  <th className="p-2 border border-slate-300 text-left">الموزع للمستأجرين</th>
                  <th className="p-2 border border-slate-300 text-left">المرحل للذمم</th>
                  <th className="p-2 border border-slate-300 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((m) => (
                  <tr key={m.monthIndex} className="border border-slate-200 even:bg-slate-50/50">
                    <td className="p-2 border border-slate-200 font-bold text-slate-900">{m.monthName}</td>
                    <td className="p-2 border border-slate-200 text-center font-mono">{m.periodsCount}</td>
                    <td className="p-2 border border-slate-200 text-center font-mono">{m.tankerCount}</td>
                    <td className="p-2 border border-slate-200 text-left font-mono">{m.tankerCost.toLocaleString()} ر.ي</td>
                    <td className="p-2 border border-slate-200 text-left font-mono">{m.operatingCost.toLocaleString()} ر.ي</td>
                    <td className="p-2 border border-slate-200 text-left font-mono font-bold text-slate-900">{m.totalCost.toLocaleString()} ر.ي</td>
                    <td className="p-2 border border-slate-200 text-left font-mono text-cyan-800">{m.distributedAmount.toLocaleString()} ر.ي</td>
                    <td className="p-2 border border-slate-200 text-left font-mono text-emerald-800 font-bold">{m.postedAmount.toLocaleString()} ر.ي</td>
                    <td className="p-2 border border-slate-200 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' :
                        m.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {m.status === 'POSTED' ? 'مرحل' : m.status === 'PARTIAL' ? 'جزئي' : 'لا يوجد'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border border-slate-300 font-bold text-slate-900">
                <tr>
                  <td className="p-2 border border-slate-300">الإجمالي السنوي العام:</td>
                  <td className="p-2 border border-slate-300 text-center font-mono">{summary.totalPeriodsCount}</td>
                  <td className="p-2 border border-slate-300 text-center font-mono">{summary.totalTankersCount}</td>
                  <td className="p-2 border border-slate-300 text-left font-mono">{summary.totalTankersCost.toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-300 text-left font-mono">{(summary.netTotalWaterCost - summary.totalTankersCost).toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-300 text-left font-mono font-black">{summary.netTotalWaterCost.toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-300 text-left font-mono">{summary.totalDistributedAmount.toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-300 text-left font-mono text-emerald-900">{summary.totalPostedAmount.toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-300 text-center">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Section 2: Water Cycles / Periods Summary Table */}
        <div className="mb-6 space-y-2">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <Layers className="w-3.5 h-3.5 text-cyan-600" />
            <span>بيان دورات تكاليف المياه المعتمدة ({periods.length} دورة)</span>
          </h3>

          <table className="w-full text-right border-collapse text-[11px]">
            <thead className="bg-slate-100 border border-slate-300 font-bold text-slate-700">
              <tr>
                <th className="p-2 border border-slate-300">الشهر / الفترة</th>
                <th className="p-2 border border-slate-300">العقار</th>
                <th className="p-2 border border-slate-300 text-center">الوايتات</th>
                <th className="p-2 border border-slate-300 text-left">تكلفة الوايتات</th>
                <th className="p-2 border border-slate-300 text-left">مصاريف أخرى</th>
                <th className="p-2 border border-slate-300 text-left">صافي التكلفة</th>
                <th className="p-2 border border-slate-300 text-left">المبلغ الموزع</th>
                <th className="p-2 border border-slate-300 text-center">طريقة التوزيع</th>
                <th className="p-2 border border-slate-300 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border border-slate-200 even:bg-slate-50/50">
                  <td className="p-2 border border-slate-200 font-bold text-slate-900">{p.periodMonth}</td>
                  <td className="p-2 border border-slate-200 text-slate-700">{p.propertyName}</td>
                  <td className="p-2 border border-slate-200 text-center font-mono">{p.tankerCount}</td>
                  <td className="p-2 border border-slate-200 text-left font-mono">{Number(p.totalTankerCost || 0).toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-200 text-left font-mono">{(Number(p.netTotalOperatingCost || 0) - Number(p.totalTankerCost || 0)).toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-200 text-left font-mono font-bold text-slate-900">{Number(p.netTotalOperatingCost || 0).toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-200 text-left font-mono text-cyan-800">{Number(p.totalDistributedAmount || 0).toLocaleString()} ر.ي</td>
                  <td className="p-2 border border-slate-200 text-center text-[10px]">{p.distributionMethod}</td>
                  <td className="p-2 border border-slate-200 text-center">
                    <span className="font-bold text-[10px]">{getStatusLabel(p.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Water Tankers Supply Entries (if detailed or range or daily) */}
        {tankers.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-600" />
              <span>سجل توريدات وايتات المياه الميدانية ({tankers.length} توريدة)</span>
            </h3>

            <table className="w-full text-right border-collapse text-[10.5px]">
              <thead className="bg-slate-100 border border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-1.5 border border-slate-300">التاريخ</th>
                  <th className="p-1.5 border border-slate-300">الدورة / العقار</th>
                  <th className="p-1.5 border border-slate-300">المورد / السائق</th>
                  <th className="p-1.5 border border-slate-300 text-center">رقم الوايت</th>
                  <th className="p-1.5 border border-slate-300 text-center">رقم السند</th>
                  <th className="p-1.5 border border-slate-300 text-center">الكمية</th>
                  <th className="p-1.5 border border-slate-300 text-left">سعر الوايت</th>
                  <th className="p-1.5 border border-slate-300 text-left">الإجمالي</th>
                  <th className="p-1.5 border border-slate-300">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {tankers.slice(0, 50).map((t) => (
                  <tr key={t.id} className="border border-slate-200 even:bg-slate-50/50">
                    <td className="p-1.5 border border-slate-200 font-mono text-slate-600">{t.entryDate || '—'}</td>
                    <td className="p-1.5 border border-slate-200 font-medium text-slate-800">{t.periodMonth || t.propertyName}</td>
                    <td className="p-1.5 border border-slate-200 text-slate-700">{t.supplierName || 'مورد عام'}</td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono">{t.tankerNumber || '—'}</td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono">{t.receiptNumber || '—'}</td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono">{t.tankerCount}</td>
                    <td className="p-1.5 border border-slate-200 text-left font-mono">{Number(t.costPerTanker || 0).toLocaleString()} ر.ي</td>
                    <td className="p-1.5 border border-slate-200 text-left font-mono font-bold text-slate-900">{Number(t.totalCost || 0).toLocaleString()} ر.ي</td>
                    <td className="p-1.5 border border-slate-200 text-slate-500 text-[10px]">{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Operating Expenses Breakdown */}
        {expenses.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span>المصاريف التشغيلية الإضافية (كهرباء مضخات، صيانة، نظافة، وصرف صحي)</span>
            </h3>

            <table className="w-full text-right border-collapse text-[10.5px]">
              <thead className="bg-slate-100 border border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-1.5 border border-slate-300">التاريخ</th>
                  <th className="p-1.5 border border-slate-300">البند / التصنيف</th>
                  <th className="p-1.5 border border-slate-300">البيان والشرح</th>
                  <th className="p-1.5 border border-slate-300 text-center">رقم السند / الفاتورة</th>
                  <th className="p-1.5 border border-slate-300 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border border-slate-200 even:bg-slate-50/50">
                    <td className="p-1.5 border border-slate-200 font-mono text-slate-600">{e.entryDate || '—'}</td>
                    <td className="p-1.5 border border-slate-200 font-bold text-cyan-900">{getCategoryArabic(e.costCategory)}</td>
                    <td className="p-1.5 border border-slate-200 text-slate-700">{e.description || '—'}</td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono">{e.referenceNumber || '—'}</td>
                    <td className="p-1.5 border border-slate-200 text-left font-mono font-bold text-slate-900">{Number(e.amount || 0).toLocaleString()} ر.ي</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 5: Tenant Distribution & Receivables Posting */}
        {charges.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span>كشف توزيع التكاليف على الوحدات وذمم المستأجرين ({charges.length} وحدة موزعة)</span>
            </h3>

            <table className="w-full text-right border-collapse text-[10.5px]">
              <thead className="bg-slate-100 border border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-1.5 border border-slate-300 text-center">رقم الوحدة</th>
                  <th className="p-1.5 border border-slate-300">اسم المستأجر</th>
                  <th className="p-1.5 border border-slate-300 text-center">المبنى</th>
                  <th className="p-1.5 border border-slate-300 text-center">أساس التوزيع</th>
                  <th className="p-1.5 border border-slate-300 text-left">الحصة المحسوبة</th>
                  <th className="p-1.5 border border-slate-300 text-left">المبلغ المرحل للذمة</th>
                  <th className="p-1.5 border border-slate-300 text-center">رقم فاتورة الذمم</th>
                  <th className="p-1.5 border border-slate-300 text-center">حالة الترحيل</th>
                </tr>
              </thead>
              <tbody>
                {charges.slice(0, 100).map((c) => (
                  <tr key={c.id} className="border border-slate-200 even:bg-slate-50/50">
                    <td className="p-1.5 border border-slate-200 text-center font-bold text-cyan-900 font-mono">{c.unitNumber}</td>
                    <td className="p-1.5 border border-slate-200 text-slate-800 font-medium">{c.tenantName || 'شاغر'}</td>
                    <td className="p-1.5 border border-slate-200 text-center text-slate-600">{c.buildingName || '—'}</td>
                    <td className="p-1.5 border border-slate-200 text-center text-slate-600 font-mono text-[10px]">{c.distributionBasis}</td>
                    <td className="p-1.5 border border-slate-200 text-left font-mono">{Number(c.calculatedShare || 0).toLocaleString()} ر.ي</td>
                    <td className="p-1.5 border border-slate-200 text-left font-mono font-bold text-slate-900">{Number(c.finalCharge || 0).toLocaleString()} ر.ي</td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono text-[10px] text-cyan-700">{c.invoiceNumber || '—'}</td>
                    <td className="p-1.5 border border-slate-200 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status === 'POSTED' ? 'مرحل للذمم' : 'معلق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Official 4-Tier Signatures Section */}
        <div className="signature-section mt-8 pt-6 border-t-2 border-slate-400">
          <div className="grid grid-cols-4 gap-4 text-center text-xs">
            <div className="p-3 border border-slate-200 rounded-xl space-y-8 bg-slate-50/60">
              <span className="font-bold text-slate-700 block">إعداد / مدخل البيانات</span>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-500 block">التوقيع والتاريخ</span>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl space-y-8 bg-slate-50/60">
              <span className="font-bold text-slate-700 block">مراجعة الحسابات والتشغيل</span>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-500 block">التوقيع والتاريخ</span>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl space-y-8 bg-slate-50/60">
              <span className="font-bold text-slate-700 block">اعتماد إدارة الأملاك</span>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-500 block">التوقيع والختم الرسمي</span>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl space-y-8 bg-slate-50/60">
              <span className="font-bold text-slate-700 block">المحاسب المالي للذمم</span>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              <span className="text-[10px] text-slate-500 block">قيد اليومية وإشعار الترحيل</span>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400 font-mono">
            نظام سمارت العقاري ERP • تقرير صادر إلكترونياً من قاعدة بيانات MySQL المركزية • محمي ضد التعديل اليدوي
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(printContent, document.body);
};
