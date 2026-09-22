import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Building, 
  Store, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  DollarSign, 
  ShieldCheck, 
  Receipt, 
  BookOpen, 
  UserCheck, 
  Layers,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Tenant, Property, Owner } from '../../types/erp';
import { ERP_API } from '../../services/api';
import { TenantFormModal } from './tenants/TenantFormModal';
import { TenantWorkspaceModal } from './tenants/TenantWorkspaceModal';
import { OwnerFormModal } from './tenants/OwnerFormModal';
import { OwnerDetailsModal } from './tenants/OwnerDetailsModal';

interface TenantsModuleProps {
  onNavigateToUnit?: (unitId: string) => void;
  onNavigateToProperty?: (propertyId: string) => void;
  onOpenQuickCollection?: (tenant: Tenant) => void;
  onOpenStatement?: (tenant: Tenant) => void;
  onRefreshGlobalStats?: () => void;
}

export const TenantsModule: React.FC<TenantsModuleProps> = ({
  onNavigateToUnit,
  onNavigateToProperty,
  onOpenQuickCollection,
  onOpenStatement,
  onRefreshGlobalStats
}) => {
  // View mode: 'tenants' | 'owners'
  const [activeSubView, setActiveSubView] = useState<'tenants' | 'owners'>('tenants');

  // Tenants data state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantsError, setTenantsError] = useState<string | null>(null);

  // Owners data state
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);

  // Action messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters for Tenants
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [selectedBalanceFilter, setSelectedBalanceFilter] = useState('ALL');

  // Filters for Owners
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

  // Modals state
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [workspaceTenantId, setWorkspaceTenantId] = useState<string | null>(null);

  const [isOwnerFormOpen, setIsOwnerFormOpen] = useState(false);
  const [ownerToEdit, setOwnerToEdit] = useState<Owner | null>(null);
  const [detailsOwnerId, setDetailsOwnerId] = useState<string | null>(null);

  // Fetch tenants
  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      setTenantsError(null);
      const data = await ERP_API.getTenants({
        search: searchQuery,
        type: selectedType,
        status: selectedStatus,
        propertyId: selectedPropertyId,
        balanceFilter: selectedBalanceFilter
      });
      setTenants(data);
    } catch (err: any) {
      setTenantsError(err.message || 'فشل جلب قائمة المستأجرين من MySQL');
    } finally {
      setLoadingTenants(false);
    }
  };

  // Fetch owners
  const fetchOwners = async () => {
    try {
      setLoadingOwners(true);
      setOwnersError(null);
      const data = await ERP_API.getOwners(ownerSearchQuery);
      setOwners(data);
    } catch (err: any) {
      setOwnersError(err.message || 'فشل جلب قائمة الملاك من MySQL');
    } finally {
      setLoadingOwners(false);
    }
  };

  // Fetch properties for filtering
  const fetchPropertiesList = async () => {
    try {
      const data = await ERP_API.getProperties();
      setProperties(data);
    } catch (err) {
      console.error('Error loading properties for tenant filter:', err);
    }
  };

  useEffect(() => {
    fetchPropertiesList();
  }, []);

  useEffect(() => {
    if (activeSubView === 'tenants') {
      fetchTenants();
    } else {
      fetchOwners();
    }
  }, [activeSubView, searchQuery, selectedType, selectedStatus, selectedPropertyId, selectedBalanceFilter, ownerSearchQuery]);

  // Handle Delete Tenant
  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف سجل المستأجر (${tenant.name}) نهائياً من قاعدة البيانات؟`)) {
      return;
    }

    try {
      setActionError(null);
      await ERP_API.deleteTenant(tenant.id);
      setSuccessMessage(`تم حذف المستأجر (${tenant.name}) بنجاح`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchTenants();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      setActionError(err.message || 'تعذر حذف المستأجر');
    }
  };

  // Handle Delete Owner
  const handleDeleteOwner = async (owner: Owner) => {
    if (!confirm(`هل أنت متأكد من حذف المالك (${owner.name})؟`)) return;

    try {
      setActionError(null);
      await ERP_API.deleteOwner(owner.id);
      setSuccessMessage(`تم حذف المالك (${owner.name}) بنجاح`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchOwners();
    } catch (err: any) {
      setActionError(err.message || 'تعذر حذف المالك');
    }
  };

  // Computed metrics
  const totalTenantsCount = tenants.length;
  const activeTenantsWithContracts = tenants.filter(t => (t.activeContractsCount || 0) > 0).length;
  const totalDebtAmount = tenants.reduce((acc, t) => acc + (t.currentBalance > 0 ? t.currentBalance : 0), 0);
  const totalDepositsHeld = tenants.reduce((acc, t) => acc + (t.depositBalance || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header & Sub-view Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">
                إدارة الأطراف: المستأجرون والملاك
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                سجل مركزي للمستأجرين والملاك مربوط بقاعدة بيانات MySQL ومرتبط بالعقود والوحدات والذمم المالية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-view switcher */}
          <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200 text-xs">
            <button
              onClick={() => setActiveSubView('tenants')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'tenants'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>سجل المستأجرين</span>
            </button>
            <button
              onClick={() => setActiveSubView('owners')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'owners'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>الملاك ومحافظ الأصول</span>
            </button>
          </div>

          {/* Action button */}
          {activeSubView === 'tenants' ? (
            <button
              onClick={() => {
                setTenantToEdit(null);
                setIsTenantFormOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل مستأجر جديد</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setOwnerToEdit(null);
                setIsOwnerFormOpen(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل مالك جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 font-bold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 font-semibold shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{actionError}</div>
        </div>
      )}

      {/* Metric Cards Row */}
      {activeSubView === 'tenants' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">إجمالي المستأجرين المسجلين</span>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {totalTenantsCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">في قاعدة بيانات MySQL</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">مستأجرون بعقود سارية</span>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
                {activeTenantsWithContracts}
              </div>
              <span className="text-[11px] text-emerald-600/80 mt-0.5 block font-medium">علاقة تعاقدية نشطة</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">إجمالي المديونيات القائمة</span>
              <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                {totalDebtAmount.toLocaleString()} <span className="text-xs">ريال</span>
              </div>
              <span className="text-[11px] text-rose-600/80 mt-0.5 block font-medium">ذمم مستحقة غير محصلة</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">مبالغ التأمين المحتجزة</span>
              <div className="text-2xl font-black font-mono text-purple-600 mt-1">
                {totalDepositsHeld.toLocaleString()} <span className="text-xs">ريال</span>
              </div>
              <span className="text-[11px] text-purple-600/80 mt-0.5 block font-medium">أمانات منفصلة عن الإيجار</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">إجمالي الملاك المسجلين</span>
              <div className="text-2xl font-black font-mono text-purple-700 mt-1">
                {owners.length}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">أصحاب الأصول والمجمعات</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">إجمالي العقارات التابعة للملاك</span>
              <div className="text-2xl font-black font-mono text-blue-700 mt-1">
                {owners.reduce((acc, o) => acc + (o.propertiesCount || 0), 0)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">عقار ومجمع استثماري</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">العائد الإيجاري الشهري المتوقع</span>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {owners.reduce((acc, o) => acc + (o.monthlyExpectedRent || 0), 0).toLocaleString()} <span className="text-xs">ريال</span>
              </div>
              <span className="text-[11px] text-emerald-600/80 mt-0.5 block font-medium">إجمالي عقود المحافظ</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Tenants View */}
      {activeSubView === 'tenants' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Search & Filter Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative grow max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم، الكود (TEN-)، الهوية، الهاتف، أو رقم الوحدة والعقد..."
                className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">جميع الأنواع</option>
                <option value="INDIVIDUAL">أفراد</option>
                <option value="COMPANY">شركات ومؤسسات</option>
                <option value="GOVERNMENT">جهات حكومية</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="ACTIVE">نشط (ساري)</option>
                <option value="INACTIVE">متوقف / منتهي</option>
                <option value="LEGAL_DISPUTE">نزاع قضائي</option>
              </select>

              {/* Property Filter */}
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 max-w-[150px] truncate"
              >
                <option value="ALL">جميع العقارات</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Balance Filter */}
              <select
                value={selectedBalanceFilter}
                onChange={(e) => setSelectedBalanceFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">جميع الأرصدة</option>
                <option value="HAS_DEBT">عليه مديونية مستحقة</option>
                <option value="ZERO_OR_CREDIT">رصيد مسدد أو دائن</option>
              </select>

              <button
                onClick={fetchTenants}
                className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                title="تحديث البيانات من MySQL"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTenants ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="px-4 py-3.5">كود المستأجر</th>
                  <th className="px-4 py-3.5">اسم المستأجر / المنشأة</th>
                  <th className="px-4 py-3.5">بيانات التواصل</th>
                  <th className="px-4 py-3.5">الوحدات والعقود المشغولة</th>
                  <th className="px-4 py-3.5">الرصيد والذمم المستحقة</th>
                  <th className="px-4 py-3.5">الحالة</th>
                  <th className="px-4 py-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingTenants ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs">جاري جلب سجلات المستأجرين من MySQL...</p>
                    </td>
                  </tr>
                ) : tenantsError ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-rose-600">
                      <AlertCircle className="w-7 h-7 mx-auto mb-1 text-rose-500" />
                      <p className="font-bold">{tenantsError}</p>
                    </td>
                  </tr>
                ) : tenants.length > 0 ? (
                  tenants.map((t) => {
                    const hasDebt = (t.currentBalance || 0) > 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Code */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {t.tenantCode}
                          </span>
                        </td>

                        {/* Name & Type */}
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer text-sm block"
                              onClick={() => setWorkspaceTenantId(t.id)}
                            >
                              {t.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                                t.type === 'COMPANY' ? 'bg-blue-50 text-blue-700' :
                                t.type === 'GOVERNMENT' ? 'bg-purple-50 text-purple-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {t.type === 'COMPANY' ? 'شركة / مؤسسة' : t.type === 'GOVERNMENT' ? 'جهة حكومية' : 'فرد'}
                              </span>
                              <span className="text-slate-400 text-[11px] font-mono">
                                هوية: {t.nationalId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contacts */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 font-mono text-slate-700" dir="ltr">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.phone}</span>
                          </div>
                          {t.address && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]" title={t.address}>
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{t.address}</span>
                            </div>
                          )}
                        </td>

                        {/* Occupied Units */}
                        <td className="px-4 py-3.5">
                          {t.currentUnits && t.currentUnits.length > 0 ? (
                            <div className="space-y-1">
                              {t.currentUnits.map((u, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs">
                                  <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="font-bold text-slate-800">وحدة {u.unitNumber}</span>
                                  <span className="text-slate-400 text-[11px]">({u.propertyName})</span>
                                  <span className="font-mono text-emerald-700 font-semibold text-[11px]">
                                    {u.rentAmount.toLocaleString()} ر.ي
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              لا توجد وحدات مؤجرة حالياً
                            </span>
                          )}
                        </td>

                        {/* Balances */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                              hasDebt ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {(t.currentBalance || 0).toLocaleString()} ريال
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1 flex gap-2">
                            <span>إيجار: {(t.rentBalance || 0).toLocaleString()}</span>
                            <span>ماء: {(t.waterBalance || 0).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            t.status === 'INACTIVE' ? 'bg-slate-100 text-slate-600' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {t.status === 'ACTIVE' ? 'نشط' : t.status === 'INACTIVE' ? 'متوقف' : 'نزاع قضائي'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setWorkspaceTenantId(t.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                              title="فتح الملف الشامل للمستأجر"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>الملف</span>
                            </button>

                            {onOpenQuickCollection && hasDebt && (
                              <button
                                onClick={() => onOpenQuickCollection(t)}
                                className="px-2 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 cursor-pointer transition-colors flex items-center gap-0.5"
                                title="تحصيل دفعة مالية فورية"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>تحصيل</span>
                              </button>
                            )}

                            {onOpenStatement && (
                              <button
                                onClick={() => onOpenStatement(t)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                title="كشف الحساب"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setTenantToEdit(t);
                                setIsTenantFormOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              title="تعديل بيانات المستأجر"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteTenant(t)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="حذف المستأجر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">لا توجد سجلات مستأجرين مطابقة للبحث</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">يمكنك تغيير معايير البحث أو إضافة مستأجر جديد.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Main Content Area: Owners View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative grow max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={ownerSearchQuery}
                onChange={(e) => setOwnerSearchQuery(e.target.value)}
                placeholder="البحث باسم المالك، الكود (OWN-)، أو رقم الهاتف..."
                className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <button
              onClick={fetchOwners}
              className="p-2 text-slate-500 hover:text-purple-700 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
              title="تحديث البيانات من MySQL"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOwners ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Owners Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="px-4 py-3.5">كود المالك</th>
                  <th className="px-4 py-3.5">اسم المالك الكامل</th>
                  <th className="px-4 py-3.5">رقم الهاتف والتواصل</th>
                  <th className="px-4 py-3.5">العقارات والمجمعات المملوكة</th>
                  <th className="px-4 py-3.5">إجمالي الوحدات</th>
                  <th className="px-4 py-3.5">العائد الشهري المتوقع</th>
                  <th className="px-4 py-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingOwners ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs">جاري جلب سجلات الملاك من MySQL...</p>
                    </td>
                  </tr>
                ) : ownersError ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-rose-600 font-bold">
                      {ownersError}
                    </td>
                  </tr>
                ) : owners.length > 0 ? (
                  owners.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-purple-700">
                        {o.ownerCode}
                      </td>
                      <td className="px-4 py-3.5">
                        <span 
                          onClick={() => setDetailsOwnerId(o.id)}
                          className="font-bold text-slate-900 hover:text-purple-700 cursor-pointer text-sm"
                        >
                          {o.name}
                        </span>
                        {o.nationalId && (
                          <div className="text-[11px] text-slate-400 font-mono">هوية: {o.nationalId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700" dir="ltr">
                        {o.phone}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {o.propertiesCount || 0} عقارات
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {o.unitsCount || 0} مساحة تأجيرية
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                        {(o.monthlyExpectedRent || 0).toLocaleString()} ريال
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailsOwnerId(o.id)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>المحفظة</span>
                          </button>
                          <button
                            onClick={() => {
                              setOwnerToEdit(o);
                              setIsOwnerFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOwner(o)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">لا يوجد ملاك مسجلين</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tenant Form Modal (Add / Edit) */}
      <TenantFormModal 
        isOpen={isTenantFormOpen}
        onClose={() => {
          setIsTenantFormOpen(false);
          setTenantToEdit(null);
        }}
        tenantToEdit={tenantToEdit}
        onSuccess={(saved, isEdit) => {
          setSuccessMessage(isEdit ? `تم تعديل بيانات المستأجر (${saved.name}) بنجاح` : `تم تسجيل المستأجر (${saved.name}) في قاعدة البيانات`);
          setTimeout(() => setSuccessMessage(null), 4000);
          fetchTenants();
          if (onRefreshGlobalStats) onRefreshGlobalStats();
        }}
      />

      {/* Tenant Full Workspace Modal */}
      <TenantWorkspaceModal 
        isOpen={Boolean(workspaceTenantId)}
        tenantId={workspaceTenantId}
        onClose={() => setWorkspaceTenantId(null)}
        onRefreshList={fetchTenants}
        onNavigateToUnit={onNavigateToUnit}
        onOpenPayment={onOpenQuickCollection}
      />

      {/* Owner Form Modal (Add / Edit) */}
      <OwnerFormModal 
        isOpen={isOwnerFormOpen}
        onClose={() => {
          setIsOwnerFormOpen(false);
          setOwnerToEdit(null);
        }}
        ownerToEdit={ownerToEdit}
        onSuccess={() => {
          setSuccessMessage('تم حفظ بيانات المالك بنجاح');
          setTimeout(() => setSuccessMessage(null), 4000);
          fetchOwners();
        }}
      />

      {/* Owner Details Modal */}
      <OwnerDetailsModal 
        isOpen={Boolean(detailsOwnerId)}
        ownerId={detailsOwnerId}
        onClose={() => setDetailsOwnerId(null)}
        onNavigateToProperty={onNavigateToProperty}
      />

    </div>
  );
};
