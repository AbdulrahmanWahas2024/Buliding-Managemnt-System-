import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Building2, 
  Filter, 
  RotateCcw, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  Droplets, 
  Truck, 
  Wrench, 
  Calculator, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Users,
  Send,
  ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ERP_API } from '../../../services/api';
import { Property, Building, Unit, Tenant } from '../../../types/erp';
import { WaterDetailedReportPrintModal } from './WaterDetailedReportPrintModal';

interface WaterDetailedReportsViewProps {
  properties: Property[];
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
}

export const WaterDetailedReportsView: React.FC<WaterDetailedReportsViewProps> = ({
  properties,
  onNavigateToTenant,
  onNavigateToProperty
}) => {
  // Report Form State
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'annual' | 'range' | 'detailed'>('detailed');
  
  // Date Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Entities Cascading Filters
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');

  // Classification Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Execution & Data State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);

  // Active View Sub-Tab
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'periods' | 'tankers' | 'expenses' | 'charges'>('summary');

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Load secondary entities (buildings, units, tenants)
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [allTenants] = await Promise.all([
          ERP_API.getTenants().catch(() => [])
        ]);
        setTenants(allTenants);
      } catch (err) {
        console.error('Failed to load tenants for report filter', err);
      }
    };
    fetchEntities();
  }, []);

  // Update Buildings and Units when Property changes
  useEffect(() => {
    const fetchPropertyUnits = async () => {
      if (selectedPropertyId && selectedPropertyId !== 'ALL') {
        try {
          const [bList, uList] = await Promise.all([
            ERP_API.getBuildings(selectedPropertyId).catch(() => []),
            ERP_API.getUnits(selectedPropertyId).catch(() => [])
          ]);
          setBuildings(bList);
          setUnits(uList);
        } catch {
          setBuildings([]);
          setUnits([]);
        }
      } else {
        setBuildings([]);
        setUnits([]);
        setSelectedBuildingId('ALL');
        setSelectedUnitId('ALL');
      }
    };
    fetchPropertyUnits();
  }, [selectedPropertyId]);

  // Initial report load
  useEffect(() => {
    handleGenerateReport();
  }, []);

  // Generate Report Handler
  const handleGenerateReport = async () => {
    // Date Range Validation
    if ((reportType === 'range' || reportType === 'detailed') && startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        setError('تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const data = await ERP_API.getDetailedWaterReport({
        reportType,
        date: reportType === 'daily' ? date : undefined,
        month: reportType === 'monthly' ? month : undefined,
        year: (reportType === 'annual' || reportType === 'monthly') ? Number(year) : undefined,
        startDate: (reportType === 'range' || reportType === 'detailed') ? startDate : undefined,
        endDate: (reportType === 'range' || reportType === 'detailed') ? endDate : undefined,
        propertyId: selectedPropertyId !== 'ALL' ? selectedPropertyId : undefined,
        buildingId: selectedBuildingId !== 'ALL' ? selectedBuildingId : undefined,
        unitId: selectedUnitId !== 'ALL' ? selectedUnitId : undefined,
        tenantId: selectedTenantId !== 'ALL' ? selectedTenantId : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        distributionMethod: selectedMethod !== 'ALL' ? selectedMethod : undefined,
        search: search.trim() || undefined
      });

      setReportData(data);
      // Auto-set tab based on report type
      if (reportType === 'annual') {
        setActiveReportTab('summary');
      } else if (reportType === 'daily') {
        setActiveReportTab('tankers');
      } else {
        setActiveReportTab('periods');
      }
    } catch (err: any) {
      setError(err.message || 'فشل توليد تقرير المياه');
    } finally {
      setLoading(false);
    }
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    setReportType('detailed');
    setDate(todayStr);
    setMonth(new Date().toISOString().slice(0, 7));
    setYear(new Date().getFullYear());
    const d = new Date();
    d.setDate(1);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(todayStr);
    setSelectedPropertyId('ALL');
    setSelectedBuildingId('ALL');
    setSelectedUnitId('ALL');
    setSelectedTenantId('ALL');
    setSelectedStatus('ALL');
    setSelectedMethod('ALL');
    setSearch('');
    setError(null);
  };

  // Native Excel (.xlsx) Export Handler using SheetJS
  const handleExportToExcel = () => {
    if (!reportData) return;

    try {
      const wb = XLSX.utils.book_new();
      const currentPropName = selectedPropertyId !== 'ALL' 
        ? properties.find(p => p.id === selectedPropertyId)?.name || 'عقار محدد' 
        : 'جميع العقارات';

      // Sheet 1: General Summary
      const summaryRows = [
        ['تقرير تكاليف واستهلاك المياه - سمارت لإدارة الأملاك والعقارات'],
        ['نوع التقرير:', reportType === 'daily' ? 'يومي' : reportType === 'monthly' ? 'شهري' : reportType === 'annual' ? 'سنوي' : reportType === 'range' ? 'فترة محددة' : 'شامل تفصيلي'],
        ['العقار:', currentPropName],
        ['تاريخ التصدير:', new Date().toLocaleString('ar-YE')],
        ['العملة:', 'ريال يمني (ر.ي)'],
        [],
        ['مؤشرات التقرير المالي والتشغيلي:'],
        ['إجمالي دورات المياه:', reportData.summary.totalPeriodsCount],
        ['إجمالي عدد الوايتات:', reportData.summary.totalTankersCount],
        ['إجمالي تكلفة الوايتات (ر.ي):', reportData.summary.totalTankersCost],
        ['تكلفة كهرباء المضخات (ر.ي):', reportData.summary.totalPumpElectricityCost],
        ['تكلفة الصرف الصحي (ر.ي):', reportData.summary.totalSewerCost],
        ['تكلفة صيانة الخزانات (ر.ي):', reportData.summary.totalMaintenanceCost],
        ['تكلفة النظافة والتعقيم (ر.ي):', reportData.summary.totalCleaningCost],
        ['أجور العمالة والتشغيل (ر.ي):', reportData.summary.totalLaborCost],
        ['مصاريف أخرى ومعالجة (ر.ي):', reportData.summary.totalOtherCost],
        ['صافي إجمالي التكلفة التشغيلية (ر.ي):', reportData.summary.netTotalWaterCost],
        ['إجمالي المبالغ الموزعة (ر.ي):', reportData.summary.totalDistributedAmount],
        ['إجمالي المبالغ المرحلة للذمم (ر.ي):', reportData.summary.totalPostedAmount],
        ['فارق التوزيع غير الموزع (ر.ي):', reportData.summary.totalDifferenceAmount],
        ['عدد الوحدات المشاركة:', reportData.summary.participatingUnitsCount],
        ['عدد المستأجرين المستفيدين:', reportData.summary.participatingTenantsCount]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص التقرير');

      // Sheet 2: Annual Monthly Breakdown (if available)
      if (reportData.monthlyBreakdown && reportData.monthlyBreakdown.length > 0) {
        const monthlyData = reportData.monthlyBreakdown.map((m: any) => ({
          'الشهر': m.monthName,
          'عدد الدورات': m.periodsCount,
          'عدد الوايتات': m.tankerCount,
          'تكلفة الوايتات (ر.ي)': m.tankerCost,
          'المصاريف التشغيلية (ر.ي)': m.operatingCost,
          'إجمالي التكلفة (ر.ي)': m.totalCost,
          'الموزع للمستأجرين (ر.ي)': m.distributedAmount,
          'المرحل للذمم (ر.ي)': m.postedAmount,
          'الحالة': m.status === 'POSTED' ? 'مرحل بالكامل' : m.status === 'PARTIAL' ? 'مرحل جزئياً' : 'لا توجد دورات'
        }));
        const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
        XLSX.utils.book_append_sheet(wb, wsMonthly, 'الحركة الشهرية');
      }

      // Sheet 3: Water Periods
      if (reportData.periods && reportData.periods.length > 0) {
        const periodsData = reportData.periods.map((p: any) => ({
          'رقم الدورة': p.id,
          'الشهر / الفترة': p.periodMonth,
          'العقار': p.propertyName,
          'من تاريخ': p.periodStart || '—',
          'إلى تاريخ': p.periodEnd || '—',
          'عدد الوايتات': p.tankerCount,
          'تكلفة الوايتات (ر.ي)': p.totalTankerCost,
          'المصاريف التشغيلية (ر.ي)': p.netTotalOperatingCost - p.totalTankerCost,
          'صافي التكلفة التشغيلية (ر.ي)': p.netTotalOperatingCost,
          'طريقة التوزيع': p.distributionMethod,
          'المبلغ الموزع (ر.ي)': p.totalDistributedAmount,
          'فارق التوزيع (ر.ي)': p.differenceAmount,
          'الحالة': p.status,
          'تاريخ الترحيل': p.postedAt || '—',
          'المسؤول عن الترحيل': p.postedBy || '—',
          'ملاحظات': p.notes || ''
        }));
        const wsPeriods = XLSX.utils.json_to_sheet(periodsData);
        XLSX.utils.book_append_sheet(wb, wsPeriods, 'دورات المياه');
      }

      // Sheet 4: Water Tankers Supply Entries
      if (reportData.tankers && reportData.tankers.length > 0) {
        const tankersData = reportData.tankers.map((t: any) => ({
          'التاريخ': t.entryDate,
          'الشهر / الدورة': t.periodMonth,
          'العقار': t.propertyName,
          'المورد / السائق': t.supplierName,
          'رقم الوايت': t.tankerNumber,
          'رقم السند': t.receiptNumber,
          'طريقة الدفع': t.paymentMethod,
          'عدد الوايتات': t.tankerCount,
          'سعر الوايت (ر.ي)': t.costPerTanker,
          'الإجمالي (ر.ي)': t.totalCost,
          'ملاحظات': t.notes
        }));
        const wsTankers = XLSX.utils.json_to_sheet(tankersData);
        XLSX.utils.book_append_sheet(wb, wsTankers, 'سجل الوايتات');
      }

      // Sheet 5: Operating Expense Items
      if (reportData.expenses && reportData.expenses.length > 0) {
        const expensesData = reportData.expenses.map((e: any) => ({
          'التاريخ': e.entryDate,
          'الشهر / الدورة': e.periodMonth,
          'العقار': e.propertyName,
          'التصنيف': e.costCategory,
          'البيان': e.description,
          'رقم السند': e.referenceNumber,
          'المبلغ (ر.ي)': e.amount,
          'ملاحظات': e.notes
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(wb, wsExpenses, 'المصاريف التشغيلية');
      }

      // Sheet 6: Tenant Charges & Ledger Posting
      if (reportData.charges && reportData.charges.length > 0) {
        const chargesData = reportData.charges.map((c: any) => ({
          'رقم الوحدة': c.unitNumber,
          'اسم المستأجر': c.tenantName || 'شاغر',
          'هاتف المستأجر': c.tenantPhone || '—',
          'المبنى': c.buildingName || '—',
          'الدورة': c.periodMonth,
          'العقار': c.propertyName,
          'طريقة التوزيع': c.distributionBasis,
          'قيمة الأساس': c.basisValue,
          'الحصة المحسوبة (ر.ي)': c.calculatedShare,
          'المبلغ النهائي (ر.ي)': c.finalCharge,
          'حالة الترحيل': c.status,
          'رقم فاتورة الذمم': c.invoiceNumber || '—',
          'ملاحظات': c.notes || ''
        }));
        const wsCharges = XLSX.utils.json_to_sheet(chargesData);
        XLSX.utils.book_append_sheet(wb, wsCharges, 'توزيع المستأجرين والذمم');
      }

      // Generate filename with date
      const filename = `تقرير_المياه_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      console.error('Excel Export Error', err);
      setError('فشل تصدير ملف الإكسل: ' + err.message);
    }
  };

  const getCategoryArabic = (cat: string) => {
    switch (cat) {
      case 'PUMP_ELECTRICITY': return 'كهرباء مضخات';
      case 'SEWER': return 'صرف صحي وبيارات';
      case 'MAINTENANCE': return 'صيانة خزانات';
      case 'CLEANING': return 'تنظيف وتعقيم';
      case 'LABOR': return 'أجور وعمالة';
      case 'TREATMENT': return 'معالجة وكلور';
      default: return 'مصاريف تشغيلية';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">مرحل للذمم</span>;
      case 'CALCULATED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">تم الاحتساب</span>;
      case 'CLOSED':
        return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">مغلقة</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">ملغاة</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">مسودة</span>;
    }
  };

  const selectedPropertyName = selectedPropertyId !== 'ALL'
    ? properties.find(p => p.id === selectedPropertyId)?.name || 'جميع العقارات'
    : 'جميع العقارات';

  return (
    <div className="space-y-5">
      {/* 1. Interactive Control & Filters Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                محرك تقارير استهلاك وتكاليف المياه والذمم
              </h3>
              <p className="text-xs text-slate-500">
                استخراج تقارير دورية يومية، شهرية، وسنوية مفصلة مع التصدير المباشر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportToExcel}
              disabled={!reportData || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="تصدير التقرير الحالي إلى ملف Excel حقيقي"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={!reportData || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="معاينة وطباعة التقرير بحجم A4"
            >
              <Printer className="w-4 h-4" />
              <span>معاينة وطباعة A4</span>
            </button>
          </div>
        </div>

        {/* Filters Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Report Type Selector */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">نوع التقرير المالي:</label>
            <select
              value={reportType}
              onChange={(e: any) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="detailed">تقرير تفصيلي شامل (Comprehensive)</option>
              <option value="monthly">تقرير شهري (Monthly)</option>
              <option value="annual">تقرير سنوي مع حركة الشهور (Annual)</option>
              <option value="daily">تقرير استهلاك وتوريد يومي (Daily)</option>
              <option value="range">تقرير فترة زمنية مخصصة (Date Range)</option>
            </select>
          </div>

          {/* Dynamic Date Controls */}
          {reportType === 'daily' && (
            <div>
              <label className="block text-slate-600 font-bold mb-1">اليوم والتاريخ:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <div>
              <label className="block text-slate-600 font-bold mb-1">الشهر المستهدف:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          )}

          {reportType === 'annual' && (
            <div>
              <label className="block text-slate-600 font-bold mb-1">السنة المالية:</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {(reportType === 'range' || reportType === 'detailed') && (
            <>
              <div>
                <label className="block text-slate-600 font-bold mb-1">من تاريخ:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">إلى تاريخ:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </>
          )}

          {/* Property Selector */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">العقار:</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">جميع العقارات</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Building Selector */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">المبنى / الجناح:</label>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              disabled={selectedPropertyId === 'ALL' || buildings.length === 0}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">جميع المباني</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Unit Selector */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">الوحدة الإيجارية:</label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              disabled={selectedPropertyId === 'ALL' || units.length === 0}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">جميع الوحدات</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>وحدة {u.unitNumber}</option>
              ))}
            </select>
          </div>

          {/* Tenant Selector */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">المستأجر:</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">جميع المستأجرين</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">حالة الدورة:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="DRAFT">مسودة (DRAFT)</option>
              <option value="CALCULATED">تم الاحتساب (CALCULATED)</option>
              <option value="POSTED">مرحل للذمم (POSTED)</option>
              <option value="CLOSED">مغلقة (CLOSED)</option>
              <option value="CANCELLED">ملغاة (CANCELLED)</option>
            </select>
          </div>

          {/* Distribution Method Filter */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">طريقة التوزيع:</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">جميع الطرق</option>
              <option value="EQUAL">بالتساوي</option>
              <option value="AREA">حسب المساحة</option>
              <option value="POPULATION">حسب عدد السكان</option>
              <option value="FIXED">مبلغ ثابت</option>
              <option value="CUSTOM">توزيع مخصص</option>
            </select>
          </div>

          {/* Text Search */}
          <div className="sm:col-span-2">
            <label className="block text-slate-600 font-bold mb-1">بحث بالكود، الشهر، أو الملاحظات:</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="مثال: wat-1790، سبتمبر 2026، النصر..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Buttons Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط التصفية</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Filter className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'جاري استخراج البيانات...' : 'تحديث واستخراج التقرير'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Ribbon Cards */}
      {reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-[11px] text-slate-500 block">دورات المياه</span>
            <strong className="text-base font-bold text-slate-900 font-mono block mt-1">
              {reportData.summary.totalPeriodsCount} دورة
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {reportData.summary.participatingUnitsCount} وحدة مستفيدة
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-cyan-100 shadow-xs bg-linear-to-b from-cyan-50/30 to-white">
            <span className="text-[11px] text-cyan-800 block font-medium">توريدات الوايتات</span>
            <strong className="text-base font-bold text-cyan-950 font-mono block mt-1">
              {reportData.summary.totalTankersCost.toLocaleString()} ر.ي
            </strong>
            <span className="text-[10px] text-cyan-700 block mt-0.5 font-mono">
              {reportData.summary.totalTankersCount} وايت ماء
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-xs bg-linear-to-b from-amber-50/30 to-white">
            <span className="text-[11px] text-amber-800 block font-medium">المصاريف التشغيلية</span>
            <strong className="text-base font-bold text-amber-950 font-mono block mt-1">
              {(reportData.summary.netTotalWaterCost - reportData.summary.totalTankersCost).toLocaleString()} ر.ي
            </strong>
            <span className="text-[10px] text-amber-700 block mt-0.5">
              مضخات، صيانة، ونظافة
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-xs bg-linear-to-b from-indigo-50/30 to-white">
            <span className="text-[11px] text-indigo-800 block font-medium">صافي التكلفة التشغيلية</span>
            <strong className="text-base font-bold text-indigo-950 font-mono block mt-1">
              {reportData.summary.netTotalWaterCost.toLocaleString()} ر.ي
            </strong>
            <span className="text-[10px] text-indigo-700 block mt-0.5">
              التكلفة الإجمالية الفعلية
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-xs bg-linear-to-b from-blue-50/30 to-white">
            <span className="text-[11px] text-blue-800 block font-medium">إجمالي الموزع للمستأجرين</span>
            <strong className="text-base font-bold text-blue-950 font-mono block mt-1">
              {reportData.summary.totalDistributedAmount.toLocaleString()} ر.ي
            </strong>
            <span className="text-[10px] text-blue-700 block mt-0.5 font-mono">
              فارق: {reportData.summary.totalDifferenceAmount.toLocaleString()} ر.ي
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs bg-linear-to-b from-emerald-50/30 to-white">
            <span className="text-[11px] text-emerald-800 block font-medium">المرحل رسمياً للذمم</span>
            <strong className="text-base font-bold text-emerald-950 font-mono block mt-1">
              {reportData.summary.totalPostedAmount.toLocaleString()} ر.ي
            </strong>
            <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">
              {reportData.summary.netTotalWaterCost > 0 
                ? Math.round((reportData.summary.totalPostedAmount / reportData.summary.netTotalWaterCost) * 100) 
                : 0}% نسبة الترحيل
            </span>
          </div>
        </div>
      )}

      {/* 3. Report Data Tables & Interactive Views */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-3 border-b border-slate-100 bg-slate-50/70 text-xs">
          {reportType === 'annual' && (
            <button
              onClick={() => setActiveReportTab('summary')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeReportTab === 'summary'
                  ? 'bg-white text-cyan-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              <span>الحركة الشهرية السنوية</span>
            </button>
          )}

          <button
            onClick={() => setActiveReportTab('periods')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeReportTab === 'periods'
                ? 'bg-white text-cyan-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-600" />
            <span>بيان دورات المياه ({reportData?.periods?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveReportTab('tankers')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeReportTab === 'tankers'
                ? 'bg-white text-cyan-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-cyan-600" />
            <span>توريدات الوايتات ({reportData?.tankers?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveReportTab('expenses')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeReportTab === 'expenses'
                ? 'bg-white text-cyan-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-cyan-600" />
            <span>المصاريف التشغيلية ({reportData?.expenses?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveReportTab('charges')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeReportTab === 'charges'
                ? 'bg-white text-cyan-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-600" />
            <span>كشف توزيع المستأجرين والذمم ({reportData?.charges?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Annual Monthly Breakdown Table */}
        {activeReportTab === 'summary' && reportType === 'annual' && reportData?.monthlyBreakdown && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5">الشهر</th>
                  <th className="p-3.5 text-center">الدورات</th>
                  <th className="p-3.5 text-center">الوايتات</th>
                  <th className="p-3.5 text-left">تكلفة الوايتات</th>
                  <th className="p-3.5 text-left">المصاريف التشغيلية</th>
                  <th className="p-3.5 text-left">صافي التكلفة</th>
                  <th className="p-3.5 text-left">الموزع</th>
                  <th className="p-3.5 text-left">المرحل للذمم</th>
                  <th className="p-3.5 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.monthlyBreakdown.map((m: any) => (
                  <tr key={m.monthIndex} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{m.monthName}</td>
                    <td className="p-3.5 text-center font-mono">{m.periodsCount}</td>
                    <td className="p-3.5 text-center font-mono">{m.tankerCount}</td>
                    <td className="p-3.5 text-left font-mono font-medium text-slate-800">{m.tankerCost.toLocaleString()} ر.ي</td>
                    <td className="p-3.5 text-left font-mono text-slate-600">{m.operatingCost.toLocaleString()} ر.ي</td>
                    <td className="p-3.5 text-left font-mono font-black text-cyan-950">{m.totalCost.toLocaleString()} ر.ي</td>
                    <td className="p-3.5 text-left font-mono text-slate-700">{m.distributedAmount.toLocaleString()} ر.ي</td>
                    <td className="p-3.5 text-left font-mono font-bold text-emerald-700">{m.postedAmount.toLocaleString()} ر.ي</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' :
                        m.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {m.status === 'POSTED' ? 'مرحل' : m.status === 'PARTIAL' ? 'مرحل جزئياً' : 'لا دورات'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td className="p-3.5">الإجمالي العام السنوي:</td>
                  <td className="p-3.5 text-center font-mono">{reportData.summary.totalPeriodsCount}</td>
                  <td className="p-3.5 text-center font-mono">{reportData.summary.totalTankersCount}</td>
                  <td className="p-3.5 text-left font-mono">{reportData.summary.totalTankersCost.toLocaleString()} ر.ي</td>
                  <td className="p-3.5 text-left font-mono">{(reportData.summary.netTotalWaterCost - reportData.summary.totalTankersCost).toLocaleString()} ر.ي</td>
                  <td className="p-3.5 text-left font-mono font-black text-cyan-900">{reportData.summary.netTotalWaterCost.toLocaleString()} ر.ي</td>
                  <td className="p-3.5 text-left font-mono">{reportData.summary.totalDistributedAmount.toLocaleString()} ر.ي</td>
                  <td className="p-3.5 text-left font-mono text-emerald-800">{reportData.summary.totalPostedAmount.toLocaleString()} ر.ي</td>
                  <td className="p-3.5 text-center">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Tab 2: Periods List Table */}
        {activeReportTab === 'periods' && (
          <div className="overflow-x-auto">
            {reportData?.periods?.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد دورات مياه مطابقة لشروط التصفية المحددة.
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">الشهر / الفترة</th>
                    <th className="p-3.5">العقار</th>
                    <th className="p-3.5 text-center">الوايتات</th>
                    <th className="p-3.5 text-left">تكلفة الوايتات</th>
                    <th className="p-3.5 text-left">تكاليف أخرى</th>
                    <th className="p-3.5 text-left">صافي التكلفة</th>
                    <th className="p-3.5 text-left">المبلغ الموزع</th>
                    <th className="p-3.5">طريقة التوزيع</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData?.periods?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        {p.periodMonth}
                        {p.periodStart && (
                          <span className="block text-[10px] text-slate-400 font-normal font-mono">
                            {p.periodStart} إلى {p.periodEnd || '—'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">{p.propertyName}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-cyan-800">{p.tankerCount}</td>
                      <td className="p-3.5 text-left font-mono font-medium text-slate-800">{Number(p.totalTankerCost || 0).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-left font-mono text-slate-600">{(Number(p.netTotalOperatingCost || 0) - Number(p.totalTankerCost || 0)).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-left font-mono font-black text-slate-900">{Number(p.netTotalOperatingCost || 0).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-left font-mono font-bold text-cyan-900">{Number(p.totalDistributedAmount || 0).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-slate-600 text-[11px]">{p.distributionMethod}</td>
                      <td className="p-3.5 text-center">{getStatusBadge(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Tankers List Table */}
        {activeReportTab === 'tankers' && (
          <div className="overflow-x-auto">
            {reportData?.tankers?.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد توريدات وايتات مسجلة ضمن هذه المعايير.
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">التاريخ</th>
                    <th className="p-3.5">الدورة / العقار</th>
                    <th className="p-3.5">المورد / السائق</th>
                    <th className="p-3.5 text-center">رقم الوايت</th>
                    <th className="p-3.5 text-center">رقم السند</th>
                    <th className="p-3.5 text-center">الكمية</th>
                    <th className="p-3.5 text-left">سعر الوايت</th>
                    <th className="p-3.5 text-left">الإجمالي</th>
                    <th className="p-3.5">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData?.tankers?.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono text-slate-600">{t.entryDate || '—'}</td>
                      <td className="p-3.5">
                        <strong className="text-slate-900 block">{t.periodMonth}</strong>
                        <span className="text-[11px] text-slate-500">{t.propertyName}</span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">{t.supplierName || 'مورد عام'}</td>
                      <td className="p-3.5 text-center font-mono text-slate-600">{t.tankerNumber || '—'}</td>
                      <td className="p-3.5 text-center font-mono text-slate-600">{t.receiptNumber || '—'}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-cyan-800">{t.tankerCount}</td>
                      <td className="p-3.5 text-left font-mono text-slate-700">{Number(t.costPerTanker || 0).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900">{Number(t.totalCost || 0).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: Operating Expenses Table */}
        {activeReportTab === 'expenses' && (
          <div className="overflow-x-auto">
            {reportData?.expenses?.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد مصاريف تشغيلية إضافية مسجلة لهذه الفترة.
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">التاريخ</th>
                    <th className="p-3.5">العقار والدورة</th>
                    <th className="p-3.5">البند والتصنيف</th>
                    <th className="p-3.5">البيان والشرح</th>
                    <th className="p-3.5 text-center">رقم السند</th>
                    <th className="p-3.5 text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData?.expenses?.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono text-slate-600">{e.entryDate || '—'}</td>
                      <td className="p-3.5">
                        <strong className="text-slate-900 block">{e.periodMonth}</strong>
                        <span className="text-[11px] text-slate-500">{e.propertyName}</span>
                      </td>
                      <td className="p-3.5 font-bold text-cyan-900">{getCategoryArabic(e.costCategory)}</td>
                      <td className="p-3.5 text-slate-700">{e.description || '—'}</td>
                      <td className="p-3.5 text-center font-mono text-slate-600">{e.referenceNumber || '—'}</td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900">{Number(e.amount || 0).toLocaleString()} ر.ي</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 5: Tenant Distribution & Receivables Table */}
        {activeReportTab === 'charges' && (
          <div className="overflow-x-auto">
            {reportData?.charges?.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد حصص توزيع مستأجرين مسجلة ضمن هذه المعايير.
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5 text-center">الوحدة</th>
                    <th className="p-3.5">المستأجر</th>
                    <th className="p-3.5">العقار والمبنى</th>
                    <th className="p-3.5 text-center">طريقة التوزيع</th>
                    <th className="p-3.5 text-left">الحصة المحسوبة</th>
                    <th className="p-3.5 text-left">المبلغ المرحل</th>
                    <th className="p-3.5 text-center">رقم الفاتورة</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData?.charges?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-center font-bold text-cyan-900 font-mono">وحدة {c.unitNumber}</td>
                      <td className="p-3.5">
                        <strong className="text-slate-900 block">{c.tenantName || 'شاغر'}</strong>
                        {c.tenantPhone && <span className="text-[10px] text-slate-400 font-mono">{c.tenantPhone}</span>}
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-800 font-medium block">{c.propertyName}</span>
                        <span className="text-[10px] text-slate-500">{c.buildingName || '—'}</span>
                      </td>
                      <td className="p-3.5 text-center font-mono text-[11px] text-slate-600">{c.distributionBasis}</td>
                      <td className="p-3.5 text-left font-mono text-slate-700">{Number(c.calculatedShare || 0).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900">{Number(c.finalCharge || 0).toLocaleString()} ر.ي</td>
                      <td className="p-3.5 text-center font-mono text-[11px] text-cyan-700">{c.invoiceNumber || '—'}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status === 'POSTED' ? 'مرحل للذمم' : 'معلق'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Print Modal Portal */}
      {reportData && (
        <WaterDetailedReportPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          reportData={reportData}
          propertyName={selectedPropertyName}
        />
      )}
    </div>
  );
};
