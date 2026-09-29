import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, Wrench, Plus, Search, Filter, RefreshCw, Printer, Download, 
  Tag, Users, BarChart3, AlertTriangle, CheckCircle2, RotateCcw, XCircle, 
  Eye, Edit3, Trash2, ShieldCheck, Clock, FileText, ChevronRight, ChevronLeft,
  Building, Home, ArrowUpRight, ArrowDownRight, Wallet, Check, AlertCircle
} from 'lucide-react';
import { 
  Expense, MaintenanceRequest, ExpenseCategory, Vendor, Property, 
  ExpenseDashboardStats, ExpenseStatus, MaintenanceStatus, MaintenancePriority 
} from '../../types/erp';
import { api } from '../../services/api';
import { formatMoney, formatDate, toWesternDigits } from '../../utils/formatters';

// Subcomponents and Modals
import { ExpenseFormModal } from './expenses/ExpenseFormModal';
import { ExpenseDetailModal } from './expenses/ExpenseDetailModal';
import { ExpensePrintModal } from './expenses/ExpensePrintModal';
import { ReversalModal } from './expenses/ReversalModal';
import { CategoryModal } from './expenses/CategoryModal';
import { VendorModal } from './expenses/VendorModal';
import { MaintenanceFormModal } from './expenses/MaintenanceFormModal';
import { MaintenanceDetailModal } from './expenses/MaintenanceDetailModal';
import { CreateExpenseFromMaintenanceModal } from './expenses/CreateExpenseFromMaintenanceModal';
import { ReportsView } from './expenses/ReportsView';
import { PostExpenseModal } from './expenses/PostExpenseModal';
import { TransactionDetailModal } from './statements/TransactionDetailModal';

interface ExpensesModuleProps {
  onNavigateToProperty?: (propertyId: string) => void;
  onNavigateToTenant?: (tenantId: string) => void;
  onRefreshGlobalStats?: () => void;
}

