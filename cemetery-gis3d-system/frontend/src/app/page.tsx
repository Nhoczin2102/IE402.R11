'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraveLot } from '../types/cemetery';
import { cemeteryApi, InfrastructureItem, RoadSegmentItem } from '../services/cemeteryApi';
import { MeasureResult } from '../components/3d/utils/viewportInteraction';
import { TopHeader } from '../components/ui/TopHeader';
import { SearchFilterSidebar } from '../components/ui/SearchFilterSidebar';
import { GraveDetailDrawer } from '../components/ui/GraveDetailModal';
import { CapacityDashboard } from '../components/ui/CapacityDashboard';
import { AllocateModal } from '../components/ui/AllocateModal';

const CemeteryViewport3D = dynamic(
  () => import('../components/3d/CemeteryViewport3D').then((mod) => mod.CemeteryViewport3D),
  { ssr: false }
);

export default function CemeteryGIS3DPage() {
  const [graves, setGraves] = useState<GraveLot[]>([]);
  const [infrastructures, setInfrastructures] = useState<InfrastructureItem[]>([]);
  const [roads, setRoads] = useState<RoadSegmentItem[]>([]);
  const [selectedGrave, setSelectedGrave] = useState<GraveLot | null>(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [slopeHeatmap, setSlopeHeatmap] = useState(false);
  const [showSubsurface, setShowSubsurface] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    path: [number, number, number][];
    distance: number;
    minutes: number;
  } | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'top' | 'reset'>('overview');
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);

  const loadAllSpatialData = useCallback(async () => {
    const [gravesRes, infraData, roadsData] = await Promise.all([
      cemeteryApi.fetchGraves(),
      cemeteryApi.fetchInfrastructures(),
      cemeteryApi.fetchRoads(),
    ]);
    setGraves(gravesRes.data);
    setInfrastructures(infraData);
    setRoads(roadsData);
  }, []);

  // Tải dữ liệu khởi tạo từ Backend PostGIS khi mở trang
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      cemeteryApi.fetchGraves(),
      cemeteryApi.fetchInfrastructures(),
      cemeteryApi.fetchRoads(),
    ]).then(([gravesRes, infraData, roadsData]) => {
      if (!isMounted) return;
      setGraves(gravesRes.data);
      setInfrastructures(infraData);
      setRoads(roadsData);
    });

    return () => {
      isMounted = false;
    };
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

  // Cấp phát mộ mới xuống PostgreSQL và đồng bộ lại toàn bộ cảnh 3D
  const handleConfirmAllocate = async (
    lotCode: string,
    status: 'Đã an táng' | 'Đã đặt trước',
    occupantName: string,
    contact: string
  ) => {
    const ok = await cemeteryApi.allocateGrave({
      ma_lo_dat: lotCode,
      trang_thai: status,
      ho_ten: occupantName,
      thong_tin_than_nhan: contact,
    });

    if (ok) {
      const { data: freshGraves } = await cemeteryApi.fetchGraves();
      setGraves(freshGraves);
      const updatedLot = freshGraves.find((g) => g.ma_lo_dat === lotCode) || null;
      if (updatedLot) setSelectedGrave(updatedLot);
    }
  };

  // Chuyển trạng thái (Xác nhận an táng hoặc Thu hồi lô) lưu trực tiếp xuống PostgreSQL
  const handleUpdateStatus = async (lotCode: string, newStatus: 'Trống' | 'Đã an táng') => {
    const current = graves.find((g) => g.ma_lo_dat === lotCode);
    const cleanedName =
      current?.nguoi_mat?.ho_ten.replace(/\s*\(Đặt trước\)\s*/g, '').trim() || 'Chưa cập nhật';

    const updatedFromApi = await cemeteryApi.updateGraveStatus(lotCode, {
      trang_thai: newStatus,
      ho_ten: newStatus === 'Trống' ? undefined : cleanedName,
      thong_tin_than_nhan: newStatus === 'Trống' ? undefined : current?.nguoi_mat?.thong_tin_than_nhan,
    });

    if (updatedFromApi) {
      const { data: freshGraves } = await cemeteryApi.fetchGraves();
      setGraves(freshGraves);
      setSelectedGrave(updatedFromApi);
    }
  };

  // Xuất file báo cáo CSV trực tiếp từ Backend PostGIS
  const handleExportCSV = () => {
    window.open(cemeteryApi.getExportCsvUrl(), '_blank');
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
            infrastructures={infrastructures}
            roads={roads}
            selectedGrave={selectedGrave}
            onSelectGrave={(grave) => {
              setSelectedGrave(grave);
              setRouteInfo(null);
            }}
            showWireframe={showWireframe}
            slopeHeatmap={slopeHeatmap}
            showSubsurface={showSubsurface}
            measureMode={measureMode}
            onMeasureResult={setMeasureResult}
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

          {/* Thông báo & kết quả chế độ đo khoảng cách 3D */}
          {measureMode && (
            <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-slate-900/95 border border-cyan-500/60 text-cyan-200 px-4 py-2 rounded-full text-xs shadow-lg z-20">
              {measureResult
                ? `Khoảng cách 3D (${measureResult.fromLot} → ${measureResult.toLot}): ${measureResult.distance3D} m (ΔH = ${measureResult.deltaZ} m)`
                : 'Chế độ đo khoảng cách đang bật: Chọn 2 lô mộ liên tiếp để xem khoảng cách không gian 3D'}
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