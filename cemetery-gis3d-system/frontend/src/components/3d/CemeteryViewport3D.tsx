'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GraveLot } from '../../types/cemetery';
import { SharedGraveAssets, createSharedGraveAssets, disposeGroup } from './utils/threeHelpers';
import {
  addSceneLighting,
  createTerrainMesh,
  updateTerrainAppearance,
  createInfrastructureGroup,
  buildGraveUnit,
  populateRouteGroup,
} from './builders/sceneBuilders';

interface CemeteryViewport3DProps {
  graves: GraveLot[];
  selectedGrave: GraveLot | null;
  onSelectGrave: (grave: GraveLot) => void;
  showWireframe: boolean;
  slopeHeatmap: boolean;
  showSubsurface: boolean;
  measureMode?: boolean;
  onMeasureResult?: (result: { distance3D: number; deltaZ: number; from: string; to: string } | null) => void;
  routePath: [number, number, number][] | null;
  cameraPreset: 'overview' | 'top' | 'reset';
}

export const CemeteryViewport3D: React.FC<CemeteryViewport3DProps> = ({
  graves,
  selectedGrave,
  onSelectGrave,
  showWireframe,
  slopeHeatmap,
  showSubsurface,
  measureMode = false,
  onMeasureResult,
  routePath,
  cameraPreset,
}) => {
  const [isNight, setIsNight] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const gravesGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const measureGroupRef = useRef<THREE.Group | null>(null);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);
  const hoveredUnitRef = useRef<THREE.Group | null>(null);
  const sharedRef = useRef<SharedGraveAssets | null>(null);
  const targetFlyPos = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const measureModeRef = useRef(measureMode);
  const measurePointsRef = useRef<GraveLot[]>([]);
  const onSelectGraveRef = useRef(onSelectGrave);
  const onMeasureResultRef = useRef(onMeasureResult);

  useEffect(() => {
    measureModeRef.current = measureMode;
    if (!measureMode) {
      measurePointsRef.current = [];
      if (measureGroupRef.current && sharedRef.current) {
        disposeGroup(measureGroupRef.current, sharedRef.current.geoSet, sharedRef.current.matSet);
      }
      onMeasureResultRef.current?.(null);
    }
  }, [measureMode]);

  useEffect(() => {
    onSelectGraveRef.current = onSelectGrave;
    onMeasureResultRef.current = onMeasureResult;
  }, [onSelectGrave, onMeasureResult]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth - 320;
    const height = container.clientHeight || window.innerHeight - 56;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060d1f');
    scene.fog = new THREE.FogExp2('#060d1f', 0.0042);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 600);
    camera.position.set(0, 44, 64);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.65;
    pmremGenerator.dispose();

    const composer = new EffectComposer(renderer);
    composer.setSize(width, height);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.42, 0.35, 0.82);
    const outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);
    bloomPassRef.current = bloomPass;

    sharedRef.current = createSharedGraveAssets();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.88;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 8;
    controls.maxDistance = 135;
    controls.addEventListener('start', () => {
      targetFlyPos.current = null;
    });

    addSceneLighting(scene);

    const terrainMesh = createTerrainMesh();
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    scene.add(createInfrastructureGroup());

    const gravesGroup = new THREE.Group();
    const routeGroup = new THREE.Group();
    const measureGroup = new THREE.Group();
    scene.add(gravesGroup, routeGroup, measureGroup);
    gravesGroupRef.current = gravesGroup;
    routeGroupRef.current = routeGroup;
    measureGroupRef.current = measureGroup;

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
      if (unit) {
        renderer.domElement.style.cursor = measureModeRef.current ? 'crosshair' : 'pointer';
      } else {
        renderer.domElement.style.cursor = measureModeRef.current ? 'crosshair' : 'grab';
      }
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
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 20, 20),
            new THREE.MeshBasicMaterial({ color: '#f43f5e' })
          );
          marker.position.set(g.position[0], g.position[1] + 1.2, g.position[2]);
          measureGroup.add(marker);
        });

        if (pts.length === 2) {
          const [p1, p2] = pts;
          const v1 = new THREE.Vector3(p1.position[0], p1.position[1] + 1.2, p1.position[2]);
          const v2 = new THREE.Vector3(p2.position[0], p2.position[1] + 1.2, p2.position[2]);
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

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          composer.setSize(w, h);
          bloomPass.resolution.set(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let lastTime = performance.now();
    let elapsed = 0;
    let animId: number;
    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += delta;

      if (targetFlyPos.current) {
        const alpha = 1 - Math.exp(-5.5 * delta);
        camera.position.lerp(targetFlyPos.current.pos, alpha);
        controls.target.lerp(targetFlyPos.current.target, alpha);
        if (camera.position.distanceTo(targetFlyPos.current.pos) < 0.15) {
          targetFlyPos.current = null;
        }
      }

      const hoverAlpha = 1 - Math.exp(-12 * delta);
      gravesGroup.children.forEach((child) => {
        const targetScale = child === hoveredUnitRef.current ? 1.05 : 1;
        const nextScale = THREE.MathUtils.lerp(child.scale.x, targetScale, hoverAlpha);
        if (Math.abs(child.scale.x - targetScale) > 0.0005) {
          child.scale.set(nextScale, nextScale, nextScale);
        }
      });

      if (selectionRingRef.current) {
        const pulse = 1 + Math.sin(elapsed * 4) * 0.06;
        selectionRingRef.current.scale.set(pulse, pulse, 1);
      }

      controls.update();
      composer.render();
    };
    animId = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animId);
      envRT.dispose();
      composer.dispose();
      if (sharedRef.current) {
        sharedRef.current.geoSet.forEach((g) => g.dispose());
        sharedRef.current.matSet.forEach((m) => m.dispose());
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const bloomPass = bloomPassRef.current;
    if (!scene || !renderer || !bloomPass) return;

    if (isNight) {
      scene.background = new THREE.Color('#060d1f');
      scene.fog = new THREE.FogExp2('#060d1f', 0.0042);
      scene.environmentIntensity = 0.65;
      renderer.toneMappingExposure = 1.15;
      bloomPass.strength = 0.42;
      bloomPass.threshold = 0.82;
      bloomPass.radius = 0.35;
    } else {
      scene.background = new THREE.Color('#bae6fd');
      scene.fog = new THREE.FogExp2('#e0f2fe', 0.0022);
      scene.environmentIntensity = 1.0;
      renderer.toneMappingExposure = 1.05;
      bloomPass.strength = 0.14;
      bloomPass.threshold = 0.95;
      bloomPass.radius = 0.2;
    }

    scene.children.forEach((obj) => {
      if (obj instanceof THREE.HemisphereLight) {
        obj.intensity = isNight ? 0.85 : 1.25;
        obj.color.set(isNight ? '#dbeafe' : '#f0f9ff');
        obj.groundColor.set(isNight ? '#0f172a' : '#334155');
      } else if (obj instanceof THREE.DirectionalLight) {
        if (obj.castShadow) {
          obj.intensity = isNight ? 1.55 : 2.25;
          obj.color.set(isNight ? '#fffbeb' : '#ffffff');
        } else {
          obj.intensity = isNight ? 0.7 : 0.45;
        }
      }
    });
  }, [isNight]);

  useEffect(() => {
    if (terrainMeshRef.current) {
      updateTerrainAppearance(terrainMeshRef.current, showWireframe, slopeHeatmap, showSubsurface);
    }
  }, [showWireframe, slopeHeatmap, showSubsurface]);

  useEffect(() => {
    const group = gravesGroupRef.current;
    const shared = sharedRef.current;
    const renderer = rendererRef.current;
    if (!group || !shared || !renderer) return;

    disposeGroup(group, shared.geoSet, shared.matSet);
    selectionRingRef.current = null;
    hoveredUnitRef.current = null;

    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    graves.forEach((grave) => {
      const isSelected = selectedGrave?.ma_lo_dat === grave.ma_lo_dat;
      const { unit, ring } = buildGraveUnit(grave, isSelected, showSubsurface, shared, maxAnisotropy);
      if (ring) selectionRingRef.current = ring;
      group.add(unit);
    });
  }, [graves, selectedGrave, showSubsurface]);

  useEffect(() => {
    const rGroup = routeGroupRef.current;
    const shared = sharedRef.current;
    if (!rGroup || !shared) return;

    disposeGroup(rGroup, shared.geoSet, shared.matSet);
    if (routePath && routePath.length >= 2) {
      populateRouteGroup(rGroup, routePath);
    }
  }, [routePath]);

  useEffect(() => {
    if (selectedGrave && !measureMode) {
      const [gx, gy, gz] = selectedGrave.position;
      targetFlyPos.current = {
        pos: new THREE.Vector3(gx + 9, gy + 11, gz + 13),
        target: new THREE.Vector3(gx, gy + 0.5, gz),
      };
    }
  }, [selectedGrave, measureMode]);

  useEffect(() => {
    if (cameraPreset === 'top') {
      targetFlyPos.current = { pos: new THREE.Vector3(0, 88, 0.1), target: new THREE.Vector3(0, 0, 0) };
    } else if (cameraPreset === 'reset' || cameraPreset === 'overview') {
      targetFlyPos.current = { pos: new THREE.Vector3(0, 44, 64), target: new THREE.Vector3(0, 0, 0) };
    }
  }, [cameraPreset]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div
        ref={containerRef}
        className={`w-full h-full ${measureMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />
      <button
        type="button"
        onClick={() => setIsNight((prev) => !prev)}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-lg backdrop-blur-md transition hover:border-sky-400/70 hover:bg-slate-800/90"
      >
        <span>{isNight ? '☀️ Chế độ Ngày' : '🌙 Chế độ Đêm'}</span>
      </button>
    </div>
  );
};