import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Building2, 
  Truck, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Printer, 
  ChevronRight, 
  Eye, 
  Send, 
  BarChart3, 
  ArrowUpDown,
  DollarSign,
  Layers,
  Wrench,
  Pencil,
  Trash2,
  Lock
} from 'lucide-react';
import { Property, WaterCostPeriod, WaterTankerEntry } from '../../../types/erp';
import { ERP_API } from '../../../services/api';
import { CURRENT_USER } from '../../../data/initialData';
import { NewWaterPeriodModal } from './NewWaterPeriodModal';
import { WaterPeriodDetailsModal } from './WaterPeriodDetailsModal';
import { WaterReportPrintModal } from './WaterReportPrintModal';

interface WaterCostManagementModuleProps {
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
  onRefreshGlobalStats?: () => void;
}

export const WaterCostManagementModule: React.FC<WaterCostManagementModuleProps> = ({
  onNavigateToTenant,
  onNavigateToProperty,
  onRefreshGlobalStats
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'periods' | 'tankers' | 'reports'>('periods');
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<WaterCostPeriod[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reportsData, setReportsData] = useState<any[]>([]);

  // RBAC permission checks
  const canManagePeriods = CURRENT_USER.role === 'SUPER_ADMIN' || CURRENT_USER.role === 'PROPERTY_MANAGER' || CURRENT_USER.role === 'ACCOUNTANT';
  const canDeletePeriods = CURRENT_USER.role === 'SUPER_ADMIN' || CURRENT_USER.role === 'PROPERTY_MANAGER';

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('ALL');

  // Modals state
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<WaterCostPeriod | null>(null);
  const [selectedPeriodIdForDetails, setSelectedPeriodIdForDetails] = useState<string | null>(null);
  
  // Quick Print Modal state
  const [periodToPrint, setPeriodToPrint] = useState<{
    period: WaterCostPeriod;
    tankers: any[];
    costItems: any[];
    charges: any[];
  } | null>(null);

  // Load properties and periods
  const loadData = async () => {
    setLoading(true);
    try {
      const [propsData, periodsData] = await Promise.all([
        ERP_API.getProperties(),
        ERP_API.getWaterPeriods({
          propertyId: selectedPropertyId,
          status: selectedStatus,
          distributionMethod: selectedMethod,
          search
        })
      ]);
      setProperties(propsData);
      setPeriods(periodsData);
    } catch (err) {
      console.error('Failed to load water periods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPropertyId, selectedStatus, selectedMethod]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Open Quick Print
  const handleQuickPrint = async (periodId: string) => {
    try {
      const fullData = await ERP_API.getWaterPeriodById(periodId);
      setPeriodToPrint(fullData);
    } catch (err: any) {
      alert(err.message || 'تعذر جلب تفاصيل دورة المياه للطباعة');
    }
  };

  // Edit & Delete handlers for draft periods
  const handleEditPeriod = (p: WaterCostPeriod) => {
    setEditingPeriod(p);
    setIsNewPeriodModalOpen(true);
  };

  const handleDeletePeriod = async (periodId: string, periodMonth: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف دورة المياه المسودة (${periodMonth})؟\nسيتم حذف جميع توريدات الوايتات والمصاريف الملحقة بهذه الدورة نهائياً.`)) {
      return;
    }
    try {
      setLoading(true);
      await ERP_API.deleteWaterPeriod(periodId);
      await loadData();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      alert(err.message || 'فشل حذف دورة المياه');
    } finally {
      setLoading(false);
    }
  };

  // Overall KPI Calculations
  const totalWaterCostAll = periods.reduce((acc, p) => acc + (p.status !== 'CANCELLED' ? Number(p.netTotalOperatingCost || 0) : 0), 0);
  const totalTankersCostAll = periods.reduce((acc, p) => acc + (p.status !== 'CANCELLED' ? Number(p.totalTankerCost || 0) : 0), 0);
  const totalOperatingCostsAll = totalWaterCostAll - totalTankersCostAll;
  const totalPostedAmountAll = periods.reduce((acc, p) => acc + (p.status === 'POSTED' ? Number(p.totalDistributedAmount || 0) : 0), 0);
  const activeUnpostedPeriodsCount = periods.filter(p => p.status === 'DRAFT' || p.status === 'CALCULATED').length;
  const totalTankersCountAll = periods.reduce((acc, p) => acc + (p.status !== 'CANCELLED' ? Number(p.tankerCount || 0) : 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            مرحل للذمم
          </span>
        );
      case 'CALCULATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            تم الاحتساب
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            مغلقة
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            ملغاة
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            مسودة
          </span>
        );
    }
  };

  const getMethodArabic = (method?: string) => {
    switch (method) {
      case 'EQUAL': return 'بالتساوي';
      case 'AREA': return 'حسب المساحة';
      case 'POPULATION': return 'حسب عدد السكان';
      case 'FIXED': return 'مبلغ ثابت';
      case 'CUSTOM': return 'توزيع مخصص';
      default: return method || 'بالتساوي';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* 1. Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                إدارة وتكاليف المياه (الوايتات والتشغيل)
              </h1>
              <span className="text-[11px] bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-md font-semibold border border-cyan-200">
                اليمن (ر.ي)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة توريد وايتات المياه، تسجيل فواتير التشغيل، واحتساب الحصص وترحيلها آلياً إلى ذمم المستأجرين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManagePeriods && (
            <button
              onClick={() => {
                setEditingPeriod(null);
                setIsNewPeriodModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>دورة تكاليف جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي تكاليف المياه</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-mono">
              {totalWaterCostAll.toLocaleString()} ر.ي
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              عن {periods.length} دورات مسجلة
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تكاليف الوايتات</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-blue-900 font-mono">
              {totalTankersCostAll.toLocaleString()} ر.ي
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              إجمالي {totalTankersCountAll} وايت ماء
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المصاريف التشغيلية</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-amber-900 font-mono">
              {totalOperatingCostsAll.toLocaleString()} ر.ي
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              كهرباء، مجاري، صيانة ونظافة
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">دورات قيد الاحتساب</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-indigo-900 font-mono">
              {activeUnpostedPeriodsCount} دورات
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              جاهزة للاحتساب والترحيل
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المبالغ المرحلة للذمم</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-emerald-700 font-mono">
              {totalPostedAmountAll.toLocaleString()} ر.ي
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">
              مقيدة بكشوفات المستأجرين
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveMainTab('periods')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'periods'
              ? 'border-cyan-600 text-cyan-700 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>دورات تكاليف المياه ({periods.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('tankers')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'tankers'
              ? 'border-cyan-600 text-cyan-700 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>سجل توريد الوايتات</span>
        </button>

        <button
          onClick={() => setActiveMainTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'reports'
              ? 'border-cyan-600 text-cyan-700 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>تقارير واستهلاك المياه السنوي</span>
        </button>
      </div>

      {activeMainTab === 'periods' ? (
        /* TAB 1: WATER PERIODS TABLE & FILTERS */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="البحث باسم العقار، شهر الدورة، أو الملاحظات..."
                  className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="ALL">جميع العقارات</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="ALL">جميع الحالات</option>
                  <option value="DRAFT">مسودة (DRAFT)</option>
                  <option value="CALCULATED">تم الاحتساب (CALCULATED)</option>
                  <option value="POSTED">مرحل للذمم (POSTED)</option>
                  <option value="CLOSED">مغلقة (CLOSED)</option>
                  <option value="CANCELLED">ملغاة (CANCELLED)</option>
                </select>

                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="ALL">جميع طرق التوزيع</option>
                  <option value="EQUAL">بالتساوي</option>
                  <option value="AREA">حسب المساحة</option>
                  <option value="POPULATION">حسب عدد السكان</option>
                  <option value="FIXED">مبلغ ثابت</option>
                  <option value="CUSTOM">توزيع مخصص</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                >
                  تصفية
                </button>
              </div>
            </form>
          </div>

          {/* Periods Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">الفترة / الشهر</th>
                    <th className="p-3.5">العقار</th>
                    <th className="p-3.5 text-center">الوايتات</th>
                    <th className="p-3.5 text-left">تكلفة الوايتات</th>
                    <th className="p-3.5 text-left">تكاليف تشغيلية</th>
                    <th className="p-3.5 text-left">صافي التكلفة</th>
                    <th className="p-3.5">طريقة التوزيع</th>
                    <th className="p-3.5 text-left">الموزع</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-400">
                        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-cyan-600" />
                        <span>جاري تحميل دورات تكاليف المياه من MySQL...</span>
                      </td>
                    </tr>
                  ) : periods.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-400">
                        <Droplets className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <h4 className="font-bold text-slate-700 text-sm">لا توجد دورات تكاليف مياه مطابقة</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          اضغط على زر "دورة تكاليف جديدة" لبدء تسجيل ومتابعة تكاليف المياه.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    periods.map((p) => {
                      const otherCostsSum = Number(p.netTotalOperatingCost || 0) - Number(p.totalTankerCost || 0);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{p.periodMonth}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.id}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{p.propertyName}</span>
                            </div>
                          </td>

                          <td className="p-3.5 text-center font-mono font-bold">
                            {p.tankerCount} وايت
                          </td>

                          <td className="p-3.5 text-left font-mono font-semibold text-slate-800">
                            {Number(p.totalTankerCost || 0).toLocaleString()} ر.ي
                          </td>

                          <td className="p-3.5 text-left font-mono text-slate-600">
                            {otherCostsSum.toLocaleString()} ر.ي
                          </td>

                          <td className="p-3.5 text-left font-mono font-black text-cyan-900">
                            {Number(p.netTotalOperatingCost || 0).toLocaleString()} ر.ي
                          </td>

                          <td className="p-3.5 text-slate-700">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                              {getMethodArabic(p.distributionMethod)}
                            </span>
                          </td>

                          <td className="p-3.5 text-left font-mono font-bold text-slate-800">
                            {Number(p.totalDistributedAmount || 0).toLocaleString()} ر.ي
                          </td>

                          <td className="p-3.5 text-center">
                            {getStatusBadge(p.status)}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedPeriodIdForDetails(p.id)}
                                className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                                title="إدارة الدورة والتوزيع"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{p.status === 'POSTED' ? 'عرض الدورة' : 'إدارة الدورة'}</span>
                              </button>

                              {/* Edit Draft Period */}
                              {p.status === 'DRAFT' && canManagePeriods && (
                                <button
                                  onClick={() => handleEditPeriod(p)}
                                  className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                                  title="تعديل بيانات الدورة المسودة"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-cyan-600" />
                                </button>
                              )}

                              {/* Delete Draft Period */}
                              {p.status === 'DRAFT' && canDeletePeriods && (
                                <button
                                  onClick={() => handleDeletePeriod(p.id, p.periodMonth)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف دورة المياه المسودة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Protected indicator for POSTED */}
                              {p.status === 'POSTED' && (
                                <span
                                  className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg inline-flex items-center cursor-help"
                                  title="دورة مرحلة محاسبياً - محمية ضد التعديل أو الحذف"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              )}

                              <button
                                onClick={() => handleQuickPrint(p.id)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="طباعة تقرير الدورة A4"
                              >
                                <Printer className="w-3.5 h-3.5 text-cyan-600" />
                              </button>
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
      ) : activeMainTab === 'tankers' ? (
        /* TAB 2: ALL TANKERS LOG */
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-600" />
                سجل توريد ومتابعة وايتات المياه المعتمدة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                استعراض فواتير وتوريدات الوايتات عبر جميع العقارات المسجلة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {periods.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedPeriodIdForDetails(p.id)}
                className="p-4 bg-slate-50 hover:bg-cyan-50/50 border border-slate-200 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 group-hover:text-cyan-700">{p.periodMonth}</span>
                  {getStatusBadge(p.status)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{p.propertyName}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="font-bold font-mono text-cyan-800">{p.tankerCount} وايت</span>
                  <span className="font-black font-mono text-slate-900">{Number(p.totalTankerCost || 0).toLocaleString()} ر.ي</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TAB 3: REPORTS & ANALYTICS */
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-600" />
                التحليل المالي السنوي لتكاليف المياه والوايتات
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة شهرية لتكاليف المياه، أسعار الوايتات، وتوزيع الحصص على العقارات
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800">توزيع التكاليف التشغيلية</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>توريدات الوايتات</span>
                    <span className="font-mono font-bold">{totalTankersCostAll.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-cyan-600 h-2 rounded-full" 
                      style={{ width: `${totalWaterCostAll > 0 ? (totalTankersCostAll / totalWaterCostAll) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>كهرباء المضخات والصيانة والتشغيل</span>
                    <span className="font-mono font-bold">{totalOperatingCostsAll.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${totalWaterCostAll > 0 ? (totalOperatingCostsAll / totalWaterCostAll) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800">مؤشرات الأداء والكفاءة المائية</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-600">متوسط سعر الوايت المعتمد:</span>
                  <strong className="font-mono text-cyan-800">
                    {totalTankersCountAll > 0 ? Math.round(totalTankersCostAll / totalTankersCountAll).toLocaleString() : 0} ر.ي
                  </strong>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-600">نسبة الترحيل إلى الذمم:</span>
                  <strong className="font-mono text-emerald-700">
                    {totalWaterCostAll > 0 ? Math.round((totalPostedAmountAll / totalWaterCostAll) * 100) : 0}%
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Water Period */}
      <NewWaterPeriodModal
        isOpen={isNewPeriodModalOpen}
        onClose={() => {
          setIsNewPeriodModalOpen(false);
          setEditingPeriod(null);
        }}
        properties={properties}
        initialPeriod={editingPeriod}
        onPeriodCreated={(newId) => {
          loadData();
          if (onRefreshGlobalStats) onRefreshGlobalStats();
          setSelectedPeriodIdForDetails(newId);
          setEditingPeriod(null);
        }}
      />

      {/* Modal: Water Period Details & Workspace */}
      {selectedPeriodIdForDetails && (
        <WaterPeriodDetailsModal
          isOpen={Boolean(selectedPeriodIdForDetails)}
          onClose={() => setSelectedPeriodIdForDetails(null)}
          periodId={selectedPeriodIdForDetails}
          onRefreshList={() => {
            loadData();
            if (onRefreshGlobalStats) onRefreshGlobalStats();
          }}
          onNavigateToTenant={onNavigateToTenant}
        />
      )}

      {/* Modal: Quick Print Report */}
      {periodToPrint && (
        <WaterReportPrintModal
          isOpen={Boolean(periodToPrint)}
          onClose={() => setPeriodToPrint(null)}
          period={periodToPrint.period}
          tankers={periodToPrint.tankers}
          costItems={periodToPrint.costItems}
          charges={periodToPrint.charges}
        />
      )}
    </div>
  );
};
