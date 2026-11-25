import * as THREE from 'three';
import { GraveLot } from '../../../types/cemetery';
import { SharedGraveAssets, createLabelTexture, createProceduralTexture } from '../utils/threeHelpers';

export function getTerrainHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  return dist > 44 ? Math.sin(x * 0.06) * Math.cos(z * 0.06) * 0.85 : 0;
}

export function addSceneLighting(scene: THREE.Scene): void {
  const hemiLight = new THREE.HemisphereLight('#dbeafe', '#0f172a', 0.9);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight('#fffbeb', 1.9);
  dirLight.position.set(42, 68, 36);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 180;
  const d = 62;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0004;
  dirLight.shadow.normalBias = 0.025;
  dirLight.shadow.radius = 2.5;
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight('#60a5fa', 0.7);
  rimLight.position.set(-45, 32, -40);
  scene.add(rimLight);
}

export function createTerrainMesh(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(140, 140, 96, 96);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    color.set('#142826');
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const grassTex = createProceduralTexture('grass', '#183631', '#1f463f', 24, 24);

  const mat = new THREE.MeshStandardMaterial({
    map: grassTex,
    color: '#ffffff',
    roughness: 0.88,
    metalness: 0.03,
    vertexColors: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = 0;
  return mesh;
}

export function updateTerrainAppearance(
  terrainMesh: THREE.Mesh,
  showWireframe: boolean,
  slopeHeatmap: boolean,
  showSubsurface: boolean
): void {
  const mat = terrainMesh.material as THREE.MeshStandardMaterial;
  const geo = terrainMesh.geometry;
  const pos = geo.attributes.position;
  const colorAttr = geo.attributes.color as THREE.BufferAttribute;

  mat.wireframe = showWireframe;
  mat.transparent = showSubsurface;
  mat.opacity = showSubsurface ? 0.35 : 1.0;
  mat.depthWrite = !showSubsurface;

  if (slopeHeatmap && colorAttr) {
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((y + 1.0) / 2.0, 0, 1);
      c.setHSL((1 - t) * 0.55, 0.82, 0.45);
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colorAttr.needsUpdate = true;
    mat.vertexColors = true;
    mat.color.set('#ffffff');
  } else {
    mat.vertexColors = false;
    mat.color.set('#ffffff');
  }

  mat.needsUpdate = true;
}

export function createInfrastructureGroup(): THREE.Group {
  const group = new THREE.Group();

  const roadTex = createProceduralTexture('road', '#334155', '#475569', 2, 22);
  const roadMat = new THREE.MeshPhysicalMaterial({
    map: roadTex,
    roughness: 0.58,
    metalness: 0.08,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  });

  const crossRoadTex = createProceduralTexture('road', '#334155', '#475569', 22, 2);
  const crossRoadMat = new THREE.MeshPhysicalMaterial({
    map: crossRoadTex,
    roughness: 0.58,
    metalness: 0.08,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  });

  const curbMat = new THREE.MeshPhysicalMaterial({
    color: '#94a3b8',
    roughness: 0.45,
    metalness: 0.12,
    clearcoat: 0.35,
  });

  const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 110), roadMat);
  mainRoad.position.set(0, 0.01, 0);
  mainRoad.receiveShadow = true;
  group.add(mainRoad);

  const crossRoad = new THREE.Mesh(new THREE.BoxGeometry(110, 0.08, 4.4), crossRoadMat);
  crossRoad.position.set(0, 0.01, 0);
  crossRoad.receiveShadow = true;
  group.add(crossRoad);

  [-2.75, 2.75].forEach((x) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 110), curbMat);
    curb.position.set(x, 0.04, 0);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  });

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
  const foliageMatA = new THREE.MeshPhysicalMaterial({
    color: '#15803d',
    roughness: 0.55,
    metalness: 0.02,
    clearcoat: 0.18,
  });
  const foliageMatB = new THREE.MeshPhysicalMaterial({
    color: '#166534',
    roughness: 0.6,
    metalness: 0.02,
    clearcoat: 0.15,
  });

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

  const poleMat = new THREE.MeshPhysicalMaterial({
    color: '#1e293b',
    roughness: 0.35,
    metalness: 0.85,
    clearcoat: 0.5,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#facc15',
    emissiveIntensity: 2.2,
    roughness: 0.2,
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

export function buildGraveUnit(
  grave: GraveLot,
  isSelected: boolean,
  showSubsurface: boolean,
  shared: SharedGraveAssets,
  maxAnisotropy: number
): { unit: THREE.Group; ring: THREE.Mesh | null } {
  const unit = new THREE.Group();
  unit.userData.graveData = grave;
  const groundY = getTerrainHeight(grave.position[0], grave.position[2]);
  unit.position.set(grave.position[0], groundY, grave.position[2]);

  const status = (grave.trang_thai || '').toLowerCase();
  const isOccupied = status.includes('sử dụng') || status.includes('su dung') || status.includes('occupied');
  const isReserved = status.includes('đặt') || status.includes('dat') || status.includes('reserved');

  const baseMat = isSelected
    ? shared.materials.selectedHighlight
    : isOccupied
      ? shared.materials.occupiedBase
      : isReserved
        ? shared.materials.reservedBase
        : shared.materials.emptyBase;

  const slabMat = isSelected
    ? shared.materials.selectedHighlight
    : isOccupied
      ? shared.materials.occupiedSlab
      : isReserved
        ? shared.materials.reservedSlab
        : shared.materials.emptySlab;

  const shadow = new THREE.Mesh(shared.geometries.contactShadow, shared.materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  unit.add(shadow);

  const plinth = new THREE.Mesh(shared.geometries.basePlinth, baseMat);
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  unit.add(plinth);

  const slab = new THREE.Mesh(shared.geometries.mainSlab, slabMat);
  slab.position.y = 0.4;
  slab.castShadow = true;
  slab.receiveShadow = true;
  unit.add(slab);

  const accent = new THREE.Mesh(shared.geometries.topAccent, shared.materials.headstoneDark);
  accent.position.y = 0.62;
  accent.castShadow = true;
  accent.receiveShadow = true;
  unit.add(accent);

  const headstone = new THREE.Mesh(shared.geometries.headstone, shared.materials.headstoneDark);
  headstone.position.set(0, 1.12, -1.06);
  headstone.castShadow = true;
  headstone.receiveShadow = true;
  unit.add(headstone);

  const trim = new THREE.Mesh(shared.geometries.headstoneTrim, shared.materials.goldTrim);
  trim.position.set(0, 1.68, -1.06);
  trim.castShadow = true;
  unit.add(trim);

  const bowl = new THREE.Mesh(shared.geometries.incenseBowl, shared.materials.incenseMetal);
  bowl.position.set(0, 0.74, -0.58);
  bowl.castShadow = true;
  unit.add(bowl);

  const labelTex = createLabelTexture(grave.ma_lo_dat, maxAnisotropy);
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
  const labelMesh = new THREE.Mesh(shared.geometries.labelPlane, labelMat);
  labelMesh.position.set(0, 1.18, -0.93);
  unit.add(labelMesh);

  if (showSubsurface) {
    const vault = new THREE.Mesh(shared.geometries.subsurfaceVault, shared.materials.subsurfaceVault);
    vault.position.y = -0.72;
    unit.add(vault);
  }

  let ring: THREE.Mesh | null = null;
  if (isSelected) {
    ring = new THREE.Mesh(shared.geometries.selectionRing, shared.materials.selectionRing);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    unit.add(ring);
  }

  return { unit, ring };
}

export function populateRouteGroup(routeGroup: THREE.Group, routePath: [number, number, number][]): void {
  const points = routePath.map(([x, , z]) => new THREE.Vector3(x, getTerrainHeight(x, z) + 0.35, z));
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, Math.max(points.length * 16, 32), 0.16, 12, false);
  const tubeMat = new THREE.MeshPhysicalMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.75,
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 0.9,
  });

  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  routeGroup.add(tube);

  const nodeGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const nodeMat = new THREE.MeshBasicMaterial({ color: '#7dd3fc' });

  [points[0], points[points.length - 1]].forEach((pt) => {
    const marker = new THREE.Mesh(nodeGeo, nodeMat);
    marker.position.copy(pt);
    routeGroup.add(marker);
  });
}