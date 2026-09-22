import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Store, 
  User, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Printer, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert,
  ArrowUpRight,
  ChevronDown,
  DollarSign,
  Layers,
  Sparkles
} from 'lucide-react';
import { Contract, Property, Tenant, Unit } from '../../types/erp';
import { ERP_API } from '../../services/api';
import { ContractPrintModal } from './contracts/ContractPrintModal';
import { RenewContractModal } from './contracts/RenewContractModal';
import { TerminateContractModal } from './contracts/TerminateContractModal';
import { ContractDetailsModal } from './contracts/ContractDetailsModal';
import { DepositSettleModal } from './contracts/DepositSettleModal';

interface ContractsModuleProps {
  initialExpiringOnly?: boolean;
  onNavigateToUnit?: (unitId: string) => void;
  onNavigateToTenant?: (tenantId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
  onOpenNewContractModal: () => void;
  onRefreshGlobalStats: () => void;
}

export const ContractsModule: React.FC<ContractsModuleProps> = ({
  initialExpiringOnly = false,
  onNavigateToUnit,
  onNavigateToTenant,
  onNavigateToProperty,
  onOpenNewContractModal,
  onRefreshGlobalStats
}) => {
  // Navigation View Tab: 'CONTRACTS' | 'DEPOSITS'
  const [activeSubTab, setActiveSubTab] = useState<'CONTRACTS' | 'DEPOSITS'>('CONTRACTS');

  // State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialExpiringOnly ? 'EXPIRING' : 'ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');

  // Selected for modals
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<Contract | null>(null);
  const [selectedContractForRenew, setSelectedContractForRenew] = useState<Contract | null>(null);
  const [selectedContractForTerminate, setSelectedContractForTerminate] = useState<Contract | null>(null);
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<string | null>(null);
  const [selectedDepositForSettle, setSelectedDepositForSettle] = useState<any | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load contracts and deposits from MySQL
  const loadData = async () => {
    setLoading(true);
    try {
      const [cnts, deps, props] = await Promise.all([
        ERP_API.getContracts().catch(() => []),
        ERP_API.getDeposits().catch(() => []),
        ERP_API.getProperties().catch(() => [])
      ]);
      setContracts(cnts);
      setDeposits(deps);
      setProperties(props);
    } catch (err) {
      console.error('Failed to load contracts data from MySQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateDaysRemaining = (endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // KPIs
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
  const expiringContracts = activeContracts.filter(c => calculateDaysRemaining(c.endDate) <= 60 && calculateDaysRemaining(c.endDate) >= 0);
  const expiredContracts = contracts.filter(c => c.status === 'EXPIRED' || (c.status === 'ACTIVE' && calculateDaysRemaining(c.endDate) < 0));
  const totalMonthlyRent = activeContracts.reduce((sum, c) => sum + (c.rentAmount || 0), 0);
  const totalDepositsHeld = deposits.filter(d => d.status === 'HELD').reduce((sum, d) => sum + (d.balance || d.amount || 0), 0);

  // Filtered Contracts
  const filteredContracts = contracts.filter(c => {
    const daysLeft = calculateDaysRemaining(c.endDate);

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        c.contractNumber?.toLowerCase().includes(q) ||
        c.tenantName?.toLowerCase().includes(q) ||
        c.propertyName?.toLowerCase().includes(q) ||
        c.unitNumber?.toLowerCase().includes(q) ||
        c.guaranteePersonName?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Property Filter
    if (propertyFilter !== 'ALL' && c.propertyId !== propertyFilter) {
      return false;
    }

    // Cycle Filter
    if (cycleFilter !== 'ALL' && c.paymentCycle !== cycleFilter) {
      return false;
    }

    // Status Filter
    if (statusFilter === 'ACTIVE') {
      return c.status === 'ACTIVE' && daysLeft > 60;
    } else if (statusFilter === 'EXPIRING') {
      return c.status === 'ACTIVE' && daysLeft <= 60 && daysLeft >= 0;
    } else if (statusFilter === 'EXPIRED') {
      return c.status === 'EXPIRED' || (c.status === 'ACTIVE' && daysLeft < 0);
    } else if (statusFilter === 'TERMINATED') {
      return c.status === 'TERMINATED';
    }

    return true;
  });

  // Filtered Deposits
  const filteredDeposits = deposits.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.tenantName?.toLowerCase().includes(q) ||
      d.contractNumber?.toLowerCase().includes(q) ||
      d.propertyName?.toLowerCase().includes(q) ||
      d.unitNumber?.toLowerCase().includes(q) ||
      d.guarantorName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-emerald-500/50 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ribbon Header & Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                سجل العقود والضمانات والتأمينات
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة حية لعقود الإيجار، تواريخ التجديد والاستحقاق، ومبالغ التأمين المحتجزة كأمانات منفصلة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Subtab Toggle Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('CONTRACTS')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'CONTRACTS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              العقود والاتفاقيات ({contracts.length})
            </button>
            <button
              onClick={() => setActiveSubTab('DEPOSITS')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'DEPOSITS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              أمانات التأمين والضمانات ({deposits.length})
            </button>
          </div>

          <button
            onClick={onOpenNewContractModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إبرام عقد جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Contracts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>العقود السارية</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">{activeContracts.length}</p>
          <p className="text-[11px] text-slate-500">من أصل {contracts.length} عقد موثق</p>
        </div>

        {/* Card 2: Expiring Soon Contracts */}
        <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 transition-all ${
          expiringContracts.length > 0 ? 'bg-amber-50/70 border-amber-300/80 text-amber-950' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={expiringContracts.length > 0 ? 'text-amber-800 font-bold' : 'text-slate-500'}>
              تنتهي خلال 60 يوماً
            </span>
            <AlertTriangle className={`w-4 h-4 ${expiringContracts.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700">{expiringContracts.length}</p>
          <p className="text-[11px] text-amber-800">تتطلب إشعار أو تجديد تعاقدي</p>
        </div>

        {/* Card 3: Monthly Rent Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>الإيراد التعاقدي الشهري</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">{totalMonthlyRent.toLocaleString()} <span className="text-xs font-normal">ريال</span></p>
          <p className="text-[11px] text-emerald-600 font-semibold">إجمالي القيمة الشهرية للعقود السارية</p>
        </div>

        {/* Card 4: Deposits Held */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>أمانات التأمين المحتجزة</span>
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-cyan-800">{totalDepositsHeld.toLocaleString()} <span className="text-xs font-normal">ريال</span></p>
          <p className="text-[11px] text-cyan-700 font-semibold">محتجزة في حساب الضمانات المستردة</p>
        </div>
      </div>

      {/* Main View: CONTRACTS TAB */}
      {activeSubTab === 'CONTRACTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم العقد، اسم المستأجر، رقم الوحدة، اسم العقار، أو الضامن..."
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="ACTIVE">عقود سارية ونشطة</option>
                <option value="EXPIRING">تنتهي قريباً (≤ 60 يوماً)</option>
                <option value="EXPIRED">منتهية الصلاحية</option>
                <option value="TERMINATED">مفسوخة / مخلية</option>
              </select>

              {/* Property Filter */}
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">جميع العقارات</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Cycle Filter */}
              <select
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">جميع دورات السداد</option>
                <option value="MONTHLY">شهري</option>
                <option value="QUARTERLY">ربع سنوي</option>
                <option value="SEMI_ANNUAL">نصف سنوي</option>
                <option value="ANNUAL">سنوي</option>
              </select>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">رقم العقد</th>
                  <th className="px-4 py-3">المستأجر</th>
                  <th className="px-4 py-3">الوحدة والعقار</th>
                  <th className="px-4 py-3">تاريخ السريان والانتهاء</th>
                  <th className="px-4 py-3">المدة المتبقية</th>
                  <th className="px-4 py-3">الإيجار الدوري</th>
                  <th className="px-4 py-3">التأمين المحتجز</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span>جاري تحميل قائمة العقود من MySQL...</span>
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      لا توجد عقود مطابقة لمعايير البحث والتصفية المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => {
                    const daysLeft = calculateDaysRemaining(c.endDate);
                    const isExpiring = c.status === 'ACTIVE' && daysLeft <= 60 && daysLeft >= 0;
                    const isExpired = c.status === 'EXPIRED' || (c.status === 'ACTIVE' && daysLeft < 0);

                    return (
                      <tr 
                        key={c.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isExpiring ? 'bg-amber-50/30' : isExpired ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {/* Contract Number */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedContractForDetails(c.id)}
                            className="hover:text-emerald-700 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{c.contractNumber}</span>
                          </button>
                        </td>

                        {/* Tenant Name */}
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {onNavigateToTenant ? (
                            <button
                              onClick={() => onNavigateToTenant(c.tenantId)}
                              className="hover:text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer text-right"
                            >
                              <span>{c.tenantName}</span>
                              <ArrowUpRight className="w-3 h-3 text-slate-400" />
                            </button>
                          ) : (
                            <span>{c.tenantName}</span>
                          )}
                        </td>

                        {/* Unit & Property */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">وحدة {c.unitNumber}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">{c.propertyName}</span>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          <span>{c.startDate}</span>
                          <span className="text-slate-400 mx-1">←</span>
                          <span className={isExpiring ? 'text-amber-700 font-bold' : isExpired ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>
                            {c.endDate}
                          </span>
                        </td>

                        {/* Countdown Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {c.status === 'TERMINATED' ? (
                            <span className="text-[11px] text-slate-500 font-medium">تم الإخلاء</span>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              منتهٍ منذ {Math.abs(daysLeft)} يوماً
                            </span>
                          ) : isExpiring ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              باقٍ {daysLeft} يوماً
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 font-mono">
                              باقٍ {daysLeft} يوماً
                            </span>
                          )}
                        </td>

                        {/* Rent & Cycle */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <div>
                            <span>{c.rentAmount.toLocaleString()} ريال</span>
                            <span className="text-[10px] text-slate-500 font-normal block">
                              {c.paymentCycle === 'MONTHLY' ? 'شهري' :
                               c.paymentCycle === 'QUARTERLY' ? 'ربع سنوي' :
                               c.paymentCycle === 'SEMI_ANNUAL' ? 'نصف سنوي' : 'سنوي'}
                            </span>
                          </div>
                        </td>

                        {/* Deposit Amount */}
                        <td className="px-4 py-3 font-mono text-cyan-800 font-semibold whitespace-nowrap">
                          {(c.depositAmount || 0) > 0 ? `${(c.depositAmount || 0).toLocaleString()} ريال` : '-'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'ACTIVE' ? (isExpiring ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800') :
                            c.status === 'TERMINATED' ? 'bg-slate-100 text-slate-700' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {c.status === 'ACTIVE' ? (isExpiring ? 'سارٍ (ينتهي قريباً)' : 'سارٍ ونافذ') :
                             c.status === 'TERMINATED' ? 'مفسوخ / منتهٍ' : 'منتهي الصلاحية'}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Details Button */}
                            <button
                              onClick={() => setSelectedContractForDetails(c.id)}
                              title="عرض تفاصيل العقد"
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* Print Button */}
                            <button
                              onClick={() => setSelectedContractForPrint(c)}
                              title="طباعة العقد الرسمي"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Renew Button */}
                            {c.status === 'ACTIVE' && (
                              <button
                                onClick={() => setSelectedContractForRenew(c)}
                                title="تجديد العقد"
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}

                            {/* Terminate Button */}
                            {c.status === 'ACTIVE' && (
                              <button
                                onClick={() => setSelectedContractForTerminate(c)}
                                title="إنهاء العقد وإخلاء الوحدة"
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
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
      )}

      {/* Main View: DEPOSITS TAB */}
      {activeSubTab === 'DEPOSITS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالمستأجر، العقد، الوحدة، العقار، أو الكفيل الضامن..."
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              إجمالي سجلات الأمانات: <strong className="text-slate-800 font-mono">{filteredDeposits.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">المستأجر</th>
                  <th className="px-4 py-3">العقد والوحدة</th>
                  <th className="px-4 py-3">العقار</th>
                  <th className="px-4 py-3">مبلغ التأمين الكلي</th>
                  <th className="px-4 py-3">الرصيد المحتجز حالياً</th>
                  <th className="px-4 py-3">الكفيل / الضامن</th>
                  <th className="px-4 py-3">تاريخ الاستلام</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span>جاري تحميل بيانات الأمانات من MySQL...</span>
                    </td>
                  </tr>
                ) : filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      لا توجد سجلات تأمينات مطابقة.
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div>
                          <span>{d.tenantName}</span>
                          {d.tenantPhone && <span className="block text-[10px] text-slate-400 font-mono">{d.tenantPhone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-800">{d.contractNumber}</span>
                        <span className="text-slate-500 block text-[11px]">وحدة {d.unitNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{d.propertyName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {d.amount.toLocaleString()} ريال
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-cyan-800 whitespace-nowrap">
                        {d.balance.toLocaleString()} ريال
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <span className="font-medium text-slate-800">{d.guarantorName || '-'}</span>
                          {d.guarantorPhone && d.guarantorPhone !== '-' && (
                            <span className="block text-[10px] text-slate-500 font-mono">{d.guarantorPhone}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {d.receivedDate ? d.receivedDate.split('T')[0] : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'HELD' ? 'bg-cyan-100 text-cyan-800' :
                          d.status === 'REFUNDED' ? 'bg-emerald-100 text-emerald-800' :
                          d.status === 'PARTIALLY_REFUNDED' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {d.status === 'HELD' ? 'محتجز كأمانة' :
                           d.status === 'REFUNDED' ? 'مسترد بالكامل' :
                           d.status === 'PARTIALLY_REFUNDED' ? 'مسترد جزئياً' : 'مخصوم للتلفيات'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {d.status === 'HELD' || d.status === 'PARTIALLY_REFUNDED' ? (
                          <button
                            onClick={() => setSelectedDepositForSettle(d)}
                            className="px-3 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            تسوية / استرداد
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">مكتمل</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Dialogs */}
      {/* 1. Print Official Lease Contract Modal */}
      <ContractPrintModal
        contract={selectedContractForPrint}
        onClose={() => setSelectedContractForPrint(null)}
      />

      {/* 2. Renew Contract Modal */}
      <RenewContractModal
        contract={selectedContractForRenew}
        onClose={() => setSelectedContractForRenew(null)}
        onSuccess={(res) => {
          showToast(`تم تجديد العقد بنجاح!`);
          loadData();
          onRefreshGlobalStats();
        }}
      />

      {/* 3. Terminate Contract Modal */}
      <TerminateContractModal
        contract={selectedContractForTerminate}
        onClose={() => setSelectedContractForTerminate(null)}
        onSuccess={(res) => {
          showToast(`تم إنهاء العقد وإخلاء الوحدة بنجاح!`);
          loadData();
          onRefreshGlobalStats();
        }}
      />

      {/* 4. Contract Details Workspace Modal */}
      <ContractDetailsModal
        contractId={selectedContractForDetails}
        onClose={() => setSelectedContractForDetails(null)}
        onRenew={(c) => {
          setSelectedContractForDetails(null);
          setSelectedContractForRenew(c);
        }}
        onTerminate={(c) => {
          setSelectedContractForDetails(null);
          setSelectedContractForTerminate(c);
        }}
        onPrint={(c) => {
          setSelectedContractForPrint(c);
        }}
        onViewTenant={(tId) => {
          setSelectedContractForDetails(null);
          if (onNavigateToTenant) onNavigateToTenant(tId);
        }}
        onViewUnit={(uId) => {
          setSelectedContractForDetails(null);
          if (onNavigateToUnit) onNavigateToUnit(uId);
        }}
      />

      {/* 5. Deposit Settle Modal */}
      <DepositSettleModal
        deposit={selectedDepositForSettle}
        onClose={() => setSelectedDepositForSettle(null)}
        onSuccess={() => {
          showToast(`تمت تسوية مبلغ التأمين بنجاح!`);
          loadData();
          onRefreshGlobalStats();
        }}
      />
    </div>
  );
};
