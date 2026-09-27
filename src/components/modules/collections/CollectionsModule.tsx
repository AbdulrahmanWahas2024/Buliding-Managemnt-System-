import React, { useState, useEffect } from 'react';
import { 
  BadgeDollarSign, 
  Building2, 
  Wallet, 
  Receipt, 
  Users, 
  FileText, 
  Calendar, 
  BarChart3, 
  Lock, 
  History, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  FileSpreadsheet, 
  RefreshCw, 
  RotateCcw, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  ArrowRight, 
  Eye, 
  Edit2, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Layers,
  MapPin,
  Phone,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ERP_API } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { CURRENT_USER } from '../../../data/initialData';
import { 
  Property, 
  CollectionCenter, 
  CashBox, 
  CashBoxClosing, 
  CollectionReceiptRecord, 
  ReceivableItem, 
  CollectionDashboardStats 
} from '../../../types/erp';

// Modals
import { CenterModal } from './CenterModal';
import { CashBoxModal } from './CashBoxModal';
import { CashBoxClosingModal } from './CashBoxClosingModal';
import { CancelOrReverseReceiptModal } from './CancelOrReverseReceiptModal';
import { CollectionReceiptPrintModal } from './CollectionReceiptPrintModal';
import { NewReceiptModal } from './NewReceiptModal';
import { CollectionReportPrintModal } from './CollectionReportPrintModal';

interface Props {
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
  onRefreshGlobalStats?: () => void;
}

type SubTab = 
  | 'dashboard'
  | 'centers'
  | 'cash_boxes'
  | 'receipts'
  | 'new_receipt'
  | 'receivables'
  | 'daily_summary'
  | 'reports'
  | 'closings'
  | 'audit';

