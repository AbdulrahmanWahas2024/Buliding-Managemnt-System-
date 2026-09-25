import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Layers, 
  FileText, 
  Tag, 
  Receipt, 
  BarChart3, 
  User, 
  Calendar,
  RotateCcw,
  Edit2,
  Trash2,
  ArrowRight,
  TrendingUp,
  CreditCard,
  ShieldAlert,
  Eye,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { CURRENT_USER } from '../../../data/initialData';
import { 
  Property, 
  Unit, 
  ElectricityMeter, 
  ElectricityReading, 
  ElectricityTariff, 
  ElectricityDashboardStats 
} from '../../../types/erp';

// Modals
import { MeterModal } from './MeterModal';
import { MeterReplacementModal } from './MeterReplacementModal';
import { ReadingModal } from './ReadingModal';
import { TariffModal } from './TariffModal';
import { ElectricityBillingModal } from './ElectricityBillingModal';
import { ElectricityReportPrintModal } from './ElectricityReportPrintModal';
import { ElectricityInvoicePrintModal } from './ElectricityInvoicePrintModal';
import { ElectricityPostingModal } from './ElectricityPostingModal';
import { DeleteReadingModal } from './DeleteReadingModal';
import { CancelOrReverseInvoiceModal } from './CancelOrReverseInvoiceModal';

interface Props {
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
  onRefreshGlobalStats?: () => void;
}

