import * as THREE from 'three';
import { GraveLot } from '../../../types/cemetery';
import { SharedGraveAssets, createLabelTexture } from '../utils/threeHelpers';
import { getTerrainHeight } from './terrainBuilder';

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

  if (grave.goc_xoay_z) {
    unit.rotation.y = THREE.MathUtils.degToRad(grave.goc_xoay_z);
  }

  const status = (grave.trang_thai || '').toLowerCase();
  const isOccupied =
    status.includes('an táng') ||
    status.includes('an tang') ||
    status.includes('sử dụng') ||
    status.includes('su dung') ||
    status.includes('occupied');
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