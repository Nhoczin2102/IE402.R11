import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface SharedGraveAssets {
  geoSet: Set<THREE.BufferGeometry>;
  matSet: Set<THREE.Material>;
  geometries: {
    basePlinth: THREE.BufferGeometry;
    mainSlab: THREE.BufferGeometry;
    topAccent: THREE.BufferGeometry;
    headstone: THREE.BufferGeometry;
    headstoneTrim: THREE.BufferGeometry;
    incenseBowl: THREE.CylinderGeometry;
    subsurfaceVault: THREE.BoxGeometry;
    selectionRing: THREE.RingGeometry;
    labelPlane: THREE.PlaneGeometry;
    contactShadow: THREE.PlaneGeometry;
  };
  materials: {
    occupiedBase: THREE.MeshPhysicalMaterial;
    occupiedSlab: THREE.MeshPhysicalMaterial;
    reservedBase: THREE.MeshPhysicalMaterial;
    reservedSlab: THREE.MeshPhysicalMaterial;
    emptyBase: THREE.MeshPhysicalMaterial;
    emptySlab: THREE.MeshPhysicalMaterial;
    headstoneDark: THREE.MeshPhysicalMaterial;
    goldTrim: THREE.MeshPhysicalMaterial;
    incenseMetal: THREE.MeshPhysicalMaterial;
    selectedHighlight: THREE.MeshPhysicalMaterial;
    subsurfaceVault: THREE.MeshPhysicalMaterial;
    selectionRing: THREE.MeshBasicMaterial;
    contactShadow: THREE.MeshBasicMaterial;
  };
}

export function createProceduralTexture(
  type: 'granite' | 'grass' | 'road',
  baseHex: string,
  accentHex: string,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);

    if (type === 'granite') {
      for (let i = 0; i < 4200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 1.8 + 0.4;
        ctx.fillStyle = Math.random() > 0.5 ? accentHex : 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y, r, r);
      }
    } else if (type === 'grass') {
      for (let i = 0; i < 5500; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = Math.random() * 2 + 1;
        const h = Math.random() * 4 + 1;
        ctx.fillStyle = Math.random() > 0.45 ? accentHex : 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h);
      }
    } else if (type === 'road') {
      for (let i = 0; i < 3200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = Math.random() > 0.5 ? accentHex : 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 2;
      for (let y = 0; y < size; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createSharedGraveAssets(): SharedGraveAssets {
  const darkGraniteTex = createProceduralTexture('granite', '#1e293b', 'rgba(148,163,184,0.16)', 2, 2);
  const blackGraniteTex = createProceduralTexture('granite', '#0f172a', 'rgba(203,213,225,0.14)', 2, 2);
  const amberGraniteTex = createProceduralTexture('granite', '#b45309', 'rgba(253,230,138,0.16)', 2, 2);
  const tealGraniteTex = createProceduralTexture('granite', '#0f766e', 'rgba(153,246,228,0.14)', 2, 2);
  const shadowTex = createContactShadowTexture();

  const geometries = {
    basePlinth: new RoundedBoxGeometry(2.34, 0.22, 3.24, 3, 0.04),
    mainSlab: new RoundedBoxGeometry(1.94, 0.36, 2.74, 3, 0.05),
    topAccent: new RoundedBoxGeometry(1.56, 0.08, 2.25, 2, 0.025),
    headstone: new RoundedBoxGeometry(1.48, 1.08, 0.24, 3, 0.04),
    headstoneTrim: new RoundedBoxGeometry(1.58, 0.08, 0.28, 2, 0.02),
    incenseBowl: new THREE.CylinderGeometry(0.16, 0.12, 0.18, 24),
    subsurfaceVault: new THREE.BoxGeometry(1.85, 1.4, 2.6),
    selectionRing: new THREE.RingGeometry(1.98, 2.24, 64),
    labelPlane: new THREE.PlaneGeometry(1.24, 0.44),
    contactShadow: new THREE.PlaneGeometry(3.2, 4.1),
  };

  const materials = {
    occupiedBase: new THREE.MeshPhysicalMaterial({
      map: darkGraniteTex,
      color: '#cbd5e1',
      roughness: 0.3,
      metalness: 0.14,
      clearcoat: 0.65,
      clearcoatRoughness: 0.16,
    }),
    occupiedSlab: new THREE.MeshPhysicalMaterial({
      map: darkGraniteTex,
      color: '#ffffff',
      roughness: 0.16,
      metalness: 0.18,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95,
    }),
    reservedBase: new THREE.MeshPhysicalMaterial({
      map: darkGraniteTex,
      color: '#94a3b8',
      roughness: 0.34,
      metalness: 0.12,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    }),
    reservedSlab: new THREE.MeshPhysicalMaterial({
      map: amberGraniteTex,
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.2,
      clearcoat: 0.88,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
    }),
    emptyBase: new THREE.MeshPhysicalMaterial({
      map: darkGraniteTex,
      color: '#64748b',
      roughness: 0.36,
      metalness: 0.1,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
    }),
    emptySlab: new THREE.MeshPhysicalMaterial({
      map: tealGraniteTex,
      color: '#ffffff',
      roughness: 0.22,
      metalness: 0.15,
      clearcoat: 0.82,
      clearcoatRoughness: 0.12,
      reflectivity: 0.88,
    }),
    headstoneDark: new THREE.MeshPhysicalMaterial({
      map: blackGraniteTex,
      color: '#ffffff',
      roughness: 0.12,
      metalness: 0.24,
      clearcoat: 0.96,
      clearcoatRoughness: 0.06,
      reflectivity: 1.0,
    }),
    goldTrim: new THREE.MeshPhysicalMaterial({
      color: '#facc15',
      roughness: 0.2,
      metalness: 0.9,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
    }),
    incenseMetal: new THREE.MeshPhysicalMaterial({
      color: '#d97706',
      roughness: 0.26,
      metalness: 0.84,
      clearcoat: 0.55,
    }),
    selectedHighlight: new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.5,
      roughness: 0.14,
      metalness: 0.22,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
    }),
    subsurfaceVault: new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
    selectionRing: new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  };

  const geoSet = new Set<THREE.BufferGeometry>(Object.values(geometries));
  const matSet = new Set<THREE.Material>(Object.values(materials));

  return { geoSet, matSet, geometries, materials };
}

export function createLabelTexture(text: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 38px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function disposeGroup(
  group: THREE.Group,
  sharedGeos: Set<THREE.BufferGeometry>,
  sharedMats: Set<THREE.Material>
): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    child.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Line).isLine) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry && !sharedGeos.has(mesh.geometry)) {
          mesh.geometry.dispose();
        }
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if (!sharedMats.has(m)) {
              const map = (m as THREE.MeshBasicMaterial).map;
              if (map) map.dispose();
              m.dispose();
            }
          });
        } else if (mesh.material && !sharedMats.has(mesh.material)) {
          const map = (mesh.material as THREE.MeshBasicMaterial).map;
          if (map) map.dispose();
          mesh.material.dispose();
        }
      }
    });
    group.remove(child);
  }
}