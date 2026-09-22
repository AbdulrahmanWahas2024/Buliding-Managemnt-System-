import React from 'react';
import { 
  Droplets, 
  Zap, 
  Calculator, 
  ArrowRight, 
  Gauge, 
  Layers, 
  ShieldCheck,
  Receipt,
  Info
} from 'lucide-react';
import { WaterOperatingCost, ElectricityReading } from '../../types/erp';

interface WaterElectricityWidgetProps {
  waterCost: WaterOperatingCost;
  electricityReading: ElectricityReading;
}

export const WaterElectricityWidget: React.FC<WaterElectricityWidgetProps> = ({
  waterCost,
  electricityReading,
}) => {
  const formatMoney = (val: number) => new Intl.NumberFormat('ar-YE').format(val);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Water Cost Operating Engine */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                منظومة احتساب تكاليف المياه (فترة {waterCost.period})
              </h3>
              <p className="text-[11px] text-slate-500">
                عقار: {waterCost.propertyName}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded font-medium">
            طريقة التوزيع: بالتساوي
          </span>
        </div>

        {/* Calculation breakdown */}
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600">
              وايتات المياه المفرغة ({waterCost.tankerCount} وايت × {formatMoney(waterCost.tankerUnitPrice)} ريال)
            </span>
            <span className="font-mono font-bold text-slate-900">{formatMoney(waterCost.totalTankersCost)} ريال</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1">
              <span className="text-slate-600">كهرباء مضخة رفع المياه (تشغيل عام)</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">مصروف تشغيلي منفصل</span>
            </div>
            <span className="font-mono font-bold text-slate-900">{formatMoney(waterCost.pumpElectricityCost)} ريال</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600">رسوم المجاري والصرف الصحي</span>
            <span className="font-mono font-bold text-slate-900">{formatMoney(waterCost.sewerCost)} ريال</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600">صيانة وتنظيف وتعقيم الخزان الأرضي والعلوي</span>
            <span className="font-mono font-bold text-slate-900">
              {formatMoney(waterCost.tankMaintenanceCost + waterCost.tankCleaningCost)} ريال
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600">أجور العمال والمصاريف التشغيلية الأخرى</span>
            <span className="font-mono font-bold text-slate-900">
              {formatMoney(waterCost.laborWages + waterCost.otherExpenses + waterCost.operatingFees)} ريال
            </span>
          </div>
        </div>

        {/* Total calculation banner */}
        <div className="mt-4 p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] text-cyan-800 font-semibold block">
              إجمالي تكلفة المياه لشهر {waterCost.period}
            </span>
            <span className="text-[10px] text-cyan-600">
              توزع على {28} وحدة سكنية وتجارية (حوالي 12,000 ريال للوحدة)
            </span>
          </div>
          <span className="text-base font-bold text-cyan-900 font-mono">
            {formatMoney(waterCost.totalWaterCost)} ريال
          </span>
        </div>
      </div>

      {/* 2. Electricity Metering & Rate History Engine */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                منظومة قراءات عدادات الكهرباء واحتساب الاستهلاك
              </h3>
              <p className="text-[11px] text-slate-500">
                عداد: {electricityReading.meterNumber} (الوحدة {electricityReading.unitNumber})
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">
            سعر ثابت بالفاتورة: {electricityReading.ratePerKWh} ريال/ك.و
          </span>
        </div>

        {/* Meter formula visualization */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">القراءة السابقة</span>
            <span className="text-sm font-bold font-mono text-slate-700 mt-1 block">
              {electricityReading.previousReading}
            </span>
            <span className="text-[10px] text-slate-400">ك.و.س</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">القراءة الحالية</span>
            <span className="text-sm font-bold font-mono text-emerald-700 mt-1 block">
              {electricityReading.currentReading}
            </span>
            <span className="text-[10px] text-slate-400">ك.و.س</span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
            <span className="text-[10px] text-amber-800 font-medium block">صافي الاستهلاك</span>
            <span className="text-sm font-bold font-mono text-amber-900 mt-1 block">
              {electricityReading.consumption}
            </span>
            <span className="text-[10px] text-amber-700">ك.و</span>
          </div>
        </div>

        {/* Calculation math */}
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-600">
            <span>صيغة الاحتساب:</span>
            <span className="font-mono text-slate-800">
              الاستهلاك ({electricityReading.consumption} ك.و) × التعريفة ({electricityReading.ratePerKWh} ريال)
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>تاريخ القراءة:</span>
            <span className="font-mono text-slate-800">{electricityReading.readingDate}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>حالة العداد:</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>طبيعي (لا يوجد تصفير أو استبدال)</span>
            </span>
          </div>
        </div>

        {/* Total electricity bill banner */}
        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] text-amber-900 font-semibold block">
              قيمة فاتورة الكهرباء للوحدة
            </span>
            <span className="text-[10px] text-amber-700">
              المستأجر: {electricityReading.tenantName}
            </span>
          </div>
          <span className="text-base font-bold text-amber-950 font-mono">
            {formatMoney(electricityReading.totalAmount)} ريال
          </span>
        </div>
      </div>
    </div>
  );
};