type ActiveTab = 'dashboard' | 'expenses' | 'maintenance' | 'categories' | 'vendors' | 'reports';

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  onNavigateToProperty,
  onNavigateToTenant,
  onRefreshGlobalStats,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Master Data States
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [cashBoxes, setCashBoxes] = useState<any[]>([]);

  // Expenses Data & Filters
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesTotalCount, setExpensesTotalCount] = useState(0);
  const [expensesTotalAmount, setExpensesTotalAmount] = useState(0);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expensePropertyFilter, setExpensePropertyFilter] = useState('ALL');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('ALL');
  const [expenseDateFrom, setExpenseDateFrom] = useState('');
  const [expenseDateTo, setExpenseDateTo] = useState('');

  // Maintenance Data & Filters
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceRequest[]>([]);
  const [maintenanceTotalCount, setMaintenanceTotalCount] = useState(0);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [maintenancePropertyFilter, setMaintenancePropertyFilter] = useState('ALL');
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState('ALL');
  const [maintenancePriorityFilter, setMaintenancePriorityFilter] = useState('ALL');
  const [maintenanceVendorFilter, setMaintenanceVendorFilter] = useState('ALL');

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState<ExpenseDashboardStats | null>(null);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);

  // Modal Dialogs
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<Expense | null>(null);
  const [expenseToPrint, setExpenseToPrint] = useState<Expense | null>(null);
  const [expenseToPost, setExpenseToPost] = useState<Expense | null>(null);
  const [viewingTransactionId, setViewingTransactionId] = useState<string | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [isMaintenanceFormOpen, setIsMaintenanceFormOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRequest | null>(null);
  const [selectedMaintenanceForDetail, setSelectedMaintenanceForDetail] = useState<MaintenanceRequest | null>(null);

  const [isCreateExpenseFromMntOpen, setIsCreateExpenseFromMntOpen] = useState(false);
  const [maintenanceForExpense, setMaintenanceForExpense] = useState<MaintenanceRequest | null>(null);

  const [reversalModalConfig, setReversalModalConfig] = useState<{
    isOpen: boolean;
    type: 'CANCEL' | 'REVERSE';
    expense: Expense | null;
  }>({
    isOpen: false,
    type: 'CANCEL',
    expense: null,
  });

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  // 1. Initial Load of Master Data
  const loadMasterData = useCallback(async () => {
    try {
      const [propsRes, catsRes, vendsRes, boxesRes] = await Promise.all([
        api.getProperties ? api.getProperties().catch(() => []) : Promise.resolve([]),
        api.getExpenseCategories ? api.getExpenseCategories().catch(() => []) : Promise.resolve([]),
        api.getVendors ? api.getVendors().catch(() => []) : Promise.resolve([]),
        api.getCollectionCashBoxes ? api.getCollectionCashBoxes().catch(() => []) : Promise.resolve([]),
      ]);
      setProperties(propsRes || []);
      setCategories(catsRes || []);
      setVendors(vendsRes || []);
      setCashBoxes(boxesRes || []);
    } catch (err: any) {
      console.warn('Could not load master data:', err);
    }
  }, []);

  // 2. Load Expenses
  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getExpenses({
        page: expensePage,
        limit: 25,
        propertyId: expensePropertyFilter,
        categoryId: expenseCategoryFilter,
        status: expenseStatusFilter,
        dateFrom: expenseDateFrom,
        dateTo: expenseDateTo,
        search: expenseSearch.trim(),
      });
      setExpenses(res.items || []);
      setExpensesTotalCount(res.totalCount || 0);
      setExpensesTotalAmount(res.totalAmount || 0);
    } catch (err: any) {
      setError(err.message || 'فشل جلب قائمة المصروفات');
    } finally {
      setLoading(false);
    }
  }, [
    expensePage,
    expensePropertyFilter,
    expenseCategoryFilter,
    expenseStatusFilter,
    expenseDateFrom,
    expenseDateTo,
    expenseSearch,
  ]);

  // 3. Load Maintenance Requests
  const loadMaintenance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getMaintenanceRequests({
        page: maintenancePage,
        limit: 25,
        propertyId: maintenancePropertyFilter,
        status: maintenanceStatusFilter,
        priority: maintenancePriorityFilter,
        vendorId: maintenanceVendorFilter,
        search: maintenanceSearch.trim(),
      });
      setMaintenanceList(res.items || []);
      setMaintenanceTotalCount(res.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'فشل جلب طلبات الصيانة');
    } finally {
      setLoading(false);
    }
  }, [
    maintenancePage,
    maintenancePropertyFilter,
    maintenanceStatusFilter,
    maintenancePriorityFilter,
    maintenanceVendorFilter,
    maintenanceSearch,
  ]);

  // 4. Load Dashboard KPIs
  const loadDashboard = useCallback(async () => {
    try {
      const [dashRes, mntStatsRes] = await Promise.all([
        api.getExpensesDashboard().catch(() => null),
        api.getMaintenanceStats ? api.getMaintenanceStats().catch(() => null) : Promise.resolve(null),
      ]);
      if (dashRes) setDashboardStats(dashRes);
      if (mntStatsRes) setMaintenanceStats(mntStatsRes);
    } catch (err: any) {
      console.warn('Dashboard stats error:', err);
    }
  }, []);

  useEffect(() => {
    loadMasterData();
    loadDashboard();
  }, [loadMasterData, loadDashboard]);

  useEffect(() => {
    if (activeTab === 'expenses') {
      loadExpenses();
    } else if (activeTab === 'maintenance') {
      loadMaintenance();
    } else if (activeTab === 'dashboard') {
      loadDashboard();
    }
  }, [activeTab, loadExpenses, loadMaintenance, loadDashboard]);

  const handleGlobalRefresh = async () => {
    setLoading(true);
    await Promise.all([
      loadMasterData(),
      loadDashboard(),
      loadExpenses(),
      loadMaintenance(),
    ]);
    if (onRefreshGlobalStats) onRefreshGlobalStats();
    setLoading(false);
    showNotification('تم تحديث بيانات المصروفات والصيانة من قاعدة البيانات');
  };

  // Expense Handlers
  const handleSaveExpense = async (data: any) => {
    if (editingExpense) {
      await api.updateExpense(editingExpense.id, data);
      showNotification(`تم تعديل بيانات المصروف (${editingExpense.expenseNumber}) بنجاح`);
    } else {
      const res = await api.createExpense(data);
      showNotification(`تم إصدار سند المصروف رقم (${res.expenseNumber || 'الجديد'}) بنجاح`);
    }
    loadExpenses();
    loadDashboard();
    if (onRefreshGlobalStats) onRefreshGlobalStats();
  };

  const handleApproveExpense = async (id: string) => {
    try {
      await api.approveExpense(id);
      showNotification('تم اعتماد المصروف بنجاح وأصبح جاهزاً للترحيل المالي');
      loadExpenses();
      loadDashboard();
      if (selectedExpenseForDetail?.id === id) {
        setSelectedExpenseForDetail(prev => prev ? { ...prev, status: 'APPROVED' } : null);
      }
    } catch (err: any) {
      alert(err.message || 'فشل اعتماد المصروف');
    }
  };

  const handleOpenPostModal = (expense: Expense) => {
    if (expense.status !== 'APPROVED') {
      showNotification('يجب اعتماد المصروف أولاً قبل الترحيل المالي');
      return;
    }
    setExpenseToPost(expense);
  };

  const handleConfirmPost = async (expenseId: string, cashBoxId?: string) => {
    const res = await api.postExpense(expenseId, cashBoxId);
    showNotification(`تم ترحيل المصروف (${res.expenseNumber || ''}) دفترياً بنجاح إلى الأستاذ العام وتحديث أرصدة الخزينة`);
    await Promise.all([
      loadExpenses(),
      loadDashboard(),
      loadMasterData(),
    ]);
    if (onRefreshGlobalStats) onRefreshGlobalStats();
    if (selectedExpenseForDetail?.id === expenseId) {
      setSelectedExpenseForDetail(prev => prev ? { 
        ...prev, 
        status: 'POSTED', 
        postedBy: res.postedBy || 'م. أحمد الوهاس', 
        postedAt: res.postedAt || new Date().toISOString(),
        ledgerId: res.ledgerId || `ledg-exp-${expenseId}` 
      } : null);
    }
  };

  const handleDeleteExpense = async (id: string, num: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مسودة المصروف (${num})؟`)) return;
    try {
      await api.deleteExpense(id);
      showNotification(`تم حذف مسودة المصروف (${num}) بنجاح`);
      loadExpenses();
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'فشل حذف المصروف');
    }
  };

  // Reversal and Cancellation
  const handleConfirmReversalOrCancel = async (reason: string) => {
    const exp = reversalModalConfig.expense;
    if (!exp) return;

    if (reversalModalConfig.type === 'REVERSE') {
      await api.reverseExpense(exp.id, reason);
      showNotification(`تم عكس قيد المصروف (${exp.expenseNumber}) دفترياً وإلغاء أثره المالي بنجاح`);
    } else {
      await api.cancelExpense(exp.id, reason);
      showNotification(`تم إلغاء المصروف (${exp.expenseNumber}) بنجاح`);
    }
    loadExpenses();
    loadDashboard();
    if (onRefreshGlobalStats) onRefreshGlobalStats();
    if (selectedExpenseForDetail?.id === exp.id) {
      setSelectedExpenseForDetail(null);
    }
  };

  // Category Handlers
  const handleSaveCategory = async (data: any) => {
    if (editingCategory) {
      await api.updateExpenseCategory(editingCategory.id, data);
      showNotification('تم تحديث تصنيف المصروف بنجاح');
    } else {
      await api.createExpenseCategory(data);
      showNotification('تمت إضافة تصنيف المصروفات الجديد بنجاح');
    }
    loadMasterData();
  };

  const handleToggleCategory = async (id: string) => {
    try {
      await api.toggleExpenseCategory(id);
      showNotification('تم تغيير حالة تفعيل التصنيف بنجاح');
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'تعذر تغيير حالة التصنيف');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف التصنيف (${name})؟ لن يسمح النظام بالحذف إذا كان هناك سندات مسجلة عليه.`)) return;
    try {
      await api.deleteExpenseCategory(id);
      showNotification(`تم حذف التصنيف (${name}) بنجاح`);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'فشل حذف التصنيف');
    }
  };

  // Vendor Handlers
  const handleSaveVendor = async (data: any) => {
    if (editingVendor) {
      await api.updateVendor(editingVendor.id, data);
      showNotification('تم تعديل بيانات الفني/المورد بنجاح');
    } else {
      await api.createVendor(data);
      showNotification('تمت إضافة الفني/المورد الجديد إلى السجل بنجاح');
    }
    loadMasterData();
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفني/المورد (${name})؟`)) return;
    try {
      await api.deleteVendor(id);
      showNotification(`تم حذف (${name}) من السجل`);
      loadMasterData();
    } catch (err: any) {
      alert(err.message || 'فشل حذف المورد');
    }
  };

  // Maintenance Handlers
  const handleSaveMaintenance = async (data: any) => {
    if (editingMaintenance) {
      await api.updateMaintenanceStatus(editingMaintenance.id, {
        status: data.status,
        notes: data.notes,
        actualCost: data.actualCost,
        completionDate: data.completionDate,
      });
      showNotification(`تم تحديث بيانات طلب الصيانة (${editingMaintenance.maintenanceNumber})`);
    } else {
      const res = await api.createMaintenanceRequest(data);
      showNotification(`تم تسجيل طلب الصيانة الجديد برقم (${res.maintenanceNumber || 'مكتمل'})`);
    }
    loadMaintenance();
    loadDashboard();
  };

  const handleUpdateMaintenanceStatus = async (
    id: string, 
    newStatus: MaintenanceStatus, 
    actualCost?: number, 
    notes?: string
  ) => {
    try {
      await api.updateMaintenanceStatus(id, {
        status: newStatus,
        actualCost,
        notes,
        completionDate: newStatus === 'COMPLETED' ? new Date().toISOString().split('T')[0] : undefined,
      });
      showNotification('تم تحديث مسار وحالة الصيانة بنجاح');
      loadMaintenance();
      loadDashboard();
      if (selectedMaintenanceForDetail?.id === id) {
        setSelectedMaintenanceForDetail(prev => prev ? {
          ...prev,
          status: newStatus,
          actualCost: actualCost !== undefined ? actualCost : prev.actualCost,
        } : null);
      }
    } catch (err: any) {
      alert(err.message || 'تعذر تحديث حالة الصيانة');
    }
  };

  const handleCreateExpenseFromMaintenance = async (data: any) => {
    if (!maintenanceForExpense) return;
    try {
      const res = await api.createExpenseFromMaintenance(maintenanceForExpense.id, data);
      showNotification(`تم إصدار سند المصروف رقم (${res.expenseNumber}) من طلب الصيانة بنجاح`);
      loadMaintenance();
      loadExpenses();
      loadDashboard();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      alert(err.message || 'فشل إصدار المصروف من طلب الصيانة');
    }
  };

  return (
    <div className="space-y-4">
      {/* Success Floating Banner */}
      {successMsg && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Top Header & Navigation Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>إدارة المصروفات والصيانة والتشغيل</span>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                  متصل بـ MySQL
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع التكاليف التشغيلية، إدارة بلاغات الصيانة، وترحيل قيود المصروفات آلياً للأستاذ العام
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleGlobalRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="تحديث شامل من قاعدة البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>تحديث البيانات</span>
          </button>

          <button
            onClick={() => {
              setEditingMaintenance(null);
              setIsMaintenanceFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-amber-600/20 cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>طلب صيانة جديد</span>
          </button>

          <button
            onClick={() => {
              setEditingExpense(null);
              setIsExpenseFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>سند صرف مصروف</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>لوحة المؤشرات والتحليلات</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>سندات المصروفات ({toWesternDigits(expensesTotalCount || expenses.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-600" />
          <span>طلبات وأعمال الصيانة ({toWesternDigits(maintenanceTotalCount || maintenanceList.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Tag className="w-4 h-4 text-blue-600" />
          <span>دليل تصنيفات المصروفات ({toWesternDigits(categories.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'vendors'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          <span>سجل الفنيين والموردين ({toWesternDigits(vendors.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-700" />
          <span>التقارير المالية والتشغيلية</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD & KPIS */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Expenses */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold">إجمالي المصروفات</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {formatMoney(dashboardStats?.totalExpenses || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                {toWesternDigits(dashboardStats?.expensesCount || 0)} سندات مسجلة
              </span>
            </div>

            {/* Current Month */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold">مصروفات الشهر الحالي</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-blue-700 font-mono">
                {formatMoney(dashboardStats?.monthExpenses || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">الشهر التشغيلي الحالي</span>
            </div>

            {/* Maintenance Costs */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold">مصروفات الصيانة</span>
                <Wrench className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-amber-700 font-mono">
                {formatMoney(dashboardStats?.maintenanceExpenses || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                {toWesternDigits(maintenanceStats?.total || maintenanceList.length)} بلاغ صيانة
              </span>
            </div>

            {/* Posted / Paid */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold">المصروفات المرحلة للأستاذ</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                {formatMoney(dashboardStats?.paidPostedExpenses || 0)}
              </div>
              <span className="text-[10px] text-emerald-600 mt-1 block font-bold">مغلقة دفترياً ومؤكدة</span>
            </div>

            {/* Approved */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold">المصروفات المعتمدة</span>
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-indigo-700 font-mono">
                {formatMoney(dashboardStats?.approvedExpenses || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">بانتظار الترحيل المالي</span>
            </div>

            {/* Drafts */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold">مسودات قيد المراجعة</span>
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-700 font-mono">
                {formatMoney(dashboardStats?.draftExpenses || 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">لم تعتمد بعد</span>
            </div>
          </div>

          {/* Breakdown Section: By Property & By Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Property Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-800">المصروفات التشغيلية حسب العقارات</h3>
                </div>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="text-xs text-emerald-600 hover:underline font-bold"
                >
                  تقرير تحليلي كامل ←
                </button>
              </div>

              <div className="space-y-3">
                {dashboardStats?.byProperty && dashboardStats.byProperty.length > 0 ? (
                  dashboardStats.byProperty.map((item, idx) => {
                    const percent = dashboardStats.totalExpenses > 0
                      ? ((item.amount / dashboardStats.totalExpenses) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{item.propertyName}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatMoney(item.amount)} ر.ي{' '}
                            <span className="text-[11px] text-slate-400 font-normal">({toWesternDigits(percent)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">لا توجد بيانات مصروفات عقارات مسجلة</p>
                )}
              </div>
            </div>

            {/* By Category Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-800">توزيع المصروفات حسب بنود التصنيف</h3>
                </div>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  دليل التصنيفات ←
                </button>
              </div>

              <div className="space-y-3">
                {dashboardStats?.byCategory && dashboardStats.byCategory.length > 0 ? (
                  dashboardStats.byCategory.map((item, idx) => {
                    const percent = dashboardStats.totalExpenses > 0
                      ? ((item.amount / dashboardStats.totalExpenses) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{item.categoryName}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatMoney(item.amount)} ر.ي{' '}
                            <span className="text-[11px] text-slate-400 font-normal">({toWesternDigits(percent)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">لا توجد بنود مصروفات مسجلة</p>
                )}
              </div>
            </div>
          </div>

          {/* Maintenance Status Quick Overview Ribbon */}
          <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-amber-950">متابعة طلبات الصيانة التشغيلية</h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  يوجد حالياً{' '}
                  <strong className="font-bold text-amber-950">
                    {toWesternDigits(maintenanceStats?.inProgress || 0)} أعمال قيد التنفيذ
                  </strong>{' '}
                  و{' '}
                  <strong className="font-bold text-amber-950">
                    {toWesternDigits(maintenanceStats?.newRequests || 0)} طلبات جديدة
                  </strong>{' '}
                  بانتظار التكليف والاعتماد.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  setMaintenanceStatusFilter('IN_PROGRESS');
                  setActiveTab('maintenance');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                عرض الأعمال الجارية ←
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXPENSES LIST TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="بحث برقم السند، البيان، المورد، الحساب..."
                  className="w-full pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Property Filter */}
              <select
                value={expensePropertyFilter}
                onChange={(e) => setExpensePropertyFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-white"
              >
                <option value="ALL">جميع العقارات</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-white"
              >
                <option value="ALL">جميع التصنيفات</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={expenseStatusFilter}
                onChange={(e) => setExpenseStatusFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-white font-bold"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="DRAFT">مسودة</option>
                <option value="APPROVED">معتمد</option>
                <option value="POSTED">مرحل دفترياً</option>
                <option value="REVERSED">معكوس</option>
                <option value="CANCELLED">ملغى</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">
                المجموع: <strong className="text-slate-900 font-black">{formatMoney(expensesTotalAmount)} ر.ي</strong>
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3">رقم السند</th>
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-3">التصنيف المحاسبي</th>
                    <th className="py-3 px-3">البيان والشرح</th>
                    <th className="py-3 px-3">العقار / الوحدة</th>
                    <th className="py-3 px-3 text-left">المبلغ (ر.ي)</th>
                    <th className="py-3 px-3 text-center">طريقة الصرف</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        {loading ? 'جاري جلب السجلات من قاعدة البيانات...' : 'لا توجد سندات مصروفات مطابقة للبحث'}
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {toWesternDigits(exp.expenseNumber)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {formatDate(exp.expenseDate)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 block">{exp.categoryName}</span>
                          <span className="font-mono text-[10px] text-slate-400">ح/ {toWesternDigits(exp.accountCode || '5101')}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-xs truncate" title={exp.description}>
                          {exp.description}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="block font-medium">{exp.propertyName || 'مصروف عام للمؤسسة'}</span>
                          {exp.unitNumber && (
                            <span className="text-[10px] text-amber-700 font-mono">وحدة {toWesternDigits(exp.unitNumber)}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left font-mono font-bold text-slate-900 text-sm">
                          {formatMoney(exp.amount)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                            {exp.paymentMethod === 'CASH' ? 'نقداً (صندوق)' : exp.paymentMethod === 'BANK_TRANSFER' ? 'بنكي' : 'شيك'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            exp.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            exp.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            exp.status === 'REVERSED' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            exp.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {exp.status === 'POSTED' ? 'مرحل للأستاذ' :
                             exp.status === 'APPROVED' ? 'معتمد' :
                             exp.status === 'REVERSED' ? 'معكوس' :
                             exp.status === 'CANCELLED' ? 'ملغى' : 'مسودة'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedExpenseForDetail(exp)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Print Voucher */}
                            <button
                              onClick={() => setExpenseToPrint(exp)}
                              className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg cursor-pointer"
                              title="طباعة سند الصرف"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Approve (Draft only) */}
                            {exp.status === 'DRAFT' && (
                              <button
                                onClick={() => handleApproveExpense(exp.id)}
                                className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg cursor-pointer"
                                title="اعتماد المصروف"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Post to GL (Approved only) */}
                            {exp.status === 'APPROVED' && (
                              <button
                                onClick={() => handleOpenPostModal(exp)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                                title="ترحيل مالي لدفتر الأستاذ"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>ترحيل</span>
                              </button>
                            )}

                            {/* Actions for POSTED: View Ledger & Reverse */}
                            {exp.status === 'POSTED' && (
                              <>
                                <button
                                  onClick={() => setViewingTransactionId(exp.ledgerId || `ledg-exp-${exp.id}`)}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg cursor-pointer"
                                  title="عرض القيد بدفتر الأستاذ"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setReversalModalConfig({ isOpen: true, type: 'REVERSE', expense: exp })}
                                  className="p-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded-lg cursor-pointer"
                                  title="عكس القيد دفترياً"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Edit (Draft only) */}
                            {exp.status === 'DRAFT' && (
                              <button
                                onClick={() => {
                                  setEditingExpense(exp);
                                  setIsExpenseFormOpen(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                                title="تعديل المسودة"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete (Draft only) */}
                            {exp.status === 'DRAFT' && (
                              <button
                                onClick={() => handleDeleteExpense(exp.id, exp.expenseNumber)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="حذف المسودة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Ribbon */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                إجمالي السجلات: <strong className="font-mono text-slate-800">{toWesternDigits(expensesTotalCount)}</strong> سند
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={expensePage <= 1}
                  onClick={() => setExpensePage(prev => prev - 1)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-bold"
                >
                  السابق
                </button>
                <span className="px-2 font-mono">صفحة {toWesternDigits(expensePage)}</span>
                <button
                  disabled={expenses.length < 25}
                  onClick={() => setExpensePage(prev => prev + 1)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer font-bold"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MAINTENANCE REQUESTS TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'maintenance' && (
        <div className="space-y-3">
          {/* Maintenance Filters Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={maintenanceSearch}
                  onChange={(e) => setMaintenanceSearch(e.target.value)}
                  placeholder="بحث برقم الطلب، اسم المشكلة، مقدم الطلب..."
                  className="w-full pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <select
                value={maintenancePropertyFilter}
                onChange={(e) => setMaintenancePropertyFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-white"
              >
                <option value="ALL">جميع العقارات</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={maintenancePriorityFilter}
                onChange={(e) => setMaintenancePriorityFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-white"
              >
                <option value="ALL">جميع الأولويات</option>
                <option value="LOW">منخفضة</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="URGENT">عاجلة جداً</option>
              </select>

              <select
                value={maintenanceStatusFilter}
                onChange={(e) => setMaintenanceStatusFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-white font-bold"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="NEW">جديد</option>
                <option value="REVIEW">قيد المراجعة</option>
                <option value="APPROVED">معتمد</option>
                <option value="IN_PROGRESS">قيد التنفيذ</option>
                <option value="COMPLETED">مكتمل</option>
                <option value="CANCELLED">ملغى</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingMaintenance(null);
                setIsMaintenanceFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تسجيل بلاغ صيانة</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3">رقم البلاغ</th>
                    <th className="py-3 px-3">تاريخ الطلب</th>
                    <th className="py-3 px-3">العقار / الوحدة</th>
                    <th className="py-3 px-3">مقدم الطلب</th>
                    <th className="py-3 px-3">وصف المشكلة / العطل</th>
                    <th className="py-3 px-3 text-center">الأولوية</th>
                    <th className="py-3 px-3">الفني المكلف</th>
                    <th className="py-3 px-3 text-left">التكلفة الفعلية</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenanceList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        {loading ? 'جاري التحميل...' : 'لا توجد طلبات صيانة مسجلة'}
                      </td>
                    </tr>
                  ) : (
                    maintenanceList.map((mnt) => (
                      <tr key={mnt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {toWesternDigits(mnt.maintenanceNumber)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {formatDate(mnt.requestDate)}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="block font-medium">{mnt.propertyName || 'عام'}</span>
                          {mnt.unitNumber && (
                            <span className="text-[10px] text-amber-700 font-mono">وحدة {toWesternDigits(mnt.unitNumber)}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-800 font-medium">
                          {mnt.requesterName}
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={mnt.problemDescription}>
                          {mnt.problemDescription}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            mnt.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                            mnt.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                            mnt.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {mnt.priority === 'URGENT' ? 'عاجل' : mnt.priority === 'HIGH' ? 'عالي' : mnt.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {mnt.vendorName || <span className="text-slate-400">(لم يكلف)</span>}
                        </td>
                        <td className="py-3 px-3 text-left font-mono font-bold text-slate-900">
                          {mnt.actualCost ? `${formatMoney(mnt.actualCost)} ر.ي` : formatMoney(mnt.expectedCost)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            mnt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            mnt.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            mnt.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-800' :
                            mnt.status === 'REVIEW' ? 'bg-purple-100 text-purple-800' :
                            mnt.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {mnt.status === 'COMPLETED' ? 'مكتمل' :
                             mnt.status === 'IN_PROGRESS' ? 'قيد التنفيذ' :
                             mnt.status === 'APPROVED' ? 'معتمد' :
                             mnt.status === 'REVIEW' ? 'مراجعة' :
                             mnt.status === 'CANCELLED' ? 'ملغى' : 'جديد'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* View details */}
                            <button
                              onClick={() => setSelectedMaintenanceForDetail(mnt)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                              title="عرض تفاصيل الصيانة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Create Expense from Maintenance */}
                            {!mnt.expenseId && mnt.status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  setMaintenanceForExpense(mnt);
                                  setIsCreateExpenseFromMntOpen(true);
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                title="إنشاء سند صرف مالي لهذا الطلب"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>صرف</span>
                              </button>
                            )}

                            {/* Edit */}
                            {mnt.status !== 'COMPLETED' && mnt.status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  setEditingMaintenance(mnt);
                                  setIsMaintenanceFormOpen(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                                title="تعديل الطلب"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CATEGORIES MASTER */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">دليل وبنود تصنيفات المصروفات</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ربط كل تصنيف تشغيلي برموز الحسابات بدفتر الأستاذ العام لمنع العشوائية المحاسبية
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تصنيف جديد</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-3">الكود</th>
                  <th className="py-3 px-3">اسم التصنيف</th>
                  <th className="py-3 px-3">رمز الحساب بالأستاذ</th>
                  <th className="py-3 px-3">الوصف والتوضيح</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{toWesternDigits(c.code)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{toWesternDigits(c.accountCode || '5101')}</td>
                    <td className="py-3 px-3 text-slate-500">{c.description || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleCategory(c.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer ${
                          c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {c.isActive ? 'نشط' : 'معطل'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="حذف التصنيف (إن لم تكن هناك قيود تاريخية)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: VENDORS MASTER */}
      {/* ========================================================================= */}
      {activeTab === 'vendors' && (
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">سجل الفنيين والمقاولين والموردين</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توثيق أرقام وبيانات الحرفيين والشركات المنفذة لأعمال الصيانة والخدمات
              </p>
            </div>
            <button
              onClick={() => {
                setEditingVendor(null);
                setIsVendorModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فني / مورد</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-3">الكود</th>
                  <th className="py-3 px-3">الاسم</th>
                  <th className="py-3 px-3">التصنيف المهني</th>
                  <th className="py-3 px-3">رقم الهاتف</th>
                  <th className="py-3 px-3">العنوان</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{toWesternDigits(v.code)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{v.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[11px]">
                        {v.type === 'TECHNICIAN' ? 'فني مستقل' :
                         v.type === 'CONTRACTOR' ? 'مقاول تشطيب' :
                         v.type === 'SUPPLIER' ? 'مورد مواد' :
                         v.type === 'MAINTENANCE_COMPANY' ? 'شركة صيانة' : 'أخرى'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">{toWesternDigits(v.phone || '-')}</td>
                    <td className="py-3 px-3 text-slate-500">{v.address || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        v.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {v.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingVendor(v);
                            setIsVendorModalOpen(true);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v.id, v.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REPORTS & EXPORTS */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <ReportsView
          expenses={expenses}
          maintenanceList={maintenanceList}
          categories={categories}
          properties={properties}
          vendors={vendors}
          onPrintExpense={(exp) => setExpenseToPrint(exp)}
        />
      )}

      {/* ========================================================================= */}
      {/* ALL MODALS & DIALOGS */}
      {/* ========================================================================= */}

      {/* Expense Form Modal (Create / Edit) */}
      <ExpenseFormModal
        isOpen={isExpenseFormOpen}
        expense={editingExpense}
        categories={categories.filter(c => c.isActive)}
        vendors={vendors}
        properties={properties}
        cashBoxes={cashBoxes}
        onSave={handleSaveExpense}
        onClose={() => {
          setIsExpenseFormOpen(false);
          setEditingExpense(null);
        }}
      />

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        isOpen={Boolean(selectedExpenseForDetail)}
        expense={selectedExpenseForDetail}
        onClose={() => setSelectedExpenseForDetail(null)}
        onApprove={handleApproveExpense}
        onPost={handleOpenPostModal}
        onViewLedger={(ledgerId) => setViewingTransactionId(ledgerId)}
        onCancelPrompt={(exp) => setReversalModalConfig({ isOpen: true, type: 'CANCEL', expense: exp })}
        onReversePrompt={(exp) => setReversalModalConfig({ isOpen: true, type: 'REVERSE', expense: exp })}
        onPrint={(exp) => setExpenseToPrint(exp)}
        onEdit={(exp) => {
          setSelectedExpenseForDetail(null);
          setEditingExpense(exp);
          setIsExpenseFormOpen(true);
        }}
        onViewMaintenance={(mId) => {
          const match = maintenanceList.find(m => m.id === mId || m.maintenanceNumber === mId);
          if (match) {
            setSelectedExpenseForDetail(null);
            setSelectedMaintenanceForDetail(match);
          }
        }}
      />

      {/* Expense Print Modal */}
      {expenseToPrint && (
        <ExpensePrintModal
          expense={expenseToPrint}
          onClose={() => setExpenseToPrint(null)}
        />
      )}

      {/* Post Expense to General Ledger Modal */}
      <PostExpenseModal
        isOpen={Boolean(expenseToPost)}
        expense={expenseToPost}
        cashBoxes={cashBoxes}
        onConfirm={handleConfirmPost}
        onClose={() => setExpenseToPost(null)}
      />

      {/* View General Ledger Transaction Modal */}
      {viewingTransactionId && (
        <TransactionDetailModal
          transactionId={viewingTransactionId}
          onClose={() => setViewingTransactionId(null)}
        />
      )}

      {/* Reversal / Cancellation Modal */}
      <ReversalModal
        isOpen={reversalModalConfig.isOpen}
        type={reversalModalConfig.type}
        expenseNumber={reversalModalConfig.expense?.expenseNumber || ''}
        amount={reversalModalConfig.expense?.amount || 0}
        onConfirm={handleConfirmReversalOrCancel}
        onClose={() => setReversalModalConfig({ isOpen: false, type: 'CANCEL', expense: null })}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
      />

      {/* Vendor Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        vendor={editingVendor}
        onSave={handleSaveVendor}
        onClose={() => {
          setIsVendorModalOpen(false);
          setEditingVendor(null);
        }}
      />

      {/* Maintenance Form Modal (Create / Edit) */}
      <MaintenanceFormModal
        isOpen={isMaintenanceFormOpen}
        maintenance={editingMaintenance}
        properties={properties}
        vendors={vendors}
        categories={categories}
        onSave={handleSaveMaintenance}
        onClose={() => {
          setIsMaintenanceFormOpen(false);
          setEditingMaintenance(null);
        }}
      />

      {/* Maintenance Detail Modal */}
      <MaintenanceDetailModal
        isOpen={Boolean(selectedMaintenanceForDetail)}
        maintenance={selectedMaintenanceForDetail}
        onClose={() => setSelectedMaintenanceForDetail(null)}
        onUpdateStatus={handleUpdateMaintenanceStatus}
        onCreateExpense={(mnt) => {
          setSelectedMaintenanceForDetail(null);
          setMaintenanceForExpense(mnt);
          setIsCreateExpenseFromMntOpen(true);
        }}
        onViewExpense={(expId) => {
          const match = expenses.find(e => e.id === expId || e.expenseNumber === expId);
          if (match) {
            setSelectedMaintenanceForDetail(null);
            setSelectedExpenseForDetail(match);
          }
        }}
        onEdit={(mnt) => {
          setSelectedMaintenanceForDetail(null);
          setEditingMaintenance(mnt);
          setIsMaintenanceFormOpen(true);
        }}
      />

      {/* Create Expense From Maintenance Modal */}
      <CreateExpenseFromMaintenanceModal
        isOpen={isCreateExpenseFromMntOpen}
        maintenance={maintenanceForExpense}
        categories={categories.filter(c => c.isActive)}
        cashBoxes={cashBoxes}
        onConfirm={handleCreateExpenseFromMaintenance}
        onClose={() => {
          setIsCreateExpenseFromMntOpen(false);
          setMaintenanceForExpense(null);
        }}
      />
    </div>
  );
};

export default ExpensesModule;
