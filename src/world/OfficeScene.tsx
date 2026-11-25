import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { OfficeEnvironment } from './OfficeEnvironment';
import { AgentAvatar } from '../agents/AgentAvatar';
import { useGameStore } from '../store/useGameStore';
import { QUALITY_CONFIGS } from '../services/performanceMonitor';

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
  const { camera } = useThree();
  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPos = useRef(new THREE.Vector3(0, 22, 24));
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
  }, []);

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

    // Smooth WASD / Arrow keyboard panning relative to camera yaw
    if (keysPressed.current.size > 0) {
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
    }

    if (lerping.current) {
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

    // Clamp orbit target inside office bounds so user never gets lost
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
      minDistance={4.5}
      maxDistance={46}
      onStart={() => {
        lerping.current = false;
      }}
    />
  );
};

export const OfficeScene: React.FC = () => {
  const agents = useGameStore((s) => s.agents);
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);
  const selectAgent = useGameStore((s) => s.selectAgent);
  const quality = useGameStore((s) => s.quality);
  const showBubbles = useGameStore((s) => s.showSpeechBubbles);
  const managementPanelOpen = useGameStore((s) => s.managementPanelOpen);
  const setWebGLError = useGameStore((s) => s.setWebGLError);

  const qConfig = QUALITY_CONFIGS[quality];

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
        <color attach="background" args={['#0c1424']} />
        <fog attach="fog" args={['#0c1424', 40, 82]} />

        {/* Semi-Realistic 3-Point Office Lighting */}
        <ambientLight intensity={0.68} color="#f1f5f9" />
        <hemisphereLight args={['#e0f2fe', '#334155', 0.72]} />
        <directionalLight
          position={[15, 25, 17]}
          intensity={1.35}
          color="#fff7ed"
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
        <directionalLight position={[-16, 14, -14]} intensity={0.42} color="#93c5fd" />

        {quality !== 'low' && (
          <pointLight position={[0, 3.6, 0]} intensity={1.1} distance={15} color="#e0f2fe" />
        )}
        {quality === 'high' && (
          <>
            <pointLight position={[-12, 3.4, -9]} intensity={0.7} distance={12} color="#fef3c7" />
            <pointLight position={[12, 3.4, 9]} intensity={0.7} distance={12} color="#e0f2fe" />
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
          />
        ))}

        <CameraRig />
        <SimulationTicker />
      </Canvas>
    </div>
  );
};
