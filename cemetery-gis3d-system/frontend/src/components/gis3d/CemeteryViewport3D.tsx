'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GraveLot } from '../../types/cemetery';
import { getTerrainHeight } from '../../data/mockCemeteryData';

interface CemeteryViewport3DProps {
  graves: GraveLot[];
  selectedGrave: GraveLot | null;
  onSelectGrave: (grave: GraveLot) => void;
  showWireframe: boolean;
  slopeHeatmap: boolean;
  showSubsurface: boolean;
  measureMode?: boolean;
  onMeasureResult?: (result: { distance3D: number; deltaZ: number; from: string; to: string } | null) => void;
  routePath: [number, number, number][] | null;
  cameraPreset: 'overview' | 'top' | 'reset';
}

// Hàm tạo Sprite nhãn mã lô 3D sắc nét
function createLabelSprite(text: string, isSelected: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isSelected ? 'rgba(14, 165, 233, 0.92)' : 'rgba(15, 23, 42, 0.82)';
  ctx.beginPath();
  ctx.roundRect(28, 8, 200, 48, 14);
  ctx.fill();

  ctx.strokeStyle = isSelected ? '#bae6fd' : '#475569';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.8, 0.7, 1);
  return sprite;
}

export const CemeteryViewport3D: React.FC<CemeteryViewport3DProps> = ({
  graves,
  selectedGrave,
  onSelectGrave,
  showWireframe,
  slopeHeatmap,
  showSubsurface,
  measureMode = false,
  onMeasureResult,
  routePath,
  cameraPreset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const gravesGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const measureGroupRef = useRef<THREE.Group | null>(null);
  const targetFlyPos = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  // Refs giữ trạng thái mới nhất cho sự kiện click WebGL
  const measureModeRef = useRef(measureMode);
  const measurePointsRef = useRef<GraveLot[]>([]);
  const onSelectGraveRef = useRef(onSelectGrave);
  const onMeasureResultRef = useRef(onMeasureResult);

  useEffect(() => {
    measureModeRef.current = measureMode;
    if (!measureMode) {
      measurePointsRef.current = [];
      if (measureGroupRef.current) {
        while (measureGroupRef.current.children.length > 0) {
          measureGroupRef.current.remove(measureGroupRef.current.children[0]);
        }
      }
      onMeasureResultRef.current?.(null);
    }
  }, [measureMode]);

  useEffect(() => {
    onSelectGraveRef.current = onSelectGrave;
    onMeasureResultRef.current = onMeasureResult;
  }, [onSelectGrave, onMeasureResult]);

  // 1. Khởi tạo Scene 3D, Ánh sáng, Địa hình & Hạ tầng
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth - 320;
    const height = container.clientHeight || window.innerHeight - 56;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#091326');
    scene.fog = new THREE.FogExp2('#091326', 0.0055);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 46, 66);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 8;
    controls.maxDistance = 140;
    controlsRef.current = controls;

    // Hệ thống ánh sáng
    scene.add(new THREE.AmbientLight('#ffffff', 0.65));
    scene.add(new THREE.HemisphereLight('#e0f2fe', '#1e293b', 0.9));

    const dirLight = new THREE.DirectionalLight('#fef3c7', 1.6);
    dirLight.position.set(45, 75, 45);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 55;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Địa hình TIN / DEM
    const terrainGeo = new THREE.PlaneGeometry(110, 110, 56, 56);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainHeight(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // Hạ tầng: Cổng chính, Đài tưởng niệm & Tuyến đường trục chính
    const infraGroup = new THREE.Group();
    const gateY = getTerrainHeight(0, 42);
    const pillarGeo = new THREE.BoxGeometry(1.2, 5.5, 1.2);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35 });
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-4.5, gateY + 2.75, 42);
    leftPillar.castShadow = true;
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(4.5, gateY + 2.75, 42);
    rightPillar.castShadow = true;
    const gateRoof = new THREE.Mesh(
      new THREE.BoxGeometry(11.5, 1.0, 2.2),
      new THREE.MeshStandardMaterial({ color: '#0d9488' })
    );
    gateRoof.position.set(0, gateY + 5.8, 42);
    gateRoof.castShadow = true;
    infraGroup.add(leftPillar, rightPillar, gateRoof);

    // Đài tưởng niệm
    const monY = getTerrainHeight(0, -25);
    const monBase = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 5.2, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: '#64748b' })
    );
    monBase.position.set(0, monY + 0.4, -25);
    monBase.receiveShadow = true;
    const monTower = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 8.5, 1.8),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.2 })
    );
    monTower.position.set(0, monY + 4.8, -25);
    monTower.castShadow = true;
    infraGroup.add(monBase, monTower);

    // Trục đường nội bộ chính bám theo địa hình
    const roadSegments: [number, number][][] = [
      [[0, 42], [0, -22]],
      [[-18, -14], [18, -14]],
      [[-18, 6], [18, 6]],
    ];
    roadSegments.forEach(([[x1, z1], [x2, z2]]) => {
      const steps = 20;
      const roadPts: THREE.Vector3[] = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const rx = x1 + (x2 - x1) * t;
        const rz = z1 + (z2 - z1) * t;
        roadPts.push(new THREE.Vector3(rx, getTerrainHeight(rx, rz) + 0.08, rz));
      }
      const roadCurve = new THREE.CatmullRomCurve3(roadPts);
      const roadGeo = new THREE.TubeGeometry(roadCurve, 32, 0.75, 4, false);
      roadGeo.scale(1, 0.15, 1);
      const roadMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9 });
      infraGroup.add(new THREE.Mesh(roadGeo, roadMat));
    });

    // Cây cảnh quan
    const treePositions = [
      [-32, -28], [-35, 0], [-30, 25], [32, -26], [34, 5], [28, 28], [-10, -32], [12, -32],
    ];
    treePositions.forEach(([tx, tz]) => {
      const ty = getTerrainHeight(tx, tz);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 2.2),
        new THREE.MeshStandardMaterial({ color: '#92400e' })
      );
      trunk.position.set(tx, ty + 1.1, tz);
      trunk.castShadow = true;
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 4.5, 8),
        new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.75 })
      );
      foliage.position.set(tx, ty + 3.8, tz);
      foliage.castShadow = true;
      infraGroup.add(trunk, foliage);
    });
    scene.add(infraGroup);

    const gravesGroup = new THREE.Group();
    scene.add(gravesGroup);
    gravesGroupRef.current = gravesGroup;

    const routeGroup = new THREE.Group();
    scene.add(routeGroup);
    routeGroupRef.current = routeGroup;

    const measureGroup = new THREE.Group();
    scene.add(measureGroup);
    measureGroupRef.current = measureGroup;

    // Raycaster xử lý chọn mộ hoặc đo khoảng cách 3D
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(gravesGroup.children, true);
      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.graveData) {
          hitObj = hitObj.parent;
        }
        const clickedGrave: GraveLot | undefined = hitObj?.userData?.graveData;
        if (!clickedGrave) return;

        // Nếu đang bật chế độ Đo khoảng cách 3D
        if (measureModeRef.current) {
          const pts = measurePointsRef.current;
          if (pts.length >= 2) pts.length = 0;
          pts.push(clickedGrave);

          while (measureGroup.children.length > 0) {
            measureGroup.remove(measureGroup.children[0]);
          }

          pts.forEach((g) => {
            const marker = new THREE.Mesh(
              new THREE.SphereGeometry(0.45, 16, 16),
              new THREE.MeshBasicMaterial({ color: '#f43f5e' })
            );
            marker.position.set(g.position[0], g.position[1] + 1.2, g.position[2]);
            measureGroup.add(marker);
          });

          if (pts.length === 2) {
            const [p1, p2] = pts;
            const v1 = new THREE.Vector3(p1.position[0], p1.position[1] + 1.2, p1.position[2]);
            const v2 = new THREE.Vector3(p2.position[0], p2.position[1] + 1.2, p2.position[2]);
            const lineGeo = new THREE.BufferGeometry().setFromPoints([v1, v2]);
            const lineMat = new THREE.LineBasicMaterial({ color: '#f43f5e' });
            measureGroup.add(new THREE.Line(lineGeo, lineMat));

            const dist3D = Number(v1.distanceTo(v2).toFixed(2));
            const deltaZ = Number((p2.cao_do_z - p1.cao_do_z).toFixed(2));
            onMeasureResultRef.current?.({
              distance3D: dist3D,
              deltaZ,
              from: p1.ma_lo_dat,
              to: p2.ma_lo_dat,
            });
          }
          return;
        }

        // Chế độ xem chi tiết thông thường
        onSelectGraveRef.current(clickedGrave);
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (targetFlyPos.current) {
        camera.position.lerp(targetFlyPos.current.pos, 0.06);
        controls.target.lerp(targetFlyPos.current.target, 0.06);
        if (camera.position.distanceTo(targetFlyPos.current.pos) < 0.2) {
          targetFlyPos.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 2. Cập nhật địa hình TIN & Bản đồ nhiệt độ cao
  useEffect(() => {
    const mesh = terrainMeshRef.current;
    if (!mesh) return;

    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.wireframe = showWireframe;
    mat.transparent = showSubsurface;
    mat.opacity = showSubsurface ? 0.45 : 1.0;

    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (slopeHeatmap) {
        const norm = Math.max(0, Math.min(1, (y + 3) / 7));
        const c = new THREE.Color().setHSL(0.38 - norm * 0.38, 0.85, 0.48);
        colors.push(c.r, c.g, c.b);
      } else {
        const shade = 0.26 + Math.max(0, y * 0.025);
        colors.push(0.13, shade + 0.18, 0.20);
      }
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }, [showWireframe, slopeHeatmap, showSubsurface]);

  // 3. Render khối mộ SUDM + Nhãn mã lô 3D
  useEffect(() => {
    const group = gravesGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    graves.forEach((grave) => {
      const graveUnit = new THREE.Group();
      const [gx, gy, gz] = grave.position;
      graveUnit.position.set(gx, gy, gz);
      graveUnit.userData = { graveData: grave };

      const isSelected = selectedGrave?.ma_lo_dat === grave.ma_lo_dat;

      let wallColor = '#10b981';
      if (grave.trang_thai === 'Đã an táng') wallColor = '#94a3b8';
      if (grave.trang_thai === 'Đã đặt trước') wallColor = '#f59e0b';
      if (isSelected) wallColor = '#38bdf8';

      // GroundSurface
      const groundMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.22, 2.5),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 })
      );
      groundMesh.position.y = 0.11;
      groundMesh.castShadow = true;
      groundMesh.receiveShadow = true;

      // WallSurface
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.48, 2.2),
        new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.4, metalness: 0.15 })
      );
      wallMesh.position.y = 0.46;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;

      // RoofSurface
      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.75, 0.24),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.6 })
      );
      roofMesh.position.set(0, 0.95, -0.82);
      roofMesh.castShadow = true;

      // Nhãn mã lô 3D nổi trên đầu bia mộ
      const labelSprite = createLabelSprite(grave.ma_lo_dat, isSelected);
      labelSprite.position.set(0, 1.85, 0);

      graveUnit.add(groundMesh, wallMesh, roofMesh, labelSprite);

      if (showSubsurface) {
        const depth = grave.do_sau_huyet || 2.0;
        const vaultMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, depth, 2.1),
          new THREE.MeshBasicMaterial({ color: '#c084fc', wireframe: true, transparent: true, opacity: 0.75 })
        );
        vaultMesh.position.y = -depth / 2;
        graveUnit.add(vaultMesh);
      }

      if (isSelected) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.6, 1.95, 32),
          new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;
        graveUnit.add(ring);
      }

      group.add(graveUnit);
    });
  }, [graves, selectedGrave, showSubsurface]);

  // 4. Vẽ đường dẫn 3D + Điểm đánh dấu đầu/cuối
  useEffect(() => {
    const rGroup = routeGroupRef.current;
    if (!rGroup) return;

    while (rGroup.children.length > 0) {
      rGroup.remove(rGroup.children[0]);
    }

    if (routePath && routePath.length >= 2) {
      const points = routePath.map(([x, y, z]) => new THREE.Vector3(x, y + 0.35, z));
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.24, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
      rGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

      // Điểm xuất phát (Cổng) & Điểm đích
      const startMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#10b981' })
      );
      startMarker.position.copy(points[0]);
      const endMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#f43f5e' })
      );
      endMarker.position.copy(points[points.length - 1]);
      rGroup.add(startMarker, endMarker);
    }
  }, [routePath]);

  // 5. FlyTo
  useEffect(() => {
    if (selectedGrave && !measureMode) {
      const [gx, gy, gz] = selectedGrave.position;
      targetFlyPos.current = {
        pos: new THREE.Vector3(gx + 9, gy + 11, gz + 13),
        target: new THREE.Vector3(gx, gy + 0.5, gz),
      };
    }
  }, [selectedGrave, measureMode]);

  // 6. Preset Camera
  useEffect(() => {
    if (cameraPreset === 'top') {
      targetFlyPos.current = {
        pos: new THREE.Vector3(0, 88, 0.1),
        target: new THREE.Vector3(0, 0, 0),
      };
    } else if (cameraPreset === 'reset' || cameraPreset === 'overview') {
      targetFlyPos.current = {
        pos: new THREE.Vector3(0, 46, 66),
        target: new THREE.Vector3(0, 0, 0),
      };
    }
  }, [cameraPreset]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[500px] ${measureMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
    />
  );
};