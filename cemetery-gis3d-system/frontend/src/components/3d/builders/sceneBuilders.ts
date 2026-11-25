import * as THREE from 'three';
import { GraveLot } from '../../../types/cemetery';
import { getTerrainHeight } from '../../../data/mockCemeteryData';
import { SharedGraveAssets, createLabelSprite } from '../utils/threeHelpers';

export function addSceneLighting(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight('#dbeafe', 0.45));
  scene.add(new THREE.HemisphereLight('#bae6fd', '#0f172a', 0.85));

  const dirLight = new THREE.DirectionalLight('#fffbeb', 1.75);
  dirLight.position.set(42, 72, 42);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.bias = -0.0004;
  dirLight.shadow.normalBias = 0.03;
  const d = 58;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 180;
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight('#38bdf8', 0.45);
  rimLight.position.set(-45, 30, -45);
  scene.add(rimLight);
}

export function createTerrainMesh(): THREE.Mesh {
  const terrainGeo = new THREE.PlaneGeometry(110, 110, 80, 80);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(terrainGeo, terrainMat);
  mesh.receiveShadow = true;
  return mesh;
}

export function updateTerrainAppearance(
  mesh: THREE.Mesh,
  showWireframe: boolean,
  slopeHeatmap: boolean,
  showSubsurface: boolean
) {
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.wireframe = showWireframe;
  mat.transparent = showSubsurface;
  mat.opacity = showSubsurface ? 0.42 : 1.0;

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
      const shade = 0.24 + Math.max(0, y * 0.028);
      colors.push(0.11, shade + 0.17, 0.19);
    }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

export function createInfrastructureGroup(): THREE.Group {
  const infraGroup = new THREE.Group();

  const gateY = getTerrainHeight(0, 42);
  const pillarGeo = new THREE.BoxGeometry(1.2, 5.5, 1.2);
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.32, metalness: 0.1 });
  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(-4.5, gateY + 2.75, 42);
  leftPillar.castShadow = true;
  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(4.5, gateY + 2.75, 42);
  rightPillar.castShadow = true;
  const gateRoof = new THREE.Mesh(
    new THREE.BoxGeometry(11.6, 0.95, 2.2),
    new THREE.MeshStandardMaterial({ color: '#0d9488', roughness: 0.4, metalness: 0.2 })
  );
  gateRoof.position.set(0, gateY + 5.8, 42);
  gateRoof.castShadow = true;
  infraGroup.add(leftPillar, rightPillar, gateRoof);

  const monY = getTerrainHeight(0, -25);
  const monBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 5.2, 0.8, 12),
    new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.65 })
  );
  monBase.position.set(0, monY + 0.4, -25);
  monBase.receiveShadow = true;
  const monTower = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 8.5, 1.8),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.28, metalness: 0.25 })
  );
  monTower.position.set(0, monY + 4.8, -25);
  monTower.castShadow = true;
  infraGroup.add(monBase, monTower);

  const roadSegments: [number, number][][] = [
    [[0, 42], [0, -22]],
    [[-18, -14], [18, -14]],
    [[-18, 6], [18, 6]],
  ];
  roadSegments.forEach(([[x1, z1], [x2, z2]]) => {
    const steps = 28;
    const roadPts: THREE.Vector3[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const rx = x1 + (x2 - x1) * t;
      const rz = z1 + (z2 - z1) * t;
      roadPts.push(new THREE.Vector3(rx, getTerrainHeight(rx, rz) + 0.08, rz));
    }
    const roadCurve = new THREE.CatmullRomCurve3(roadPts);
    const roadGeo = new THREE.TubeGeometry(roadCurve, 40, 0.8, 6, false);
    roadGeo.scale(1, 0.14, 1);
    const roadMesh = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.88 }));
    roadMesh.receiveShadow = true;
    infraGroup.add(roadMesh);
  });

  const treePositions = [
    [-32, -28], [-35, 0], [-30, 25], [32, -26], [34, 5], [28, 28], [-10, -32], [12, -32],
  ];
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 2.2, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
  const foliageGeo = new THREE.ConeGeometry(1.85, 4.6, 10);
  const foliageMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.78 });

  treePositions.forEach(([tx, tz]) => {
    const ty = getTerrainHeight(tx, tz);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(tx, ty + 1.1, tz);
    trunk.castShadow = true;
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.set(tx, ty + 3.8, tz);
    foliage.castShadow = true;
    infraGroup.add(trunk, foliage);
  });

  return infraGroup;
}

export function buildGraveUnit(
  grave: GraveLot,
  isSelected: boolean,
  showSubsurface: boolean,
  shared: SharedGraveAssets,
  maxAnisotropy: number
): { unit: THREE.Group; ring: THREE.Mesh | null } {
  const unit = new THREE.Group();
  const [gx, gy, gz] = grave.position;
  unit.position.set(gx, gy, gz);
  unit.userData = { graveData: grave };

  let wallMat = shared.wallMats.empty;
  if (grave.trang_thai === 'Đã an táng') wallMat = shared.wallMats.occupied;
  if (grave.trang_thai === 'Đã đặt trước') wallMat = shared.wallMats.reserved;
  if (isSelected) wallMat = shared.wallMats.selected;

  const groundMesh = new THREE.Mesh(shared.groundGeo, shared.groundMat);
  groundMesh.position.y = 0.11;
  groundMesh.castShadow = true;
  groundMesh.receiveShadow = true;

  const wallMesh = new THREE.Mesh(shared.wallGeo, wallMat);
  wallMesh.position.y = 0.46;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;

  const roofMesh = new THREE.Mesh(shared.roofGeo, shared.roofMat);
  roofMesh.position.set(0, 0.95, -0.82);
  roofMesh.castShadow = true;

  const labelSprite = createLabelSprite(grave.ma_lo_dat, isSelected, maxAnisotropy);
  labelSprite.position.set(0, 1.88, 0);

  unit.add(groundMesh, wallMesh, roofMesh, labelSprite);

  if (showSubsurface) {
    const depth = grave.do_sau_huyet || 2.0;
    const vaultMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, depth, 2.1), shared.vaultMat);
    vaultMesh.position.y = -depth / 2;
    unit.add(vaultMesh);
  }

  let ring: THREE.Mesh | null = null;
  if (isSelected) {
    ring = new THREE.Mesh(shared.ringGeo, shared.ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;
    unit.add(ring);
  }

  return { unit, ring };
}

export function populateRouteGroup(routeGroup: THREE.Group, routePath: [number, number, number][]) {
  const points = routePath.map(([x, y, z]) => new THREE.Vector3(x, y + 0.36, z));
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.12);
  const tubeGeo = new THREE.TubeGeometry(curve, 72, 0.22, 12, false);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: '#22d3ee',
    emissive: '#06b6d4',
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });
  routeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

  const startMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 20, 20),
    new THREE.MeshBasicMaterial({ color: '#10b981' })
  );
  startMarker.position.copy(points[0]);

  const endMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 20, 20),
    new THREE.MeshBasicMaterial({ color: '#f43f5e' })
  );
  endMarker.position.copy(points[points.length - 1]);

  routeGroup.add(startMarker, endMarker);
}