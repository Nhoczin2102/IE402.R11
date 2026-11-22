'use client';

import React from 'react';
import { Compass, Layers, Mountain, Eye, RotateCcw, Ruler, Download } from 'lucide-react';

interface TopHeaderProps {
  showWireframe: boolean;
  onToggleWireframe: () => void;
  slopeHeatmap: boolean;
  onToggleHeatmap: () => void;
  showSubsurface: boolean;
  onToggleSubsurface: () => void;
  measureMode: boolean;
  onToggleMeasure: () => void;
  onExportCSV: () => void;
  onChangeCameraPreset: (preset: 'overview' | 'top' | 'reset') => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  showWireframe,
  onToggleWireframe,
  slopeHeatmap,
  onToggleHeatmap,
  showSubsurface,
  onToggleSubsurface,
  measureMode,
  onToggleMeasure,
  onExportCSV,
  onChangeCameraPreset,
}) => {
  return (
    <header className="h-14 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-5 flex items-center justify-between z-20 select-none">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 tracking-wide">
            WEBGIS 3D QUY HOẠCH NGHĨA TRANG ĐÔ THỊ
          </h1>
          <p className="text-[11px] text-slate-400">
            Mô hình lai B-Rep &amp; SUDM • Địa hình TIN/DEM • IE402
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleWireframe}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            showWireframe
              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Lưới TIN</span>
        </button>

        <button
          onClick={onToggleHeatmap}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            slopeHeatmap
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Mountain className="w-3.5 h-3.5" />
          <span>Phân tích Cao độ</span>
        </button>

        <button
          onClick={onToggleSubsurface}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            showSubsurface
              ? 'bg-purple-500/20 border-purple-500/60 text-purple-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Huyệt ngầm (Trục Z)</span>
        </button>

        <button
          onClick={onToggleMeasure}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            measureMode
              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Đo khoảng cách</span>
        </button>

        <div className="h-5 w-px bg-slate-700 mx-1" />

        <button
          onClick={onExportCSV}
          title="Xuất danh sách quy hoạch ra file CSV"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 border border-slate-700 text-emerald-300 hover:bg-slate-800"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất CSV</span>
        </button>

        <button
          onClick={() => onChangeCameraPreset('top')}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white"
        >
          Mặt bằng 2D
        </button>

        <button
          onClick={() => onChangeCameraPreset('reset')}
          title="Đặt lại góc nhìn 3D"
          className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};