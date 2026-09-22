import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  DollarSign, 
  Eye, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  Edit3, 
  Building2, 
  Store, 
  User, 
  Calendar,
  RotateCw,
  TrendingUp,
  CreditCard,
  FileText
} from 'lucide-react';
import { Invoice, Tenant, Property } from '../../types/erp';
import { ERP_API } from '../../services/api';
import { InvoicePrintModal } from './billing/InvoicePrintModal';
import { NewRentInvoiceModal } from './billing/NewRentInvoiceModal';
import { InvoiceDetailsModal } from './billing/InvoiceDetailsModal';
import { EditInvoiceModal } from './billing/EditInvoiceModal';
import { CancelInvoiceModal } from './billing/CancelInvoiceModal';

interface RentBillingModuleProps {
  onOpenQuickCollection?: (tenant: Tenant, invoice?: Invoice) => void;
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToUnit?: (unitId: string) => void;
  onNavigateToContract?: (contractId: string) => void;
  onRefreshGlobalStats?: () => void;
}

export const RentBillingModule: React.FC<RentBillingModuleProps> = ({
  onOpenQuickCollection,
  onNavigateToTenant,
  onNavigateToUnit,
  onNavigateToContract,
  onRefreshGlobalStats
}) => {
  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // KPI Summary Stats
  const [stats, setStats] = useState<{
    totalBilled: number;
    totalPaid: number;
    totalRemaining: number;
    totalCount: number;
    paidCount: number;
    partialCount: number;
    overdueCount: number;
    overdueAmount: number;
  }>({
    totalBilled: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalCount: 0,
    paidCount: 0,
    partialCount: 0,
    overdueCount: 0,
    overdueAmount: 0
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  // Modals state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState<boolean>(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceIdForDetails, setSelectedInvoiceIdForDetails] = useState<string | null>(null);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<Invoice | null>(null);
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<Invoice | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Invoices and References from MySQL
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      const [invData, statsData, propsData, tntsData] = await Promise.all([
        ERP_API.getInvoices({
          accountType: 'RENT',
          propertyId: propertyFilter !== 'ALL' ? propertyFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          periodMonth: periodFilter !== 'ALL' ? periodFilter : undefined,
          search: searchQuery.trim() || undefined,
          overdueOnly: overdueOnly || undefined
        }),
        ERP_API.getInvoiceSummaryStats('RENT'),
        ERP_API.getProperties().catch(() => []),
        ERP_API.getTenants().catch(() => [])
      ]);

      setInvoices(invData);
      setStats(statsData);
      setProperties(propsData);
      setTenants(tntsData);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      setErrorMessage(err.message || 'فشل تحميل بيانات الفواتير من خادم MySQL');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [propertyFilter, statusFilter, periodFilter, overdueOnly]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Available unique periods for filter dropdown
  const uniquePeriods = useMemo(() => {
    const periods = new Set<string>();
    invoices.forEach(inv => {
      if (inv.period || inv.periodMonth) periods.add(inv.period || inv.periodMonth || '');
    });
    return Array.from(periods).filter(Boolean).sort().reverse();
  }, [invoices]);

  // Handle successful invoice creation
  const handleInvoiceCreated = (res: any) => {
    showToast(`تم إصدار فاتورة الإيجار بنجاح: ${res.invoiceNumber}`);
    loadData(true);
    if (onRefreshGlobalStats) onRefreshGlobalStats();
  };

  // Handle successful invoice edit
  const handleInvoiceUpdated = (res: any) => {
    showToast(`تم تعديل الفاتورة بنجاح: ${res.invoiceNumber}`);
    loadData(true);
    if (onRefreshGlobalStats) onRefreshGlobalStats();
  };

  // Handle successful invoice cancellation
  const handleInvoiceCancelled = (res: any) => {
    showToast(`تم إلغاء الفاتورة ${res.invoiceNumber} وعكس القيد المحاسبي بنجاح`);
    loadData(true);
    if (onRefreshGlobalStats) onRefreshGlobalStats();
  };

  // Handle Quick Collection click
  const handleCollectClick = (invoice: Invoice) => {
    if (onOpenQuickCollection) {
      const tenant = tenants.find(t => t.id === invoice.tenantId) || ({
        id: invoice.tenantId,
        tenantCode: invoice.tenantCode || '',
        name: invoice.tenantName,
        phone: invoice.tenantPhone || '',
        propertyId: invoice.propertyId,
        propertyName: invoice.propertyName,
        unitId: invoice.unitId,
        unitNumber: invoice.unitNumber,
        currentBalance: invoice.remainingAmount,
        rentBalance: invoice.remainingAmount,
        waterBalance: 0,
        electricityBalance: 0,
        servicesBalance: 0,
        depositBalance: 0,
        status: 'ACTIVE',
        nationalId: '',
        address: '',
        type: 'INDIVIDUAL',
        activeContractsCount: 1,
        currentUnitsCount: 1
      } as unknown as Tenant);

      onOpenQuickCollection(tenant, invoice);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                فوترة الإيجارات والمطالبات الدورية
              </h1>
              <p className="text-xs text-slate-500">
                إصدار الفواتير، متابعة الاستحقاق والتحصيل، واحتساب الأرصدة والذمم في MySQL
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="تحديث البيانات من MySQL"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={() => setIsNewInvoiceOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار فاتورة إيجار جديدة</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Billed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>إجمالي الفواتير الصادرة</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 font-mono text-[11px] font-bold">
              {stats.totalCount} فاتورة
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {stats.totalBilled.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>منها {stats.paidCount} فاتورة مسددة بالكامل</span>
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>إجمالي المحصل الفعلي</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 font-mono">
            {stats.totalPaid.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span>
          </div>
          <div className="text-[11px] text-slate-500">
            نسبة التحصيل: {stats.totalBilled > 0 ? ((stats.totalPaid / stats.totalBilled) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Card 3: Total Outstanding */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>الرصيد المتبقي غير المحصل</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 font-mono text-[11px] font-bold">
              {stats.partialCount} جزئي
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {stats.totalRemaining.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span>
          </div>
          <div className="text-[11px] text-slate-500">
            مستحقات إيجارية قيد المتابعة والتحصيل
          </div>
        </div>

        {/* Card 4: Overdue Alert */}
        <div 
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`p-4 rounded-2xl border shadow-xs space-y-2 cursor-pointer transition-all ${
            overdueOnly 
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500' 
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>فواتير متأخرة عن موعدها</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-mono">
              {stats.overdueCount} فاتورة
            </span>
          </div>
          <div className="text-xl font-extrabold text-rose-700 font-mono">
            {stats.overdueAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span>
          </div>
          <div className="text-[11px] text-rose-600 font-semibold">
            {overdueOnly ? '✓ يتم عرض المتأخرات فقط (انقر للإلغاء)' : 'انقر للتصفية حسب المتأخرات فقط'}
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة، اسم المستأجر، رقم الوحدة، أو العقد..."
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Property Filter */}
          <div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">جميع العقارات والمشاريع</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">جميع حالات السداد</option>
              <option value="UNPAID">مستحقة (غير مسددة)</option>
              <option value="PARTIAL">مسددة جزئياً</option>
              <option value="PAID">مسددة بالكامل</option>
              <option value="OVERDUE">متأخرة عن الاستحقاق</option>
              <option value="CANCELLED">فواتير ملغاة</option>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">جميع فترات الفوترة</option>
              {uniquePeriods.map((per) => (
                <option key={per} value={per}>{per}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(propertyFilter !== 'ALL' || statusFilter !== 'ALL' || periodFilter !== 'ALL' || overdueOnly || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400">التصفيات النشطة:</span>
            {overdueOnly && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-200 flex items-center gap-1">
                <span>المتأخرات فقط</span>
                <button onClick={() => setOverdueOnly(false)} className="hover:text-rose-900 cursor-pointer">✕</button>
              </span>
            )}
            {propertyFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1">
                <span>عقار: {properties.find(p => p.id === propertyFilter)?.name}</span>
                <button onClick={() => setPropertyFilter('ALL')} className="hover:text-blue-900 cursor-pointer">✕</button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                <span>حالة: {statusFilter}</span>
                <button onClick={() => setStatusFilter('ALL')} className="hover:text-emerald-900 cursor-pointer">✕</button>
              </span>
            )}
            {periodFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-1">
                <span>فترة: {periodFilter}</span>
                <button onClick={() => setPeriodFilter('ALL')} className="hover:text-slate-900 cursor-pointer">✕</button>
              </span>
            )}
            <button
              onClick={() => {
                setPropertyFilter('ALL');
                setStatusFilter('ALL');
                setPeriodFilter('ALL');
                setOverdueOnly(false);
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:underline mr-auto cursor-pointer"
            >
              إلغاء كافة التصفيات
            </button>
          </div>
        )}
      </div>

      {/* 4. Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            جاري تحميل فواتير الإيجار من قاعدة بيانات MySQL...
          </div>
        ) : errorMessage ? (
          <div className="p-8 text-center text-xs text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="font-bold">{errorMessage}</p>
            <button
              onClick={() => loadData(true)}
              className="mt-3 px-4 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-3">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">لا توجد فواتير إيجار مطابقة للبحث أو التصفية</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              يمكنك إصدار فاتورة جديدة بالضغط على زر "إصدار فاتورة إيجار جديدة" أو تغيير معايير التصفية.
            </p>
            <button
              onClick={() => setIsNewInvoiceOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار فاتورة جديدة الآن</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pr-5">رقم الفاتورة</th>
                  <th className="p-3.5">تاريخ الإصدار</th>
                  <th className="p-3.5">فترة الفاتورة</th>
                  <th className="p-3.5">المستأجر</th>
                  <th className="p-3.5">الوحدة والعقار</th>
                  <th className="p-3.5">العقد</th>
                  <th className="p-3.5 text-left">قيمة الفاتورة</th>
                  <th className="p-3.5 text-left">المسدد</th>
                  <th className="p-3.5 text-left">المتبقي</th>
                  <th className="p-3.5 text-center">الاستحقاق</th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 pl-5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const isOverdue = inv.status === 'OVERDUE' || (inv.status !== 'PAID' && inv.status !== 'CANCELLED' && new Date(inv.dueDate) < new Date());

                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        inv.status === 'CANCELLED' ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      {/* 1. Invoice Number */}
                      <td className="p-3.5 pr-5 font-mono font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{inv.invoiceNumber}</span>
                        </span>
                      </td>

                      {/* 2. Issue Date */}
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {inv.issueDate}
                      </td>

                      {/* 3. Period */}
                      <td className="p-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {inv.period || inv.periodMonth}
                      </td>

                      {/* 4. Tenant */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span 
                            onClick={() => onNavigateToTenant && onNavigateToTenant(inv.tenantId)}
                            className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer block"
                          >
                            {inv.tenantName}
                          </span>
                          {inv.tenantPhone && (
                            <span className="text-[11px] text-slate-500 font-mono block">
                              {inv.tenantPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Unit & Property */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span 
                            onClick={() => onNavigateToUnit && onNavigateToUnit(inv.unitId)}
                            className="font-bold text-emerald-800 hover:underline cursor-pointer block"
                          >
                            وحدة {inv.unitNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                            {inv.propertyName}
                          </span>
                        </div>
                      </td>

                      {/* 6. Contract */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {inv.contractNumber ? (
                          <span 
                            onClick={() => onNavigateToContract && inv.contractId && onNavigateToContract(inv.contractId)}
                            className="hover:text-blue-700 hover:underline cursor-pointer font-semibold"
                          >
                            {inv.contractNumber}
                          </span>
                        ) : '-'}
                      </td>

                      {/* 7. Total Amount */}
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.totalAmount.toLocaleString()} ريال
                      </td>

                      {/* 8. Paid Amount */}
                      <td className="p-3.5 text-left font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {inv.paidAmount > 0 ? `${inv.paidAmount.toLocaleString()} ريال` : '-'}
                      </td>

                      {/* 9. Remaining Amount */}
                      <td className="p-3.5 text-left font-mono font-bold whitespace-nowrap">
                        <span className={inv.remainingAmount > 0 ? (isOverdue ? 'text-rose-700' : 'text-slate-900') : 'text-emerald-600'}>
                          {inv.remainingAmount.toLocaleString()} ريال
                        </span>
                      </td>

                      {/* 10. Due Date & Overdue Indicator */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`font-mono text-xs block ${isOverdue ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                          {inv.dueDate}
                        </span>
                        {isOverdue && inv.daysOverdue && inv.daysOverdue > 0 ? (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            متأخر {inv.daysOverdue} يوم
                          </span>
                        ) : null}
                      </td>

                      {/* 11. Status Badge */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                          inv.status === 'CANCELLED' ? 'bg-slate-200 text-slate-700' :
                          isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inv.status === 'PAID' ? 'مسددة' :
                           inv.status === 'PARTIAL' ? 'سداد جزئي' :
                           inv.status === 'CANCELLED' ? 'ملغاة' :
                           isOverdue ? 'متأخرة' : 'مستحقة'}
                        </span>
                      </td>

                      {/* 12. Actions */}
                      <td className="p-3.5 pl-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedInvoiceIdForDetails(inv.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="عرض التفاصيل وسندات التحصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print Invoice */}
                          <button
                            onClick={() => setSelectedInvoiceForPrint(inv)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="طباعة الفاتورة (A4 Print)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Record Payment */}
                          {inv.status !== 'CANCELLED' && inv.remainingAmount > 0 && (
                            <button
                              onClick={() => handleCollectClick(inv)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                              title="تسجيل سداد / تحصيل مالي"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit (if unpaid) */}
                          {inv.status !== 'CANCELLED' && inv.paidAmount === 0 && (
                            <button
                              onClick={() => setSelectedInvoiceForEdit(inv)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="تعديل بنود الفاتورة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel (if unpaid) */}
                          {inv.status !== 'CANCELLED' && inv.paidAmount === 0 && (
                            <button
                              onClick={() => setSelectedInvoiceForCancel(inv)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="إلغاء الفاتورة وتسوية الذمة"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modals Container */}
      <NewRentInvoiceModal 
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
        onSuccess={handleInvoiceCreated}
      />

      <InvoicePrintModal 
        invoice={selectedInvoiceForPrint}
        onClose={() => setSelectedInvoiceForPrint(null)}
      />

      <InvoiceDetailsModal 
        invoiceId={selectedInvoiceIdForDetails}
        onClose={() => setSelectedInvoiceIdForDetails(null)}
        onPrint={(inv) => setSelectedInvoiceForPrint(inv)}
        onRecordPayment={(inv) => handleCollectClick(inv)}
        onEdit={(inv) => setSelectedInvoiceForEdit(inv)}
        onCancel={(inv) => setSelectedInvoiceForCancel(inv)}
      />

      <EditInvoiceModal 
        invoice={selectedInvoiceForEdit}
        onClose={() => setSelectedInvoiceForEdit(null)}
        onSuccess={handleInvoiceUpdated}
      />

      <CancelInvoiceModal 
        invoice={selectedInvoiceForCancel}
        onClose={() => setSelectedInvoiceForCancel(null)}
        onSuccess={handleInvoiceCancelled}
      />
    </div>
  );
};
