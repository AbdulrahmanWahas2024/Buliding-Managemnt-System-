import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Droplets, Calendar, Building2, CheckCircle2, ShieldCheck, FileSpreadsheet, Eye } from 'lucide-react';
import { WaterCostPeriod, WaterTankerEntry, WaterCostItem, WaterCharge } from '../../../types/erp';

interface WaterReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: WaterCostPeriod;
  tankers: WaterTankerEntry[];
  costItems: WaterCostItem[];
  charges: (WaterCharge & { unitType?: string; unitArea?: number; tenantPhone?: string })[];
}

export const WaterReportPrintModal: React.FC<WaterReportPrintModalProps> = ({
  isOpen,
  onClose,
  period,
  tankers,
  costItems,
  charges
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

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

  if (!isOpen) return null;

  const totalOtherCosts = costItems.reduce((acc, ci) => acc + Number(ci.amount || 0), 0);
  const totalTankers = tankers.reduce((acc, t) => acc + Number(t.tankerCount || 0), 0);
  const totalTankersCost = tankers.reduce((acc, t) => acc + Number(t.totalCost || 0), 0);

  const getCategoryArabic = (cat: string) => {
    switch (cat) {
      case 'PUMP_ELECTRICITY': return 'كهرباء مضخات الرفع والتعبئة';
      case 'SEWER': return 'رسوم الصرف الصحي وشفط البيارات';
      case 'MAINTENANCE': return 'صيانة الخزانات وتمديدات المياه';
      case 'CLEANING': return 'نظافة وغسيل وتعقيم الخزانات';
      case 'LABOR': return 'أجور وعمالة تشغيل شبكة المياه';
      case 'TREATMENT': return 'معالجة وفلاتر ومواد التطهير (كلور)';
      default: return 'مصاريف تشغيلية إضافية';
    }
  };

  const getMethodArabic = (method: string) => {
    switch (method) {
      case 'EQUAL': return 'بالتساوي';
      case 'AREA': return 'حسب المساحة';
      case 'POPULATION': return 'حسب عدد السكان';
      case 'FIXED': return 'مبلغ ثابت';
      case 'CUSTOM': return 'توزيع مخصص';
      default: return method;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const printContent = (
    <div
      id="invoice-print-portal"
      className="invoice-print-portal fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-center py-6 px-3 sm:px-6"
      dir="rtl"
    >
      {/* Dynamic Page Orientation Style Injection for Print */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 10mm;
          }
          #invoice-print-portal {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .print-controls-bar {
            display: none !important;
          }
          .invoice-document-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar (Hidden during print) */}
      <div className="print-controls-bar w-full max-w-4xl bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center text-white">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold">معاينة تقرير تكاليف وتوزيع المياه (A4)</h4>
            <span className="text-[11px] text-slate-400 font-mono">{period.propertyName} - {period.periodMonth}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Orientation Toggle */}
          <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 text-[11px] font-semibold border border-slate-700">
            <button
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                orientation === 'portrait' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              عمودي (Portrait)
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                orientation === 'landscape' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              أفقي (Landscape)
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير (Print)</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Printable A4 Document Sheet */}
      <div
        className={`invoice-document-sheet font-sans text-slate-900 bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 sm:p-10 transition-all ${
          orientation === 'landscape' ? 'w-full max-w-6xl' : 'w-full max-w-4xl'
        }`}
      >
        {/* Header */}
        <div className="border-b-2 border-cyan-800 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center font-bold">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 leading-tight">
                  مكتب الوهاس لإدارة وتأجير العقارات
                </h1>
                <p className="text-[11px] text-slate-600">
                  نظام إدارة التكاليف التشغيلية ومياه الوايتات المعتمد (اليمن)
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-700 space-y-0.5">
              <div><strong>العقار:</strong> {period.propertyName}</div>
              <div><strong>الفترة:</strong> {period.periodMonth} {period.periodYear ? `(${period.periodYear})` : ''}</div>
              {period.periodStart && period.periodEnd && (
                <div><strong>المدة المعتمدة:</strong> من {period.periodStart} إلى {period.periodEnd}</div>
              )}
            </div>
          </div>

          <div className="text-left border border-slate-200 rounded-xl p-3 bg-slate-50 min-w-[210px]">
            <div className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider">
              تقرير تكاليف وتوزيع المياه
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 mt-1">
              رقم الدورة: {period.id}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                period.status === 'POSTED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {period.status === 'POSTED' ? 'دورة مرحلة إلى الذمم' : 'دورة قيد الاحتساب'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs">
          <div className="p-1.5 bg-white rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500">إجمالي وايتات المياه</div>
            <div className="font-bold text-slate-800 mt-0.5 font-mono">
              {totalTankers} وايت ({totalTankersCost.toLocaleString()} ر.ي)
            </div>
          </div>
          <div className="p-1.5 bg-white rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500">التكاليف التشغيلية الأخرى</div>
            <div className="font-bold text-slate-800 mt-0.5 font-mono">
              {totalOtherCosts.toLocaleString()} ر.ي
            </div>
          </div>
          <div className="bg-cyan-50 p-1.5 rounded-lg border border-cyan-200">
            <div className="text-[10px] text-cyan-900 font-bold">صافي تكلفة المياه</div>
            <div className="text-sm font-black text-cyan-900 mt-0.5 font-mono">
              {Number(period.netTotalOperatingCost || 0).toLocaleString()} ر.ي
            </div>
          </div>
          <div className="p-1.5 bg-white rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500">طريقة التوزيع المعتمدة</div>
            <div className="font-bold text-slate-800 mt-0.5 text-xs">
              {getMethodArabic(period.distributionMethod)}
            </div>
          </div>
        </div>

        {/* Section 1: Tankers Log Table */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-slate-800 border-r-3 border-cyan-700 pr-2 mb-2">
            أولاً: بيان وايتات المياه الموردة خلال الفترة ({tankers.length} توريدة)
          </h2>
          <table className="w-full text-[11px] border border-slate-200 rounded-lg text-right overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2">م</th>
                <th className="p-2">التاريخ</th>
                <th className="p-2 text-center">العدد</th>
                <th className="p-2 text-left">قيمة الوايت</th>
                <th className="p-2 text-left">الإجمالي (ر.ي)</th>
                <th className="p-2">المورد / السائق</th>
                <th className="p-2">رقم السند/اللوحة</th>
                <th className="p-2">طريقة الدفع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tankers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-slate-400">لا توجد وايتات مسجلة لهذه الدورة</td>
                </tr>
              ) : (
                tankers.map((t, idx) => (
                  <tr key={t.id}>
                    <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2 font-mono">{t.entryDate}</td>
                    <td className="p-2 text-center font-bold font-mono">{t.tankerCount}</td>
                    <td className="p-2 text-left font-mono">{t.costPerTanker.toLocaleString()} ر.ي</td>
                    <td className="p-2 text-left font-bold font-mono text-cyan-900">{t.totalCost.toLocaleString()} ر.ي</td>
                    <td className="p-2">{t.supplierName || '—'}</td>
                    <td className="p-2 font-mono">{t.receiptNumber || t.tankerNumber || '—'}</td>
                    <td className="p-2">{t.paymentMethod || 'نقداً'}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
              <tr>
                <td colSpan={2} className="p-2">مجموع تكاليف الوايتات</td>
                <td className="p-2 text-center font-mono">{totalTankers} وايت</td>
                <td></td>
                <td className="p-2 text-left font-mono text-cyan-900 font-black">{totalTankersCost.toLocaleString()} ر.ي</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 2: Other Costs Table (if any) */}
        {costItems.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold text-slate-800 border-r-3 border-cyan-700 pr-2 mb-2">
              ثانياً: المصاريف التشغيلية والتفريغ والصيانة الملحقة ({costItems.length} بنود)
            </h2>
            <table className="w-full text-[11px] border border-slate-200 rounded-lg text-right overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">م</th>
                  <th className="p-2">فئة المصروف</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">البيان والتفاصيل</th>
                  <th className="p-2">رقم السند/المرجع</th>
                  <th className="p-2 text-left">المبلغ (ر.ي)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {costItems.map((ci, idx) => (
                  <tr key={ci.id}>
                    <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2 font-semibold">{getCategoryArabic(ci.costCategory)}</td>
                    <td className="p-2 font-mono">{ci.entryDate}</td>
                    <td className="p-2">{ci.description || '—'}</td>
                    <td className="p-2 font-mono">{ci.referenceNumber || '—'}</td>
                    <td className="p-2 text-left font-bold font-mono text-cyan-900">{ci.amount.toLocaleString()} ر.ي</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                <tr>
                  <td colSpan={5} className="p-2">مجموع المصاريف التشغيلية الإضافية</td>
                  <td className="p-2 text-left font-mono text-cyan-900 font-black">{totalOtherCosts.toLocaleString()} ر.ي</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Section 3: Distribution Breakdown Table */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-slate-800 border-r-3 border-cyan-700 pr-2 mb-2">
            ثالثاً: جدول توزيع التكلفة المعتمد على الوحدات والمستأجرين ({charges.length} وحدة)
          </h2>
          <table className="w-full text-[11px] border border-slate-200 rounded-lg text-right overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2">م</th>
                <th className="p-2">رقم الوحدة</th>
                <th className="p-2">النوع والمساحة</th>
                <th className="p-2">المستأجر الحالي</th>
                <th className="p-2 text-center">أساس التوزيع</th>
                <th className="p-2 text-left">الحصة المحتسبة</th>
                <th className="p-2 text-left">المبلغ المفوتر (ر.ي)</th>
                <th className="p-2 text-center">حالة الذمة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-400">
                    لم يتم احتساب وتوزيع التكاليف بعد
                  </td>
                </tr>
              ) : (
                charges.map((ch, idx) => (
                  <tr key={ch.id}>
                    <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2 font-bold font-mono text-slate-800">{ch.unitNumber}</td>
                    <td className="p-2">{ch.unitType || 'وحدة'} {ch.unitArea ? `(${ch.unitArea} م²)` : ''}</td>
                    <td className="p-2 font-semibold">{ch.tenantName || 'شاغرة (حساب المالك)'}</td>
                    <td className="p-2 text-center font-mono">{ch.basisValue}</td>
                    <td className="p-2 text-left font-mono">{ch.calculatedShare.toLocaleString()} ر.ي</td>
                    <td className="p-2 text-left font-bold font-mono text-cyan-900">{ch.finalCharge.toLocaleString()} ر.ي</td>
                    <td className="p-2 text-center font-semibold">
                      {ch.status === 'POSTED' ? (
                        <span className="text-emerald-700 font-bold">مرحل للذمة</span>
                      ) : (
                        <span className="text-amber-700">معلق</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
              <tr>
                <td colSpan={5} className="p-2">
                  الإجمالي الموزع على الوحدات
                </td>
                <td className="p-2 text-left font-mono">
                  {charges.reduce((acc, c) => acc + Number(c.calculatedShare || 0), 0).toLocaleString()} ر.ي
                </td>
                <td className="p-2 text-left font-black font-mono text-cyan-900 text-xs">
                  {charges.reduce((acc, c) => acc + Number(c.finalCharge || 0), 0).toLocaleString()} ر.ي
                </td>
                <td className="p-2 text-center text-[10px] text-slate-500">
                  {period.differenceAmount === 0 ? 'مطابق تماماً' : `فرق: ${period.differenceAmount} ر.ي`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        {period.notes && (
          <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <strong>ملاحظات تشغيلية:</strong> {period.notes}
          </div>
        )}

        {/* Official Signatures Block */}
        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="text-[11px] text-slate-500 mb-8">مسؤول تشغيل ومراقبة المياه</div>
            <div className="border-b border-dotted border-slate-400 pb-1 font-bold text-slate-800">
              التوقيع: ...........................
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 mb-8">المحاسب المالي المختص</div>
            <div className="border-b border-dotted border-slate-400 pb-1 font-bold text-slate-800">
              {period.postedBy || 'التوقيع: ...........................'}
            </div>
            {period.postedAt && (
              <div className="text-[10px] text-slate-400 mt-1">
                تاريخ الترحيل: {period.postedAt}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-slate-500 mb-8">إدارة الأملاك والعقارات (الختم الرسمي)</div>
            <div className="border-b border-dotted border-slate-400 pb-1 font-bold text-slate-800">
              الاعتماد: ...........................
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>نظام الوهاس لإدارة العقارات والأملاك الذكي - تم التوليد آلياً من قاعدة البيانات المركزية</span>
          <span>صفحة 1 من 1</span>
        </div>
      </div>
    </div>
  );

  return createPortal(printContent, document.body);
};
