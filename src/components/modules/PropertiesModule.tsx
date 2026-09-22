import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  User, 
  Phone, 
  Layers, 
  DoorOpen, 
  Home, 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Building,
  Check,
  ChevronRight,
  Info,
  DollarSign
} from 'lucide-react';
import { Property, PropertyType, Building as BuildingType, Unit } from '../../types/erp';
import { ERP_API } from '../../services/api';

interface PropertiesModuleProps {
  onNavigateToUnits?: (propertyId: string) => void;
  onRefreshGlobalStats?: () => void;
}

export const PropertiesModule: React.FC<PropertiesModuleProps> = ({ 
  onNavigateToUnits,
  onRefreshGlobalStats 
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddBuildingModalOpen, setIsAddBuildingModalOpen] = useState(false);

  // Selected property for edit/details
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<{
    property: Property;
    buildings: BuildingType[];
    units: Unit[];
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form State for Property (Add / Edit)
  const [propForm, setPropForm] = useState({
    code: '',
    name: '',
    type: 'RESIDENTIAL' as PropertyType,
    ownershipType: 'SOLE',
    city: 'صنعاء',
    district: '',
    street: '',
    ownerName: '',
    ownerPhone: '',
    totalAreaSqm: 0,
    status: 'ACTIVE',
    description: '',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State for Building
  const [bldForm, setBldForm] = useState({
    name: '',
    code: '',
    totalFloors: 1,
    status: 'ACTIVE',
    description: '',
    notes: ''
  });

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ERP_API.getProperties(searchQuery, selectedType, selectedStatus);
      setProperties(data);
    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError(err.message || 'فشل جلب قائمة العقارات من قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [searchQuery, selectedType, selectedStatus]);

  const handleOpenAddModal = () => {
    setPropForm({
      code: `PROP-${Date.now().toString().slice(-4)}`,
      name: '',
      type: 'RESIDENTIAL',
      ownershipType: 'SOLE',
      city: 'صنعاء',
      district: '',
      street: '',
      ownerName: '',
      ownerPhone: '',
      totalAreaSqm: 0,
      status: 'ACTIVE',
      description: '',
      notes: ''
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (prop: Property) => {
    setSelectedProperty(prop);
    setPropForm({
      code: prop.code,
      name: prop.name,
      type: prop.type,
      ownershipType: prop.ownershipType || 'SOLE',
      city: prop.city,
      district: prop.district,
      street: prop.street,
      ownerName: prop.ownerName,
      ownerPhone: prop.ownerPhone || '',
      totalAreaSqm: prop.totalAreaSqm || 0,
      status: prop.status || 'ACTIVE',
      description: prop.description || '',
      notes: prop.notes || ''
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = async (prop: Property) => {
    setSelectedProperty(prop);
    setIsDetailsModalOpen(true);
    try {
      setDetailsLoading(true);
      const data = await ERP_API.getPropertyById(prop.id);
      setPropertyDetails(data);
    } catch (err: any) {
      console.error('Error fetching property details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (isEditModalOpen && selectedProperty) {
        await ERP_API.updateProperty(selectedProperty.id, propForm);
        setSuccessMessage(`تم تحديث بيانات العقار (${propForm.name}) بنجاح`);
        setIsEditModalOpen(false);
      } else {
        await ERP_API.createProperty(propForm);
        setSuccessMessage(`تم إضافة العقار الجديد (${propForm.name}) بنجاح إلى قاعدة البيانات`);
        setIsAddModalOpen(false);
      }
      await fetchProperties();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ بيانات العقار');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (prop: Property) => {
    const nextStatus = prop.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ERP_API.updatePropertyStatus(prop.id, nextStatus);
      setSuccessMessage(`تم تغيير حالة العقار (${prop.name}) إلى ${nextStatus === 'ACTIVE' ? 'نشط' : 'معطل'}`);
      await fetchProperties();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      alert(`فشل تغيير حالة العقار: ${err.message}`);
    }
  };

  const handleDeleteProperty = async (prop: Property) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف العقار (${prop.name})؟\nلا يمكن التراجع عن هذه العملية.`)) {
      return;
    }

    try {
      await ERP_API.deleteProperty(prop.id);
      setSuccessMessage(`تم حذف العقار (${prop.name}) بنجاح`);
      await fetchProperties();
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err: any) {
      alert(`تعذر حذف العقار: ${err.message}`);
    }
  };

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    try {
      setFormSubmitting(true);
      await ERP_API.createBuilding({
        propertyId: selectedProperty.id,
        name: bldForm.name,
        code: bldForm.code || undefined,
        totalFloors: bldForm.totalFloors,
        status: bldForm.status,
        description: bldForm.description,
        notes: bldForm.notes
      });
      setIsAddBuildingModalOpen(false);
      setSuccessMessage(`تم إضافة المبنى (${bldForm.name}) بنجاح`);
      // Refresh details
      const updated = await ERP_API.getPropertyById(selectedProperty.id);
      setPropertyDetails(updated);
      await fetchProperties();
    } catch (err: any) {
      alert(`فشل إضافة المبنى: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteBuilding = async (buildingId: string, bldName: string) => {
    if (!window.confirm(`هل تريد حذف المبنى (${bldName})؟`)) return;
    try {
      await ERP_API.deleteBuilding(buildingId);
      if (selectedProperty) {
        const updated = await ERP_API.getPropertyById(selectedProperty.id);
        setPropertyDetails(updated);
      }
      await fetchProperties();
      setSuccessMessage(`تم حذف المبنى بنجاح`);
    } catch (err: any) {
      alert(`فشل حذف المبنى: ${err.message}`);
    }
  };

  // Aggregated Stats
  const totalProps = properties.length;
  const totalUnits = properties.reduce((acc, p) => acc + (p.totalUnits || 0), 0);
  const totalOccupied = properties.reduce((acc, p) => acc + (p.occupiedUnits || 0), 0);
  const totalVacant = properties.reduce((acc, p) => acc + (p.vacantUnits || 0), 0);
  const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
  const totalMonthlyRent = properties.reduce((acc, p) => acc + (p.monthlyExpectedRent || 0), 0);

  const getTypeName = (type: string) => {
    switch (type) {
      case 'RESIDENTIAL': return 'سكني';
      case 'COMMERCIAL': return 'تجاري';
      case 'MIXED': return 'مختلط (تجاري/سكني)';
      case 'MARKET_COMPLEX': return 'مجمع أسواق';
      case 'TOWER': return 'برج استثماري';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">إدارة العقارات والمباني والأصول</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  السجل المركزي للعقارات، المباني، الطوابق، نسب الإشغال ومتابعة الإيرادات التأجيرية
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProperties}
              disabled={loading}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              title="تحديث البيانات من MySQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث السجلات</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عقار جديد</span>
            </button>
          </div>
        </div>

        {/* Global KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 border border-slate-100 p-3.5 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">إجمالي العقارات المسجلة</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalProps} <span className="text-xs font-normal text-slate-500">عقار</span></div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 p-3.5 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">إجمالي الوحدات والمحلات</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalUnits} <span className="text-xs font-normal text-slate-500">مساحة تأجيرية</span></div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl">
            <div className="text-xs text-emerald-700 font-medium">الوحدات المؤجرة (المشغولة)</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">{totalOccupied} <span className="text-xs font-normal text-emerald-600">({occupancyRate}%)</span></div>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 p-3.5 rounded-xl">
            <div className="text-xs text-amber-700 font-medium">الوحدات الشاغرة (المتاحة)</div>
            <div className="text-xl font-bold text-amber-800 mt-1">{totalVacant} <span className="text-xs font-normal text-amber-600">شاغرة</span></div>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 p-3.5 rounded-xl col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-500 font-medium">الإيجار الشهري المتوقع</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {totalMonthlyRent.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-500">ريال</span>
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

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الرمز، المدينة، الحي، أو اسم المالك..."
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
          <div className="flex items-center gap-1.5 text-xs text-slate-500 border-l border-slate-200 pl-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>تصفية:</span>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">جميع الأنواع</option>
            <option value="RESIDENTIAL">سكني</option>
            <option value="COMMERCIAL">تجاري</option>
            <option value="MIXED">مختلط</option>
            <option value="MARKET_COMPLEX">مجمع أسواق</option>
            <option value="TOWER">برج استثماري</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="INACTIVE">معطل / غير نشط</option>
          </select>
        </div>
      </div>

      {/* Properties Data Table / Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3.5 px-4">رمز واسم العقار</th>
                <th className="py-3.5 px-4">نوع العقار والملكية</th>
                <th className="py-3.5 px-4">الموقع الجغرافي</th>
                <th className="py-3.5 px-4">بيانات المالك</th>
                <th className="py-3.5 px-4 text-center">المباني والوحدات</th>
                <th className="py-3.5 px-4 text-center">نسبة الإشغال</th>
                <th className="py-3.5 px-4">الإيجار الشهري المتوقع</th>
                <th className="py-3.5 px-4 text-center">الحالة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>جاري تحميل بيانات العقارات من MySQL...</span>
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">لا توجد عقارات مطابقة لمعايير البحث</p>
                    <p className="text-xs text-slate-400 mt-1">يمكنك إضافة عقار جديد بالنقر على زر "إضافة عقار جديد"</p>
                  </td>
                </tr>
              ) : (
                properties.map((prop) => {
                  const occupied = prop.occupiedUnits || 0;
                  const total = prop.totalUnits || 0;
                  const occPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;
                  const isActive = prop.status === 'ACTIVE';

                  return (
                    <tr key={prop.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{prop.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 inline-block px-1.5 py-0.5 rounded-md mt-1 border border-emerald-100">
                          {prop.code}
                        </div>
                      </td>

                      {/* Type & Ownership */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{getTypeName(prop.type)}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {prop.ownershipType === 'SOLE' ? 'ملكية فردية' : 
                           prop.ownershipType === 'PARTNERSHIP' ? 'شراكة' : 
                           prop.ownershipType === 'WAQF' ? 'وقف خيري' : 'حكومي'}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{prop.city} - {prop.district}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mr-4 mt-0.5 truncate max-w-[150px]">
                          {prop.street}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{prop.ownerName}</span>
                        </div>
                        {prop.ownerPhone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span dir="ltr">{prop.ownerPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Buildings & Units */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800">
                          {total} <span className="font-normal text-slate-500 text-[11px]">وحدة</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {prop.totalBuildings || prop.buildingsCount || 1} مبنى
                        </div>
                      </td>

                      {/* Occupancy */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-bold ${occPercent >= 80 ? 'text-emerald-700' : occPercent >= 50 ? 'text-blue-700' : 'text-amber-700'}`}>
                            {occPercent}%
                          </span>
                          <span className="text-[11px] text-slate-400">({occupied}/{total})</span>
                        </div>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 mx-auto mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${occPercent >= 80 ? 'bg-emerald-500' : occPercent >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${occPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Expected Rent */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {Number(prop.monthlyExpectedRent || 0).toLocaleString('en-US')}
                        <span className="text-[11px] font-sans font-normal text-slate-500 mr-1">ريال</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(prop)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="انقر لتغيير حالة العقار"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{isActive ? 'نشط' : 'معطل'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(prop)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="عرض تفاصيل العقار والمباني التابعة"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(prop)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل بيانات العقار"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {onNavigateToUnits && (
                            <button
                              onClick={() => onNavigateToUnits(prop.id)}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="إدارة وحدات ومحلات هذا العقار"
                            >
                              <DoorOpen className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteProperty(prop)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف العقار"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Property Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isEditModalOpen ? 'تعديل بيانات العقار' : 'إضافة عقار جديد للنظام'}
                  </h3>
                  <p className="text-xs text-slate-500">سيتم حفظ البيانات مباشرة في قاعدة بيانات MySQL</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم العقار / المجمع <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={propForm.name}
                    onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                    placeholder="مثال: برج الوفاء التجاري"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز العقار الفريد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={propForm.code}
                    onChange={(e) => setPropForm({ ...propForm, code: e.target.value.toUpperCase() })}
                    placeholder="مثال: PROP-WAFA-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع الاستخدام <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={propForm.type}
                    onChange={(e) => setPropForm({ ...propForm, type: e.target.value as PropertyType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="RESIDENTIAL">سكني (عمارة شقق)</option>
                    <option value="COMMERCIAL">تجاري (مكاتب ومحلات)</option>
                    <option value="MIXED">مختلط (تجاري وسكني)</option>
                    <option value="MARKET_COMPLEX">مجمع أسواق / محلات وبسطات</option>
                    <option value="TOWER">برج استثماري متعدد الأغراض</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع الملكية <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={propForm.ownershipType}
                    onChange={(e) => setPropForm({ ...propForm, ownershipType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="SOLE">ملكية فردية</option>
                    <option value="PARTNERSHIP">شراكة متعددة</option>
                    <option value="WAQF">وقف خيري</option>
                    <option value="GOVERNMENT">حكومي / جهة عامة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المدينة / المحافظة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={propForm.city}
                    onChange={(e) => setPropForm({ ...propForm, city: e.target.value })}
                    placeholder="مثال: صنعاء"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحي / المنطقة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={propForm.district}
                    onChange={(e) => setPropForm({ ...propForm, district: e.target.value })}
                    placeholder="مثال: حدة"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الشارع / العنوان التفصيلي <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={propForm.street}
                    onChange={(e) => setPropForm({ ...propForm, street: e.target.value })}
                    placeholder="مثال: شارع الستين الجنوبي - بجوار بنك التضامن"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المالك / الوكيل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={propForm.ownerName}
                    onChange={(e) => setPropForm({ ...propForm, ownerName: e.target.value })}
                    placeholder="مثال: الشيخ عبدالله الحاشدي"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم هاتف المالك
                  </label>
                  <input
                    type="tel"
                    value={propForm.ownerPhone}
                    onChange={(e) => setPropForm({ ...propForm, ownerPhone: e.target.value })}
                    placeholder="مثال: 777123456"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المساحة الإجمالية (م²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={propForm.totalAreaSqm || ''}
                    onChange={(e) => setPropForm({ ...propForm, totalAreaSqm: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة العقار
                  </label>
                  <select
                    value={propForm.status}
                    onChange={(e) => setPropForm({ ...propForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="ACTIVE">نشط ويعمل</option>
                    <option value="INACTIVE">معطل / غير نشط</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوصف والملاحظات
                  </label>
                  <textarea
                    rows={2}
                    value={propForm.notes}
                    onChange={(e) => setPropForm({ ...propForm, notes: e.target.value })}
                    placeholder="أي ملاحظات حول العقار، الصك الشرعي، أو شروط الاستخدام..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ في MySQL...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isEditModalOpen ? 'حفظ التعديلات' : 'تسجيل العقار'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property Details Drawer / Modal */}
      {isDetailsModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{selectedProperty.name}</h3>
                    <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      {selectedProperty.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {getTypeName(selectedProperty.type)} • {selectedProperty.city} - {selectedProperty.district}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailsLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
                  <p>جاري جلب تفاصيل العقار والمباني والوحدات من قاعدة البيانات...</p>
                </div>
              ) : (
                <>
                  {/* Property Quick Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500">المالك المسجل</div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedProperty.ownerName}</div>
                      {selectedProperty.ownerPhone && (
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{selectedProperty.ownerPhone}</div>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500">المباني التابعة</div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {propertyDetails?.buildings?.length || 1} مبنى
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-xs text-emerald-700">نسبة الإشغال الكلية</div>
                      <div className="font-bold text-emerald-800 text-sm mt-0.5">
                        {propertyDetails?.property?.occupiedUnits || 0} من {propertyDetails?.property?.totalUnits || 0} وحدة
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500">الإيراد الشهري المتوقع</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {Number(propertyDetails?.property?.monthlyExpectedRent || 0).toLocaleString('en-US')} ريال
                      </div>
                    </div>
                  </div>

                  {/* Buildings Hierarchy Section */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 text-xs">المباني والأجنحة التابعة لهذا العقار</h4>
                      </div>
                      <button
                        onClick={() => {
                          setBldForm({
                            name: '',
                            code: `${selectedProperty.code}-B${(propertyDetails?.buildings.length || 0) + 1}`,
                            totalFloors: 1,
                            status: 'ACTIVE',
                            description: '',
                            notes: ''
                          });
                          setIsAddBuildingModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة مبنى</span>
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {propertyDetails?.buildings && propertyDetails.buildings.length > 0 ? (
                        propertyDetails.buildings.map((bld) => (
                          <div key={bld.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                                {bld.code || 'B'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-xs">{bld.name}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {bld.totalFloors} طوابق • {bld.description || 'مبنى مسجل'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-medium">
                                {bld.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                              </span>

                              <button
                                onClick={() => handleDeleteBuilding(bld.id, bld.name)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                title="حذف المبنى"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          لا توجد مباني فرعية، العقار مسجل كمبنى رئيسي واحد.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Units List under this Property */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 text-xs">الوحدات والمحلات التابعة</h4>
                        <span className="text-[11px] text-slate-500">({propertyDetails?.units?.length || 0} وحدة)</span>
                      </div>
                      {onNavigateToUnits && (
                        <button
                          onClick={() => {
                            setIsDetailsModalOpen(false);
                            onNavigateToUnits(selectedProperty.id);
                          }}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>عرض كامل في جدول الوحدات</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                            <th className="py-2.5 px-3">رقم الوحدة</th>
                            <th className="py-2.5 px-3">المبنى / الطابق</th>
                            <th className="py-2.5 px-3">النوع</th>
                            <th className="py-2.5 px-3">المستأجر الحالي</th>
                            <th className="py-2.5 px-3">الإيجار الشهري</th>
                            <th className="py-2.5 px-3 text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {propertyDetails?.units && propertyDetails.units.length > 0 ? (
                            propertyDetails.units.map((unit) => (
                              <tr key={unit.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-bold text-slate-800 font-mono">
                                  {unit.unitNumber}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {unit.buildingName} • {unit.floorName || `ط ${unit.floorNumber}`}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {unit.type === 'APARTMENT' ? 'شقة' :
                                   unit.type === 'SHOP' ? 'محل' :
                                   unit.type === 'OFFICE' ? 'مكتب' :
                                   unit.type === 'STALL' || unit.type === 'MARKET_STALL' ? 'بسطة سوق' :
                                   unit.type === 'WAREHOUSE' ? 'مستودع' : unit.type}
                                </td>
                                <td className="py-2.5 px-3">
                                  {unit.currentTenantName ? (
                                    <span className="font-semibold text-slate-800">{unit.currentTenantName}</span>
                                  ) : (
                                    <span className="text-slate-400 italic">بدون مستأجر</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                                  {Number(unit.pricePerCycle || 0).toLocaleString('en-US')} ريال
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    unit.status === 'OCCUPIED' ? 'bg-blue-100 text-blue-800' :
                                    unit.status === 'VACANT' ? 'bg-emerald-100 text-emerald-800' :
                                    unit.status === 'RESERVED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {unit.status === 'OCCUPIED' ? 'مؤجرة' :
                                     unit.status === 'VACANT' ? 'شاغرة' :
                                     unit.status === 'RESERVED' ? 'محجوزة' : 'صيانة'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400">
                                لا توجد وحدات مسجلة تحت هذا العقار حتى الآن
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                سجل العقار محفوظ ومحدث في قاعدة بيانات MySQL
              </span>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Building Modal */}
      {isAddBuildingModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-900 text-xs">إضافة مبنى أو جناح لعقار ({selectedProperty.name})</h4>
              <button onClick={() => setIsAddBuildingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBuilding} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المبنى <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={bldForm.name}
                  onChange={(e) => setBldForm({ ...bldForm, name: e.target.value })}
                  placeholder="مثال: المبنى الشرقي / الجناح أ"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رمز المبنى</label>
                <input
                  type="text"
                  value={bldForm.code}
                  onChange={(e) => setBldForm({ ...bldForm, code: e.target.value.toUpperCase() })}
                  placeholder="مثال: B1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عدد الطوابق</label>
                <input
                  type="number"
                  min="1"
                  value={bldForm.totalFloors}
                  onChange={(e) => setBldForm({ ...bldForm, totalFloors: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف المبنى</label>
                <input
                  type="text"
                  value={bldForm.description}
                  onChange={(e) => setBldForm({ ...bldForm, description: e.target.value })}
                  placeholder="ملاحظات حول المبنى أو المداخل..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBuildingModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  حفظ المبنى
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
