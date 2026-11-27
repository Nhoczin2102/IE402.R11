import * as THREE from 'three';
import { createProceduralTexture, createLabelTexture } from '../utils/threeHelpers';
import { getTerrainHeight } from './terrainBuilder';
import { InfrastructureItem, RoadSegmentItem } from '../../../services/cemeteryApi';

function getPolygonBounds(geojson?: InfrastructureItem['geojson']) {
  const ring = geojson?.coordinates?.[0]?.[0];
  if (!ring || ring.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const pt of ring) {
    const [x, z] = pt;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: Math.max(maxX - minX, 2),
    depth: Math.max(maxZ - minZ, 2),
  };
}

function createTerrainConformingStrip(
  width: number,
  height: number,
  length: number,
  segments: number,
  material: THREE.Material,
  centerX: number,
  centerZ: number,
  rotationY: number,
  yOffset: number
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, length, 2, 1, segments);
  const pos = geo.attributes.position;
  const cosR = Math.cos(rotationY);
  const sinR = Math.sin(rotationY);

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const lz = pos.getZ(i);

    const wx = centerX + lx * cosR + lz * sinR;
    const wz = centerZ - lx * sinR + lz * cosR;
    const groundY = getTerrainHeight(wx, wz);

    pos.setY(i, ly + groundY + yOffset);
  }

  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

