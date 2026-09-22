import React, { useState, useEffect } from 'react';
import { X, UserCheck, Phone, Mail, MapPin, Building, Store, AlertCircle, ExternalLink } from 'lucide-react';
import { Owner, Property } from '../../../types/erp';
import { ERP_API } from '../../../services/api';

interface OwnerDetailsModalProps {
  ownerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProperty?: (propertyId: string) => void;
}

export const OwnerDetailsModal: React.FC<OwnerDetailsModalProps> = ({
  ownerId,
  isOpen,
  onClose,
  onNavigateToProperty
}) => {
  const [data, setData] = useState<{ owner: Owner; properties: Property[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ownerId && isOpen) {
      const fetchOwner = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await ERP_API.getOwnerById(ownerId);
          setData(res);
        } catch (err: any) {
          setError(err.message || 'تعذر جلب ملف المالك');
        } finally {
          setLoading(false);
        }
      };
      fetchOwner();
    }
  }, [ownerId, isOpen]);

  if (!isOpen || !ownerId) return null;

  const owner = data?.owner;
  const properties = data?.properties || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{owner?.name || 'ملف المالك'}</h2>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-purple-300 font-mono text-xs font-bold">
                  {owner?.ownerCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{owner?.phone}</span>
                {owner?.address && <span>• {owner.address}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">جاري جلب عقارات ومحفظة المالك من MySQL...</p>
            </div>
          ) : error ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100">
                  <span className="text-[11px] text-purple-800 font-bold block">العقارات والمجمعات</span>
                  <span className="text-xl font-bold font-mono text-purple-950 mt-1 block">
                    {properties.length}
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-blue-800 font-bold block">إجمالي الوحدات والمحلات</span>
                  <span className="text-xl font-bold font-mono text-blue-950 mt-1 block">
                    {properties.reduce((acc, p) => acc + (p.totalUnits || 0), 0)}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 font-bold block">العائد الإيجاري الشهري المتوقع</span>
                  <span className="text-xl font-bold font-mono text-emerald-950 mt-1 block">
                    {properties.reduce((acc, p) => acc + (p.monthlyExpectedRent || 0), 0).toLocaleString()} <span className="text-xs">ريال</span>
                  </span>
                </div>
              </div>

              {/* Properties Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-purple-600" />
                  <span>العقارات المسجلة باسم المالك في قاعدة البيانات</span>
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">كود العقار</th>
                        <th className="px-4 py-3">اسم العقار</th>
                        <th className="px-4 py-3">الموقع</th>
                        <th className="px-4 py-3">الوحدات (المشغولة / الكلية)</th>
                        <th className="px-4 py-3">الإيجار الشهري</th>
                        <th className="px-4 py-3">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {properties.length > 0 ? (
                        properties.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.code}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                            <td className="px-4 py-3 text-slate-600">{p.city} - {p.district}</td>
                            <td className="px-4 py-3 font-mono">
                              <span className="text-emerald-700 font-bold">{p.occupiedUnits || 0}</span> / {p.totalUnits || 0}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                              {(p.monthlyExpectedRent || 0).toLocaleString()} ريال
                            </td>
                            <td className="px-4 py-3">
                              {onNavigateToProperty && (
                                <button
                                  onClick={() => {
                                    onNavigateToProperty(p.id);
                                    onClose();
                                  }}
                                  className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <span>فتح العقار</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            لا توجد عقارات مسجلة باسم هذا المالك حتى الآن
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
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
