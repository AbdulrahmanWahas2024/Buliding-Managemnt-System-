import React from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  BadgeDollarSign, 
  Calendar, 
  Coins, 
  FilePlus2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { User } from '../../types/erp';

interface HeaderProps {
  onMenuClick: () => void;
  currentUser: User;
  onQuickCollect: () => void;
  onNewContract: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  currentUser,
  onQuickCollect,
  onNewContract,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile menu toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-slate-800 font-semibold">SMART PROPERTY ERP</span>
            <span>/</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              لوحة العمليات والتحصيل
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن مستأجر، رقم عقد، عقار، وحدة، أو رقم فاتورة..."
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Currency Pill */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 text-xs font-medium border border-slate-200">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span>العملة:</span>
            <span className="font-bold text-slate-900 font-mono">YER (ريال يمني)</span>
          </div>

          {/* Quick Collect Action */}
          <button
            onClick={onQuickCollect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs shadow-emerald-600/30 transition-all hover:shadow-sm"
          >
            <BadgeDollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">تحصيل فوري</span>
            <span className="sm:hidden">تحصيل</span>
          </button>

          {/* New Contract Button */}
          <button
            onClick={onNewContract}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition-all"
          >
            <FilePlus2 className="w-4 h-4 text-emerald-400" />
            <span>عقد جديد</span>
          </button>

          {/* Notifications button */}
          <div className="relative">
            <button
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative"
              aria-label="التنبيهات"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
