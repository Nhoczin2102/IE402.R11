'use client';

import React, { useState } from 'react';
import { Navigation, PlusCircle, XCircle, BarChart3, List } from 'lucide-react';
import { GraveLot } from '../../types/cemetery';
import { GraveListTab } from './sidebar/GraveListTab';
import { GisAnalyticsTab } from './sidebar/GisAnalyticsTab';

interface SearchFilterSidebarProps {
  graves: GraveLot[];
  selectedGrave: GraveLot | null;
  onSelectGrave: (grave: GraveLot) => void;
  routeActive: boolean;
  onToggleRoute: () => void;
  onOpenAllocateModal: () => void;
}

export const SearchFilterSidebar: React.FC<SearchFilterSidebarProps> = ({
  graves,
  selectedGrave,
  onSelectGrave,
  routeActive,
  onToggleRoute,
  onOpenAllocateModal,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');

  return (
    <aside className="w-80 bg-slate-950/85 backdrop-blur-2xl border-r border-white/10 flex flex-col h-full z-10 text-slate-100 select-none">
      <div className="p-3.5 border-b border-white/10 space-y-3">
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Danh sách lô</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'analytics' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Phân tích GIS</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onToggleRoute}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm ${
              routeActive ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {routeActive ? <XCircle className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />}
            <span>{routeActive ? 'Tắt dẫn đường' : 'Dẫn đường 3D'}</span>
          </button>

          <button
            onClick={onOpenAllocateModal}
            className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Cấp phát mộ</span>
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <GraveListTab graves={graves} selectedGrave={selectedGrave} onSelectGrave={onSelectGrave} />
      ) : (
        <GisAnalyticsTab refreshTrigger={graves.length} />
      )}
    </aside>
  );
};