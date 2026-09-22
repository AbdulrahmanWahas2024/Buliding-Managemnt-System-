import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  User, 
  Phone, 
  Layers, 
  ChevronRight, 
  ArrowUpRight,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Property } from '../../types/erp';

interface PropertiesQuickViewProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onManageAll?: () => void;
}

export const PropertiesQuickView: React.FC<PropertiesQuickViewProps> = ({
  properties,
  onSelectProperty,
  onManageAll
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredProperties = properties.filter(prop => {
    if (filterType === 'ALL') return true;
    return prop.type === filterType;
  });

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount);
  };

  const getTypeBadge = (type: Property['type']) => {
    switch (type) {
      case 'MIXED':
        return <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium">سكني وتجاري</span>;
      case 'MARKET_COMPLEX':
        return <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">سوق ومحلات وبسطات</span>;
      case 'RESIDENTIAL':
        return <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">سكني عائلي</span>;
      case 'COMMERCIAL':
        return <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">مستودعات ومكاتب</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>العقارات والمجمعات العقارية المسجلة</span>
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredProperties.length} عقار
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة حالة الإشغال، الإيرادات المتوقعة، والمتأخرات في كل عقار
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('ALL')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({properties.length})
          </button>
          <button
            onClick={() => setFilterType('MIXED')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
              filterType === 'MIXED'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            أبراج مختلطة
          </button>
          <button
            onClick={() => setFilterType('MARKET_COMPLEX')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
              filterType === 'MARKET_COMPLEX'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            أسواق وبسطات
          </button>

          {onManageAll && (
            <button
              onClick={onManageAll}
              className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors font-bold whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <span>إدارة العقارات والمباني</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Properties Table / Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">العقار والرمز</th>
              <th className="py-3 px-4">الموقع الجغرافي</th>
              <th className="py-3 px-4">المالك وبيانات الاتصال</th>
              <th className="py-3 px-4 text-center">الوحدات والإشغال</th>
              <th className="py-3 px-4 text-left">الإيجار المتوقع</th>
              <th className="py-3 px-4 text-left">المتأخرات</th>
              <th className="py-3 px-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProperties.map((property) => {
              const occupancy = Math.round((property.occupiedUnits / property.totalUnits) * 100);
              return (
                <tr 
                  key={property.id} 
                  className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  onClick={() => onSelectProperty(property)}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{property.name}</span>
                          {getTypeBadge(property.type)}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{property.code}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="flex items-center gap-1 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{property.city} - {property.district}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                      {property.street}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="font-medium text-slate-800">{property.ownerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span dir="ltr">{property.ownerPhone}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <span>{property.occupiedUnits} مؤجرة</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{property.totalUnits} إجمالي</span>
                      </div>
                      <div className="w-28 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            occupancy >= 90 ? 'bg-emerald-500' : occupancy >= 75 ? 'bg-indigo-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${occupancy}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{occupancy}% إشغال</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900">
                    {formatMoney(property.monthlyExpectedRent)}
                    <span className="text-[10px] font-normal text-slate-400 mr-1">ريال</span>
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono">
                    {property.totalOutstandingRent > 0 ? (
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        {formatMoney(property.totalOutstandingRent)} ريال
                      </span>
                    ) : (
                      <span className="text-emerald-600 text-[11px] font-medium flex items-center justify-end gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>مسدد بالكامل</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProperty(property);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="عرض تفاصيل العقار والوحدات"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
