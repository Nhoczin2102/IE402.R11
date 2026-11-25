import * as THREE from 'three';
import { createProceduralTexture } from '../utils/threeHelpers';

export function getTerrainHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  return dist > 44 ? Math.sin(x * 0.06) * Math.cos(z * 0.06) * 0.85 : 0;
}

export function addSceneLighting(scene: THREE.Scene): void {
  const hemiLight = new THREE.HemisphereLight('#dbeafe', '#0f172a', 0.75);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight('#fffbeb', 1.45);
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

  const rimLight = new THREE.DirectionalLight('#60a5fa', 0.5);
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
    pos.setY(i, getTerrainHeight(x, z));

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
    roughness: 0.9,
    metalness: 0.02,
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