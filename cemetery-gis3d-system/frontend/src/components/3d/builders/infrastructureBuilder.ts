import * as THREE from 'three';
import { InfrastructureItem, RoadSegmentItem } from '../../../services/cemeteryApi';
import { getTerrainHeight } from './terrainBuilder';

function extractPolygonRing(geojson: InfrastructureItem['geojson']): [number, number][] {
  if (!geojson?.coordinates) return [];
  if (geojson.type === 'MultiPolygon') {
    const coords = geojson.coordinates as number[][][][];
    return (coords[0]?.[0] || []).map((p) => [Number(p[0]), Number(p[1])]);
  }
  if (geojson.type === 'Polygon') {
    const coords = geojson.coordinates as number[][][];
    return (coords[0] || []).map((p) => [Number(p[0]), Number(p[1])]);
  }
  return [];
}

function getRingCentroid(ring: [number, number][]): [number, number] {
  if (ring.length === 0) return [0, 0];
  const pts =
    ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  const cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
  const cz = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
  return [cx, cz];
}

function getRingBounds(ring: [number, number][]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

function createExtrudedFootprint(
  ring: [number, number][],
  height: number,
  material: THREE.Material,
  yOffset = -0.2,
  castShadow = true
): THREE.Mesh | null {
  if (ring.length < 3) return null;
  const shape = new THREE.Shape();
  ring.forEach(([x, z], idx) => {
    // Khi xoay -PI/2 quanh trục X: (shapeX, shapeY) -> (x, 0, -shapeY)
    if (idx === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);

  const [cx, cz] = getRingCentroid(ring);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = getTerrainHeight(cx, cz) + yOffset;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function buildGate3D(
  ring: [number, number][],
  height: number,
  pillarMat: THREE.Material,
  roofMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  const [cx, cz] = getRingCentroid(ring);
  const { width, depth } = getRingBounds(ring);
  const baseY = getTerrainHeight(cx, cz);

  const pillarGeo = new THREE.BoxGeometry(1.1, height, 1.1);
  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(cx - width / 2 + 0.8, baseY + height / 2, cz);
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;

  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(cx + width / 2 - 0.8, baseY + height / 2, cz);
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;

  const beamGeo = new THREE.BoxGeometry(width + 0.8, 1.0, Math.max(depth, 2.4));
  const beam = new THREE.Mesh(beamGeo, roofMat);
  beam.position.set(cx, baseY + height + 0.3, cz);
  beam.castShadow = true;

  const topRoofGeo = new THREE.BoxGeometry(width * 0.72, 0.7, Math.max(depth * 0.8, 1.8));
  const topRoof = new THREE.Mesh(topRoofGeo, roofMat);
  topRoof.position.set(cx, baseY + height + 1.1, cz);
  topRoof.castShadow = true;

  grp.add(leftPillar, rightPillar, beam, topRoof);
  return grp;
}

function buildMonument3D(
  ring: [number, number][],
  height: number,
  stoneMat: THREE.Material,
  accentMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  const [cx, cz] = getRingCentroid(ring);
  const baseY = getTerrainHeight(cx, cz);

  const basePlaza = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.8, 0.6, 32), stoneMat);
  basePlaza.position.set(cx, baseY + 0.2, cz);
  basePlaza.receiveShadow = true;

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.0, 2.2, 16), stoneMat);
  pedestal.position.set(cx, baseY + 1.5, cz);
  pedestal.castShadow = true;

  const obeliskHeight = Math.max(8, height - 2.8);
  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.6, obeliskHeight, 8), accentMat);
  obelisk.position.set(cx, baseY + 2.6 + obeliskHeight / 2, cz);
  obelisk.castShadow = true;

  grp.add(basePlaza, pedestal, obelisk);
  return grp;
}

function buildBuilding3D(
  ring: [number, number][],
  height: number,
  wallMat: THREE.Material,
  roofMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  const [cx, cz] = getRingCentroid(ring);
  const { width, depth } = getRingBounds(ring);
  const baseY = getTerrainHeight(cx, cz);

  const bodyHeight = Math.max(3, height - 1.8);
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, depth), wallMat);
  body.position.set(cx, baseY + bodyHeight / 2, cz);
  body.castShadow = true;
  body.receiveShadow = true;

  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(width, depth) * 0.54, 2.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(cx, baseY + bodyHeight + 1.1, cz);
  roof.castShadow = true;

  grp.add(body, roof);
  return grp;
}

function buildTree3D(
  cx: number,
  cz: number,
  height: number,
  isBig: boolean,
  trunkMat: THREE.Material,
  foliageMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  const baseY = getTerrainHeight(cx, cz);
  const trunkH = isBig ? height * 0.35 : height * 0.4;
  const trunkR = isBig ? 0.55 : 0.25;
  const canopyR = isBig ? 4.0 : 1.7;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.75, trunkR, trunkH, 8), trunkMat);
  trunk.position.set(cx, baseY + trunkH / 2, cz);
  trunk.castShadow = true;

  const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(canopyR, 1), foliageMat);
  canopy.position.set(cx, baseY + trunkH + canopyR * 0.72, cz);
  canopy.castShadow = true;
  canopy.receiveShadow = true;

  grp.add(trunk, canopy);
  return grp;
}

