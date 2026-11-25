import * as THREE from 'three';

export interface SharedGraveAssets {
  groundGeo: THREE.BoxGeometry;
  wallGeo: THREE.BoxGeometry;
  roofGeo: THREE.BoxGeometry;
  ringGeo: THREE.RingGeometry;
  groundMat: THREE.MeshStandardMaterial;
  roofMat: THREE.MeshStandardMaterial;
  wallMats: Record<string, THREE.MeshStandardMaterial>;
  vaultMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  geoSet: Set<THREE.BufferGeometry>;
  matSet: Set<THREE.Material>;
}

export function createSharedGraveAssets(): SharedGraveAssets {
  const groundGeo = new THREE.BoxGeometry(1.85, 0.22, 2.55);
  const wallGeo = new THREE.BoxGeometry(1.52, 0.48, 2.22);
  const roofGeo = new THREE.BoxGeometry(1.32, 0.78, 0.24);
  const ringGeo = new THREE.RingGeometry(1.65, 1.98, 48);

  const groundMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8, metalness: 0.1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.22, metalness: 0.65 });
  const wallMats: Record<string, THREE.MeshStandardMaterial> = {
    empty: new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.38, metalness: 0.12 }),
    occupied: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.45, metalness: 0.18 }),
    reserved: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.38, metalness: 0.15 }),
    selected: new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.2,
    }),
  };
  const vaultMat = new THREE.MeshBasicMaterial({
    color: '#c084fc',
    wireframe: true,
    transparent: true,
    opacity: 0.72,
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  const geoSet = new Set<THREE.BufferGeometry>([groundGeo, wallGeo, roofGeo, ringGeo]);
  const matSet = new Set<THREE.Material>([
    groundMat,
    roofMat,
    vaultMat,
    ringMat,
    ...Object.values(wallMats),
  ]);

  return {
    groundGeo,
    wallGeo,
    roofGeo,
    ringGeo,
    groundMat,
    roofMat,
    wallMats,
    vaultMat,
    ringMat,
    geoSet,
    matSet,
  };
}

export function createLabelSprite(text: string, isSelected: boolean, maxAnisotropy: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = isSelected ? 'rgba(2, 132, 199, 0.94)' : 'rgba(15, 23, 42, 0.86)';
  ctx.beginPath();
  ctx.roundRect(56, 16, 400, 96, 28);
  ctx.fill();

  ctx.strokeStyle = isSelected ? '#7dd3fc' : 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = isSelected ? 6 : 4;
  ctx.stroke();

  ctx.font = '700 50px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = maxAnisotropy;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.7, 0.675, 1);
  return sprite;
}

export function disposeGroup(
  group: THREE.Group,
  sharedGeos: Set<THREE.BufferGeometry>,
  sharedMats: Set<THREE.Material>
) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && !sharedGeos.has(mesh.geometry)) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!sharedMats.has(m)) {
            if ((m as THREE.SpriteMaterial).map) {
              (m as THREE.SpriteMaterial).map?.dispose();
            }
            m.dispose();
          }
        });
      }
    });
  }
}