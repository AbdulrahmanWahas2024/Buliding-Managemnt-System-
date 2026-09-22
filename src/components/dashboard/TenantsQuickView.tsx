import React, { useState } from 'react';
import { 
  Users, 
  Phone, 
  FileText, 
  BadgeDollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  BookOpenCheck,
  Building2,
  Receipt
} from 'lucide-react';
import { Tenant } from '../../types/erp';

interface TenantsQuickViewProps {
  tenants: Tenant[];
  onCollect: (tenant: Tenant) => void;
  onViewStatement: (tenant: Tenant) => void;
}

export const TenantsQuickView: React.FC<TenantsQuickViewProps> = ({
  tenants,
  onCollect,
  onViewStatement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.nationalId.includes(searchTerm);
    
    if (!matchesSearch) return false;

    if (statusFilter === 'DUE') return t.currentBalance > 0;
    if (statusFilter === 'PAID') return t.currentBalance === 0;
    return true;
  });

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header with Search and Quick Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>سجل المستأجرين النشطين والأرصدة المالية</span>
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredTenants.length} مستأجر
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة حالة الحسابات، الأرصدة المستحقة، وإصدار السندات وكشوفات الحساب
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setStatusFilter('DUE')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'DUE' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              عليهم مستحقات
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'PAID' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              مسددون بالكامل
            </button>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">المستأجر</th>
              <th className="py-3 px-4">نوع المستأجر والهوية</th>
              <th className="py-3 px-4">أرقام التواصل</th>
              <th className="py-3 px-4">الوحدات والعقود</th>
              <th className="py-3 px-4 text-left">الرصيد المالي الحالي</th>
              <th className="py-3 px-4 text-center">إجراءات سريعة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{tenant.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <span>كود: {tenant.tenantCode}</span>
                  </div>
                </td>

                <td className="py-3 px-4 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      tenant.type === 'COMPANY' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {tenant.type === 'COMPANY' ? 'شركة / منشأة' : 'مستأجر فرد'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                    الرقم: {tenant.nationalId}
                  </span>
                </td>

                <td className="py-3 px-4 text-slate-600">
                  <div className="font-mono text-slate-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span dir="ltr">{tenant.phone}</span>
                  </div>
                  {tenant.alternativePhone && (
                    <span dir="ltr" className="text-[11px] font-mono text-slate-400 block mt-0.5">
                      {tenant.alternativePhone}
                    </span>
                  )}
                </td>

                <td className="py-3 px-4 text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tenant.currentUnitsCount} وحدة مستأجرة</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                    عقد ساري نشط
                  </span>
                </td>

                <td className="py-3 px-4 text-left font-mono">
                  {tenant.currentBalance > 0 ? (
                    <div>
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                        {formatMoney(tenant.currentBalance)} ريال
                      </span>
                      <span className="text-[10px] text-rose-500 block mt-0.5">
                        مستحق السداد
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>رصيد مسدد (0 ريال)</span>
                    </div>
                  )}
                </td>

                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onCollect(tenant)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors shadow-2xs"
                      title="تحصيل فوري وإصدار سند قبض"
                    >
                      <BadgeDollarSign className="w-3.5 h-3.5" />
                      <span>تحصيل</span>
                    </button>
                    <button
                      onClick={() => onViewStatement(tenant)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                      title="عرض كشف حساب المستأجر (Tenant Statement)"
                    >
                      <BookOpenCheck className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
