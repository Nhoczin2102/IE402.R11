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
  routePath: [number, number, number][] | null;
  cameraPreset: 'overview' | 'top' | 'reset';
}

export const CemeteryViewport3D: React.FC<CemeteryViewport3DProps> = ({
  graves,
  selectedGrave,
  onSelectGrave,
  showWireframe,
  slopeHeatmap,
  showSubsurface,
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
  const targetFlyPos = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  // 1. Khởi tạo Scene 3D, Ánh sáng, Môi trường & Hạ tầng cố định
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070d19');
    scene.fog = new THREE.FogExp2('#070d19', 0.0075);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 48, 68);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 8;
    controls.maxDistance = 130;
    controlsRef.current = controls;

    // Hệ thống ánh sáng chân thực
    const hemiLight = new THREE.HemisphereLight('#e0f2fe', '#1e293b', 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fef3c7', 1.4);
    dirLight.position.set(45, 75, 45);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 200;
    const d = 55;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Dựng địa hình TIN / DEM
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
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // Cổng chính & Đài tưởng niệm trung tâm (Hạ tầng)
    const infraGroup = new THREE.Group();
    // Cổng chào tại (0, y, 42)
    const gateY = getTerrainHeight(0, 42);
    const pillarGeo = new THREE.BoxGeometry(1.2, 5.5, 1.2);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.4 });
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-4.5, gateY + 2.75, 42);
    leftPillar.castShadow = true;
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(4.5, gateY + 2.75, 42);
    rightPillar.castShadow = true;
    const gateRoof = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.0, 2.2), new THREE.MeshStandardMaterial({ color: '#0f766e' }));
    gateRoof.position.set(0, gateY + 5.8, 42);
    gateRoof.castShadow = true;
    infraGroup.add(leftPillar, rightPillar, gateRoof);

    // Đài tưởng niệm trung tâm tại (0, y, -25)
    const monY = getTerrainHeight(0, -25);
    const monBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.2, 0.8, 8), new THREE.MeshStandardMaterial({ color: '#475569' }));
    monBase.position.set(0, monY + 0.4, -25);
    monBase.receiveShadow = true;
    const monTower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.5, 1.8), new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.2 }));
    monTower.position.set(0, monY + 4.8, -25);
    monTower.castShadow = true;
    infraGroup.add(monBase, monTower);

    // Trồng cây cảnh quan xung quanh khuôn viên
    const treePositions = [
      [-32, -28], [-35, 0], [-30, 25], [32, -26], [34, 5], [28, 28], [-10, -32], [12, -32],
    ];
    treePositions.forEach(([tx, tz]) => {
      const ty = getTerrainHeight(tx, tz);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2), new THREE.MeshStandardMaterial({ color: '#78350f' }));
      trunk.position.set(tx, ty + 1.1, tz);
      trunk.castShadow = true;
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.5, 8), new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 }));
      foliage.position.set(tx, ty + 3.8, tz);
      foliage.castShadow = true;
      infraGroup.add(trunk, foliage);
    });
    scene.add(infraGroup);

    // Nhóm chứa các khối mộ SUDM và Tuyến đường
    const gravesGroup = new THREE.Group();
    scene.add(gravesGroup);
    gravesGroupRef.current = gravesGroup;

    const routeGroup = new THREE.Group();
    scene.add(routeGroup);
    routeGroupRef.current = routeGroup;

    // Xử lý Raycaster click chọn ngôi mộ
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
        if (hitObj?.userData?.graveData) {
          onSelectGrave(hitObj.userData.graveData);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Vòng lặp Render & Hiệu ứng FlyTo mượt mà
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

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animId);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // 2. Cập nhật chế độ hiển thị Địa hình (Wireframe TIN & Bản đồ nhiệt độ cao)
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
        const c = new THREE.Color().setHSL(0.38 - norm * 0.38, 0.85, 0.45);
        colors.push(c.r, c.g, c.b);
      } else {
        // Xanh rêu tự nhiên có đổ bóng theo độ cao
        const shade = 0.22 + Math.max(0, y * 0.02);
        colors.push(0.11, shade + 0.14, 0.16);
      }
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }, [showWireframe, slopeHeatmap, showSubsurface]);

  // 3. Render danh sách các Khối Mộ chuẩn B-Rep/SUDM
  useEffect(() => {
    const group = gravesGroupRef.current;
    if (!group) return;

    // Xóa các đối tượng cũ
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    graves.forEach((grave) => {
      const graveUnit = new THREE.Group();
      const [gx, gy, gz] = grave.position;
      graveUnit.position.set(gx, gy, gz);
      graveUnit.userData = { graveData: grave };

      const isSelected = selectedGrave?.ma_lo_dat === grave.ma_lo_dat;

      // Màu sắc WallSurface theo trạng thái quy hoạch
      let wallColor = '#10b981'; // Trống -> Xanh ngọc
      if (grave.trang_thai === 'Đã an táng') wallColor = '#64748b'; // Đã an táng -> Đá xám
      if (grave.trang_thai === 'Đã đặt trước') wallColor = '#f59e0b'; // Đặt trước -> Vàng hổ phách
      if (isSelected) wallColor = '#38bdf8'; // Đang chọn -> Xanh dương sáng

      // Tầng 1 SUDM: GroundSurface (Bệ móng tiếp đất)
      const groundMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.22, 2.5),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 })
      );
      groundMesh.position.y = 0.11;
      groundMesh.castShadow = true;
      groundMesh.receiveShadow = true;

      // Tầng 2 SUDM: WallSurface (Thân lăng mộ)
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.48, 2.2),
        new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.45, metalness: 0.15 })
      );
      wallMesh.position.y = 0.46;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;

      // Tầng 3 SUDM: RoofSurface (Bia đá & Nắp mộ)
      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.75, 0.24),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.6 })
      );
      roofMesh.position.set(0, 0.95, -0.82);
      roofMesh.castShadow = true;

      graveUnit.add(groundMesh, wallMesh, roofMesh);

      // Tầng Ngầm (Subsurface): Hiển thị thể tích huyệt mộ âm dưới trục Z khi bật chế độ xuyên đất
      if (showSubsurface) {
        const depth = grave.do_sau_huyet || 2.0;
        const vaultMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, depth, 2.1),
          new THREE.MeshBasicMaterial({ color: '#a855f7', wireframe: true, transparent: true, opacity: 0.65 })
        );
        vaultMesh.position.y = -depth / 2;
        graveUnit.add(vaultMesh);
      }

      // Vòng hào quang nhận diện khi đang chọn mộ
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

  // 4. Vẽ tuyến đường dẫn 3D (Network Model)
  useEffect(() => {
    const rGroup = routeGroupRef.current;
    if (!rGroup) return;

    while (rGroup.children.length > 0) {
      rGroup.remove(rGroup.children[0]);
    }

    if (routePath && routePath.length >= 2) {
      const points = routePath.map(([x, y, z]) => new THREE.Vector3(x, y + 0.35, z));
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.22, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: '#06b6d4' });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      rGroup.add(tubeMesh);
    }
  }, [routePath]);

  // 5. Kích hoạt FlyTo khi người dùng chọn mộ từ danh sách hoặc click 3D
  useEffect(() => {
    if (selectedGrave) {
      const [gx, gy, gz] = selectedGrave.position;
      targetFlyPos.current = {
        pos: new THREE.Vector3(gx + 9, gy + 11, gz + 13),
        target: new THREE.Vector3(gx, gy + 0.5, gz),
      };
    }
  }, [selectedGrave]);

  // 6. Xử lý các Preset góc nhìn Camera
  useEffect(() => {
    if (cameraPreset === 'top') {
      targetFlyPos.current = {
        pos: new THREE.Vector3(0, 88, 0.1),
        target: new THREE.Vector3(0, 0, 0),
      };
    } else if (cameraPreset === 'reset' || cameraPreset === 'overview') {
      targetFlyPos.current = {
        pos: new THREE.Vector3(0, 48, 68),
        target: new THREE.Vector3(0, 0, 0),
      };
    }
  }, [cameraPreset]);

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};