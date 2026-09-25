import React, { useState, useEffect } from 'react';
import { 
  X, 
  Droplets, 
  Truck, 
  Wrench, 
  Calculator, 
  Send, 
  Printer, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  FileText,
  UserCheck,
  Building2,
  RefreshCw,
  Ban
} from 'lucide-react';
import { 
  WaterCostPeriod, 
  WaterTankerEntry, 
  WaterCostItem, 
  WaterCharge, 
  WaterDistributionMethod,
  WaterCostCategory
} from '../../../types/erp';
import { ERP_API } from '../../../services/api';
import { CURRENT_USER } from '../../../data/initialData';
import { WaterReportPrintModal } from './WaterReportPrintModal';

interface WaterPeriodDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  onRefreshList: () => void;
  onNavigateToTenant?: (tenantId: string) => void;
}

export const WaterPeriodDetailsModal: React.FC<WaterPeriodDetailsModalProps> = ({
  isOpen,
  onClose,
  periodId,
  onRefreshList,
  onNavigateToTenant
}) => {
  const [activeTab, setActiveTab] = useState<'tankers' | 'costs' | 'distribution' | 'posting'>('tankers');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // RBAC checks
  const canManagePeriods = CURRENT_USER.role === 'SUPER_ADMIN' || CURRENT_USER.role === 'PROPERTY_MANAGER' || CURRENT_USER.role === 'ACCOUNTANT';
  const canDeletePeriods = CURRENT_USER.role === 'SUPER_ADMIN' || CURRENT_USER.role === 'PROPERTY_MANAGER';

  // Action Modals State
  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ type: 'tanker' | 'costItem'; id: string; label: string } | null>(null);

  // Period full details
  const [period, setPeriod] = useState<WaterCostPeriod | null>(null);
  const [tankers, setTankers] = useState<WaterTankerEntry[]>([]);
  const [costItems, setCostItems] = useState<WaterCostItem[]>([]);
  const [charges, setCharges] = useState<(WaterCharge & { unitType?: string; unitArea?: number; tenantPhone?: string })[]>([]);

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form: Add Tanker
  const [tankerDate, setTankerDate] = useState(new Date().toISOString().split('T')[0]);
  const [tankerCount, setTankerCount] = useState<number>(1);
  const [tankerUnitPrice, setTankerUnitPrice] = useState<number>(35000);
  const [tankerSupplier, setTankerSupplier] = useState('');
  const [tankerNumber, setTankerNumber] = useState('');
  const [tankerReceipt, setTankerReceipt] = useState('');
  const [tankerPaymentMethod, setTankerPaymentMethod] = useState('CASH');
  const [tankerNotes, setTankerNotes] = useState('');

  // Form: Add Cost Item
  const [costCategory, setCostCategory] = useState<WaterCostCategory>('PUMP_ELECTRICITY');
  const [costAmount, setCostAmount] = useState<number>(5000);
  const [costDate, setCostDate] = useState(new Date().toISOString().split('T')[0]);
  const [costRef, setCostRef] = useState('');
  const [costDescription, setCostDescription] = useState('');
  const [costNotes, setCostNotes] = useState('');

  // Form: Calculate Distribution
  const [distMethod, setDistMethod] = useState<WaterDistributionMethod>('EQUAL');
  const [includeVacant, setIncludeVacant] = useState(false);
  const [fixedAmount, setFixedAmount] = useState<number>(0);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});

  // Posting form
  const [postedBy, setPostedBy] = useState('م. أحمد الوهاس (مدير الأملاك)');
  const [postingNotes, setPostingNotes] = useState('');

  const loadPeriodData = async () => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ERP_API.getWaterPeriodById(periodId);
      setPeriod(data.period);
      setTankers(data.tankers);
      setCostItems(data.costItems);
      setCharges(data.charges);
      setDistMethod(data.period.distributionMethod || 'EQUAL');
      
      // Initialize custom allocations map if any
      const allocMap: Record<string, number> = {};
      data.charges.forEach(ch => {
        allocMap[ch.unitId] = ch.finalCharge;
      });
      setCustomAllocations(allocMap);
    } catch (err: any) {
      setError(err.message || 'فشل جلب تفاصيل دورة المياه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && periodId) {
      loadPeriodData();
    }
  }, [isOpen, periodId]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Add Tanker Action
  const handleAddTanker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tankerCount <= 0 || tankerUnitPrice <= 0) {
      setError('يرجى تحديد عدد وسعر الوايت بشكل صحيح');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await ERP_API.addWaterTanker(periodId, {
        entryDate: tankerDate,
        tankerCount,
        costPerTanker: tankerUnitPrice,
        supplierName: tankerSupplier.trim() || undefined,
        tankerNumber: tankerNumber.trim() || undefined,
        receiptNumber: tankerReceipt.trim() || undefined,
        paymentMethod: tankerPaymentMethod,
        notes: tankerNotes.trim() || undefined
      });

      showNotification(res.message);
      // Reset tanker form
      setTankerSupplier('');
      setTankerNumber('');
      setTankerReceipt('');
      setTankerNotes('');
      await loadPeriodData();
      onRefreshList();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة وايت الماء');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Tanker Action
  const handleDeleteTanker = async (tankerId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الوايت وإعادة احتساب تكاليف الدورة؟')) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await ERP_API.deleteWaterTanker(periodId, tankerId);
      showNotification(res.message);
      await loadPeriodData();
      onRefreshList();
    } catch (err: any) {
      setError(err.message || 'فشل حذف الوايت');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Cost Item Action
  const handleAddCostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (costAmount <= 0) {
      setError('مبلغ التكلفة يجب أن يكون أكبر من الصفر');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await ERP_API.addWaterCostItem(periodId, {
        costCategory,
        amount: costAmount,
        entryDate: costDate,
        referenceNumber: costRef.trim() || undefined,
        description: costDescription.trim() || 'بند تكلفة مياه تشغيلية',
        notes: costNotes.trim() || undefined
      });

      showNotification(res.message);
      // Reset cost form
      setCostRef('');
      setCostDescription('');
      setCostNotes('');
      await loadPeriodData();
      onRefreshList();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة بند التكلفة');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Cost Item Action
  const handleDeleteCostItem = async (costItemId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البند وإعادة احتساب التكاليف؟')) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await ERP_API.deleteWaterCostItem(periodId, costItemId);
      showNotification(res.message);
      await loadPeriodData();
      onRefreshList();
    } catch (err: any) {
      setError(err.message || 'فشل حذف البند');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate Distribution Action
  const handleCalculateDistribution = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await ERP_API.calculateWaterDistribution(periodId, {
        distributionMethod: distMethod,
        includeVacant,
        fixedAmountPerUnit: distMethod === 'FIXED' ? fixedAmount : undefined,
        customAllocations: distMethod === 'CUSTOM' ? customAllocations : undefined
      });

      showNotification(res.message);
      await loadPeriodData();
      onRefreshList();
    } catch (err: any) {
      setError(err.message || 'فشل احتساب توزيع المياه');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodExplanation = (method: WaterDistributionMethod) => {
    switch (method) {
      case 'EQUAL':
        return 'يتم توزيع إجمالي تكلفة المياه بالتساوي على الوحدات المشمولة في الدورة.';
      case 'AREA':
        return 'يتم توزيع التكلفة بنسبة مساحة كل وحدة مقارنة بإجمالي مساحة الوحدات المشمولة.';
      case 'POPULATION':
        return 'يتم توزيع التكلفة بنسبة عدد السكان المسجلين في كل وحدة.';
      case 'FIXED':
        return 'يتم تحديد مبلغ ثابت لكل وحدة، ويظهر أي فرق بين إجمالي التكلفة وإجمالي المبالغ الموزعة.';
      case 'CUSTOM':
        return 'يتم تحديد قيمة المياه لكل وحدة يدويًا، مع التحقق من إجمالي المبالغ قبل الترحيل.';
      default:
        return 'يتم توزيع التكلفة وفق الطريقة المحددة على وحدات العقار.';
    }
  };

  // Post to Ledger Action
  const handlePostToLedger = async () => {
    if (!window.confirm(`هل أنت متأكد من ترحيل تكاليف المياه (${period?.netTotalOperatingCost?.toLocaleString()} ر.ي) رسمياً إلى دفاتر ذمم المستأجرين؟ لا يمكن التراجع عن الترحيل.`)) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await ERP_API.postWaterPeriod(periodId, {
        postedBy,
        notes: postingNotes.trim() || undefined
      });

      showNotification(res.message);
      await loadPeriodData();
      onRefreshList();
    } catch (err: any) {
      setError(err.message || 'فشل ترحيل دورة المياه');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Period Action
  const handleCancelPeriod = async () => {
    const reason = window.prompt('يرجى كتابة سبب إلغاء دورة المياه:');
    if (!reason) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await ERP_API.cancelWaterPeriod(periodId, { reason });
      showNotification(res.message);
      await loadPeriodData();
      onRefreshList();
    } catch (err: any) {
      setError(err.message || 'فشل إلغاء دورة المياه');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isLocked = period?.status === 'POSTED' || period?.status === 'CLOSED';
  const isCancelled = period?.status === 'CANCELLED';

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'POSTED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">مرحل للذمم (POSTED)</span>;
      case 'CALCULATED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-bold">تم الاحتساب (CALCULATED)</span>;
      case 'CLOSED':
        return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold">مغلقة (CLOSED)</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-bold">ملغاة (CANCELLED)</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">مسودة (DRAFT)</span>;
    }
  };

  const getCategoryArabic = (cat: string) => {
    switch (cat) {
      case 'PUMP_ELECTRICITY': return 'كهرباء مضخات الرفع';
      case 'SEWER': return 'شفط بيارات وصرف صحي';
      case 'MAINTENANCE': return 'صيانة شبكة وخزانات';
      case 'CLEANING': return 'نظافة وغسيل الخزانات';
      case 'LABOR': return 'أجور وعمالة تشغيل';
      case 'TREATMENT': return 'كلور ومعالجة وفلاتر';
      default: return 'مصاريف أخرى';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    دورة مياه: {period?.periodMonth}
                  </h2>
                  {getStatusBadge(period?.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {period?.propertyName}
                  </span>
                  <span>•</span>
                  <span>رقم الدورة: <strong className="font-mono text-slate-700">{period?.id}</strong></span>
                  {period?.periodStart && period?.periodEnd && (
                    <>
                      <span>•</span>
                      <span>من {period.periodStart} إلى {period.periodEnd}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-cyan-600" />
                <span>طباعة تقرير الدورة A4</span>
              </button>

              <button
                onClick={loadPeriodData}
                disabled={loading}
                title="تحديث البيانات"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* KPI Mini-Ribbon */}
          {period && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-cyan-50/50 border-b border-cyan-100 text-xs shrink-0">
              <div className="p-2 bg-white rounded-xl border border-cyan-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">إجمالي الوايتات</span>
                <span className="font-bold text-slate-800 text-sm font-mono">
                  {period.tankerCount} وايت
                </span>
                <span className="text-[10px] text-cyan-700 block font-mono">
                  {Number(period.totalTankerCost || 0).toLocaleString()} ر.ي
                </span>
              </div>

              <div className="p-2 bg-white rounded-xl border border-cyan-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">المصاريف التشغيلية</span>
                <span className="font-bold text-slate-800 text-sm font-mono">
                  {(
                    Number(period.pumpElectricityCost || 0) +
                    Number(period.sewerCost || 0) +
                    Number(period.tankMaintenanceCost || 0) +
                    Number(period.cleaningCost || 0) +
                    Number(period.laborCost || 0) +
                    Number(period.treatmentCost || 0) +
                    Number(period.otherFees || 0)
                  ).toLocaleString()} ر.ي
                </span>
                <span className="text-[10px] text-slate-400 block">{costItems.length} بنود مسجلة</span>
              </div>

              <div className="p-2 bg-cyan-600 text-white rounded-xl shadow-2xs">
                <span className="text-[10px] text-cyan-100 block">صافي تكلفة المياه</span>
                <span className="font-bold text-base font-mono block">
                  {Number(period.netTotalOperatingCost || 0).toLocaleString()} ر.ي
                </span>
                <span className="text-[10px] text-cyan-200">التكلفة الفعلية للدورة</span>
              </div>

              <div className="p-2 bg-white rounded-xl border border-cyan-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">المبلغ الموزع</span>
                <span className="font-bold text-slate-800 text-sm font-mono">
                  {Number(period.totalDistributedAmount || 0).toLocaleString()} ر.ي
                </span>
                <span className="text-[10px] text-slate-400 block">{charges.length} وحدات موزعة</span>
              </div>

              <div className={`p-2 rounded-xl border shadow-2xs ${
                Number(period.differenceAmount || 0) === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <span className="text-[10px] block opacity-80">فارق التوزيع</span>
                <span className="font-bold text-sm font-mono block">
                  {Number(period.differenceAmount || 0).toLocaleString()} ر.ي
                </span>
                <span className="text-[10px] block">
                  {Number(period.differenceAmount || 0) === 0 ? 'توزيع مطابق 100%' : 'يوجد فارق غير موزع'}
                </span>
              </div>
            </div>
          )}

          {/* Alerts Banner */}
          {error && (
            <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 text-xs shrink-0 bg-white">
            <button
              onClick={() => setActiveTab('tankers')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'tankers'
                  ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>وايتات المياه ({tankers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('costs')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'costs'
                  ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>التكاليف التشغيلية الأخرى ({costItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('distribution')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'distribution'
                  ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>احتساب وتوزيع التكلفة ({charges.length} وحدة)</span>
            </button>

            <button
              onClick={() => setActiveTab('posting')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'posting'
                  ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>الترحيل إلى دفاتر الذمم {period?.status === 'POSTED' ? '✓' : ''}</span>
            </button>
          </div>

          {/* Modal Tab Content Area */}
          <div className="p-6 overflow-y-auto flex-1 text-xs">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-600" />
                <p>جاري تحميل بيانات الدورة من MySQL...</p>
              </div>
            ) : activeTab === 'tankers' ? (
              /* TAB 1: TANKERS */
              <div className="space-y-6">
                {/* Add Tanker Form */}
                {!isLocked && !isCancelled && (
                  <form onSubmit={handleAddTanker} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-cyan-600" />
                        إضافة توريدة وايت ماء جديدة
                      </span>
                      <span className="text-[11px] text-cyan-700 font-semibold">
                        الإجمالي المحسوب: {(tankerCount * (Number(tankerUnitPrice) || 0)).toLocaleString()} ر.ي
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">التاريخ *</label>
                        <input
                          type="date"
                          value={tankerDate}
                          onChange={(e) => setTankerDate(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-[11px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">عدد الوايتات *</label>
                        <input
                          type="number"
                          min="1"
                          value={tankerCount}
                          onChange={(e) => setTankerCount(Number(e.target.value))}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">قيمة الوايت (ر.ي) *</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={tankerUnitPrice}
                          onChange={(e) => setTankerUnitPrice(Number(e.target.value))}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">المورد / السائق</label>
                        <input
                          type="text"
                          value={tankerSupplier}
                          onChange={(e) => setTankerSupplier(e.target.value)}
                          placeholder="مثال: وايت السعيد / أبو محمد"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">رقم لوحة الوايت / الخزان</label>
                        <input
                          type="text"
                          value={tankerNumber}
                          onChange={(e) => setTankerNumber(e.target.value)}
                          placeholder="مثال: أ ب ج 1234"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">الرقم المرجعي للنظام</label>
                        <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px] select-none">
                          {`WTR-TNK-${period?.id ? period.id.slice(-6) : 'AUTO'}`}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">سند المورد / الفاتورة الخارجية</label>
                        <input
                          type="text"
                          value={tankerReceipt}
                          onChange={(e) => setTankerReceipt(e.target.value)}
                          placeholder="اختياري: مثال REC-9921"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-[11px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">طريقة الدفع</label>
                        <select
                          value={tankerPaymentMethod}
                          onChange={(e) => setTankerPaymentMethod(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="CASH">نقداً من الصندوق</option>
                          <option value="BANK_TRANSFER">تحويل بنكي</option>
                          <option value="CHECK">شيك مصرفي</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 block font-medium">ملاحظات</label>
                      <input
                        type="text"
                        value={tankerNotes}
                        onChange={(e) => setTankerNotes(e.target.value)}
                        placeholder="مثال: تعبئة الخزان العلوي"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{submitting ? 'جاري الإضافة...' : 'تسجيل الوايت'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Tankers Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">م</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3 text-center">العدد</th>
                        <th className="p-3 text-left">سعر الوايت</th>
                        <th className="p-3 text-left">الإجمالي</th>
                        <th className="p-3">المورد / السائق</th>
                        <th className="p-3">رقم السند/اللوحة</th>
                        <th className="p-3">طريقة الدفع</th>
                        {!isLocked && !isCancelled && <th className="p-3 text-center">إجراء</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tankers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            لا توجد وايتات مسجلة لهذه الدورة حتى الآن. استخدم النموذج أعلاه لتسجيل وايتات المياه.
                          </td>
                        </tr>
                      ) : (
                        tankers.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-slate-50/60">
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-mono font-medium">{t.entryDate}</td>
                            <td className="p-3 text-center font-bold font-mono">{t.tankerCount}</td>
                            <td className="p-3 text-left font-mono">{t.costPerTanker.toLocaleString()} ر.ي</td>
                            <td className="p-3 text-left font-mono font-bold text-cyan-800">
                              {t.totalCost.toLocaleString()} ر.ي
                            </td>
                            <td className="p-3 font-medium">{t.supplierName || '—'}</td>
                            <td className="p-3 font-mono text-slate-500">
                              {t.receiptNumber || t.tankerNumber || '—'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                                {t.paymentMethod || 'نقداً'}
                              </span>
                            </td>
                            {!isLocked && !isCancelled && (
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteTanker(t.id)}
                                  disabled={submitting}
                                  title="حذف الوايت"
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {tankers.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                        <tr>
                          <td colSpan={2} className="p-3">الإجمالي</td>
                          <td className="p-3 text-center font-mono">
                            {tankers.reduce((acc, t) => acc + Number(t.tankerCount || 0), 0)} وايت
                          </td>
                          <td></td>
                          <td className="p-3 text-left font-mono text-cyan-900 font-black">
                            {tankers.reduce((acc, t) => acc + Number(t.totalCost || 0), 0).toLocaleString()} ر.ي
                          </td>
                          <td colSpan={isLocked || isCancelled ? 3 : 4}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ) : activeTab === 'costs' ? (
              /* TAB 2: OTHER COSTS */
              <div className="space-y-6">
                {/* Add Cost Item Form */}
                {!isLocked && !isCancelled && (
                  <form onSubmit={handleAddCostItem} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-cyan-600" />
                        إضافة بند تكلفة تشغيلية أو صيانة ملحقة
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">فئة التكلفة *</label>
                        <select
                          value={costCategory}
                          onChange={(e) => setCostCategory(e.target.value as WaterCostCategory)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                        >
                          <option value="PUMP_ELECTRICITY">كهرباء مضخات الرفع والتعبئة</option>
                          <option value="SEWER">شفط البيارات والصرف الصحي</option>
                          <option value="MAINTENANCE">صيانة الخزانات وتمديدات المياه</option>
                          <option value="CLEANING">نظافة وغسيل وتعقيم الخزانات</option>
                          <option value="LABOR">أجور وعمالة تشغيل شبكة المياه</option>
                          <option value="TREATMENT">معالجة وفلاتر ومواد تطهير (كلور)</option>
                          <option value="OTHER">مصاريف ورسوم تشغيل أخرى</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">المبلغ (ر.ي) *</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={costAmount}
                          onChange={(e) => setCostAmount(Number(e.target.value))}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">التاريخ *</label>
                        <input
                          type="date"
                          value={costDate}
                          onChange={(e) => setCostDate(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-[11px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">الرقم المرجعي للنظام</label>
                        <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px] select-none">
                          {`WTR-EXP-${period?.id ? period.id.slice(-6) : 'AUTO'}`}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">رقم الفاتورة / المستند الخارجي</label>
                        <input
                          type="text"
                          value={costRef}
                          onChange={(e) => setCostRef(e.target.value)}
                          placeholder="اختياري: مثال INV-3341"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">البيان والشرح</label>
                        <input
                          type="text"
                          value={costDescription}
                          onChange={(e) => setCostDescription(e.target.value)}
                          placeholder="مثال: فاتورة كهرباء مضخة الرفع للدور السادس"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 block font-medium">ملاحظات إضافية</label>
                        <input
                          type="text"
                          value={costNotes}
                          onChange={(e) => setCostNotes(e.target.value)}
                          placeholder="مثال: تم السداد للمقاول فلان"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{submitting ? 'جاري الإضافة...' : 'تسجيل بند التكلفة'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Cost Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">م</th>
                        <th className="p-3">فئة التكلفة</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">البيان والتفاصيل</th>
                        <th className="p-3">رقم السند/المرجع</th>
                        <th className="p-3 text-left">المبلغ</th>
                        {!isLocked && !isCancelled && <th className="p-3 text-center">إجراء</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {costItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            لا توجد مصاريف تشغيلية إضافية مسجلة لهذه الدورة.
                          </td>
                        </tr>
                      ) : (
                        costItems.map((ci, idx) => (
                          <tr key={ci.id} className="hover:bg-slate-50/60">
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-800">
                              {getCategoryArabic(ci.costCategory)}
                            </td>
                            <td className="p-3 font-mono">{ci.entryDate}</td>
                            <td className="p-3">{ci.description || '—'}</td>
                            <td className="p-3 font-mono text-slate-500">{ci.referenceNumber || '—'}</td>
                            <td className="p-3 text-left font-mono font-bold text-cyan-900">
                              {ci.amount.toLocaleString()} ر.ي
                            </td>
                            {!isLocked && !isCancelled && (
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteCostItem(ci.id)}
                                  disabled={submitting}
                                  title="حذف البند"
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {costItems.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                        <tr>
                          <td colSpan={5} className="p-3">إجمالي التكاليف التشغيلية الملحقة</td>
                          <td className="p-3 text-left font-mono text-cyan-900 font-black">
                            {costItems.reduce((acc, ci) => acc + Number(ci.amount || 0), 0).toLocaleString()} ر.ي
                          </td>
                          {!isLocked && !isCancelled && <td></td>}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ) : activeTab === 'distribution' ? (
              /* TAB 3: DISTRIBUTION & CALCULATION */
              <div className="space-y-6">
                {/* Distribution Controls */}
                {!isLocked && !isCancelled && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          محرك احتساب وتوزيع تكلفة المياه على الوحدات
                        </span>
                        <span className="text-[11px] text-slate-500">
                          إجمالي التكلفة المطلوب توزيعها: <strong className="text-cyan-800 font-mono font-bold">{Number(period?.netTotalOperatingCost || 0).toLocaleString()} ر.ي</strong>
                        </span>
                      </div>

                      <button
                        onClick={handleCalculateDistribution}
                        disabled={submitting || Number(period?.netTotalOperatingCost || 0) <= 0}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <Calculator className="w-4 h-4" />
                        <span>{submitting ? 'جاري الاحتساب...' : 'احتساب وتحديث التوزيع الآن'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-slate-600 font-medium block">طريقة توزيع تكلفة المياه</label>
                        <select
                          value={distMethod}
                          onChange={(e) => setDistMethod(e.target.value as WaterDistributionMethod)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                        >
                          <option value="EQUAL">بالتساوي</option>
                          <option value="AREA">حسب المساحة</option>
                          <option value="POPULATION">حسب عدد السكان</option>
                          <option value="FIXED">مبلغ ثابت</option>
                          <option value="CUSTOM">توزيع مخصص</option>
                        </select>
                      </div>

                      {distMethod === 'FIXED' && (
                        <div className="space-y-1">
                          <label className="text-slate-600 font-medium block">المبلغ الثابت لكل وحدة (ر.ي)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={fixedAmount}
                            onChange={(e) => setFixedAmount(Number(e.target.value))}
                            placeholder="مثال: 5000"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeVacant}
                            onChange={(e) => setIncludeVacant(e.target.checked)}
                            className="w-4 h-4 rounded text-cyan-600 border-slate-300 focus:ring-cyan-500"
                          />
                          <span className="text-slate-700 font-semibold">
                            شمول الوحدات الشاغرة (تحت حساب المالك)
                          </span>
                        </label>
                      </div>

                      {/* Dynamic Explanation under field */}
                      <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed sm:col-span-3">
                        {getMethodExplanation(distMethod)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Charges List Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      جدول حصص وتكاليف المياه على الوحدات ({charges.length} وحدة)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      طريقة التوزيع: <strong>{period?.distributionMethod}</strong>
                    </span>
                  </div>

                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">م</th>
                        <th className="p-3">الوحدة</th>
                        <th className="p-3">النوع والمساحة</th>
                        <th className="p-3">المستأجر الحالي</th>
                        <th className="p-3 text-center">أساس التوزيع</th>
                        <th className="p-3 text-left">الحصة المحسوبة</th>
                        <th className="p-3 text-left">المبلغ المفوتر</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {charges.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            لم يتم توزيع التكلفة بعد. اضغط على زر "احتساب وتحديث التوزيع الآن" أعلاه لتوليد حصص الوحدات.
                          </td>
                        </tr>
                      ) : (
                        charges.map((ch, idx) => (
                          <tr key={ch.id} className="hover:bg-slate-50/60">
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-800">
                              وحدة {ch.unitNumber}
                            </td>
                            <td className="p-3 text-slate-600">
                              {ch.unitType || 'وحدة'} {ch.unitArea ? `(${ch.unitArea} م²)` : ''}
                            </td>
                            <td className="p-3">
                              {ch.tenantName ? (
                                <button
                                  type="button"
                                  onClick={() => ch.tenantId && onNavigateToTenant && onNavigateToTenant(ch.tenantId)}
                                  className="text-cyan-700 hover:text-cyan-900 font-semibold hover:underline cursor-pointer"
                                >
                                  {ch.tenantName}
                                </button>
                              ) : (
                                <span className="text-slate-400 italic">شاغرة (تحت حساب المالك)</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono">
                              {ch.basisValue}
                            </td>
                            <td className="p-3 text-left font-mono">
                              {ch.calculatedShare.toLocaleString()} ر.ي
                            </td>
                            <td className="p-3 text-left font-mono font-bold text-cyan-800">
                              {distMethod === 'CUSTOM' && !isLocked && !isCancelled ? (
                                <input
                                  type="number"
                                  value={customAllocations[ch.unitId] ?? ch.finalCharge}
                                  onChange={(e) => {
                                    setCustomAllocations({
                                      ...customAllocations,
                                      [ch.unitId]: Number(e.target.value)
                                    });
                                  }}
                                  className="w-24 px-2 py-1 border border-slate-200 rounded text-left font-mono"
                                />
                              ) : (
                                `${ch.finalCharge.toLocaleString()} ر.ي`
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {ch.status === 'POSTED' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                  مرحل للذمة
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                                  معلق
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {charges.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                        <tr>
                          <td colSpan={5} className="p-3">الإجمالي الموزع على الوحدات</td>
                          <td className="p-3 text-left font-mono">
                            {charges.reduce((acc, c) => acc + Number(c.calculatedShare || 0), 0).toLocaleString()} ر.ي
                          </td>
                          <td className="p-3 text-left font-mono text-cyan-900 font-black">
                            {charges.reduce((acc, c) => acc + Number(c.finalCharge || 0), 0).toLocaleString()} ر.ي
                          </td>
                          <td className="p-3 text-center text-[10px] text-slate-500">
                            {period?.differenceAmount === 0 ? 'مطابق تماماً' : `فرق: ${period?.differenceAmount} ر.ي`}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ) : (
              /* TAB 4: POSTING TO LEDGER */
              <div className="space-y-6">
                {period?.status === 'POSTED' ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 text-emerald-800">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">تم ترحيل هذه الدورة رسمياً إلى دفاتر ذمم المستأجرين</h3>
                        <p className="text-xs text-emerald-700">
                          تم قيد المبالغ مدينة على حسابات المستأجرين وتحديث الأرصدة المالية بنجاح.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[11px]">المسؤول عن الترحيل</span>
                        <strong className="text-slate-800 text-sm">{period.postedBy || 'النظام المركزي'}</strong>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[11px]">تاريخ ووقت الترحيل</span>
                        <strong className="text-slate-800 font-mono text-sm">{period.postedAt || '—'}</strong>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-emerald-100">
                        <span className="text-slate-500 block text-[11px]">إجمالي المبلغ المرحل</span>
                        <strong className="text-emerald-800 font-mono text-sm">
                          {Number(period.totalDistributedAmount || 0).toLocaleString()} ر.ي
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : isCancelled ? (
                  <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Ban className="w-5 h-5" />
                      <span>دورة تكاليف المياه هذه ملغاة</span>
                    </div>
                    <p className="text-xs text-rose-700">
                      لا يمكن ترحيل دورة مياه ملغاة. يمكنك إنشاء دورة جديدة عند الحاجة.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center">
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">
                          الترحيل المالي إلى كشوفات حسابات المستأجرين (Tenant Ledgers)
                        </h3>
                        <p className="text-xs text-slate-500">
                          قيد التكلفة الموزعة في دفاتر الذمم وتحديث الأرصدة الإجمالية وأرصدة المياه
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        تأثير الترحيل المحاسبي:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-amber-900 pr-2">
                        <li>سيتم إنشاء قيد مدين (Debit) في كشف حساب كل مستأجر بنوع حساب <code className="bg-amber-100 px-1 rounded font-bold font-mono">WATER</code>.</li>
                        <li>سيتم زيادة الرصيد الإجمالي المستحق للمستأجر ورصيد المياه <code className="bg-amber-100 px-1 rounded font-bold font-mono">water_balance</code>.</li>
                        <li>سيتم إقفال الدورة وتحويل حالتها إلى <strong className="text-slate-900">مرحل للذمم (POSTED)</strong> لمنع التعديل المزدوج.</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">اسم المحاسب / مسؤول الترحيل *</label>
                        <input
                          type="text"
                          value={postedBy}
                          onChange={(e) => setPostedBy(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">ملاحظات الترحيل</label>
                        <input
                          type="text"
                          value={postingNotes}
                          onChange={(e) => setPostingNotes(e.target.value)}
                          placeholder="مثال: تم الترحيل بناء على قراءات وسندات شهر سبتمبر..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleCancelPeriod}
                        disabled={submitting}
                        className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <Ban className="w-4 h-4" />
                        <span>إلغاء الدورة</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePostToLedger}
                        disabled={submitting || charges.length === 0}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>{submitting ? 'جاري الترحيل...' : 'تأكيد وترحيل الدورة إلى الذمم الآن'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {period && (
        <WaterReportPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          period={period}
          tankers={tankers}
          costItems={costItems}
          charges={charges}
        />
      )}
    </>
  );
};