export const CollectionsModule: React.FC<Props> = ({
  onNavigateToTenant,
  onNavigateToProperty,
  onRefreshGlobalStats
}) => {
  // Navigation SubTab
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');

  // Core Data States
  const [properties, setProperties] = useState<Property[]>([]);
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [receipts, setReceipts] = useState<CollectionReceiptRecord[]>([]);
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [closings, setClosings] = useState<CashBoxClosing[]>([]);
  const [dashboardStats, setDashboardStats] = useState<CollectionDashboardStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('ALL');
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('ALL');
  const [selectedBoxFilter, setSelectedBoxFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Modals visibility states
  const [isCenterModalOpen, setIsCenterModalOpen] = useState(false);
  const [centerToEdit, setCenterToEdit] = useState<CollectionCenter | null>(null);

  const [isCashBoxModalOpen, setIsCashBoxModalOpen] = useState(false);
  const [cashBoxToEdit, setCashBoxToEdit] = useState<CashBox | null>(null);

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingDefaultBox, setClosingDefaultBox] = useState<CashBox | null>(null);

  const [isNewReceiptOpen, setIsNewReceiptOpen] = useState(false);
  const [preSelectedReceivable, setPreSelectedReceivable] = useState<ReceivableItem | null>(null);

  const [receiptToPrint, setReceiptToPrint] = useState<CollectionReceiptRecord | null>(null);
  const [receiptToCancelOrReverse, setReceiptToCancelOrReverse] = useState<{
    receipt: CollectionReceiptRecord;
    mode: 'CANCEL' | 'REVERSE';
  } | null>(null);

  // Reports
  const [reportType, setReportType] = useState<string>('daily');
  const [reportData, setReportData] = useState<any | null>(null);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

  // Load all data from MySQL
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        propsData,
        centersData,
        boxesData,
        statsData,
        receiptsData,
        receivablesData,
        closingsData,
        auditsData
      ] = await Promise.allSettled([
        ERP_API.getProperties(),
        ERP_API.getCollectionCenters(),
        ERP_API.getCollectionCashBoxes(),
        ERP_API.getCollectionDashboard(),
        ERP_API.getCollectionReceipts(),
        ERP_API.getOutstandingReceivables(),
        ERP_API.getCashBoxClosings(),
        ERP_API.getAuditLogs ? ERP_API.getAuditLogs() : Promise.resolve([])
      ]);

      if (propsData.status === 'fulfilled') setProperties(propsData.value || []);
      if (centersData.status === 'fulfilled') setCenters(centersData.value || []);
      if (boxesData.status === 'fulfilled') setCashBoxes(boxesData.value || []);
      if (statsData.status === 'fulfilled') setDashboardStats(statsData.value);
      if (receiptsData.status === 'fulfilled') setReceipts(receiptsData.value || []);
      if (receivablesData.status === 'fulfilled') setReceivables(receivablesData.value || []);
      if (closingsData.status === 'fulfilled') setClosings(closingsData.value || []);
      if (auditsData.status === 'fulfilled') {
        const pAudits = (auditsData.value || []).filter((a: any) => 
          a.entity === 'PAYMENT' || a.entity === 'PAYMENT_RECEIPT' || a.entity === 'CASH_BOX' || a.entity === 'COLLECTION_CENTER'
        );
        setAuditLogs(pAudits);
      }
    } catch (err) {
      console.error('Failed to load collections data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
    if (onRefreshGlobalStats) onRefreshGlobalStats();
  };

  // Quick collection trigger
  const handleOpenCollectForReceivable = (item: ReceivableItem) => {
    setPreSelectedReceivable(item);
    setIsNewReceiptOpen(true);
  };

  // Excel Export
  const handleExportToExcel = () => {
    let rowsToExport: any[] = [];
    let fileName = `Collections_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (activeSubTab === 'receipts' || activeSubTab === 'reports') {
      rowsToExport = receipts.map((r, i) => ({
        'م': i + 1,
        'رقم سند القبض': r.receiptNumber,
        'تاريخ السند': (r.collectedAt || '').slice(0, 10),
        'المستأجر': r.tenantName,
        'العقار': r.propertyName,
        'الوحدة': r.unitNumber,
        'نوع الذمة': r.accountType === 'RENT' ? 'إيجار' : r.accountType === 'ELECTRICITY' ? 'كهرباء' : r.accountType === 'WATER' ? 'مياه' : 'خدمات',
        'المبلغ المحصل (ر.ي)': r.amountPaid,
        'طريقة الدفع': r.paymentMethod === 'CASH' ? 'نقدي' : r.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : r.paymentMethod === 'CHECK' ? 'شيك' : 'محفظة',
        'مركز التحصيل': r.centerName || 'المركز الرئيسي',
        'الصندوق': r.cashBoxName || 'الصندوق الرئيسي',
        'أمين الصندوق': r.collectorName,
        'الحالة': r.status === 'CANCELLED' ? 'ملغى' : r.status === 'REVERSED' ? 'معكوس' : 'معتمد ومرحل'
      }));
    } else if (activeSubTab === 'receivables') {
      rowsToExport = receivables.map((rec, i) => ({
        'م': i + 1,
        'رقم الفاتورة': rec.invoiceNumber,
        'المستأجر': rec.tenantName,
        'هاتف المستأجر': rec.tenantPhone || '',
        'العقار': rec.propertyName,
        'الوحدة': rec.unitNumber,
        'تاريخ الاستحقاق': rec.dueDate,
        'المبلغ الإجمالي': rec.totalAmount,
        'المبلغ المدفوع': rec.paidAmount,
        'المبلغ المتبقي المستحق': rec.remainingAmount,
        'نوع الذمة': rec.accountType === 'RENT' ? 'إيجار' : rec.accountType === 'ELECTRICITY' ? 'كهرباء' : rec.accountType === 'WATER' ? 'مياه' : 'خدمات',
        'الحالة': rec.status === 'OVERDUE' ? 'متعثرة ومتأخرة' : 'مستحقة السداد'
      }));
      fileName = `Outstanding_Receivables_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (activeSubTab === 'cash_boxes') {
      rowsToExport = cashBoxes.map((b, i) => ({
        'م': i + 1,
        'كود الصندوق': b.code,
        'اسم الصندوق': b.name,
        'مركز التحصيل': b.centerName || '',
        'أمين الصندوق': b.cashierName || '',
        'العملة': b.currency,
        'الرصيد الافتتاحي': b.openingBalance,
        'الرصيد الحالي الفعلي': b.currentBalance,
        'تحصيل اليوم': b.todayCollections || 0,
        'الحالة': b.status === 'ACTIVE' ? 'نشط' : b.status === 'CLOSED' ? 'مغلق ومورد' : 'غير نشط'
      }));
      fileName = `Cash_Boxes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    }

    if (rowsToExport.length === 0) {
      alert('لا توجد بيانات متاحة للتصدير حالياً');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rowsToExport);
    ws['!dir'] = 'rtl';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'البيانات المحاسبية');
    XLSX.writeFile(wb, fileName);
  };

  // Load report data
  const handleLoadReport = async (type: string) => {
    setReportType(type);
    try {
      const data = await ERP_API.getCollectionReports({
        reportType: type,
        propertyId: selectedPropertyFilter !== 'ALL' ? selectedPropertyFilter : undefined,
        centerId: selectedCenterFilter !== 'ALL' ? selectedCenterFilter : undefined,
        cashBoxId: selectedBoxFilter !== 'ALL' ? selectedBoxFilter : undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  };

  // Permission check helper
  const canManage = CURRENT_USER.role === 'SUPER_ADMIN' || CURRENT_USER.role === 'PROPERTY_MANAGER';

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir="rtl">
      {/* 1. Header & Navigation Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                إدارة التحصيل ومراكز الصناديق الخزنية
              </h1>
              <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                MySQL Real-Time
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              إدارة مراكز وفروع التحصيل، الصناديق النقدية، إصدار وعكس سندات القبض، وتحصيل الذمم المدينة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPreSelectedReceivable(null);
              setIsNewReceiptOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>سند قبض جديد</span>
          </button>

          <button
            onClick={() => {
              setCenterToEdit(null);
              setIsCenterModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>إضافة مركز</span>
          </button>

          <button
            onClick={() => {
              setCashBoxToEdit(null);
              setIsCashBoxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-amber-600" />
            <span>إضافة صندوق</span>
          </button>

          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="تصدير إلى Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="تحديث البيانات من MySQL"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>لوحة المؤشرات</span>
          </button>

          <button
            onClick={() => setActiveSubTab('receipts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'receipts'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>سندات القبض</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'receipts' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {receipts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('receivables')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'receivables'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>الذمم المستحقة للتحصيل</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'receivables' ? 'bg-emerald-700 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {receivables.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('centers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'centers'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>مراكز التحصيل</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'centers' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {centers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('cash_boxes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'cash_boxes'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>الصناديق الخزنية</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'cash_boxes' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {cashBoxes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('closings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'closings'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>إغلاق وتوريد الصناديق</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('reports');
              handleLoadReport(reportType);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>التقارير التحليلية</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل التدقيق</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SUBTAB A: DASHBOARD VIEW                              */}
      {/* ======================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 4 Primary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">إجمالي الذمم المستحقة</span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {formatMoney(dashboardStats?.totalOutstandingReceivables || 0)} <span className="text-xs font-sans text-slate-500">ر.ي</span>
              </div>
              <div className="mt-2 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                <span>على {dashboardStats?.tenantsWithDueCount || 0} مستأجراً وعميلاً</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">المحصل اليوم</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 font-mono">
                {formatMoney(dashboardStats?.totalCollectedToday || 0)} <span className="text-xs font-sans text-slate-500">ر.ي</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>{dashboardStats?.receiptsCountToday || 0} سند قبض محرر اليوم</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">المحصل هذا الشهر</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {formatMoney(dashboardStats?.totalCollectedThisMonth || 0)} <span className="text-xs font-sans text-slate-500">ر.ي</span>
              </div>
              <div className="mt-2 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                <span>إجمالي الإيرادات الموردة دفترياً</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">إجمالي النقدية بالصناديق</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
                {formatMoney(dashboardStats?.totalCurrentCashInBoxes || 0)} <span className="text-xs font-sans text-slate-500">ر.ي</span>
              </div>
              <div className="mt-2 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <span>موزعة على {dashboardStats?.activeCashBoxesCount || cashBoxes.length} صندوقاً نشطاً</span>
              </div>
            </div>
          </div>

          {/* Secondary Grid: Cash Boxes Snapshot & Recent Receipts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cash Boxes Snapshot Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-800">أرصدة الصناديق الخزنية المباشرة</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('cash_boxes')}
                  className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  إدارة الكل ←
                </button>
              </div>

              <div className="space-y-2.5">
                {cashBoxes.map(box => (
                  <div key={box.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-colors flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">{box.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {box.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {box.centerName} | الكاشير: {box.cashierName || 'غير محدد'}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="font-black text-sm font-mono text-amber-900 block">
                        {formatMoney(box.currentBalance)} {box.currency}
                      </span>
                      <button
                        onClick={() => {
                          setClosingDefaultBox(box);
                          setIsClosingModalOpen(true);
                        }}
                        className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                      >
                        إغلاق وتوريد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Collections Table Snapshot */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">أحدث سندات القبض المحصلة والمرحلة</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('receipts')}
                  className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  عرض كافة السندات ←
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200/70 pb-2">
                      <th className="pb-2 font-bold">رقم السند</th>
                      <th className="pb-2 font-bold">المستأجر</th>
                      <th className="pb-2 font-bold">العقار / الوحدة</th>
                      <th className="pb-2 font-bold text-left">المبلغ</th>
                      <th className="pb-2 font-bold text-center">طريقة الدفع</th>
                      <th className="pb-2 font-bold text-center">الحالة</th>
                      <th className="pb-2 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receipts.slice(0, 6).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 font-mono font-bold text-slate-800">
                          {r.receiptNumber}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-800">
                          {r.tenantName}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {r.propertyName} ({r.unitNumber})
                        </td>
                        <td className="py-2.5 font-mono font-black text-emerald-800 text-left">
                          {formatMoney(r.amountPaid)} ر.ي
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.paymentMethod === 'CASH' ? 'نقدي' : r.paymentMethod === 'BANK_TRANSFER' ? 'تحويل' : r.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          {r.status === 'CANCELLED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ملغى
                            </span>
                          ) : r.status === 'REVERSED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              معكوس
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              مرحل
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => setReceiptToPrint(r)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="طباعة السند"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SUBTAB B: COLLECTION CENTERS                          */}
      {/* ======================================================== */}
      {activeSubTab === 'centers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المركز، الكود، الموقع..."
                className="w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={() => {
                setCenterToEdit(null);
                setIsCenterModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مركز تحصيل</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centers
              .filter(c => !searchQuery || c.name.includes(searchQuery) || c.code.includes(searchQuery) || (c.location && c.location.includes(searchQuery)))
              .map(center => (
                <div key={center.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold block mb-1">
                          {center.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {center.name}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        center.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {center.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      {center.propertyName && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{center.propertyName}</span>
                        </div>
                      )}
                      {center.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{center.location}</span>
                        </div>
                      )}
                      {center.managerName && (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>المسؤول: {center.managerName}</span>
                        </div>
                      )}
                      {center.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-left">{center.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      الصناديق التابعة: <strong>{center.cashBoxCount || 0}</strong>
                    </span>

                    <button
                      onClick={() => {
                        setCenterToEdit(center);
                        setIsCenterModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>تعديل</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SUBTAB C: CASH BOXES                                  */}
      {/* ======================================================== */}
      {activeSubTab === 'cash_boxes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">تصفية حسب المركز:</span>
              <select
                value={selectedCenterFilter}
                onChange={(e) => setSelectedCenterFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">كافة مراكز التحصيل</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setCashBoxToEdit(null);
                setIsCashBoxModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صندوق خزني جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cashBoxes
              .filter(b => selectedCenterFilter === 'ALL' || b.centerId === selectedCenterFilter)
              .map(box => (
                <div key={box.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold block mb-1">
                          {box.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {box.name}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        box.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {box.status === 'ACTIVE' ? 'نشط' : 'مغلق'}
                      </span>
                    </div>

                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 my-3">
                      <span className="text-[11px] text-amber-800 block font-bold">الرصيد النقدي المتوفر بالصندوق:</span>
                      <span className="text-xl font-black font-mono text-amber-950 block mt-0.5">
                        {formatMoney(box.currentBalance)} {box.currency}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-500">مركز التحصيل:</span>
                        <span className="font-semibold text-slate-800">{box.centerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">أمين الصندوق (الكاشير):</span>
                        <span className="font-semibold text-slate-800">{box.cashierName || 'غير محدد'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الرصيد الافتتاحي:</span>
                        <span className="font-mono">{formatMoney(box.openingBalance)} {box.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setClosingDefaultBox(box);
                        setIsClosingModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>إغلاق وجرد</span>
                    </button>

                    <button
                      onClick={() => {
                        setCashBoxToEdit(box);
                        setIsCashBoxModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>تعديل</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SUBTAB D: RECEIPTS / سندات القبض                      */}
      {/* ======================================================== */}
      {activeSubTab === 'receipts' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم السند، المستأجر..."
                className="w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <select
                value={selectedPropertyFilter}
                onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">كافة العقارات والأصول</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              >
                <option value="ALL">كافة الحالات</option>
                <option value="COMPLETED">معتمد ومرحل</option>
                <option value="CANCELLED">سندات ملغاة</option>
                <option value="REVERSED">سندات معكوسة</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPreSelectedReceivable(null);
                  setIsNewReceiptOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>قبض جديد</span>
              </button>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-3.5">رقم السند</th>
                    <th className="py-3 px-3.5">التاريخ والوقت</th>
                    <th className="py-3 px-3.5">المستأجر</th>
                    <th className="py-3 px-3.5">العقار والوحدة</th>
                    <th className="py-3 px-3.5">نوع الذمة</th>
                    <th className="py-3 px-3.5 text-left">المبلغ المحصل</th>
                    <th className="py-3 px-3.5 text-center">طريقة الدفع</th>
                    <th className="py-3 px-3.5">المركز / الصندوق</th>
                    <th className="py-3 px-3.5 text-center">الحالة</th>
                    <th className="py-3 px-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts
                    .filter(r => {
                      if (searchQuery && !r.receiptNumber.includes(searchQuery) && !r.tenantName.includes(searchQuery)) return false;
                      if (selectedStatusFilter !== 'ALL' && r.status !== selectedStatusFilter) return false;
                      return true;
                    })
                    .map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {r.receiptNumber}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-500">
                          {(r.collectedAt || '').slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-800">
                          {r.tenantName}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600">
                          {r.propertyName} ({r.unitNumber})
                        </td>
                        <td className="py-3 px-3.5 font-semibold">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                            {r.accountType === 'RENT' ? 'إيجار عقاري' : r.accountType === 'ELECTRICITY' ? 'كهرباء' : r.accountType === 'WATER' ? 'مياه' : 'خدمات'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-sm text-emerald-800 text-left">
                          {formatMoney(r.amountPaid)} ر.ي
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.paymentMethod === 'CASH' ? 'نقدي (كاش)' : r.paymentMethod === 'BANK_TRANSFER' ? 'تحويل' : r.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 text-[11px]">
                          <div>{r.centerName || 'المركز الرئيسي'}</div>
                          <div className="text-[10px] text-amber-800 font-medium">{r.cashBoxName || 'الصندوق الرئيسي'}</div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {r.status === 'CANCELLED' ? (
                            <span 
                              title={r.cancellationReason || 'سند ملغى'}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            >
                              <Ban className="w-3 h-3 text-rose-600" />
                              <span>ملغى</span>
                            </span>
                          ) : r.status === 'REVERSED' ? (
                            <span 
                              title={r.reversalReason || 'معكوس الترحيل'}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                            >
                              <RotateCcw className="w-3 h-3 text-purple-600" />
                              <span>معكوس</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>معتمد ومرحل</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setReceiptToPrint(r)}
                              title="طباعة السند الرسمي A4"
                              className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة</span>
                            </button>

                            {r.status === 'COMPLETED' && canManage && (
                              <>
                                <button
                                  onClick={() => setReceiptToCancelOrReverse({ receipt: r, mode: 'CANCEL' })}
                                  title="إلغاء السند وعكس الأثر المالي"
                                  className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>إلغاء</span>
                                </button>

                                <button
                                  onClick={() => setReceiptToCancelOrReverse({ receipt: r, mode: 'REVERSE' })}
                                  title="عكس الترحيل المالي وتوليد قيد تسوية عكسي"
                                  className="flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>عكس</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. SUBTAB E: OUTSTANDING RECEIVABLES                     */}
      {/* ======================================================== */}
      {activeSubTab === 'receivables' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-600">تصفية العقار:</span>
              <select
                value={selectedPropertyFilter}
                onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs outline-none"
              >
                <option value="ALL">كافة العقارات</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="text-slate-500 font-medium">
              إجمالي الذمم المعلقة: <strong>{receivables.length}</strong> فاتورة مستحقة
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-3.5">المستأجر</th>
                    <th className="py-3 px-3.5">العقار والوحدة</th>
                    <th className="py-3 px-3.5">رقم الفاتورة</th>
                    <th className="py-3 px-3.5">نوع الذمة</th>
                    <th className="py-3 px-3.5">تاريخ الاستحقاق</th>
                    <th className="py-3 px-3.5 text-left">المبلغ الأصلي</th>
                    <th className="py-3 px-3.5 text-left">المدفوع</th>
                    <th className="py-3 px-3.5 text-left">المتبقي للتحصيل</th>
                    <th className="py-3 px-3.5 text-center">إجراء التحصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivables
                    .filter(r => selectedPropertyFilter === 'ALL' || r.propertyId === selectedPropertyFilter)
                    .map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{rec.tenantName}</div>
                          {rec.tenantPhone && <div className="text-[10px] text-slate-500 font-mono">{rec.tenantPhone}</div>}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700">
                          {rec.propertyName} ({rec.unitNumber})
                        </td>
                        <td className="py-3 px-3.5 font-mono font-semibold text-slate-800">
                          {rec.invoiceNumber}
                        </td>
                        <td className="py-3 px-3.5 font-semibold">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                            {rec.accountType === 'RENT' ? 'إيجار عقاري' : rec.accountType === 'ELECTRICITY' ? 'كهرباء' : rec.accountType === 'WATER' ? 'مياه' : 'خدمات'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-600">
                          {rec.dueDate}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-700 text-left">
                          {formatMoney(rec.totalAmount)}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-emerald-700 text-left font-bold">
                          {formatMoney(rec.paidAmount)}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-rose-600 text-left text-sm">
                          {formatMoney(rec.remainingAmount)} ر.ي
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <button
                            onClick={() => handleOpenCollectForReceivable(rec)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>تحصيل وسداد</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. SUBTAB F: CASH BOX CLOSINGS                           */}
      {/* ======================================================== */}
      {activeSubTab === 'closings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">سجل محاضر إغلاق وتوريد الصناديق الخزنية</h3>
              <p className="text-xs text-slate-500 mt-0.5">توثيق الجرد اليومي، الفوارق النقدية، واعتمادات التوريد بالبنوك</p>
            </div>

            <button
              onClick={() => {
                setClosingDefaultBox(cashBoxes[0] || null);
                setIsClosingModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>إغلاق صندوق جديد اليوم</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-3.5">رقم المحضر</th>
                    <th className="py-3 px-3.5">تاريخ الإغلاق</th>
                    <th className="py-3 px-3.5">الصندوق الخزني</th>
                    <th className="py-3 px-3.5">أمين الصندوق (الكاشير)</th>
                    <th className="py-3 px-3.5 text-left">النقدية المتوقعة</th>
                    <th className="py-3 px-3.5 text-left">النقدية الفعلية</th>
                    <th className="py-3 px-3.5 text-left">الفارق المالي</th>
                    <th className="py-3 px-3.5 text-center">الحالة</th>
                    <th className="py-3 px-3.5">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-bold">
                        لم يتم تسجيل أي محاضر إغلاق صناديق حتى الآن
                      </td>
                    </tr>
                  ) : (
                    closings.map(cls => (
                      <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                          {cls.closingNumber}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-600">
                          {cls.closingDate}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          {cls.cashBoxName}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700">
                          {cls.cashierName}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-800 text-left font-bold">
                          {formatMoney(cls.expectedCash)} ر.ي
                        </td>
                        <td className="py-3 px-3.5 font-mono text-purple-900 text-left font-black">
                          {formatMoney(cls.actualCash)} ر.ي
                        </td>
                        <td className={`py-3 px-3.5 font-mono text-left font-bold ${
                          cls.difference === 0 ? 'text-emerald-700' : cls.difference > 0 ? 'text-blue-700' : 'text-rose-700'
                        }`}>
                          {cls.difference > 0 ? `+${formatMoney(cls.difference)}` : formatMoney(cls.difference)} ر.ي
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            مغلق ومورد
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-500">
                          {cls.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. SUBTAB G: COLLECTION REPORTS                          */}
      {/* ======================================================== */}
      {activeSubTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">التقارير التحليلية والمالية الشاملة</h3>
                <p className="text-xs text-slate-500 mt-0.5">توليد وطباعة تقارير التحصيل التفصيلية حسب العقار، الكاشير، طريقة الدفع، واليوم</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReportPrintOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>معاينة وطباعة A4</span>
                </button>
                <button
                  onClick={handleExportToExcel}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير Excel</span>
                </button>
              </div>
            </div>

            {/* Sub-report selector buttons */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
              {[
                { id: 'daily', label: 'التحصيل اليومي' },
                { id: 'cashier', label: 'حسب أمين الصندوق' },
                { id: 'center', label: 'حسب مركز التحصيل' },
                { id: 'property', label: 'حسب العقار' },
                { id: 'payment_method', label: 'حسب طريقة الدفع' },
                { id: 'cancelled', label: 'سندات ملغاة ومعكوسة' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleLoadReport(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reportType === tab.id 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Report Data Table Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 border-b pb-2">
              نتائج التقرير الحالي ({reportType})
            </h4>

            {reportData?.rows && reportData.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">#</th>
                      {reportType === 'daily' ? (
                        <>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3 text-center">عدد السندات</th>
                          <th className="py-2.5 px-3 text-left">نقدياً (كاش)</th>
                          <th className="py-2.5 px-3 text-left">تحويلات وبنوك</th>
                          <th className="py-2.5 px-3 text-left">الإجمالي المحصل</th>
                        </>
                      ) : reportType === 'cashier' ? (
                        <>
                          <th className="py-2.5 px-3">أمين الصندوق</th>
                          <th className="py-2.5 px-3 text-center">عدد السندات</th>
                          <th className="py-2.5 px-3 text-left">التحصيل النقدي</th>
                          <th className="py-2.5 px-3 text-left">التحصيل غير النقدي</th>
                          <th className="py-2.5 px-3 text-left">إجمالي المحصل</th>
                        </>
                      ) : reportType === 'property' ? (
                        <>
                          <th className="py-2.5 px-3">العقار</th>
                          <th className="py-2.5 px-3 text-center">عدد السندات</th>
                          <th className="py-2.5 px-3 text-left">إيجارات</th>
                          <th className="py-2.5 px-3 text-left">كهرباء</th>
                          <th className="py-2.5 px-3 text-left">مياه</th>
                          <th className="py-2.5 px-3 text-left">الإجمالي</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-3">رقم السند</th>
                          <th className="py-2.5 px-3">المستأجر</th>
                          <th className="py-2.5 px-3">العقار</th>
                          <th className="py-2.5 px-3 text-left">المبلغ</th>
                          <th className="py-2.5 px-3 text-center">الحالة</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        {reportType === 'daily' ? (
                          <>
                            <td className="py-2.5 px-3 font-mono font-bold">{r.date}</td>
                            <td className="py-2.5 px-3 text-center font-bold">{r.receipt_count}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{formatMoney(r.cash_amount)}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{formatMoney(r.non_cash_amount)}</td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-800">{formatMoney(r.total_collected)} ر.ي</td>
                          </>
                        ) : reportType === 'cashier' ? (
                          <>
                            <td className="py-2.5 px-3 font-bold">{r.collector_name}</td>
                            <td className="py-2.5 px-3 text-center font-bold">{r.receipt_count}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{formatMoney(r.cash_amount)}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{formatMoney(r.non_cash_amount)}</td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-800">{formatMoney(r.total_collected)} ر.ي</td>
                          </>
                        ) : reportType === 'property' ? (
                          <>
                            <td className="py-2.5 px-3 font-bold">{r.property_name}</td>
                            <td className="py-2.5 px-3 text-center font-bold">{r.receipt_count}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{formatMoney(r.rent_amount)}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{formatMoney(r.electricity_amount)}</td>
                            <td className="py-2.5 px-3 text-left font-mono">{formatMoney(r.water_amount)}</td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-800">{formatMoney(r.total_collected)} ر.ي</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 font-mono font-bold">{r.receipt_number || r.receiptNumber}</td>
                            <td className="py-2.5 px-3 font-bold">{r.tenant_name || r.tenantName}</td>
                            <td className="py-2.5 px-3">{r.property_name || r.propertyName}</td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-800">{formatMoney(r.amount_paid || r.amountPaid)} ر.ي</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {r.status}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-bold">
                لا توجد بيانات مسجلة لهذا التقرير
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. SUBTAB H: AUDIT LOGS                                 */}
      {/* ======================================================== */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800">سجل الرقابة والتدقيق لعمليات التحصيل والخزينة</h3>
            <p className="text-xs text-slate-500 mt-0.5">تتبع تاريخي غير قابل للتعديل لكافة حركات القبض، الإلغاء، العكس، وإغلاق الصناديق</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-3.5">التاريخ والوقت</th>
                    <th className="py-3 px-3.5">المستخدم المنفذ</th>
                    <th className="py-3 px-3.5">نوع الحركة</th>
                    <th className="py-3 px-3.5">الكائن</th>
                    <th className="py-3 px-3.5">تفاصيل الحركة والأثر المالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                        لا توجد حركات تدقيق مسجلة حالياً
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3.5 font-mono text-slate-500">
                          {log.timestamp ? log.timestamp.slice(0, 19).replace('T', ' ') : ''}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-800">
                          {log.userName || log.user_name || 'م. أحمد الوهاس'}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action.includes('COLLECT') || log.action.includes('CREATE')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.action.includes('CANCEL') || log.action.includes('REVERSE')
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                          {log.entity}
                        </td>
                        <td className="py-3 px-3.5 text-slate-800 font-medium">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. INTERACTIVE MODALS                                   */}
      {/* ======================================================== */}

      {isCenterModalOpen && (
        <CenterModal
          isOpen={isCenterModalOpen}
          onClose={() => {
            setIsCenterModalOpen(false);
            setCenterToEdit(null);
          }}
          onSuccess={() => {
            loadAllData();
            if (onRefreshGlobalStats) onRefreshGlobalStats();
          }}
          centerToEdit={centerToEdit}
          properties={properties}
        />
      )}

      {isCashBoxModalOpen && (
        <CashBoxModal
          isOpen={isCashBoxModalOpen}
          onClose={() => {
            setIsCashBoxModalOpen(false);
            setCashBoxToEdit(null);
          }}
          onSuccess={() => {
            loadAllData();
            if (onRefreshGlobalStats) onRefreshGlobalStats();
          }}
          cashBoxToEdit={cashBoxToEdit}
          centers={centers}
        />
      )}

      {isClosingModalOpen && (
        <CashBoxClosingModal
          isOpen={isClosingModalOpen}
          onClose={() => {
            setIsClosingModalOpen(false);
            setClosingDefaultBox(null);
          }}
          onSuccess={() => {
            loadAllData();
            if (onRefreshGlobalStats) onRefreshGlobalStats();
          }}
          cashBoxes={cashBoxes}
          defaultCashBox={closingDefaultBox}
        />
      )}

      {isNewReceiptOpen && (
        <NewReceiptModal
          isOpen={isNewReceiptOpen}
          onClose={() => {
            setIsNewReceiptOpen(false);
            setPreSelectedReceivable(null);
          }}
          onSuccess={(newReceipt) => {
            loadAllData();
            if (onRefreshGlobalStats) onRefreshGlobalStats();
            if (newReceipt) {
              setReceiptToPrint(newReceipt);
            }
          }}
          receivables={receivables}
          preSelectedReceivable={preSelectedReceivable}
          centers={centers}
          cashBoxes={cashBoxes}
        />
      )}

      {receiptToPrint && (
        <CollectionReceiptPrintModal
          isOpen={Boolean(receiptToPrint)}
          onClose={() => setReceiptToPrint(null)}
          receipt={receiptToPrint}
        />
      )}

      {receiptToCancelOrReverse && (
        <CancelOrReverseReceiptModal
          isOpen={Boolean(receiptToCancelOrReverse)}
          onClose={() => setReceiptToCancelOrReverse(null)}
          onSuccess={() => {
            loadAllData();
            if (onRefreshGlobalStats) onRefreshGlobalStats();
          }}
          receipt={receiptToCancelOrReverse.receipt}
          mode={receiptToCancelOrReverse.mode}
        />
      )}

      {isReportPrintOpen && reportData && (
        <CollectionReportPrintModal
          isOpen={isReportPrintOpen}
          onClose={() => setIsReportPrintOpen(false)}
          reportType={reportType}
          data={reportData}
          filterSummary={{
            property: selectedPropertyFilter !== 'ALL' ? properties.find(p => p.id === selectedPropertyFilter)?.name : 'كافة العقارات',
            center: selectedCenterFilter !== 'ALL' ? centers.find(c => c.id === selectedCenterFilter)?.name : 'كافة المراكز',
            cashBox: selectedBoxFilter !== 'ALL' ? cashBoxes.find(b => b.id === selectedBoxFilter)?.name : 'كافة الصناديق',
            period: 'فترة الاستعلام المحددة'
          }}
        />
      )}
    </div>
  );
};
