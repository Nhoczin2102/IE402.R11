'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraveLot } from '../types/cemetery';
import { cemeteryApi } from '../services/cemeteryApi';
import { TopHeader } from '../components/ui/TopHeader';
import { SearchFilterSidebar } from '../components/ui/SearchFilterSidebar';
import { GraveDetailDrawer } from '../components/ui/GraveDetailModal';
import { CapacityDashboard } from '../components/ui/CapacityDashboard';
import { AllocateModal } from '../components/ui/AllocateModal';

const CemeteryViewport3D = dynamic(
  () => import('../components/gis3d/CemeteryViewport3D').then((mod) => mod.CemeteryViewport3D),
  { ssr: false }
);

export default function CemeteryGIS3DPage() {
  const [graves, setGraves] = useState<GraveLot[]>([]);
  const [selectedGrave, setSelectedGrave] = useState<GraveLot | null>(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [slopeHeatmap, setSlopeHeatmap] = useState(false);
  const [showSubsurface, setShowSubsurface] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    path: [number, number, number][];
    distance: number;
    minutes: number;
  } | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'top' | 'reset'>('overview');
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);

  useEffect(() => {
    cemeteryApi.fetchGraves().then(({ data }) => setGraves(data));
  }, []);

  // Định tuyến 3D Dijkstra từ Cổng chính
  const handleToggleRoute = async () => {
    if (routeInfo) {
      setRouteInfo(null);
      return;
    }
    if (!selectedGrave) {
      alert('Vui lòng chọn một lô mộ trên bản đồ hoặc danh sách bên trái trước khi bật dẫn đường!');
      return;
    }

    const [tx, , tz] = selectedGrave.position;
    const path = await cemeteryApi.getShortestRoute3D(tx, tz);

    // Tính tổng khoảng cách thực tế 3D
    let totalDist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1, z1] = path[i];
      const [x2, y2, z2] = path[i + 1];
      totalDist += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
    }

    setRouteInfo({
      path,
      distance: Number(totalDist.toFixed(1)),
      minutes: Math.max(1, Math.ceil(totalDist / 60)),
    });
  };

  // Cấp phát mộ mới
  const handleConfirmAllocate = async (
    lotCode: string,
    status: 'Đã an táng' | 'Đã đặt trước',
    occupantName: string,
    contact: string
  ) => {
    await cemeteryApi.allocateGrave({
      ma_lo_dat: lotCode,
      trang_thai: status,
      ho_ten: occupantName,
      thong_tin_than_nhan: contact,
    });

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

  // Chuyển trạng thái (Xác nhận an táng hoặc Thu hồi lô)
  const handleUpdateStatus = (lotCode: string, newStatus: 'Trống' | 'Đã an táng') => {
    const updated = graves.map((g) => {
      if (g.ma_lo_dat === lotCode) {
        const updatedLot: GraveLot = {
          ...g,
          trang_thai: newStatus,
          nguoi_mat:
            newStatus === 'Trống'
              ? undefined
              : {
                  ...g.nguoi_mat!,
                  ho_ten: g.nguoi_mat?.ho_ten.replace(' (Đặt trước)', '') || 'Chưa cập nhật',
                  ngay_an_tang: new Date().toLocaleDateString('vi-VN'),
                },
        };
        setSelectedGrave(updatedLot);
        return updatedLot;
      }
      return g;
    });
    setGraves(updated);
  };

  // Xuất file báo cáo CSV phục vụ quản lý quy hoạch
  const handleExportCSV = () => {
    const headers = ['MaLo', 'PhanKhu', 'ViTri', 'TrangThai', 'CaoDoZ(m)', 'DienTich(m2)', 'HoTenNguoiMat', 'ThanNhan'];
    const rows = graves.map((g) => [
      g.ma_lo_dat,
      g.ma_phan_khu,
      g.vi_tri_hang_o,
      g.trang_thai,
      g.cao_do_z,
      g.dien_tich_lo,
      g.nguoi_mat?.ho_ten || '',
      g.nguoi_mat?.thong_tin_than_nhan || '',
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BaoCao_QuyHoach_NghiaTrang3D_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const availableLots = graves.filter((g) => g.trang_thai === 'Trống');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      <TopHeader
        showWireframe={showWireframe}
        onToggleWireframe={() => setShowWireframe(!showWireframe)}
        slopeHeatmap={slopeHeatmap}
        onToggleHeatmap={() => setSlopeHeatmap(!slopeHeatmap)}
        showSubsurface={showSubsurface}
        onToggleSubsurface={() => setShowSubsurface(!showSubsurface)}
        measureMode={measureMode}
        onToggleMeasure={() => setMeasureMode(!measureMode)}
        onExportCSV={handleExportCSV}
        onChangeCameraPreset={(preset) => setCameraPreset(preset)}
      />

      <div className="flex flex-1 overflow-hidden">
        <SearchFilterSidebar
          graves={graves}
          selectedGrave={selectedGrave}
          onSelectGrave={(grave) => {
            setSelectedGrave(grave);
            setRouteInfo(null);
          }}
          routeActive={Boolean(routeInfo)}
          onToggleRoute={handleToggleRoute}
          onOpenAllocateModal={() => setIsAllocateOpen(true)}
        />

        <main className="flex-1 min-h-0 h-full relative">
          <CemeteryViewport3D
            graves={graves}
            selectedGrave={selectedGrave}
            onSelectGrave={(grave) => {
              setSelectedGrave(grave);
              setRouteInfo(null);
            }}
            showWireframe={showWireframe}
            slopeHeatmap={slopeHeatmap}
            showSubsurface={showSubsurface}
            routePath={routeInfo ? routeInfo.path : null}
            cameraPreset={cameraPreset}
          />

          {/* Thẻ hiển thị kết quả định tuyến 3D */}
          {routeInfo && selectedGrave && (
            <div className="absolute left-5 top-5 bg-cyan-950/90 backdrop-blur-xl border border-cyan-500/60 rounded-xl px-4 py-3 text-xs text-cyan-100 shadow-xl z-20">
              <div className="font-bold text-cyan-300">LỘ TRÌNH 3D TỪ CỔNG CHÍNH &rarr; {selectedGrave.ma_lo_dat}</div>
              <div className="mt-1 flex items-center gap-4 font-mono">
                <span>Quãng đường 3D: <b>{routeInfo.distance} m</b></span>
                <span>Đi bộ dự kiến: <b>~{routeInfo.minutes} phút</b></span>
              </div>
            </div>
          )}

          {/* Thông báo chế độ đo khoảng cách */}
          {measureMode && (
            <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-slate-900/90 border border-cyan-500/50 text-cyan-300 px-4 py-1.5 rounded-full text-xs shadow-lg z-20">
              Chế độ đo khoảng cách đang bật: Chọn 2 lô mộ liên tiếp để xem khoảng cách không gian 3D
            </div>
          )}

          <GraveDetailDrawer
            grave={selectedGrave}
            onClose={() => setSelectedGrave(null)}
            onOpenAllocate={() => setIsAllocateOpen(true)}
            onUpdateStatus={handleUpdateStatus}
          />

          <CapacityDashboard graves={graves} />
        </main>
      </div>

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