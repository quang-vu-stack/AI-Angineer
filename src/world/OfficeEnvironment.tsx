import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OFFICE_ROOMS } from './officeLayout';
import { InstancedFurniture } from './InstancedFurniture';
import { CentralMeetingRoom } from './CentralMeetingRoom';
import { CoffeeLoungeZone } from './CoffeeLoungeZone';

interface OfficeEnvironmentProps {
  castShadow: boolean;
}

const dummy = new THREE.Object3D();

interface WallSpec {
  pos: [number, number, number];
  args: [number, number, number];
}

const GLASS_WALL_SPECS: WallSpec[] = [
  // North room vertical dividers
  { pos: [-10, 1.4, -9], args: [0.12, 2.8, 6] },
  { pos: [-3, 1.4, -9], args: [0.12, 2.8, 6] },
  { pos: [9, 1.4, -9], args: [0.12, 2.8, 6] },
  // North front glass wall Z=-6
  { pos: [-16.2, 1.4, -6], args: [3.6, 2.8, 0.12] },
  { pos: [-10.0, 1.4, -6], args: [4.8, 2.8, 0.12] },
  { pos: [-2.05, 1.4, -6], args: [7.1, 2.8, 0.12] },
  { pos: [7.75, 1.4, -6], args: [8.5, 2.8, 0.12] },
  { pos: [16.0, 1.4, -6], args: [4.0, 2.8, 0.12] },
  // South room vertical dividers
  { pos: [-6, 1.4, 9], args: [0.12, 2.8, 6] },
  { pos: [6, 1.4, 9], args: [0.12, 2.8, 6] },
  // South front glass wall Z=+6
  { pos: [-15.5, 1.4, 6], args: [5.0, 2.8, 0.12] },
  { pos: [-6.0, 1.4, 6], args: [10.0, 2.8, 0.12] },
  { pos: [6.0, 1.4, 6], args: [10.0, 2.8, 0.12] },
  { pos: [15.5, 1.4, 6], args: [5.0, 2.8, 0.12] },
  // Central Meeting Room enclosure
  { pos: [-3.0, 1.4, -3.5], args: [4.0, 2.8, 0.12] },
  { pos: [3.0, 1.4, -3.5], args: [4.0, 2.8, 0.12] },
  { pos: [-3.0, 1.4, 3.5], args: [4.0, 2.8, 0.12] },
  { pos: [3.0, 1.4, 3.5], args: [4.0, 2.8, 0.12] },
  { pos: [-5.0, 1.4, 0], args: [0.12, 2.8, 7.0] },
  { pos: [5.0, 1.4, -2.25], args: [0.12, 2.8, 2.5] },
  { pos: [5.0, 1.4, 2.25], args: [0.12, 2.8, 2.5] },
];

const CEO_WOOD_SLAT_X = [-16.8, -15.9, -15.0, -14.1, -13.2, -12.3, -11.4];

function createCorridorFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e2c44';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 126, 126);
    ctx.strokeRect(129, 1, 126, 126);
    ctx.strokeRect(1, 129, 126, 126);
    ctx.strokeRect(129, 129, 126, 126);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(2, 2, 124, 124);
    ctx.fillRect(130, 130, 124, 124);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const RoomPlaque: React.FC<{
  name: string;
  accentColor: string;
  position: [number, number, number];
}> = React.memo(({ name, accentColor, position }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(3, 3, 506, 90);
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 34px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 256, 50);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [name, accentColor]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <mesh position={position}>
      <planeGeometry args={[3.2, 0.6]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.55}
        roughness={0.35}
        transparent
      />
    </mesh>
  );
});