export const ElectricityModule: React.FC<Props> = ({
  onNavigateToTenant,
  onNavigateToProperty,
  onRefreshGlobalStats
}) => {
  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'meters' | 'readings' | 'tariffs' | 'billing' | 'reports'>('dashboard');

  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [meters, setMeters] = useState<ElectricityMeter[]>([]);
  const [readings, setReadings] = useState<ElectricityReading[]>([]);
  const [tariffs, setTariffs] = useState<ElectricityTariff[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<ElectricityDashboardStats | null>(null);
  const [reportsData, setReportsData] = useState<any>(null);

  // Global & Shared Filters
  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [billingStatusFilter, setBillingStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID' | 'CANCELLED' | 'REVERSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  const currentMonthStr = `${arabicMonths[now.getMonth()]} ${now.getFullYear()}`;
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState('ALL');

  // Modal Open States
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [meterToEdit, setMeterToEdit] = useState<ElectricityMeter | null>(null);

  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [meterToReplace, setMeterToReplace] = useState<ElectricityMeter | null>(null);

  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [readingToEdit, setReadingToEdit] = useState<ElectricityReading | null>(null);

  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [tariffToEdit, setTariffToEdit] = useState<ElectricityTariff | null>(null);

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);
  const [reportTypeForPrint, setReportTypeForPrint] = useState<'meters' | 'readings' | 'consumption' | 'billing'>('consumption');

  const [invoiceToPrint, setInvoiceToPrint] = useState<any | null>(null);

  // Targeted Action Modals
  const [readingToPost, setReadingToPost] = useState<ElectricityReading | null>(null);
  const [readingToDelete, setReadingToDelete] = useState<ElectricityReading | null>(null);
  const [invoiceToCancelOrReverse, setInvoiceToCancelOrReverse] = useState<{ invoice: any; mode: 'CANCEL' | 'REVERSE' } | null>(null);

  // RBAC Permission checks
  const canManage = ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT'].includes(CURRENT_USER.role);
  const canAdmin = ['SUPER_ADMIN', 'PROPERTY_MANAGER'].includes(CURRENT_USER.role);

  // Initial Data Fetch
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [propsRes, statsRes, metersRes, readingsRes, tariffsRes, invoicesRes] = await Promise.allSettled([
        ERP_API.getProperties(),
        ERP_API.getElectricityDashboard({
          propertyId: selectedPropertyId,
          buildingId: selectedBuildingId,
          periodMonth: selectedPeriodMonth !== 'ALL' ? selectedPeriodMonth : undefined
        }),
        ERP_API.getElectricityMeters({
          propertyId: selectedPropertyId,
          buildingId: selectedBuildingId,
          status: selectedStatus,
          search: searchQuery
        }),
        ERP_API.getElectricityReadings({
          propertyId: selectedPropertyId,
          status: selectedStatus,
          periodMonth: selectedPeriodMonth !== 'ALL' ? selectedPeriodMonth : undefined,
          search: searchQuery
        }),
        ERP_API.getElectricityTariffs({
          propertyId: selectedPropertyId
        }),
        ERP_API.getElectricityInvoices({
          propertyId: selectedPropertyId,
          status: billingStatusFilter !== 'ALL' ? billingStatusFilter : undefined,
          periodMonth: selectedPeriodMonth !== 'ALL' ? selectedPeriodMonth : undefined,
          search: searchQuery
        })
      ]);

      if (propsRes.status === 'fulfilled' && propsRes.value) {
        setProperties(propsRes.value);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setDashboardStats(statsRes.value);
      }
      if (metersRes.status === 'fulfilled' && metersRes.value) {
        setMeters(metersRes.value);
      }
      if (readingsRes.status === 'fulfilled' && readingsRes.value) {
        setReadings(readingsRes.value);
      }
      if (tariffsRes.status === 'fulfilled' && tariffsRes.value) {
        setTariffs(tariffsRes.value);
      }
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value) {
        setInvoices(invoicesRes.value);
      }

      // Check if any error occurred for subtle diagnostic
      const errors = [propsRes, statsRes, metersRes, readingsRes, tariffsRes, invoicesRes]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason);
      if (errors.length > 0) {
        console.warn('Some electricity data failed to load:', errors);
      }

      // Load report data if on report tab
      if (activeSubTab === 'reports') {
        loadReportData(reportTypeForPrint);
      }
    } catch (err) {
      console.warn('Electricity data loading notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const invData = await ERP_API.getElectricityInvoices({
        propertyId: selectedPropertyId,
        status: billingStatusFilter !== 'ALL' ? billingStatusFilter : undefined,
        periodMonth: selectedPeriodMonth !== 'ALL' ? selectedPeriodMonth : undefined,
        search: searchQuery
      });
      setInvoices(invData || []);
    } catch (err) {
      console.warn('Error loading electricity invoices:', err);
    }
  };

  const loadReportData = async (type: 'meters' | 'readings' | 'consumption' | 'billing') => {
    try {
      const rep = await ERP_API.getElectricityReports({
        reportType: type,
        propertyId: selectedPropertyId,
        periodMonth: selectedPeriodMonth !== 'ALL' ? selectedPeriodMonth : undefined,
        status: selectedStatus,
        search: searchQuery
      });
      setReportsData(rep);
    } catch (err) {
      console.error('Error loading report:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedPropertyId, selectedBuildingId, selectedStatus, selectedPeriodMonth, activeSubTab, billingStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAllData();
  };

  const handleToggleMeterStatus = async (meter: ElectricityMeter) => {
    const nextStatus = meter.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ERP_API.changeElectricityMeterStatus(meter.id, nextStatus);
      await loadAllData();
    } catch (err: any) {
      console.warn('Error toggling meter status:', err?.message || err);
    }
  };

  // Excel Export Handlers using SheetJS (XLSX)
  const handleExportReadingsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const exportData = readings.map((r, idx) => ({
        'م': idx + 1,
        'رقم العداد': r.meterNumber,
        'العقار': r.propertyName,
        'رقم الوحدة': r.unitNumber,
        'المستأجر': r.tenantName || 'غير محدد',
        'دورة / شهر الفوترة': r.readingPeriodMonth || r.period,
        'تاريخ تسجيل القراءة': r.readingDate,
        'القراءة السابقة': Number(r.previousReading),
        'القراءة الحالية': Number(r.currentReading),
        'الاستهلاك (ك.و/س)': Number(r.consumptionKwh || r.consumption),
        'معامل العداد': Number(r.multiplier || 1),
        'سعر الكيلوواط (ر.ي)': Number(r.ratePerKwh || r.ratePerKWh),
        'إجمالي المبلغ (ر.ي)': Number(r.totalAmount),
        'حالة الفوترة': r.status === 'BILLED' ? 'مرحل ومفوتر' : 'غير مفوتر',
        'رقم الفاتورة': r.invoiceNumber || '-',
        'تاريخ الترحيل': r.postedAt || '-',
        'ملاحظات': r.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'قراءات العدادات');
      XLSX.writeFile(wb, `سجل_قراءات_الكهرباء_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      alert('فشل تصدير القراءات إلى Excel: ' + err.message);
    }
  };

  const handleExportInvoicesToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const billedOnly = readings.filter(r => r.status === 'BILLED');
      const exportData = billedOnly.map((r, idx) => ({
        'م': idx + 1,
        'رقم الفاتورة': r.invoiceNumber || `INV-EL-${r.id.slice(-6)}`,
        'اسم المستأجر': r.tenantName || 'غير محدد',
        'العقار': r.propertyName,
        'رقم الوحدة': r.unitNumber,
        'رقم العداد': r.meterNumber,
        'دورة الفوترة': r.readingPeriodMonth || r.period,
        'تاريخ القراءة': r.readingDate,
        'الاستهلاك (ك.و/س)': Number(r.consumptionKwh || r.consumption),
        'التعرفة (ر.ي)': Number(r.ratePerKwh || r.ratePerKWh),
        'إجمالي قيمة الفاتورة (ر.ي)': Number(r.totalAmount),
        'حالة الترحيل': 'مرحل رسمياً إلى دفتر أستاذ المستأجر',
        'تاريخ الترحيل': r.postedAt || '-',
        'المسؤول عن الترحيل': r.postedBy || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'فواتير الكهرباء');
      XLSX.writeFile(wb, `فواتير_الكهرباء_المرحلة_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      alert('فشل تصدير الفواتير إلى Excel: ' + err.message);
    }
  };

  const handleExportMetersToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const exportData = meters.map((m, idx) => ({
        'م': idx + 1,
        'رقم العداد': m.meterNumber,
        'نوع العداد': m.meterType,
        'العقار': m.propertyName,
        'المبنى': m.buildingName || '-',
        'الوحدة': m.unitNumber || 'غير مخصص',
        'المستأجر الحالي': m.currentTenantName || 'شاغر',
        'الحالة': m.status === 'ACTIVE' ? 'نشط' : m.status === 'REPLACED' ? 'مستبدل' : 'معطل',
        'تاريخ التركيب': m.installationDate || '-',
        'القراءة الابتدائية': Number(m.initialReading || 0),
        'القراءة الحالية': Number(m.currentReading || 0),
        'معامل الضرب': Number(m.multiplier || 1),
        'موقع العداد': m.locationNotes || '',
        'ملاحظات': m.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'عدادات الكهرباء');
      XLSX.writeFile(wb, `كشف_عدادات_الكهرباء_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      alert('فشل تصدير العدادات إلى Excel: ' + err.message);
    }
  };

  const handleExportReportToExcel = () => {
    if (!reportsData || !reportsData.rows) {
      alert('لا توجد بيانات تقرير متاحة للتصدير');
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportsData.rows);
      XLSX.utils.book_append_sheet(wb, ws, `تقرير_${reportTypeForPrint}`);
      XLSX.writeFile(wb, `تقرير_كهرباء_${reportTypeForPrint}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      alert('فشل تصدير التقرير إلى Excel: ' + err.message);
    }
  };

  // Unbilled readings for the billing modal
  const unbilledReadings = readings.filter(r => r.status === 'UNBILLED');

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  الكهرباء والعدادات والتعريفات والفوترة
                </h1>
                <span className="text-[11px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                  نظام حقيقي متصل بقاعدة البيانات MySQL
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة كاملة لعدادات الكهرباء، تسجيل القراءات الدورية، احتساب الاستهلاك والتعريفات، وإصدار الفواتير الآلية لدفتر أستاذ المستأجرين
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <button
                onClick={() => {
                  setReadingToEdit(null);
                  setIsReadingModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل قراءة عداد</span>
              </button>

              <button
                onClick={() => {
                  setMeterToEdit(null);
                  setIsMeterModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>إضافة عداد</span>
              </button>

              <button
                onClick={() => setIsBillingModalOpen(true)}
                disabled={unbilledReadings.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>ترحيل الفواتير ({unbilledReadings.length})</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              setReportTypeForPrint(activeSubTab === 'billing' ? 'billing' : activeSubTab === 'meters' ? 'meters' : activeSubTab === 'readings' ? 'readings' : 'consumption');
              loadReportData(activeSubTab === 'billing' ? 'billing' : activeSubTab === 'meters' ? 'meters' : activeSubTab === 'readings' ? 'readings' : 'consumption');
              setIsReportPrintOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة تقرير A4</span>
          </button>
        </div>
      </div>

      {/* 2. Primary KPI Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-slate-500 text-[11px] font-semibold flex items-center justify-between">
            <span>إجمالي العدادات</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {dashboardStats?.totalMeters || meters.length}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">
            {dashboardStats?.activeMeters || meters.filter(m => m.status === 'ACTIVE').length} عداد نشط
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-slate-500 text-[11px] font-semibold flex items-center justify-between">
            <span>بانتظار القراءة ({dashboardStats?.currentBillingPeriod || currentMonthStr})</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            {dashboardStats?.metersNeedingReading !== undefined ? dashboardStats.metersNeedingReading : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            عدادات بحاجة لتسجيل قراءة
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-slate-500 text-[11px] font-semibold flex items-center justify-between">
            <span>استهلاك الدورة الحالية</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">
            {Number(dashboardStats?.totalConsumptionCurrentPeriod || 0).toLocaleString()} <span className="text-xs font-normal">ك.و/س</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            إجمالي الطاقة المستهلكة
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-slate-500 text-[11px] font-semibold flex items-center justify-between">
            <span>إجمالي الرسوم المفوترة</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatMoney(dashboardStats?.totalElectricityCharges || 0)} <span className="text-xs font-normal">ر.ي</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">
            {dashboardStats?.totalInvoicesCount || 0} فاتورة مصدرة
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-slate-500 text-[11px] font-semibold flex items-center justify-between">
            <span>فواتير قيد التحصيل</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-700 mt-1">
            {dashboardStats?.unpaidChargesCount || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            متبقي: {formatMoney(dashboardStats?.unpaidChargesAmount || 0)} ر.ي
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-slate-500 text-[11px] font-semibold flex items-center justify-between">
            <span>العقارات المشمولة</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-700 mt-1">
            {dashboardStats?.propertiesWithElectricityCount || properties.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            أصول عقارية مزودة بعدادات
          </div>
        </div>
      </div>

      {/* 3. Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'dashboard'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>لوحة التحكم والمؤشرات</span>
        </button>

        <button
          onClick={() => setActiveSubTab('meters')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'meters'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>إدارة العدادات ({meters.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('readings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'readings'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>قراءات العدادات ({readings.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tariffs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'tariffs'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>تعريفات الكهرباء ({tariffs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('billing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'billing'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>الفوترة والترحيل للذمم</span>
          {unbilledReadings.length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
              {unbilledReadings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveSubTab('reports');
            loadReportData(reportTypeForPrint);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>التقارير الشاملة والطباعة</span>
        </button>
      </div>

      {/* 4. Common Filter Controls Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Property Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">العقار:</span>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">كافة العقارات</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Period Month Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">الدورة:</span>
            <select
              value={selectedPeriodMonth}
              onChange={(e) => setSelectedPeriodMonth(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">كافة الفترات</option>
              <option value={currentMonthStr}>{currentMonthStr} (الحالية)</option>
              <option value="أغسطس 2026">أغسطس 2026</option>
              <option value="يوليو 2026">يوليو 2026</option>
              <option value="يونيو 2026">يونيو 2026</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">الحالة:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">الكل</option>
              <option value="ACTIVE">نشط (Active)</option>
              <option value="UNBILLED">غير مفوتر (Unbilled)</option>
              <option value="BILLED">مفوتر ومرحل (Billed)</option>
              <option value="INACTIVE">معطل (Inactive)</option>
              <option value="REPLACED">مستبدل (Replaced)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 w-full sm:w-64">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم العداد أو الوحدة أو المستأجر..."
              className="w-full pl-3 pr-8 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            بحث
          </button>
        </form>
      </div>

      {/* 5. TAB 1: DASHBOARD & KPIS */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Urgent Action Alerts */}
          {unbilledReadings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-950">قراءات معلقة بانتظار الترحيل المالي:</span>{' '}
                  <span className="text-amber-800">
                    يوجد <strong>{unbilledReadings.length} قراءة</strong> تم تسجيلها واحتساب استهلاكها دون إصدار فواتير أو ترحيلها إلى دفتر الأستاذ للذمم.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-end sm:self-center shrink-0"
              >
                ترحيل الفواتير الآن ←
              </button>
            </div>
          )}

          {/* Quick Views Grid: Recent Readings & Meter Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Readings Widget */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-800">أحدث قراءات العدادات المسجلة</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('readings')}
                  className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
                >
                  عرض كافة القراءات ←
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {readings.slice(0, 5).map(r => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 rounded-lg px-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{r.meterNumber}</span>
                        <span className="text-slate-500 font-semibold">(وحدة {r.unitNumber})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {r.tenantName ? `المستأجر: ${r.tenantName}` : 'وحدة شاغرة'} • {r.readingPeriodMonth || r.period}
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <div className="font-bold text-amber-700">
                        {Number(r.consumptionKwh || r.consumption).toLocaleString()} ك.و/س
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700">
                        {formatMoney(r.totalAmount)} ر.ي
                      </div>
                    </div>
                  </div>
                ))}
                {readings.length === 0 && (
                  <div className="text-center py-6 text-slate-400">لا توجد قراءات مسجلة بعد.</div>
                )}
              </div>
            </div>

            {/* Meters Quick Overview */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-800">حالة العدادات وتوزيعها على الوحدات</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('meters')}
                  className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
                >
                  إدارة العدادات ←
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {meters.slice(0, 5).map(m => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 rounded-lg px-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{m.meterNumber}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                          {m.meterType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {m.propertyName} {m.unitNumber ? `• وحدة ${m.unitNumber}` : '• خدمات عامة'}
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.status === 'ACTIVE' ? 'نشط' : m.status === 'REPLACED' ? 'مستبدل' : 'معطل'}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        آخر قراءة: {Number(m.currentReading || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. TAB 2: METERS MANAGEMENT */}
      {activeSubTab === 'meters' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              قائمة عدادات الكهرباء المرتبطة بالعقارات والوحدات ({meters.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMetersToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير Excel</span>
              </button>
              {canManage && (
                <button
                  onClick={() => {
                    setMeterToEdit(null);
                    setIsMeterModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة عداد</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">رقم العداد</th>
                  <th className="py-3 px-3.5">العقار / المبنى</th>
                  <th className="py-3 px-3.5">الوحدة العقارية</th>
                  <th className="py-3 px-3.5">المستأجر الحالي</th>
                  <th className="py-3 px-3.5 font-mono text-center">النوع</th>
                  <th className="py-3 px-3.5 font-mono text-center">القراءة الحالية</th>
                  <th className="py-3 px-3.5 font-mono text-center">المعامل</th>
                  <th className="py-3 px-3.5 text-center">الحالة</th>
                  <th className="py-3 px-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      لا توجد عدادات كهرباء مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  meters.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {m.meterNumber}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-800">
                        {m.propertyName}
                        {m.buildingName && <span className="block text-[11px] text-slate-400 font-normal">{m.buildingName}</span>}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                        {m.unitNumber ? `وحدة ${m.unitNumber}` : <span className="text-slate-400 font-normal">عام / غير محدد</span>}
                      </td>
                      <td className="py-3 px-3.5">
                        {m.currentTenantName ? (
                          <span className="font-semibold text-slate-800">{m.currentTenantName}</span>
                        ) : (
                          <span className="text-slate-400">شاغرة / غير مؤجرة</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-center text-slate-600">
                        {m.meterType}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-center font-bold text-slate-900">
                        {Number(m.currentReading || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-center text-slate-700">
                        {m.multiplier}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.status === 'REPLACED'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {m.status === 'ACTIVE' ? 'نشط' : m.status === 'REPLACED' ? 'مستبدل' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setMeterToEdit(m);
                                  setIsMeterModalOpen(true);
                                }}
                                title="تعديل بيانات العداد"
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setMeterToReplace(m);
                                  setIsReplacementModalOpen(true);
                                }}
                                title="استبدال العداد بأخر جديد"
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleMeterStatus(m)}
                                title={m.status === 'ACTIVE' ? 'إيقاف العداد' : 'تنشيط العداد'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  m.status === 'ACTIVE'
                                    ? 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                                    : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: METER READINGS */}
      {activeSubTab === 'readings' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              سجل قراءات عدادات الكهرباء واحتساب الاستهلاك ({readings.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportReadingsToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير Excel</span>
              </button>
              {canManage && (
                <button
                  onClick={() => {
                    setReadingToEdit(null);
                    setIsReadingModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تسجيل قراءة جديدة</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">التاريخ</th>
                  <th className="py-3 px-3">الدورة / الشهر</th>
                  <th className="py-3 px-3">الوحدة والعقار</th>
                  <th className="py-3 px-3">المستأجر</th>
                  <th className="py-3 px-3 font-mono">رقم العداد</th>
                  <th className="py-3 px-3 font-mono text-center">السابقة</th>
                  <th className="py-3 px-3 font-mono text-center">الحالية</th>
                  <th className="py-3 px-3 font-mono text-center">الاستهلاك</th>
                  <th className="py-3 px-3 font-mono text-center">التعرفة</th>
                  <th className="py-3 px-3 font-mono text-left">المبلغ</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readings.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-slate-400">
                      لا توجد قراءات مسجلة مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  readings.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600">{r.readingDate}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{r.readingPeriodMonth || r.period}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">{r.unitNumber}</span>
                        <span className="text-[11px] text-slate-500 block">{r.propertyName}</span>
                      </td>
                      <td className="py-3 px-3">
                        {r.tenantName || <span className="text-slate-400">غير محدد</span>}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.meterNumber}</td>
                      <td className="py-3 px-3 font-mono text-center text-slate-500">
                        {Number(r.previousReading).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-center font-bold text-slate-900">
                        {Number(r.currentReading).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-center font-bold text-amber-700 bg-amber-50/40">
                        {Number(r.consumptionKwh || r.consumption).toLocaleString()} ك.و
                      </td>
                      <td className="py-3 px-3 font-mono text-center text-slate-700">
                        {r.ratePerKwh || r.ratePerKWh} ر.ي
                      </td>
                      <td className="py-3 px-3 font-mono text-left font-black text-slate-900">
                        {formatMoney(r.totalAmount)} ر.ي
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'BILLED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {r.status === 'BILLED' ? 'مرحل ومفوتر' : 'غير مفوتر'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {r.status === 'BILLED' ? (
                            <button
                              onClick={() => setInvoiceToPrint(r)}
                              title="معاينة وطباعة الفاتورة A4"
                              className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>طباعة</span>
                            </button>
                          ) : (
                            canManage && (
                              <button
                                onClick={() => setReadingToPost(r)}
                                title="إصدار وترحيل الفاتورة مباشرة للذمم المحاسبية"
                                className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border border-emerald-200"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                <span>ترحيل</span>
                              </button>
                            )
                          )}

                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setReadingToEdit(r);
                                  setIsReadingModalOpen(true);
                                }}
                                title="تعديل القراءة"
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setReadingToDelete(r)}
                                title={r.status === 'BILLED' ? 'تعذر حذف قراءة مفوترة (محمية مالياً)' : 'حذف القراءة'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  r.status === 'BILLED' 
                                    ? 'text-slate-300 hover:text-slate-500 hover:bg-slate-100' 
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 4: TARIFFS MANAGEMENT */}
      {activeSubTab === 'tariffs' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              تعريفات أسعار الكهرباء والتاريخ الفعلي للسريان ({tariffs.length})
            </h3>
            {canManage && (
              <button
                onClick={() => {
                  setTariffToEdit(null);
                  setIsTariffModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة تعرفة جديدة</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">اسم التعرفة</th>
                  <th className="py-3 px-4">نطاق التطبيق (العقار)</th>
                  <th className="py-3 px-4 font-mono text-center">سعر الكيلوواط</th>
                  <th className="py-3 px-4 text-center">سارية من تاريخ</th>
                  <th className="py-3 px-4 text-center">سارية حتى تاريخ</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4">الملاحظات</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tariffs.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{t.tariffName || 'تعرفة الكهرباء'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{t.propertyName || 'كافة العقارات (عام)'}</td>
                    <td className="py-3 px-4 font-mono text-center font-black text-amber-700 bg-amber-50/40">
                      {Number(t.ratePerKwh || t.pricePerKWh).toLocaleString()} ر.ي/ك.و
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-slate-600">{t.effectiveFrom}</td>
                    <td className="py-3 px-4 font-mono text-center text-slate-600">{t.effectiveTo || 'مستمرة (حتى الآن)'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.status === 'ACTIVE' ? 'نشطة ومعتمدة' : 'متوقفة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{t.notes || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      {canManage && (
                        <button
                          onClick={() => {
                            setTariffToEdit(t);
                            setIsTariffModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. TAB 5: BILLING & INVOICES */}
      {activeSubTab === 'billing' && (
        <div className="space-y-6">
          {/* Header Action & Pending Readings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                فواتير الكهرباء وترحيل قيود الذمم المالية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إصدار وترحيل القيود المحاسبية للذمم، مع إمكانية طباعة الفواتير النظامية لكل مستأجر
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInvoicesToExcel}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>تصدير الفواتير Excel</span>
              </button>
              {canManage && (
                <button
                  onClick={() => setIsBillingModalOpen(true)}
                  disabled={unbilledReadings.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>إصدار وترحيل ({unbilledReadings.length}) فاتورة جديدة</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Sub-Filters for Billing */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setBillingStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                billingStatusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              كافة الفواتير ({invoices.length})
            </button>
            <button
              onClick={() => setBillingStatusFilter('UNPAID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                billingStatusFilter === 'UNPAID'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              مرحّلة ومستحقة ({invoices.filter(i => i.status === 'UNPAID').length})
            </button>
            <button
              onClick={() => setBillingStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                billingStatusFilter === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              مسددة بالكامل ({invoices.filter(i => i.status === 'PAID').length})
            </button>
            <button
              onClick={() => setBillingStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                billingStatusFilter === 'CANCELLED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              ملغاة ({invoices.filter(i => i.status === 'CANCELLED').length})
            </button>
            <button
              onClick={() => setBillingStatusFilter('REVERSED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                billingStatusFilter === 'REVERSED'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              معكوسة الترحيل ({invoices.filter(i => i.status === 'REVERSED').length})
            </button>
          </div>

          {/* Billed Readings & Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">رقم الفاتورة / المرجع</th>
                    <th className="py-3 px-3.5">المستأجر</th>
                    <th className="py-3 px-3.5">الوحدة والعقار</th>
                    <th className="py-3 px-3.5">دورة الفوترة</th>
                    <th className="py-3 px-3.5 font-mono">العداد</th>
                    <th className="py-3 px-3.5 font-mono text-center">الاستهلاك</th>
                    <th className="py-3 px-3.5 font-mono text-left">المبلغ المستحق</th>
                    <th className="py-3 px-3.5 text-center">حالة الفاتورة والترحيل</th>
                    <th className="py-3 px-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        لا توجد فواتير كهرباء تطابق الفلاتر المحددة حالياً.
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => {
                      const isCancelled = inv.status === 'CANCELLED';
                      const isReversed = inv.status === 'REVERSED';
                      const isPaid = inv.status === 'PAID';
                      const canModify = canAdmin && !isCancelled && !isReversed;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5 font-mono font-bold text-blue-700">
                            {inv.invoiceNumber || inv.id}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">{inv.tenantName || 'غير محدد'}</td>
                          <td className="py-3 px-3.5">
                            <span className="font-semibold text-slate-800">{inv.unitNumber}</span> ({inv.propertyName})
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">{inv.periodMonth}</td>
                          <td className="py-3 px-3.5 font-mono text-slate-700">{inv.meterNumber || '-'}</td>
                          <td className="py-3 px-3.5 font-mono text-center font-bold text-amber-700">
                            {Number(inv.consumptionKwh || 0).toLocaleString()} ك.و
                          </td>
                          <td className="py-3 px-3.5 font-mono text-left font-black text-emerald-700">
                            {formatMoney(inv.totalAmount)} ر.ي
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {isCancelled ? (
                              <span 
                                title={inv.cancellationReason ? `سبب الإلغاء: ${inv.cancellationReason}` : 'فاتورة ملغاة'}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>ملغاة</span>
                              </span>
                            ) : isReversed ? (
                              <span 
                                title={inv.cancellationReason ? `سبب العكس: ${inv.cancellationReason}` : 'معكوسة الترحيل'}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                              >
                                <RotateCcw className="w-3 h-3 text-purple-600" />
                                <span>معكوس الترحيل</span>
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>مسدد بالكامل</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <CheckCircle2 className="w-3 h-3 text-amber-600" />
                                <span>مرحل لدفتر الأستاذ</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setInvoiceToPrint(inv)}
                                title="معاينة وطباعة الفاتورة"
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                                <span>طباعة</span>
                              </button>

                              {canModify && (
                                <>
                                  <button
                                    onClick={() => setInvoiceToCancelOrReverse({ invoice: inv, mode: 'CANCEL' })}
                                    title="إلغاء الفاتورة وعكس القيد المحاسبي"
                                    className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>إلغاء</span>
                                  </button>

                                  <button
                                    onClick={() => setInvoiceToCancelOrReverse({ invoice: inv, mode: 'REVERSE' })}
                                    title="عكس الترحيل المالي وتوليد قيد تسوية عكسي"
                                    className="flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>عكس الترحيل</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 10. TAB 6: REPORTS & PRINTING */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                التقارير التحليلية والطباعة الورقية A4
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد تقارير العدادات، استهلاك الطاقة، الفواتير، والتحصيل مع إمكانية التصدير والطباعة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => {
                    setReportTypeForPrint('consumption');
                    loadReportData('consumption');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reportTypeForPrint === 'consumption' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تقرير الاستهلاك
                </button>
                <button
                  onClick={() => {
                    setReportTypeForPrint('readings');
                    loadReportData('readings');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reportTypeForPrint === 'readings' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  سجل القراءات
                </button>
                <button
                  onClick={() => {
                    setReportTypeForPrint('billing');
                    loadReportData('billing');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reportTypeForPrint === 'billing' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تقرير الفوترة
                </button>
                <button
                  onClick={() => {
                    setReportTypeForPrint('meters');
                    loadReportData('meters');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reportTypeForPrint === 'meters' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  كشف العدادات
                </button>
              </div>

              <button
                onClick={handleExportReportToExcel}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>تصدير Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => setIsReportPrintOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>معاينة وطباعة A4</span>
              </button>
            </div>
          </div>

          {/* Report Live Preview Table */}
          {reportsData && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-800">
                  معاينة مباشرة للتقرير ({reportsData.rows?.length || 0} سجل)
                </span>
                <span className="text-slate-400">
                  تاريخ التوليد: {new Date(reportsData.generatedAt).toLocaleString('ar-YE')}
                </span>
              </div>

              {reportsData.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  {reportsData.summary.totalConsumption !== undefined && (
                    <div>
                      <span className="text-slate-500 text-[11px]">إجمالي الاستهلاك:</span>
                      <div className="font-mono font-bold text-amber-700 text-sm mt-0.5">
                        {Number(reportsData.summary.totalConsumption).toLocaleString()} ك.و/س
                      </div>
                    </div>
                  )}
                  {reportsData.summary.totalAmount !== undefined && (
                    <div>
                      <span className="text-slate-500 text-[11px]">إجمالي الرسوم:</span>
                      <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                        {formatMoney(reportsData.summary.totalAmount)} ر.ي
                      </div>
                    </div>
                  )}
                  {reportsData.summary.totalBilled !== undefined && (
                    <div>
                      <span className="text-slate-500 text-[11px]">إجمالي الفواتير:</span>
                      <div className="font-mono font-bold text-blue-700 text-sm mt-0.5">
                        {formatMoney(reportsData.summary.totalBilled)} ر.ي
                      </div>
                    </div>
                  )}
                  {reportsData.summary.totalRemaining !== undefined && (
                    <div>
                      <span className="text-slate-500 text-[11px]">المتبقي للتحصيل:</span>
                      <div className="font-mono font-bold text-rose-700 text-sm mt-0.5">
                        {formatMoney(reportsData.summary.totalRemaining)} ر.ي
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">العداد</th>
                      <th className="py-2.5 px-3">العقار والوحدة</th>
                      <th className="py-2.5 px-3">المستأجر</th>
                      <th className="py-2.5 px-3">الفترة</th>
                      <th className="py-2.5 px-3 font-mono text-center">الاستهلاك</th>
                      <th className="py-2.5 px-3 font-mono text-left">المبلغ</th>
                      <th className="py-2.5 px-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportsData.rows?.map((row: any, idx: number) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.meterNumber}</td>
                        <td className="py-2 px-3">{row.propertyName} {row.unitNumber ? `(${row.unitNumber})` : ''}</td>
                        <td className="py-2 px-3">{row.tenantName || '-'}</td>
                        <td className="py-2 px-3">{row.period || row.periodMonth || '-'}</td>
                        <td className="py-2 px-3 font-mono text-center font-bold text-amber-700">
                          {Number(row.consumptionKwh || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-mono text-left font-bold text-emerald-700">
                          {formatMoney(row.totalAmount || 0)} ر.ي
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {row.status || 'معتمد'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Modals */}
      <MeterModal
        isOpen={isMeterModalOpen}
        onClose={() => {
          setIsMeterModalOpen(false);
          setMeterToEdit(null);
        }}
        onSuccess={() => {
          loadAllData();
          if (onRefreshGlobalStats) onRefreshGlobalStats();
        }}
        meterToEdit={meterToEdit}
        properties={properties}
      />

      <MeterReplacementModal
        isOpen={isReplacementModalOpen}
        onClose={() => {
          setIsReplacementModalOpen(false);
          setMeterToReplace(null);
        }}
        onSuccess={() => {
          loadAllData();
          if (onRefreshGlobalStats) onRefreshGlobalStats();
        }}
        oldMeter={meterToReplace}
      />

      <ReadingModal
        isOpen={isReadingModalOpen}
        onClose={() => {
          setIsReadingModalOpen(false);
          setReadingToEdit(null);
        }}
        onSuccess={() => {
          loadAllData();
          if (onRefreshGlobalStats) onRefreshGlobalStats();
        }}
        readingToEdit={readingToEdit}
        properties={properties}
      />

      <TariffModal
        isOpen={isTariffModalOpen}
        onClose={() => {
          setIsTariffModalOpen(false);
          setTariffToEdit(null);
        }}
        onSuccess={() => {
          loadAllData();
        }}
        tariffToEdit={tariffToEdit}
        properties={properties}
      />

      <ElectricityBillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onSuccess={() => {
          loadAllData();
          if (onRefreshGlobalStats) onRefreshGlobalStats();
        }}
        unbilledReadings={unbilledReadings}
      />

      <ElectricityReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        reportType={reportTypeForPrint}
        data={reportsData || { rows: readings, summary: {} }}
        filterSummary={{
          property: selectedPropertyId !== 'ALL' ? properties.find(p => p.id === selectedPropertyId)?.name : 'كافة العقارات',
          period: selectedPeriodMonth !== 'ALL' ? selectedPeriodMonth : 'كافة الفترات'
        }}
      />

      <ElectricityInvoicePrintModal
        isOpen={Boolean(invoiceToPrint)}
        onClose={() => setInvoiceToPrint(null)}
        invoice={invoiceToPrint}
      />

    </div>
  );
};
