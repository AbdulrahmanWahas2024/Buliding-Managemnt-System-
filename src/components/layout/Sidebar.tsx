import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Store, 
  Users, 
  FileText, 
  Receipt, 
  Droplets, 
  Zap, 
  BadgeDollarSign, 
  BookOpenCheck, 
  Wrench, 
  BarChart3, 
  ShieldCheck, 
  History, 
  CheckCircle2, 
  ChevronLeft,
  Layers,
  X
} from 'lucide-react';
import { User } from '../../types/erp';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  count?: string | null;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  isOpen,
  onClose
}) => {
  const menuSections: MenuSection[] = [
    {
      title: 'الرئيسية',
      items: [
        { id: 'dashboard', label: 'لوحة التحكم العامة', icon: LayoutDashboard, badge: null }
      ]
    },
    {
      title: 'إدارة الأصول والمساحات',
      items: [
        { id: 'properties', label: 'العقارات والمباني', icon: Building2, count: '4' },
        { id: 'units', label: 'الوحدات والأسواق والمحلات', icon: Store, count: '96' },
      ]
    },
    {
      title: 'الأطراف والعقود',
      items: [
        { id: 'tenants', label: 'المستأجرون والملاك', icon: Users, count: '85' },
        { id: 'contracts', label: 'العقود والضمانات', icon: FileText, badge: '4 تنتهي قريباً' },
      ]
    },
    {
      title: 'الفوترة والخدمات',
      items: [
        { id: 'rent-billing', label: 'فوترة الإيجارات', icon: Receipt, count: null },
        { id: 'water', label: 'إدارة وتكاليف المياه (الوايتات)', icon: Droplets, badge: 'توزيع أغسطس' },
        { id: 'electricity', label: 'الكهرباء والعدادات والتعريفات', icon: Zap, count: '300 ريال' },
      ]
    },
    {
      title: 'التحصيل والمحاسبة',
      items: [
        { id: 'collections', label: 'مركز التحصيل والصندوق', icon: BadgeDollarSign, count: null },
        { id: 'statements', label: 'كشوف الحسابات ودفتر الأستاذ', icon: BookOpenCheck, count: null },
        { id: 'expenses', label: 'المصروفات والصيانة', icon: Wrench, count: '2 طلب' },
      ]
    },
    {
      title: 'التقارير والأمان',
      items: [
        { id: 'reports', label: 'التقارير المالية والتشغيلية', icon: BarChart3, count: null },
        { id: 'rbac', label: 'المستخدمون والصلاحيات', icon: ShieldCheck, count: null },
        { id: 'audit', label: 'سجل التدقيق (Audit Logs)', icon: History, count: null },
      ]
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed top-0 bottom-0 right-0 w-72 bg-slate-900 text-slate-100 z-50 flex flex-col border-l border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                SMART PROPERTY
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">ERP</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">نظام إدارة العقارات الذكي</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                        isActive 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                        }`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isActive 
                            ? 'bg-emerald-700 text-emerald-100' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {item.count && (
                        <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${
                          isActive 
                            ? 'bg-emerald-700/80 text-white' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Database Sync Status & User Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-3">
          {/* Sync status */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-slate-300 font-medium">قاعدة البيانات: متصلة</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">MySQL 8.x</span>
          </div>

          {/* User info */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-800/80 border border-emerald-500/40 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-emerald-400 font-medium">مدير النظام الأعلى (Super Admin)</p>
              </div>
            </div>
            <div className="text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
