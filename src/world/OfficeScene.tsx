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
    if (!lerping.current || !controlsRef.current) return;
    const step = Math.min(1, delta * 4.5);
    camera.position.lerp(desiredPos.current, step);
    controlsRef.current.target.lerp(desiredTarget.current, step);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(desiredPos.current) < 0.2 &&
      controlsRef.current.target.distanceTo(desiredTarget.current) < 0.2
    ) {
      lerping.current = false;
      clearFocus();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.18}
      minPolarAngle={0.22}
      minDistance={5}
      maxDistance={48}
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
  const setWebGLError = useGameStore((s) => s.setWebGLError);

  const qConfig = QUALITY_CONFIGS[quality];

  return (
    <div className="canvas-wrapper">
      <Canvas
        shadows={qConfig.shadows}
        dpr={qConfig.dpr}
        camera={{ position: [0, 22, 24], fov: 44, near: 0.2, far: 140 }}
        gl={{
          antialias: qConfig.antialias,
          powerPreference: 'high-performance',
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
        <color attach="background" args={['#0b1120']} />
        <fog attach="fog" args={['#0b1120', 38, 78]} />

        {/* Stylized Semi-Realistic Lighting */}
        <ambientLight intensity={0.62} />
        <hemisphereLight args={['#bae6fd', '#1e293b', 0.45]} />
        <directionalLight
          position={[14, 24, 16]}
          intensity={1.15}
          castShadow={qConfig.shadows}
          shadow-mapSize-width={qConfig.shadowMapSize}
          shadow-mapSize-height={qConfig.shadowMapSize}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
        />

        {quality === 'high' && (
          <pointLight position={[0, 4.5, 0]} intensity={1.2} distance={18} color="#7dd3fc" />
        )}

        <OfficeEnvironment castShadow={qConfig.shadows} />

        {agents.map((agent) => (
          <AgentAvatar
            key={agent.id}
            agent={agent}
            isSelected={selectedAgentId === agent.id}
            onSelect={selectAgent}
            showBubbles={showBubbles}
          />
        ))}

        <CameraRig />
        <SimulationTicker />
      </Canvas>
    </div>
  );
};