export function createInfrastructureGroup(
  infrastructures: InfrastructureItem[] = [],
  roads: RoadSegmentItem[] = [],
  maxAnisotropy = 4
): THREE.Group {
  const group = new THREE.Group();

  const roadTex = createProceduralTexture('road', '#334155', '#475569', 2, 22);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.9,
    metalness: 0.02,
  });

  const crossRoadTex = createProceduralTexture('road', '#334155', '#475569', 22, 2);
  const crossRoadMat = new THREE.MeshStandardMaterial({
    map: crossRoadTex,
    roughness: 0.9,
    metalness: 0.02,
  });

  const curbMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.82,
    metalness: 0.05,
  });

  // Trục đường chính Bắc - Nam bám sát địa hình
  const mainRoad = createTerrainConformingStrip(5.2, 0.08, 92, 64, roadMat, 0, 0, 0, 0.05);
  group.add(mainRoad);

  // Trục đường ngang Đông - Tây bám sát địa hình
  const crossRoad = createTerrainConformingStrip(92, 0.08, 4.4, 64, crossRoadMat, 0, 0, Math.PI / 2, 0.05);
  group.add(crossRoad);

  // Bó vỉa hai bên trục đường chính
  [-2.75, 2.75].forEach((x) => {
    const curb = createTerrainConformingStrip(0.28, 0.14, 92, 64, curbMat, x, 0, 0, 0.08);
    curb.castShadow = true;
    group.add(curb);
  });

  // Tuyến đường nhánh từ bảng tuyen_giao_thong (PostGIS) bám sát địa hình
  roads
    .filter((r) => r.loai_duong !== 'TRUC_CHINH')
    .forEach((road) => {
      const coords = road.geojson?.coordinates || [];
      const roadWidth = Number(road.chieu_rong_duong) || 3.5;

      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, z1] = coords[i];
        const [x2, z2] = coords[i + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const len = Math.hypot(dx, dz);
        if (len < 0.2) continue;

        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const angle = Math.atan2(dx, dz);
        const segSteps = Math.max(4, Math.ceil(len / 1.5));

        const segMesh = createTerrainConformingStrip(
          roadWidth,
          0.07,
          len,
          segSteps,
          roadMat,
          midX,
          midZ,
          angle,
          0.05
        );
        group.add(segMesh);
      }
    });

  // Công trình hạ tầng 3D từ bảng ha_tang (PostGIS)
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.55, metalness: 0.15 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.6, metalness: 0.1 });
  const monumentMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35, metalness: 0.25 });
  const waterMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.15, metalness: 0.6 });
  const bufferRingMat = new THREE.MeshBasicMaterial({
    color: '#f59e0b',
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });

  infrastructures.forEach((item) => {
    const bounds = getPolygonBounds(item.geojson);
    if (!bounds) return;

    const { centerX, centerZ, width, depth } = bounds;
    const height = Math.min(Number(item.chieu_cao_3d) || 6, 15);
    const groundY = getTerrainHeight(centerX, centerZ);
    const infraUnit = new THREE.Group();
    infraUnit.position.set(centerX, groundY, centerZ);

    if (item.loai_ha_tang === 'CONG') {
      const pillarGeo = new THREE.BoxGeometry(1.1, height * 0.78, 1.1);
      const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
      leftPillar.position.set(-width * 0.38, (height * 0.78) / 2, 0);
      leftPillar.castShadow = true;

      const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
      rightPillar.position.set(width * 0.38, (height * 0.78) / 2, 0);
      rightPillar.castShadow = true;

      const beam = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 1.1, 1.4), roofMat);
      beam.position.set(0, height * 0.82, 0);
      beam.castShadow = true;

      const topRoof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.8, 1.6), roofMat);
      topRoof.position.set(0, height * 0.94, 0);

      infraUnit.add(leftPillar, rightPillar, beam, topRoof);
    } else if (item.loai_ha_tang === 'DAI_TUONG_NIEM') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.55, width * 0.65, 1.2, 24), stoneMat);
      base.position.y = 0.6;
      base.receiveShadow = true;

      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.45, height - 1.2, 4), monumentMat);
      obelisk.position.y = 1.2 + (height - 1.2) / 2;
      obelisk.castShadow = true;

      infraUnit.add(base, obelisk);
    } else if (item.loai_ha_tang === 'NHA_TANG_LE') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.65, depth), stoneMat);
      body.position.y = (height * 0.65) / 2;
      body.castShadow = true;
      body.receiveShadow = true;

      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.72, height * 0.35, 4), roofMat);
      roof.position.y = height * 0.65 + (height * 0.35) / 2;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;

      infraUnit.add(body, roof);
    } else {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.45, width * 0.45, 0.25, 24), waterMat);
      basin.position.y = 0.13;
      basin.receiveShadow = true;
      infraUnit.add(basin);
    }

    const bufferR = Number(item.ban_kinh_cach_ly) || 0;
    if (bufferR > 0) {
      const ringGeo = new THREE.RingGeometry(bufferR - 0.15, bufferR, 36);
      const ringMesh = new THREE.Mesh(ringGeo, bufferRingMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.04;
      infraUnit.add(ringMesh);
    }

    const labelTex = createLabelTexture(item.ten_ha_tang, maxAnisotropy);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
    sprite.position.set(0, height + 1.4, 0);
    sprite.scale.set(6.5, 1.6, 1);
    infraUnit.add(sprite);

    group.add(infraUnit);
  });

  // Hàng cây cảnh quan dọc trục đường
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
  const foliageMatA = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.78, metalness: 0.02 });
  const foliageMatB = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.82, metalness: 0.02 });

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 1.8, 10);
  const tier1Geo = new THREE.ConeGeometry(1.45, 2.2, 12);
  const tier2Geo = new THREE.ConeGeometry(1.12, 1.9, 12);
  const tier3Geo = new THREE.ConeGeometry(0.75, 1.5, 12);

  const treeCoords: [number, number][] = [
    [-4.8, -26], [4.8, -26],
    [-4.8, -14], [4.8, -14],
    [-4.8, 14], [4.8, 14],
    [-4.8, 26], [4.8, 26],
    [-26, -4.4], [-26, 4.4],
    [26, -4.4], [26, 4.4],
  ];

  treeCoords.forEach(([tx, tz], idx) => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    const t1 = new THREE.Mesh(tier1Geo, foliageMatB);
    t1.position.y = 2.3;
    t1.castShadow = true;
    t1.receiveShadow = true;

    const t2 = new THREE.Mesh(tier2Geo, foliageMatA);
    t2.position.y = 3.35;
    t2.castShadow = true;
    t2.receiveShadow = true;

    const t3 = new THREE.Mesh(tier3Geo, foliageMatA);
    t3.position.y = 4.25;
    t3.castShadow = true;

    tree.add(trunk, t1, t2, t3);
    const scale = 0.9 + (idx % 3) * 0.12;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = idx * 0.8;
    tree.position.set(tx, getTerrainHeight(tx, tz), tz);
    group.add(tree);
  });

  // Cột đèn chiếu sáng dọc trục chính
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.75 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#facc15',
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.4, 10);
  const armGeo = new THREE.BoxGeometry(0.75, 0.08, 0.08);
  const bulbGeo = new THREE.SphereGeometry(0.18, 14, 14);

  const lampCoords: [number, number, number][] = [
    [-3.2, -20, 1], [3.2, -20, -1],
    [-3.2, -7, 1], [3.2, -7, -1],
    [-3.2, 7, 1], [3.2, 7, -1],
    [-3.2, 20, 1], [3.2, 20, -1],
  ];

  lampCoords.forEach(([lx, lz, dir]) => {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.2;
    pole.castShadow = true;

    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(dir * 0.35, 4.35, 0);

    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(dir * 0.68, 4.22, 0);

    lamp.add(pole, arm, bulb);
    lamp.position.set(lx, getTerrainHeight(lx, lz), lz);
    group.add(lamp);
  });

  const gridHelper = new THREE.GridHelper(120, 40, '#1e293b', '#0f172a');
  gridHelper.position.y = 0.005;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.2;
  group.add(gridHelper);

  return group;
}