const InstancedGlassPartitions: React.FC = () => {
  const paneRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const frostRef = useRef<THREE.InstancedMesh>(null);
  const slatRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    GLASS_WALL_SPECS.forEach((w, i) => {
      dummy.position.set(w.pos[0], w.pos[1], w.pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(w.args[0], w.args[1], w.args[2]);
      dummy.updateMatrix();
      paneRef.current?.setMatrixAt(i, dummy.matrix);

      // Top aluminum frame
      dummy.position.set(w.pos[0], w.pos[1] + w.args[1] / 2 - 0.03, w.pos[2]);
      dummy.scale.set(w.args[0] + 0.02, 0.06, w.args[2] + 0.02);
      dummy.updateMatrix();
      frameRef.current?.setMatrixAt(i * 2, dummy.matrix);

      // Bottom aluminum frame
      dummy.position.set(w.pos[0], w.pos[1] - w.args[1] / 2 + 0.04, w.pos[2]);
      dummy.scale.set(w.args[0] + 0.02, 0.08, w.args[2] + 0.02);
      dummy.updateMatrix();
      frameRef.current?.setMatrixAt(i * 2 + 1, dummy.matrix);

      // Frosted privacy band
      dummy.position.set(w.pos[0], w.pos[1] - 0.15, w.pos[2]);
      dummy.scale.set(w.args[0] + 0.005, 0.42, w.args[2] + 0.005);
      dummy.updateMatrix();
      frostRef.current?.setMatrixAt(i, dummy.matrix);
    });

    CEO_WOOD_SLAT_X.forEach((x, i) => {
      dummy.position.set(x, 1.45, -11.82);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.14, 2.7, 0.08);
      dummy.updateMatrix();
      slatRef.current?.setMatrixAt(i, dummy.matrix);
    });

    if (paneRef.current) paneRef.current.instanceMatrix.needsUpdate = true;
    if (frameRef.current) frameRef.current.instanceMatrix.needsUpdate = true;
    if (frostRef.current) frostRef.current.instanceMatrix.needsUpdate = true;
    if (slatRef.current) slatRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      <instancedMesh ref={paneRef} args={[undefined, undefined, GLASS_WALL_SPECS.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.22}
          roughness={0.12}
          metalness={0.15}
        />
      </instancedMesh>
      <instancedMesh ref={frameRef} args={[undefined, undefined, GLASS_WALL_SPECS.length * 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.32} />
      </instancedMesh>
      <instancedMesh ref={frostRef} args={[undefined, undefined, GLASS_WALL_SPECS.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.14} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={slatRef} args={[undefined, undefined, CEO_WOOD_SLAT_X.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8c5e3c" roughness={0.62} />
      </instancedMesh>
    </group>
  );
};

const SolidWall: React.FC<{
  position: [number, number, number];
  args: [number, number, number];
}> = ({ position, args }) => (
  <mesh position={position} receiveShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color="#2b3a52" roughness={0.8} />
  </mesh>
);

export const OfficeEnvironment: React.FC<OfficeEnvironmentProps> = ({ castShadow }) => {
  const floorTex = useMemo(() => createCorridorFloorTexture(), []);

  useEffect(() => {
    return () => {
      floorTex.dispose();
    };
  }, [floorTex]);

  return (
    <group>
      {/* Main Base Architectural Tile Floor (36m x 24m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[36, 24]} />
        <meshStandardMaterial map={floorTex} roughness={0.6} metalness={0.08} />
      </mesh>

      {/* 8 Designated Room Zones with Acoustic Carpet & Local CanvasTexture Signage */}
      {OFFICE_ROOMS.map((room) => (
        <group key={room.id}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.bounds.x, 0.008, room.bounds.z]}
            receiveShadow
          >
            <planeGeometry args={[room.bounds.width - 0.18, room.bounds.depth - 0.18]} />
            <meshStandardMaterial color={room.floorColor} roughness={0.86} metalness={0.02} />
          </mesh>

          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.bounds.x, 0.014, room.bounds.z - room.bounds.depth / 2 + 0.18]}
          >
            <planeGeometry args={[room.bounds.width - 0.6, 0.08]} />
            <meshStandardMaterial
              color={room.accentColor}
              emissive={room.accentColor}
              emissiveIntensity={0.5}
            />
          </mesh>

          <RoomPlaque
            name={room.name}
            accentColor={room.accentColor}
            position={[room.bounds.x, 2.68, room.bounds.z - room.bounds.depth / 2 + 0.25]}
          />
        </group>
      ))}

      {/* Outer Perimeter Walls */}
      <SolidWall position={[0, 1.5, -12]} args={[36, 3, 0.25]} />
      <SolidWall position={[0, 1.5, 12]} args={[36, 3, 0.25]} />
      <SolidWall position={[-18, 1.5, 0]} args={[0.25, 3, 24]} />
      <SolidWall position={[18, 1.5, 0]} args={[0.25, 3, 24]} />

      {/* Wall Whiteboards in Engineering, AI Research & Media */}
      {[
        { pos: [3, 1.65, -11.82] as [number, number, number], rotY: 0 },
        { pos: [-12, 1.65, 11.82] as [number, number, number], rotY: Math.PI },
        { pos: [0, 1.65, 11.82] as [number, number, number], rotY: Math.PI },
      ].map((wb, idx) => (
        <group key={idx} position={wb.pos} rotation={[0, wb.rotY, 0]}>
          <mesh>
            <boxGeometry args={[2.8, 1.25, 0.06]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[2.68, 1.14]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.28} />
          </mesh>
        </group>
      ))}

      {/* Instanced Glass Partitions, Aluminum Frames, Frosted Strips & CEO Wood Slats */}
      <InstancedGlassPartitions />

      {/* Central Meeting Room Table, 8 Instanced Chairs & Live Project Progress LED Screen */}
      <CentralMeetingRoom castShadow={castShadow} />
      <CoffeeLoungeZone castShadow={castShadow} />

      {/* Instanced Semi-Realistic Office Furniture & Lights */}
      <InstancedFurniture castShadow={castShadow} />
    </group>
  );
};
