import * as THREE from 'three';
import { createProceduralTexture } from '../utils/threeHelpers';
import { getTerrainHeight } from './terrainBuilder';

export function createInfrastructureGroup(): THREE.Group {
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