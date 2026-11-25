'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Calendar,
  Phone,
  Box,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Trash2,
  Check,
} from 'lucide-react';
import { GraveLot } from '../../types/cemetery';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface GraveDetailDrawerProps {
  grave: GraveLot | null;
  onClose: () => void;
  onOpenAllocate: () => void;
  onUpdateStatus: (lotCode: string, newStatus: 'Trống' | 'Đã an táng') => void;
}

interface LiveTopologyReport {
  hop_le_tong_the: boolean;
  containment: { hop_le: boolean };
  adjacency: {
    so_lo_lan_can: number;
    khoang_cach_gan_nhat_m: number | null;
    co_vi_pham: boolean;
  };
  infrastructure_buffer: { co_vi_pham: boolean };
}

export const GraveDetailDrawer: React.FC<GraveDetailDrawerProps> = ({
  grave,
  onClose,
  onOpenAllocate,
  onUpdateStatus,
}) => {
  const [liveTopo, setLiveTopo] = useState<LiveTopologyReport | null>(null);

  useEffect(() => {
    if (!grave) {
      setLiveTopo(null);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/topology/graves/${encodeURIComponent(grave.ma_lo_dat)}?radius=10`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) {
          setLiveTopo(json.data);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveTopo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [grave?.ma_lo_dat]);

  if (!grave) return null;

  const drainageStatus =
    grave.cao_do_z < -1.0
      ? { label: 'Vùng trũng - Cần rãnh thoát nước', color: 'text-amber-400' }
      : { label: 'Thoát nước tự nhiên tốt', color: 'text-emerald-400' };

  const isTopoValid = liveTopo ? liveTopo.hop_le_tong_the : grave.topology.hop_le_quy_hoach;
  const nearestDist =
    liveTopo?.adjacency?.khoang_cach_gan_nhat_m ?? grave.topology.khoang_cach_ke_can;

  return (
    <div className="absolute right-5 top-5 w-92 bg-slate-950/88 backdrop-blur-2xl border border-white/10 ring-1 ring-inset ring-white/5 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] text-slate-100 z-20 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900/90 to-slate-950/90 px-5 py-4 border-b border-white/10 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-white tabular-nums">Lô {grave.ma_lo_dat}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-200 font-medium">
              {grave.ma_phan_khu}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{grave.vi_tri_hang_o}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3.5 max-h-[calc(100vh-140px)] overflow-y-auto text-xs">
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3.5 space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Hồ sơ đối tượng an táng
          </div>
          {grave.nguoi_mat ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{grave.nguoi_mat.ho_ten}</span>
              </div>
              {grave.nguoi_mat.ngay_sinh && (
                <div className="flex items-center gap-2 text-slate-300 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Sinh: {grave.nguoi_mat.ngay_sinh} — Mất: {grave.nguoi_mat.ngay_mat}
                  </span>
                </div>
              )}
              {grave.nguoi_mat.thong_tin_than_nhan && (
                <div className="flex items-start gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Thân nhân: {grave.nguoi_mat.thong_tin_than_nhan}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                {grave.trang_thai === 'Đã đặt trước' && (
                  <button
                    onClick={() => onUpdateStatus(grave.ma_lo_dat, 'Đã an táng')}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Xác nhận an táng</span>
                  </button>
                )}
                <button
                  onClick={() => onUpdateStatus(grave.ma_lo_dat, 'Trống')}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-rose-950/70 hover:bg-rose-900/90 border border-rose-500/30 text-rose-300 rounded-xl font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Thu hồi lô</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-2 text-center space-y-2.5">
              <p className="text-slate-400">Lô quy hoạch này hiện đang trống.</p>
              <button
                onClick={onOpenAllocate}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-sm"
              >
                Đăng ký cấp phát vị trí này
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3.5 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5" />
            <span>Dữ liệu không gian 3D &amp; Địa hình</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-500 text-[10px]">Tọa độ (X, Z)</div>
              <div className="font-mono text-slate-200 mt-0.5">
                [{grave.position[0]}, {grave.position[2]}]
              </div>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-500 text-[10px]">Cao độ nền (Z)</div>
              <div className="font-mono text-amber-400 font-semibold mt-0.5">{grave.cao_do_z} m</div>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-500 text-[10px]">Diện tích mặt dốc</div>
              <div className="font-mono text-slate-200 mt-0.5">{grave.dien_tich_lo} m²</div>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-white/5">
              <div className="text-slate-500 text-[10px]">Độ sâu huyệt ngầm</div>
              <div className="font-mono text-purple-400 font-semibold mt-0.5">-{grave.do_sau_huyet} m</div>
            </div>
          </div>
          <div className="bg-slate-950/70 px-2.5 py-2 rounded-lg border border-white/5 text-[11px] flex justify-between">
            <span className="text-slate-400">Thoát nước:</span>
            <span className={`font-medium ${drainageStatus.color}`}>{drainageStatus.label}</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3.5 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Phân lớp Bề mặt SUDM ({grave.ten_mau_mo})</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {grave.surfaces.map((sf) => (
              <div
                key={sf.id}
                className="flex justify-between items-center bg-slate-950/70 px-2.5 py-2 rounded-lg border border-white/5"
              >
                <div>
                  <span className="font-mono text-[11px] text-emerald-300 font-semibold">{sf.surfaceType}</span>
                  <div className="text-[10px] text-slate-400">{sf.label}</div>
                </div>
                <span className="font-mono text-slate-300 tabular-nums">{sf.areaM2} m²</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`rounded-xl px-3.5 py-3 border space-y-2 ${
            isTopoValid
              ? 'bg-emerald-950/30 border-emerald-500/30'
              : 'bg-rose-950/30 border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTopoValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className={isTopoValid ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                Topology 3D (Cách gần nhất {nearestDist}m)
              </span>
            </div>
            <span className={`font-bold text-[11px] ${isTopoValid ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isTopoValid ? 'HỢP LỆ' : 'VI PHẠM'}
            </span>
          </div>

          {liveTopo && (
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[10px] tabular-nums">
              <div className="bg-slate-950/60 rounded-lg py-1">
                <div className="text-slate-400">Trong khu</div>
                <div className={liveTopo.containment.hop_le ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {liveTopo.containment.hop_le ? 'Đạt' : 'Lỗi'}
                </div>
              </div>
              <div className="bg-slate-950/60 rounded-lg py-1">
                <div className="text-slate-400">Lân cận</div>
                <div className={!liveTopo.adjacency.co_vi_pham ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {liveTopo.adjacency.so_lo_lan_can} lô
                </div>
              </div>
              <div className="bg-slate-950/60 rounded-lg py-1">
                <div className="text-slate-400">Vùng đệm</div>
                <div className={!liveTopo.infrastructure_buffer.co_vi_pham ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {!liveTopo.infrastructure_buffer.co_vi_pham ? 'An toàn' : 'Xâm phạm'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};