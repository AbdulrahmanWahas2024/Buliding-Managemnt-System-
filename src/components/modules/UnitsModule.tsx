import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Layers, 
  DoorOpen, 
  Zap, 
  Droplets, 
  User, 
  FileText, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { Unit, UnitType, UnitStatus, Property, Building as BuildingType } from '../../types/erp';
import { ERP_API } from '../../services/api';

interface UnitsModuleProps {
  initialPropertyFilter?: string;
  onViewTenantStatement?: (tenantId: string) => void;
  onRefreshGlobalStats?: () => void;
}

export const UnitsModule: React.FC<UnitsModuleProps> = ({
  initialPropertyFilter,
  onViewTenantStatement,
  onRefreshGlobalStats
}) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyFilter || 'ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Selected Unit
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [newStatus, setNewStatus] = useState<string>('VACANT');

  // Form State for Add / Edit
  const [unitForm, setUnitForm] = useState({
    propertyId: '',
    buildingId: '',
    floorNumber: 0,
    floorName: 'الطابق الأرضي',
    unitNumber: '',
    unitCode: '',
    type: 'APARTMENT' as UnitType,
    areaSqm: 0,
    pricePerCycle: 0,
    status: 'VACANT' as UnitStatus,
    electricityMeterNumber: '',
    waterMeterOrShare: 'حصة متساوية من الوايتات',
    ownerName: '',
    description: '',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load properties and buildings for dropdowns
  const loadMetadata = async () => {
    try {
      const [props, blds] = await Promise.all([
        ERP_API.getProperties(),
        ERP_API.getBuildings()
      ]);
      setProperties(props);
      setBuildings(blds);
    } catch (err: any) {
      console.error('Error loading metadata:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ERP_API.getUnits({
        propertyId: selectedPropertyId,
        buildingId: selectedBuildingId,
        status: selectedStatus,
        type: selectedType,
        search: searchQuery
      });
      setUnits(data);
    } catch (err: any) {
      console.error('Error fetching units:', err);
      setError(err.message || 'فشل جلب قائمة المساحات التأجيرية من MySQL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [searchQuery, selectedPropertyId, selectedBuildingId, selectedStatus, selectedType]);

  // Filtered buildings for the form based on selected property in form
  const formBuildings = buildings.filter(b => !unitForm.propertyId || b.propertyId === unitForm.propertyId);

  const handleOpenAddModal = () => {
    const firstProp = properties[0];
    const defaultPropId = selectedPropertyId !== 'ALL' ? selectedPropertyId : (firstProp ? firstProp.id : '');
    const defaultProp = properties.find(p => p.id === defaultPropId);
    const relatedBld = buildings.find(b => b.propertyId === defaultPropId);

    setUnitForm({
      propertyId: defaultPropId,
      buildingId: relatedBld ? relatedBld.id : '',
      floorNumber: 0,
      floorName: 'الطابق الأرضي',
      unitNumber: '',
      unitCode: '',
      type: defaultProp?.type === 'MARKET_COMPLEX' ? 'MARKET_STALL' : 'APARTMENT',
      areaSqm: 40,
      pricePerCycle: 50000,
      status: 'VACANT',
      electricityMeterNumber: '',
      waterMeterOrShare: 'حصة متساوية من الوايتات',
      ownerName: defaultProp ? defaultProp.ownerName : '',
      description: '',
      notes: ''
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitForm({
      propertyId: unit.propertyId,
      buildingId: unit.buildingId || '',
      floorNumber: typeof unit.floorNumber === 'number' ? unit.floorNumber : parseInt(String(unit.floorNumber)) || 0,
      floorName: unit.floorName || (unit.floorNumber === 0 ? 'الطابق الأرضي' : `الطابق ${unit.floorNumber}`),
      unitNumber: unit.unitNumber,
      unitCode: unit.unitCode || unit.unitNumber,
      type: unit.type,
      areaSqm: unit.areaSqm || 0,
      pricePerCycle: unit.pricePerCycle || 0,
      status: unit.status,
      electricityMeterNumber: unit.electricityMeterNumber || '',
      waterMeterOrShare: unit.waterMeterOrShare || 'حصة متساوية من الوايتات',
      ownerName: unit.ownerName || '',
      description: unit.description || '',
      notes: unit.notes || ''
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenStatusModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setNewStatus(unit.status);
    setFormError(null);
    setIsStatusModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (isEditModalOpen && selectedUnit) {
        await ERP_API.updateUnit(selectedUnit.id, unitForm);
        setSuccessMessage(`تم تحديث بيانات الوحدة (${unitForm.unitNumber}) بنجاح`);
        setIsEditModalOpen(false);
      } else {
        await ERP_API.createUnit(unitForm);
        setSuccessMessage(`تم إضافة المساحة التأجيرية (${unitForm.unitNumber}) بنجاح`);
        setIsAddModalOpen(false);
      }
      await fetchUnits();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ بيانات الوحدة');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      await ERP_API.updateUnitStatus(selectedUnit.id, newStatus);
      setSuccessMessage(`تم تغيير حالة الوحدة (${selectedUnit.unitNumber}) إلى ${
        newStatus === 'VACANT' ? 'شاغرة' :
        newStatus === 'RESERVED' ? 'محجوزة' :
        newStatus === 'MAINTENANCE' ? 'تحت الصيانة' : 'معطلة'
      }`);
      setIsStatusModalOpen(false);
      await fetchUnits();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      setFormError(err.message || 'فشل تحديث حالة الوحدة');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unit: Unit) => {
    if (!window.confirm(`هل أنت متأكد من حذف الوحدة (${unit.unitNumber})؟\nلا يمكن التراجع عن هذه العملية.`)) {
      return;
    }

    try {
      await ERP_API.deleteUnit(unit.id);
      setSuccessMessage(`تم حذف الوحدة (${unit.unitNumber}) بنجاح`);
      await fetchUnits();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      alert(`تعذر حذف الوحدة: ${err.message}`);
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'APARTMENT': return 'شقة سكنية';
      case 'SHOP': return 'محل تجاري';
      case 'OFFICE': return 'مكتب إداري';
      case 'STALL':
      case 'MARKET_STALL': return 'بسطة سوق شعبي';
      case 'WAREHOUSE': return 'مستودع / مخزن';
      case 'KIOSK': return 'كشك تجاري';
      case 'TEMPORARY': return 'مساحة مؤقتة';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px]">مؤجرة</span>;
      case 'VACANT':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">شاغرة (متاحة)</span>;
      case 'RESERVED':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold text-[10px]">محجوزة</span>;
      case 'MAINTENANCE':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-bold text-[10px]">صيانة</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{status}</span>;
    }
  };

  // KPIs
  const totalUnits = units.length;
  const vacantUnits = units.filter(u => u.status === 'VACANT').length;
  const occupiedUnits = units.filter(u => u.status === 'OCCUPIED').length;
  const maintenanceUnits = units.filter(u => u.status === 'MAINTENANCE' || u.status === 'RESERVED').length;
  const totalOccupiedRent = units.filter(u => u.status === 'OCCUPIED').reduce((acc, u) => acc + (u.contractRentAmount || u.pricePerCycle || 0), 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">إدارة الوحدات والمحلات والمساحات التأجيرية</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                شقق، محلات، مكاتب، بسطات أسواق، مخازن، مع متابعة العدادات وحالة الإشغال الفعلي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchUnits}
              disabled={loading}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث السجلات</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مساحة / محل جديد</span>
            </button>
          </div>
        </div>

        {/* Global KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 border border-slate-100 p-3.5 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">إجمالي المساحات المسجلة</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalUnits} <span className="text-xs font-normal text-slate-500">مساحة</span></div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-xl">
            <div className="text-xs text-emerald-700 font-medium">المساحات الشاغرة (المتاحة)</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">{vacantUnits} <span className="text-xs font-normal text-emerald-600">جاهزة للتأجير</span></div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 p-3.5 rounded-xl">
            <div className="text-xs text-blue-700 font-medium">المساحات المؤجرة (المشغولة)</div>
            <div className="text-xl font-bold text-blue-800 mt-1">{occupiedUnits} <span className="text-xs font-normal text-blue-600">({occupancyRate}%)</span></div>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-xl">
            <div className="text-xs text-amber-700 font-medium">تحت الصيانة / محجوزة</div>
            <div className="text-xl font-bold text-amber-800 mt-1">{maintenanceUnits} <span className="text-xs font-normal text-amber-600">مساحة</span></div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 p-3.5 rounded-xl col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-500 font-medium">إجمالي الإيجارات الفعلية</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {totalOccupiedRent.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-500">ريال/شهر</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الوحدة، رقم العداد، اسم المستأجر، أو العقار..."
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Property Filter */}
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">جميع العقارات</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>

          {/* Unit Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">جميع الأنواع</option>
            <option value="APARTMENT">شقق سكنية</option>
            <option value="SHOP">محلات تجارية</option>
            <option value="OFFICE">مكاتب إدارية</option>
            <option value="STALL">بسطات أسواق</option>
            <option value="WAREHOUSE">مخازن ومستودعات</option>
            <option value="KIOSK">أكشاك</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="VACANT">شاغرة فقط (متاحة)</option>
            <option value="OCCUPIED">مؤجرة فقط</option>
            <option value="RESERVED">محجوزة</option>
            <option value="MAINTENANCE">تحت الصيانة</option>
          </select>
        </div>
      </div>

      {/* Units Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3.5 px-4">رقم ورمز الوحدة</th>
                <th className="py-3.5 px-4">العقار والمبنى</th>
                <th className="py-3.5 px-4">الطابق والمساحة</th>
                <th className="py-3.5 px-4">النوع والاستخدام</th>
                <th className="py-3.5 px-4">الإيجار الشهري</th>
                <th className="py-3.5 px-4">الكهرباء والمياه</th>
                <th className="py-3.5 px-4">المستأجر الحالي والعقد</th>
                <th className="py-3.5 px-4 text-center">الحالة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>جاري تحميل بيانات الوحدات من MySQL...</span>
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Store className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">لا توجد وحدات مطابقة لمعايير البحث</p>
                    <p className="text-xs text-slate-400 mt-1">انقر على "إضافة مساحة / محل جديد" لتسجيل وحدة جديدة</p>
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Unit Number & Code */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm font-mono flex items-center gap-1.5">
                        <DoorOpen className="w-4 h-4 text-slate-400" />
                        <span>{unit.unitNumber}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {unit.unitCode || `${unit.propertyCode || 'PROP'}-${unit.unitNumber}`}
                      </div>
                    </td>

                    {/* Property & Building */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{unit.propertyName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 mr-4.5">
                        {unit.buildingName || 'المبنى الرئيسي'}
                      </div>
                    </td>

                    {/* Floor & Area */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">
                        {unit.floorName || (unit.floorNumber === 0 ? 'الطابق الأرضي' : `الطابق ${unit.floorNumber}`)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {unit.areaSqm} م²
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">
                        {getTypeName(unit.type)}
                      </span>
                    </td>

                    {/* Rent */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {Number(unit.pricePerCycle || 0).toLocaleString('en-US')}
                      <span className="text-[11px] font-sans font-normal text-slate-500 mr-1">ريال</span>
                    </td>

                    {/* Meters */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-[11px] text-slate-700">
                        <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>عداد: {unit.electricityMeterNumber || 'مشترك/غير محدد'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                        <Droplets className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>{unit.waterMeterOrShare || 'حصة وايتات'}</span>
                      </div>
                    </td>

                    {/* Current Tenant & Contract */}
                    <td className="py-3.5 px-4">
                      {unit.currentTenantName ? (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{unit.currentTenantName}</span>
                          </div>
                          {unit.contractNumber && (
                            <div className="text-[11px] text-emerald-700 font-mono flex items-center gap-1 mt-0.5">
                              <FileText className="w-3 h-3" />
                              <span>عقد: {unit.contractNumber}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">شاغرة حالياً</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenStatusModal(unit)}
                        className="cursor-pointer transition-transform hover:scale-105"
                        title="انقر لتغيير حالة الوحدة"
                      >
                        {getStatusBadge(unit.status)}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUnit(unit);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="تفاصيل الوحدة والمستأجر"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(unit)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل بيانات الوحدة"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteUnit(unit)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الوحدة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Unit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isEditModalOpen ? 'تعديل بيانات المساحة التأجيرية' : 'إضافة وحدة / محل / مساحة جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">سيتم حفظ السجل في جدول units في MySQL</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Property Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    العقار التابع له <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={unitForm.propertyId}
                    onChange={(e) => {
                      const propId = e.target.value;
                      const relatedBld = buildings.find(b => b.propertyId === propId);
                      setUnitForm({
                        ...unitForm,
                        propertyId: propId,
                        buildingId: relatedBld ? relatedBld.id : ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">اختر العقار...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                {/* Building Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبنى / الجناح
                  </label>
                  <select
                    value={unitForm.buildingId}
                    onChange={(e) => setUnitForm({ ...unitForm, buildingId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">المبنى الرئيسي (تلقائي)</option>
                    {formBuildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                {/* Unit Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم أو مسمى الوحدة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.unitNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                    placeholder="مثال: 101 أو محل رقم 5 أو بسطة 12"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Unit Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز الوحدة التعريفي (اختياري)
                  </label>
                  <input
                    type="text"
                    value={unitForm.unitCode}
                    onChange={(e) => setUnitForm({ ...unitForm, unitCode: e.target.value.toUpperCase() })}
                    placeholder="مثال: SAN-101"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Unit Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع المساحة التأجيرية <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={unitForm.type}
                    onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value as UnitType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="APARTMENT">شقة سكنية</option>
                    <option value="SHOP">محل تجاري</option>
                    <option value="OFFICE">مكتب إداري</option>
                    <option value="MARKET_STALL">بسطة سوق شعبي</option>
                    <option value="WAREHOUSE">مستودع / مخزن</option>
                    <option value="KIOSK">كشك تجاري</option>
                    <option value="TEMPORARY">مساحة مؤقتة / بسطة متنقلة</option>
                  </select>
                </div>

                {/* Floor Number & Name */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم الطابق
                    </label>
                    <input
                      type="number"
                      value={unitForm.floorNumber}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setUnitForm({ 
                          ...unitForm, 
                          floorNumber: val,
                          floorName: val === 0 ? 'الطابق الأرضي' : `الطابق ${val}`
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      مسمى الطابق
                    </label>
                    <input
                      type="text"
                      value={unitForm.floorName}
                      onChange={(e) => setUnitForm({ ...unitForm, floorName: e.target.value })}
                      placeholder="مثال: الميزانين"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Rent Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    القيمة الإيجارية الشهرية (ريال) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={unitForm.pricePerCycle || ''}
                    onChange={(e) => setUnitForm({ ...unitForm, pricePerCycle: parseFloat(e.target.value) || 0 })}
                    placeholder="مثال: 60000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                {/* Area Sqm */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المساحة (متر مربع)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={unitForm.areaSqm || ''}
                    onChange={(e) => setUnitForm({ ...unitForm, areaSqm: parseFloat(e.target.value) || 0 })}
                    placeholder="مثال: 55"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                {/* Electricity Meter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم عداد الكهرباء
                  </label>
                  <input
                    type="text"
                    value={unitForm.electricityMeterNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, electricityMeterNumber: e.target.value })}
                    placeholder="مثال: MTR-99420"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                {/* Water Configuration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    آلية توزيع المياه
                  </label>
                  <select
                    value={unitForm.waterMeterOrShare}
                    onChange={(e) => setUnitForm({ ...unitForm, waterMeterOrShare: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    <option value="حصة متساوية من الوايتات">حصة متساوية من الوايتات التشغيلية</option>
                    <option value="عداد مياه مستقل">عداد مياه مستقل بالمتر المكعب</option>
                    <option value="مشمول ضمن عقد الإيجار مجاناً">مشمول ضمن الإيجار مجاناً</option>
                    <option value="لا توجد خدمة مياه">لا توجد خدمة مياه</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات حول الوحدة أو التشطيب
                  </label>
                  <textarea
                    rows={2}
                    value={unitForm.notes}
                    onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })}
                    placeholder="مثال: واجهة زجاجية، مجهزة بمدخل مستقل، عداد تجاري..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ في MySQL...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isEditModalOpen ? 'حفظ التعديلات' : 'تسجيل المساحة التأجيرية'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {isStatusModalOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-900 text-xs">تغيير حالة الوحدة ({selectedUnit.unitNumber})</h4>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">اختر الحالة التشغيلية الجديدة:</label>
                <div className="space-y-2">
                  {[
                    { id: 'VACANT', label: 'شاغرة (متاحة للتأجير الفوري)', desc: 'الوحدة خالية وجاهزة لاستقبال مستأجر جديد' },
                    { id: 'MAINTENANCE', label: 'تحت الصيانة والترميم', desc: 'يتم إجراء أعمال صيانة أو طلاء حالياً' },
                    { id: 'RESERVED', label: 'محجوزة مؤقتاً', desc: 'تم دفع عربون حجز ولم يحرر العقد بعد' },
                    { id: 'INACTIVE', label: 'معطلة / خارج الخدمة', desc: 'لا يتم تأجيرها حالياً لأسباب إدارية' }
                  ].map((st) => (
                    <label 
                      key={st.id} 
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        newStatus === st.id 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="unitStatus"
                        value={st.id}
                        checked={newStatus === st.id}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{st.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{st.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedUnit.currentContractId && selectedUnit.status === 'OCCUPIED' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>تنبيه مالي وقانوني:</strong> هذه الوحدة مشغولة حالياً بموجب عقد ساري. لتحويلها إلى شاغرة، يجب إنهاء أو فسخ العقد من شاشة العقود.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-60"
                >
                  {formSubmitting ? 'جاري التحديث...' : 'تحديث الحالة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Details Modal */}
      {isDetailsModalOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    الوحدة {selectedUnit.unitNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUnit.propertyName} • {selectedUnit.buildingName || 'المبنى الرئيسي'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">نوع المساحة</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{getTypeName(selectedUnit.type)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">المساحة الإجمالية</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedUnit.areaSqm} متر مربع</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">الإيجار المعتمد</span>
                  <div className="font-bold text-slate-900 text-sm font-mono mt-0.5">
                    {Number(selectedUnit.pricePerCycle || 0).toLocaleString('en-US')} ريال
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">الحالة الراهنة</span>
                  <div className="mt-1">{getStatusBadge(selectedUnit.status)}</div>
                </div>
              </div>

              {/* Utility Meters */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <h5 className="font-bold text-slate-800">خدمات الكهرباء والمياه:</h5>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> عداد الكهرباء:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedUnit.electricityMeterNumber || 'غير محدد'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-500" /> نظام المياه:</span>
                  <span className="font-medium text-slate-800">{selectedUnit.waterMeterOrShare || 'حصة وايتات'}</span>
                </div>
              </div>

              {/* Current Lease Info */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <h5 className="font-bold text-slate-800">عقد الإيجار الحالي:</h5>
                {selectedUnit.currentTenantName ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">المستأجر:</span>
                      <span className="font-bold text-slate-800">{selectedUnit.currentTenantName}</span>
                    </div>
                    {selectedUnit.contractNumber && (
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-500">رقم العقد:</span>
                        <span className="font-bold text-emerald-700">{selectedUnit.contractNumber}</span>
                      </div>
                    )}
                    {selectedUnit.contractStartDate && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500">سريان العقد:</span>
                        <span>{selectedUnit.contractStartDate} إلى {selectedUnit.contractEndDate}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">لا يوجد عقد إيجار فعال، المساحة شاغرة وجاهزة للتعاقد.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
