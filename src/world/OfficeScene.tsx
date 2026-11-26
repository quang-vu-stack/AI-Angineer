import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { OfficeEnvironment } from './OfficeEnvironment';
import { AgentAvatar } from '../agents/AgentAvatar';
import { InstancedAgentIndicators } from '../agents/InstancedAgentIndicators';
import { useGameStore } from '../store/useGameStore';
import { QUALITY_CONFIGS } from '../services/performanceMonitor';

interface DayNightProfile {
  bg: string;
  fog: string;
  ambientIntensity: number;
  ambientColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunPos: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  interiorWarmIntensity: number;
}

export function computeDayNightProfile(simMinutes: number): DayNightProfile {
  const mins = ((simMinutes % 1440) + 1440) % 1440;
  const hour = mins / 60;

  // Morning (06:00 - 09:30): warm golden sunrise from East
  if (hour >= 6 && hour < 9.5) {
    const t = (hour - 6) / 3.5;
    return {
      bg: '#101a2e',
      fog: '#101a2e',
      ambientIntensity: 0.58 + t * 0.12,
      ambientColor: '#fef3c7',
      hemiSky: '#fde68a',
      hemiGround: '#334155',
      hemiIntensity: 0.65 + t * 0.08,
      sunPos: [18 - t * 4, 16 + t * 8, 16],
      sunColor: '#ffedd5',
      sunIntensity: 1.15 + t * 0.2,
      interiorWarmIntensity: 0.75 - t * 0.25,
    };
  }
  // Midday (09:30 - 16:30): bright neutral semi-realistic daylight
  if (hour >= 9.5 && hour < 16.5) {
    const t = (hour - 9.5) / 7;
    return {
      bg: '#0e172a',
      fog: '#0e172a',
      ambientIntensity: 0.7,
      ambientColor: '#f1f5f9',
      hemiSky: '#e0f2fe',
      hemiGround: '#334155',
      hemiIntensity: 0.74,
      sunPos: [14 - t * 24, 25, 16],
      sunColor: '#fffbeb',
      sunIntensity: 1.38,
      interiorWarmIntensity: 0.55,
    };
  }
  // Golden Hour / Sunset (16:30 - 19:00): amber low-angle light
  if (hour >= 16.5 && hour < 19) {
    const t = (hour - 16.5) / 2.5;
    return {
      bg: '#121528',
      fog: '#121528',
      ambientIntensity: 0.62 - t * 0.16,
      ambientColor: '#fed7aa',
      hemiSky: '#fb923c',
      hemiGround: '#1e293b',
      hemiIntensity: 0.64 - t * 0.16,
      sunPos: [-12 - t * 8, 22 - t * 10, 14],
      sunColor: '#fdba74',
      sunIntensity: 1.15 - t * 0.45,
      interiorWarmIntensity: 0.75 + t * 0.55,
    };
  }
  // Night (19:00 - 06:00): cool moonlight exterior + warm cozy office interior
  return {
    bg: '#060b16',
    fog: '#060b16',
    ambientIntensity: 0.44,
    ambientColor: '#cbd5e1',
    hemiSky: '#60a5fa',
    hemiGround: '#0f172a',
    hemiIntensity: 0.46,
    sunPos: [-14, 18, -14],
    sunColor: '#93c5fd',
    sunIntensity: 0.52,
    interiorWarmIntensity: 1.45,
  };
}

const SimulationTicker: React.FC = () => {
  const tickSimulation = useGameStore((s) => s.tickSimulation);
  const updatePerf = useGameStore((s) => s.updatePerfStats);
  const { gl } = useThree();
  const frameCount = useRef(0);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.1);
    tickSimulation(safeDelta);

    frameCount.current += 1;
    elapsed.current += delta;
    if (elapsed.current >= 0.75) {
      const fps = Math.round(frameCount.current / elapsed.current);
      const info = gl.info;
      const perfMem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      const heapMB = perfMem ? Math.round(perfMem.usedJSHeapSize / (1024 * 1024)) : null;
      updatePerf({
        fps,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        heapMB,
      });
      frameCount.current = 0;
      elapsed.current = 0;
    }
  });

  return null;
};

const CameraRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const focusTarget = useGameStore((s) => s.cameraFocusTarget);
  const clearFocus = useGameStore((s) => s.clearCameraFocus);
  const followSelectedAgent = useGameStore((s) => s.followSelectedAgent);
  const setFollowSelectedAgent = useGameStore((s) => s.setFollowSelectedAgent);
  const { camera } = useThree();
  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPos = useRef(new THREE.Vector3(0, 21, 24));
  const lerping = useRef(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const panForward = useRef(new THREE.Vector3());
  const panRight = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keysPressed.current.add(e.code);
        lerping.current = false;
        setFollowSelectedAgent(false);
      } else if (e.code === 'Escape') {
        useGameStore.getState().setManagementPanelOpen(false);
        useGameStore.getState().selectAgent(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setFollowSelectedAgent]);

  useEffect(() => {
    if (focusTarget) {
      desiredTarget.current.set(...focusTarget.target);
      desiredPos.current.set(
        focusTarget.target[0] + focusTarget.offset[0],
        focusTarget.target[1] + focusTarget.offset[1],
        focusTarget.target[2] + focusTarget.offset[2]
      );
      lerping.current = true;
    }
  }, [focusTarget]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    const dt = Math.min(delta, 0.08);

    // Smooth real-time follow mode for selected employee
    if (followSelectedAgent) {
      const st = useGameStore.getState();
      const agent = st.agents.find((a) => a.id === st.selectedAgentId);
      if (agent) {
        const step = Math.min(1, dt * 4.2);
        desiredTarget.current.set(agent.position[0], 1.0, agent.position[2]);
        desiredPos.current.set(agent.position[0], 6.4, agent.position[2] + 7.2);
        controlsRef.current.target.lerp(desiredTarget.current, step);
        camera.position.lerp(desiredPos.current, step);
      }
    } else if (keysPressed.current.size > 0) {
      const moveSpeed = 14 * dt;
      camera.getWorldDirection(panForward.current);
      panForward.current.y = 0;
      panForward.current.normalize();
      panRight.current.crossVectors(panForward.current, camera.up).normalize();

      const dx =
        (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight') ? 1 : 0) -
        (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft') ? 1 : 0);
      const dz =
        (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp') ? 1 : 0) -
        (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown') ? 1 : 0);

      if (dx !== 0 || dz !== 0) {
        const move = new THREE.Vector3()
          .addScaledVector(panRight.current, dx * moveSpeed)
          .addScaledVector(panForward.current, dz * moveSpeed);
        camera.position.add(move);
        controlsRef.current.target.add(move);
      }
    } else if (lerping.current) {
      const step = Math.min(1, dt * 4.8);
      camera.position.lerp(desiredPos.current, step);
      controlsRef.current.target.lerp(desiredTarget.current, step);

      if (
        camera.position.distanceTo(desiredPos.current) < 0.18 &&
        controlsRef.current.target.distanceTo(desiredTarget.current) < 0.18
      ) {
        lerping.current = false;
        clearFocus();
      }
    }

    controlsRef.current.target.x = THREE.MathUtils.clamp(controlsRef.current.target.x, -17, 17);
    controlsRef.current.target.z = THREE.MathUtils.clamp(controlsRef.current.target.z, -11, 11);
    controlsRef.current.target.y = THREE.MathUtils.clamp(controlsRef.current.target.y, 0, 2.5);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.15}
      minPolarAngle={0.22}
      minDistance={4.2}
      maxDistance={46}
      onStart={() => {
        lerping.current = false;
        setFollowSelectedAgent(false);
      }}
    />
  );
};

export const OfficeScene: React.FC = () => {
  const agents = useGameStore((s) => s.agents);
  const simMinutes = useGameStore((s) => s.simMinutes);
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);
  const selectAgent = useGameStore((s) => s.selectAgent);
  const quality = useGameStore((s) => s.quality);
  const showBubbles = useGameStore((s) => s.showSpeechBubbles);
  const managementPanelOpen = useGameStore((s) => s.managementPanelOpen);
  const setWebGLError = useGameStore((s) => s.setWebGLError);

  const qConfig = QUALITY_CONFIGS[quality];
  // Recompute lighting smoothly every 10 in-game minutes to avoid unnecessary React renders
  const lightingBucket = Math.floor(simMinutes / 10) * 10;
  const lighting = useMemo(() => computeDayNightProfile(lightingBucket), [lightingBucket]);

  return (
    <div className="canvas-wrapper">
      <Canvas
        shadows={qConfig.shadows}
        dpr={qConfig.dpr}
        camera={{ position: [0, 21, 24], fov: 44, near: 0.2, far: 140 }}
        gl={{
          antialias: qConfig.antialias,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setWebGLError('WebGL context bị mất. Hãy tải lại trang hoặc giảm mức đồ họa xuống Low.');
          });
          dom.addEventListener('webglcontextrestored', () => {
            setWebGLError(null);
          });
        }}
        onPointerMissed={() => selectAgent(null)}
      >
        <color attach="background" args={[lighting.bg]} />
        <fog attach="fog" args={[lighting.fog, 40, 82]} />

        {/* Dynamic Day & Night Semi-Realistic Lighting */}
        <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambientColor} />
        <hemisphereLight args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]} />
        <directionalLight
          position={lighting.sunPos}
          intensity={lighting.sunIntensity}
          color={lighting.sunColor}
          castShadow={qConfig.shadows}
          shadow-mapSize-width={qConfig.shadowMapSize}
          shadow-mapSize-height={qConfig.shadowMapSize}
          shadow-bias={-0.0004}
          shadow-normalBias={0.025}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
        />
        <directionalLight position={[-16, 14, -14]} intensity={0.38} color="#93c5fd" />

        {quality !== 'low' && (
          <>
            <pointLight
              position={[0, 3.6, 0]}
              intensity={lighting.interiorWarmIntensity}
              distance={16}
              color="#e0f2fe"
            />
            <pointLight
              position={[12.8, 3.2, 0]}
              intensity={lighting.interiorWarmIntensity * 0.9}
              distance={13}
              color="#fde68a"
            />
          </>
        )}
        {quality === 'high' && (
          <>
            <pointLight
              position={[-12, 3.4, -9]}
              intensity={lighting.interiorWarmIntensity * 0.65}
              distance={12}
              color="#fef3c7"
            />
            <pointLight
              position={[12, 3.4, 9]}
              intensity={lighting.interiorWarmIntensity * 0.65}
              distance={12}
              color="#e0f2fe"
            />
          </>
        )}

        <OfficeEnvironment castShadow={qConfig.shadows} />

        {agents.map((agent) => (
          <AgentAvatar
            key={agent.id}
            agent={agent}
            isSelected={selectedAgentId === agent.id}
            onSelect={selectAgent}
            showBubbles={showBubbles && !managementPanelOpen}
            castShadow={qConfig.shadows}
          />
        ))}

        {/* 2-Draw-Call Instanced Overhead Status Indicators for all 20 Employees */}
        <InstancedAgentIndicators agents={agents} />

        <CameraRig />
        <SimulationTicker />
      </Canvas>
    </div>
  );
};
