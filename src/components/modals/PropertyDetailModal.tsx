import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Phone, 
  User, 
  Store, 
  Layers, 
  Zap, 
  Droplets,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Property, Unit } from '../../types/erp';

interface PropertyDetailModalProps {
  property: Property | null;
  units: Unit[];
  onClose: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  units,
  onClose,
}) => {
  if (!property) return null;

  const propertyUnits = units.filter(u => u.propertyId === property.id);
  const formatMoney = (val: number) => new Intl.NumberFormat('ar-YE').format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">{property.name}</h3>
                <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  {property.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{property.city} - {property.district} - {property.street}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Property Metadata Cards */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">المالك:</span>
            <span className="font-bold text-slate-800">{property.ownerName}</span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5" dir="ltr">{property.ownerPhone}</span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">الوحدات:</span>
            <span className="font-bold text-slate-800">{property.totalUnits} وحدة</span>
            <span className="text-[11px] text-emerald-600 block mt-0.5">{property.occupiedUnits} مؤجرة ({Math.round((property.occupiedUnits/property.totalUnits)*100)}%)</span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">الإيجار الشهري المتوقع:</span>
            <span className="font-bold text-slate-900 font-mono">{formatMoney(property.monthlyExpectedRent)} ريال</span>
            <span className="text-[10px] text-slate-500 block">دورة سداد شهرية</span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">المتأخرات الحالية:</span>
            {property.totalOutstandingRent > 0 ? (
              <span className="font-bold text-rose-700 font-mono">{formatMoney(property.totalOutstandingRent)} ريال</span>
            ) : (
              <span className="font-bold text-emerald-600">لا توجد متأخرات</span>
            )}
            <span className="text-[10px] text-slate-500 block mt-0.5">محدث لحظياً</span>
          </div>
        </div>

        {/* Units Table */}
        <div className="p-5 overflow-y-auto flex-1 text-right text-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>قائمة الوحدات والمحلات التابعة للعقار:</span>
            </h4>
            <span className="text-xs text-slate-500">
              {propertyUnits.length} وحدة مسجلة في النظام
            </span>
          </div>

          <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-right">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5">رقم الوحدة</th>
                <th className="p-2.5">النوع والمساحة</th>
                <th className="p-2.5">المستأجر الحالي</th>
                <th className="p-2.5">عداد الكهرباء والمياه</th>
                <th className="p-2.5 text-left">قيمة الإيجار</th>
                <th className="p-2.5 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {propertyUnits.length > 0 ? (
                propertyUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900 font-mono">
                      {unit.unitNumber}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {unit.buildingName} - الدور {unit.floorNumber}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="font-medium text-slate-800">
                        {unit.type === 'APARTMENT' && 'شقة سكنية'}
                        {unit.type === 'SHOP' && 'محل تجاري'}
                        {unit.type === 'OFFICE' && 'مكتب إداري'}
                        {unit.type === 'STALL' && 'بسطة سوق'}
                        {unit.type === 'WAREHOUSE' && 'مستودع'}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{unit.areaSqm} متر مربع</span>
                    </td>

                    <td className="p-2.5">
                      {unit.currentTenantName ? (
                        <span className="font-semibold text-slate-800 block">{unit.currentTenantName}</span>
                      ) : (
                        <span className="text-slate-400 italic">شاغرة ومتاحة للإيجار</span>
                      )}
                    </td>

                    <td className="p-2.5 text-slate-600">
                      {unit.electricityMeterNumber && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{unit.electricityMeterNumber}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-0.5">{unit.waterMeterOrShare}</span>
                    </td>

                    <td className="p-2.5 font-mono font-bold text-slate-900 text-left">
                      {formatMoney(unit.pricePerCycle)} ريال
                    </td>

                    <td className="p-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        unit.status === 'OCCUPIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {unit.status === 'OCCUPIED' ? 'مؤجرة' : 'شاغرة'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400">
                    لا توجد تفاصيل وحدات إضافية لهذا العقار حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
