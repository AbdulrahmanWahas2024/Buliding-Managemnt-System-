import React from 'react';
import { 
  Building2, 
  Users, 
  Wallet, 
  AlertTriangle, 
  Droplets, 
  Zap, 
  ShieldAlert, 
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { DashboardStats } from '../../types/erp';

interface StatCardsProps {
  stats: DashboardStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ar-YE').format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Top 4 Primary Financial & Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Properties & Occupancy */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إشغال الوحدات والمساحات</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {stats.occupancyRate}%
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>مستقر</span>
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>الوحدات: <strong className="text-slate-700">{stats.occupiedUnits}</strong> مؤجرة</span>
            <span className="text-amber-600 font-medium">{stats.vacantUnits} شاغرة</span>
            <span className="text-slate-400">من {stats.totalUnits}</span>
          </div>
        </div>

        {/* Card 2: Active Tenants & Contracts */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">المستأجرون والعقود</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {stats.activeTenants}
            </span>
            <span className="text-xs text-slate-500">مستأجر نشط</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">العقود السارية: <strong className="text-slate-700">{stats.activeContracts}</strong></span>
            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{stats.expiringContracts} تنتهي قريباً</span>
            </span>
          </div>
        </div>

        {/* Card 3: Monthly Rent Revenue */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">الإيجار المتوقع للشهر</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatMoney(stats.totalMonthlyRentExpected)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">ريال</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">المحصل حتى اليوم:</span>
            <span className="font-semibold text-emerald-700 font-mono">
              {formatMoney(stats.totalCollectedThisMonth)} ريال
            </span>
          </div>
        </div>

        {/* Card 4: Outstanding Dues / المتأخرات */}
        <div className="bg-white rounded-xl p-4 border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/20 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              إجمالي المتأخرات والمستحقات
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 rotate-180" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-700 font-mono tracking-tight">
              {formatMoney(stats.outstandingTotal)}
            </span>
            <span className="text-[11px] text-rose-500 font-medium">ريال</span>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-xs text-rose-600">
            <span>تحصيلات اليوم: <strong>{formatMoney(stats.todayCollections)} ريال</strong></span>
            <span className="bg-rose-100/60 text-rose-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
              8.0% غير محصل
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Service & Utility Indicators: Water, Electricity, Deposits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Water Cost Formula Summary */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">تكاليف المياه والوايتات الموزعة</p>
              <p className="text-[11px] text-slate-500">6 وايتات + كهرباء مضخة + صيانة الخزان</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900 font-mono">{formatMoney(stats.monthlyWaterCost)} ريال</p>
            <span className="text-[10px] text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 font-medium">
              توزيع متساوٍ
            </span>
          </div>
        </div>

        {/* Electricity Meters & Rate */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">فوترة عدادات الكهرباء</p>
              <p className="text-[11px] text-slate-500">سعر الكيلوواط الساري: 300 ريال / ك.و</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900 font-mono">{formatMoney(stats.monthlyElectricityBilling)} ريال</p>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
              8,166 ك.و مستهلك
            </span>
          </div>
        </div>

        {/* Isolated Held Deposits */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">الضمانات والتأمينات المحتجزة</p>
              <p className="text-[11px] text-slate-500">حسابات ضمان معزولة عن إيراد الإيجار</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900 font-mono">{formatMoney(stats.totalHeldDeposits)} ريال</p>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
              قابلة للاسترداد
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