function buildRoadRibbon(road: RoadSegmentItem, roadMat: THREE.Material): THREE.Group | null {
  const coords = road.geojson?.coordinates;
  if (!coords || coords.length < 2) return null;

  const grp = new THREE.Group();
  const width = Number(road.chieu_rong_duong) || 3.0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, z1] = coords[i];
    const [x2, z2] = coords[i + 1];
    const y1 = getTerrainHeight(x1, z1) + 0.08;
    const y2 = getTerrainHeight(x2, z2) + 0.08;

    const p1 = new THREE.Vector3(x1, y1, z1);
    const p2 = new THREE.Vector3(x2, y2, z2);
    const len = p1.distanceTo(p2);
    if (len < 0.05) continue;

    const segGeo = new THREE.BoxGeometry(width, 0.12, len + 0.25);
    const segMesh = new THREE.Mesh(segGeo, roadMat);
    segMesh.position.copy(p1).add(p2).multiplyScalar(0.5);
    segMesh.lookAt(p2);
    segMesh.receiveShadow = true;
    grp.add(segMesh);
  }

  return grp;
}

export function createInfrastructureGroup(
  infrastructures: InfrastructureItem[] = [],
  roads: RoadSegmentItem[] = [],
  _maxAnisotropy = 4
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CemeteryInfrastructureGroup';

  // Vật liệu dùng chung để tối ưu draw call & bộ nhớ GPU
  const roadMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9, metalness: 0.05 });
  const parkingMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.92, metalness: 0.05 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.75, metalness: 0.15 });
  const gatePillarMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.6, metalness: 0.1 });
  const gateRoofMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.5, metalness: 0.2 });
  const monumentStoneMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.55, metalness: 0.15 });
  const monumentAccentMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.35, metalness: 0.6 });
  const buildingWallMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7, metalness: 0.05 });
  const buildingRoofMat = new THREE.MeshStandardMaterial({ color: '#3730a3', roughness: 0.6, metalness: 0.15 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.95 });
  const foliageBigMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.85 });
  const foliageMedMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.85 });
  const bushMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.9 });

  // 1. Dựng 10 tuyến đường giao thông nội bộ
  for (const road of roads) {
    const ribbon = buildRoadRibbon(road, roadMat);
    if (ribbon) group.add(ribbon);
  }

  // Gom tọa độ 165 bụi cây để dựng bằng 1 InstancedMesh duy nhất
  const bushPositions: [number, number, number][] = [];

  // 2. Dựng 187 đối tượng hạ tầng theo tiền tố ma_ha_tang
  for (const inf of infrastructures) {
    const id = inf.ma_ha_tang || '';
    const height = Number(inf.chieu_cao_3d) || 2.0;
    const ring = extractPolygonRing(inf.geojson);
    if (ring.length < 3) continue;

    if (id.startsWith('HT-BUSH')) {
      const [cx, cz] = getRingCentroid(ring);
      bushPositions.push([cx, getTerrainHeight(cx, cz) + height / 2 - 0.1, cz]);
      continue;
    }

    if (id.startsWith('HT-FENCE')) {
      const fence = createExtrudedFootprint(ring, height || 2.4, fenceMat, -0.25, true);
      if (fence) group.add(fence);
    } else if (id.startsWith('HT-PARK')) {
      const park = createExtrudedFootprint(ring, 0.25, parkingMat, -0.05, false);
      if (park) group.add(park);
    } else if (id.startsWith('HT-GATE')) {
      group.add(buildGate3D(ring, height || 6.0, gatePillarMat, gateRoofMat));
    } else if (id.startsWith('HT-MON')) {
      group.add(buildMonument3D(ring, height || 15.0, monumentStoneMat, monumentAccentMat));
    } else if (id.startsWith('HT-BLD')) {
      group.add(buildBuilding3D(ring, height || 7.5, buildingWallMat, buildingRoofMat));
    } else if (id.startsWith('HT-BIGTREE')) {
      const [cx, cz] = getRingCentroid(ring);
      group.add(buildTree3D(cx, cz, height || 14.0, true, trunkMat, foliageBigMat));
    } else if (id.startsWith('HT-TREE')) {
      const [cx, cz] = getRingCentroid(ring);
      group.add(buildTree3D(cx, cz, height || 5.5, false, trunkMat, foliageMedMat));
    }
  }

  // 3. InstancedMesh cho 165 bụi cây vuông sát tường (60 FPS)
  if (bushPositions.length > 0) {
    const bushGeo = new THREE.BoxGeometry(2.2, 1.2, 2.2);
    const bushInstanced = new THREE.InstancedMesh(bushGeo, bushMat, bushPositions.length);
    const dummy = new THREE.Object3D();

    bushPositions.forEach(([x, y, z], index) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      bushInstanced.setMatrixAt(index, dummy.matrix);
    });

    bushInstanced.instanceMatrix.needsUpdate = true;
    bushInstanced.castShadow = true;
    bushInstanced.receiveShadow = true;
    group.add(bushInstanced);
  }

  return group;
}