import { useEffect, RefObject } from 'react';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function useViewportTheme(
  isNight: boolean,
  sceneRef: RefObject<THREE.Scene | null>,
  rendererRef: RefObject<THREE.WebGLRenderer | null>,
  bloomPassRef: RefObject<UnrealBloomPass | null>
): void {
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const bloomPass = bloomPassRef.current;
    if (!scene || !renderer || !bloomPass) return;

    if (isNight) {
      scene.background = new THREE.Color('#060d1f');
      scene.fog = new THREE.FogExp2('#060d1f', 0.0042);
      scene.environmentIntensity = 0.55;
      renderer.toneMappingExposure = 1.05;
      bloomPass.strength = 0.35;
      bloomPass.threshold = 0.9;
      bloomPass.radius = 0.3;
    } else {
      scene.background = new THREE.Color('#bae6fd');
      scene.fog = new THREE.FogExp2('#e0f2fe', 0.0018);
      scene.environmentIntensity = 0.4;
      renderer.toneMappingExposure = 0.88;
      bloomPass.strength = 0;
      bloomPass.threshold = 1.5;
      bloomPass.radius = 0;
    }

    scene.children.forEach((obj) => {
      if (obj instanceof THREE.HemisphereLight) {
        obj.intensity = 0.75;
        obj.color.set(isNight ? '#dbeafe' : '#f0f9ff');
        obj.groundColor.set(isNight ? '#0f172a' : '#334155');
      } else if (obj instanceof THREE.DirectionalLight) {
        if (obj.castShadow) {
          obj.intensity = isNight ? 1.35 : 1.45;
          obj.color.set(isNight ? '#fffbeb' : '#ffffff');
        } else {
          obj.intensity = isNight ? 0.55 : 0.3;
        }
      }
    });
  }, [isNight, sceneRef, rendererRef, bloomPassRef]);
}