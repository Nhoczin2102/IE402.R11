import * as THREE from 'three';
import { MutableRefObject } from 'react';
import { GraveLot } from '../../../types/cemetery';
import { SharedGraveAssets, disposeGroup } from './threeHelpers';
import { getTerrainHeight } from '../builders/sceneBuilders';

export interface MeasureResult {
  distance3D: number;
  deltaZ: number;
  from: string;
  to: string;
}

interface InteractionParams {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  gravesGroup: THREE.Group;
  measureGroup: THREE.Group;
  hoveredUnitRef: MutableRefObject<THREE.Group | null>;
  sharedRef: MutableRefObject<SharedGraveAssets | null>;
  measureModeRef: MutableRefObject<boolean>;
  measurePointsRef: MutableRefObject<GraveLot[]>;
  onSelectGraveRef: MutableRefObject<(grave: GraveLot) => void>;
  onMeasureResultRef: MutableRefObject<((result: MeasureResult | null) => void) | undefined>;
}

export function bindViewportInteractions({
  renderer,
  camera,
  gravesGroup,
  measureGroup,
  hoveredUnitRef,
  sharedRef,
  measureModeRef,
  measurePointsRef,
  onSelectGraveRef,
  onMeasureResultRef,
}: InteractionParams): () => void {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const getHitGraveUnit = (clientX: number, clientY: number): THREE.Group | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(gravesGroup.children, true);
    if (intersects.length === 0) return null;
    let hitObj: THREE.Object3D | null = intersects[0].object;
    while (hitObj && !hitObj.userData?.graveData) {
      hitObj = hitObj.parent;
    }
    return hitObj ? (hitObj as THREE.Group) : null;
  };

  const handlePointerMove = (event: PointerEvent) => {
    const unit = getHitGraveUnit(event.clientX, event.clientY);
    hoveredUnitRef.current = unit;
    renderer.domElement.style.cursor = measureModeRef.current
      ? 'crosshair'
      : unit
        ? 'pointer'
        : 'grab';
  };

  const handlePointerDown = (event: PointerEvent) => {
    const clickedGrave: GraveLot | undefined = getHitGraveUnit(event.clientX, event.clientY)?.userData?.graveData;
    if (!clickedGrave) return;

    if (measureModeRef.current) {
      const pts = measurePointsRef.current;
      if (pts.length >= 2) pts.length = 0;
      pts.push(clickedGrave);

      if (sharedRef.current) {
        disposeGroup(measureGroup, sharedRef.current.geoSet, sharedRef.current.matSet);
      }

      pts.forEach((g) => {
        const gy = getTerrainHeight(g.position[0], g.position[2]);
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 20, 20),
          new THREE.MeshBasicMaterial({ color: '#f43f5e' })
        );
        marker.position.set(g.position[0], gy + 1.2, g.position[2]);
        measureGroup.add(marker);
      });

      if (pts.length === 2) {
        const [p1, p2] = pts;
        const y1 = getTerrainHeight(p1.position[0], p1.position[2]) + 1.2;
        const y2 = getTerrainHeight(p2.position[0], p2.position[2]) + 1.2;
        const v1 = new THREE.Vector3(p1.position[0], y1, p1.position[2]);
        const v2 = new THREE.Vector3(p2.position[0], y2, p2.position[2]);
        measureGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([v1, v2]),
            new THREE.LineBasicMaterial({ color: '#fb7185' })
          )
        );
        onMeasureResultRef.current?.({
          distance3D: Number(v1.distanceTo(v2).toFixed(2)),
          deltaZ: Number((p2.cao_do_z - p1.cao_do_z).toFixed(2)),
          from: p1.ma_lo_dat,
          to: p2.ma_lo_dat,
        });
      }
      return;
    }

    onSelectGraveRef.current(clickedGrave);
  };

  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerdown', handlePointerDown);

  return () => {
    renderer.domElement.removeEventListener('pointermove', handlePointerMove);
    renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
  };
}