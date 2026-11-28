'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GraveLot } from '../../types/cemetery';

interface AllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableLots: GraveLot[];
  preselectedLotCode?: string;
  onConfirmAllocate: (
    lotCode: string,
    status: 'Đã an táng' | 'Đã đặt trước',
    occupantName: string,
    contact: string
  ) => void;
}

export const AllocateModal: React.FC<AllocateModalProps> = ({
  isOpen,
  onClose,
  availableLots,
  preselectedLotCode,
  onConfirmAllocate,
}) => {
  const [lotCode, setLotCode] = useState('');
  const [status, setStatus] = useState<'Đã an táng' | 'Đã đặt trước'>('Đã an táng');
  const [occupantName, setOccupantName] = useState('');
  const [contact, setContact] = useState('');

  // Tự động đồng bộ mã lô mỗi khi mở modal hoặc danh sách lô trống vừa tải xong từ API
  useEffect(() => {
    if (isOpen) {
      setLotCode(preselectedLotCode || availableLots[0]?.ma_lo_dat || '');
    }
  }, [isOpen, preselectedLotCode, availableLots]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetLot = lotCode || availableLots[0]?.ma_lo_dat || '';
    const trimmedName = occupantName.trim();
    if (!targetLot || trimmedName.length < 2) return;

    onConfirmAllocate(targetLot, status, trimmedName, contact.trim());
    setOccupantName('');
    setContact('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl text-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-base text-white">Cấp phát / Đăng ký Lô mộ 3D</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5">Chọn lô quy hoạch còn trống</label>
            <select
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              disabled={availableLots.length === 0}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              {availableLots.length === 0 ? (
                <option value="">Không còn lô trống</option>
              ) : (
                availableLots.map((lot) => (
                  <option key={lot.ma_lo_dat} value={lot.ma_lo_dat}>
                    {lot.ma_lo_dat} ({lot.ma_phan_khu} - Cao độ {lot.cao_do_z}m)
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5">Hình thức đăng ký</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Đã an táng', 'Đã đặt trước'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`py-2 rounded-lg border font-medium transition ${
                    status === st
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5">Họ và tên người an táng / đăng ký *</label>
            <input
              type="text"
              required
              minLength={2}
              placeholder="Nhập họ tên đầy đủ..."
              value={occupantName}
              onChange={(e) => setOccupantName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5">Thông tin thân nhân liên hệ</label>
            <input
              type="text"
              placeholder="Họ tên thân nhân & SĐT..."
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={availableLots.length === 0}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow disabled:opacity-50"
            >
              Xác nhận &amp; Cập nhật 3D
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};