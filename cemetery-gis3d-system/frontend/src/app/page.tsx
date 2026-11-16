'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { INITIAL_GRAVES, getTerrainHeight } from '../data/mockCemeteryData';
import { GraveLot } from '../types/cemetery';
import { TopHeader } from '../components/ui/TopHeader';
import { SearchFilterSidebar } from '../components/ui/SearchFilterSidebar';
import { GraveDetailDrawer } from '../components/ui/GraveDetailModal';
import { CapacityDashboard } from '../components/ui/CapacityDashboard';
import { AllocateModal } from '../components/ui/AllocateModal';

// Tắt SSR cho Viewport Three.js
const CemeteryViewport3D = dynamic(
  () => import('../components/gis3d/CemeteryViewport3D').then((mod) => mod.CemeteryViewport3D),
  { ssr: false }
);

export default function CemeteryGIS3DPage() {
  const [graves, setGraves] = useState<GraveLot[]>(INITIAL_GRAVES);
  const [selectedGrave, setSelectedGrave] = useState<GraveLot | null>(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [slopeHeatmap, setSlopeHeatmap] = useState(false);
  const [showSubsurface, setShowSubsurface] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number, number][] | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'top' | 'reset'>('overview');
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);

  // Tính tuyến đường dẫn 3D từ Cổng chính -> Trục chính -> Lô mộ được chọn
  const handleToggleRoute = () => {
    if (routePath) {
      setRoutePath(null);
      return;
    }
    if (!selectedGrave) {
      alert('Vui lòng chọn một lô mộ trên bản đồ hoặc danh sách bên trái trước khi bật dẫn đường!');
      return;
    }

    const [tx, ty, tz] = selectedGrave.position;
    const gatePoint: [number, number, number] = [0, getTerrainHeight(0, 42), 42];
    const midJunction: [number, number, number] = [0, getTerrainHeight(0, tz), tz];
    const targetPoint: [number, number, number] = [tx, ty, tz];

    setRoutePath([gatePoint, midJunction, targetPoint]);
  };

  // Xử lý cấp phát mộ mới và cập nhật ngay lên không gian 3D
  const handleConfirmAllocate = (
    lotCode: string,
    status: 'Đã an táng' | 'Đã đặt trước',
    occupantName: string,
    contact: string
  ) => {
    const updated = graves.map((g) => {
      if (g.ma_lo_dat === lotCode) {
        const updatedLot: GraveLot = {
          ...g,
          trang_thai: status,
          nguoi_mat: {
            ho_ten: status === 'Đã đặt trước' ? `${occupantName} (Đặt trước)` : occupantName,
            ngay_an_tang: status === 'Đã an táng' ? new Date().toLocaleDateString('vi-VN') : undefined,
            thong_tin_than_nhan: contact,
          },
        };
        setSelectedGrave(updatedLot);
        return updatedLot;
      }
      return g;
    });
    setGraves(updated);
  };

  const availableLots = graves.filter((g) => g.trang_thai === 'Trống');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Thanh Header trên cùng */}
      <TopHeader
        showWireframe={showWireframe}
        onToggleWireframe={() => setShowWireframe(!showWireframe)}
        slopeHeatmap={slopeHeatmap}
        onToggleHeatmap={() => setSlopeHeatmap(!slopeHeatmap)}
        showSubsurface={showSubsurface}
        onToggleSubsurface={() => setShowSubsurface(!showSubsurface)}
        onChangeCameraPreset={(preset) => setCameraPreset(preset)}
      />

      {/* Phần thân chính: Sidebar + Không gian 3D */}
      <div className="flex flex-1 overflow-hidden">
        <SearchFilterSidebar
          graves={graves}
          selectedGrave={selectedGrave}
          onSelectGrave={(grave) => {
            setSelectedGrave(grave);
            setRoutePath(null);
          }}
          routeActive={Boolean(routePath)}
          onToggleRoute={handleToggleRoute}
          onOpenAllocateModal={() => setIsAllocateOpen(true)}
        />

        <main className="flex-1 h-full relative">
          <CemeteryViewport3D
            graves={graves}
            selectedGrave={selectedGrave}
            onSelectGrave={(grave) => {
              setSelectedGrave(grave);
              setRoutePath(null);
            }}
            showWireframe={showWireframe}
            slopeHeatmap={slopeHeatmap}
            showSubsurface={showSubsurface}
            routePath={routePath}
            cameraPreset={cameraPreset}
          />

          {/* Bảng thông tin chi tiết bên phải */}
          <GraveDetailDrawer
            grave={selectedGrave}
            onClose={() => setSelectedGrave(null)}
            onOpenAllocate={() => setIsAllocateOpen(true)}
          />

          {/* Thống kê sức chứa dưới cùng */}
          <CapacityDashboard graves={graves} />
        </main>
      </div>

      {/* Modal cấp phát mộ mới */}
      <AllocateModal
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        availableLots={availableLots}
        preselectedLotCode={selectedGrave?.trang_thai === 'Trống' ? selectedGrave.ma_lo_dat : undefined}
        onConfirmAllocate={handleConfirmAllocate}
      />
    </div>
  );
}