import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OFFICE_ROOMS } from './officeLayout';
import { InstancedFurniture } from './InstancedFurniture';
import { CentralMeetingRoom } from './CentralMeetingRoom';

interface OfficeEnvironmentProps {
  castShadow: boolean;
}

function createCorridorFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#162033';
    ctx.fillRect(0, 0, 256, 256);
    // Subtle architectural stone tile seams
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 126, 126);
    ctx.strokeRect(129, 1, 126, 126);
    ctx.strokeRect(1, 129, 126, 126);
    ctx.strokeRect(129, 129, 126, 126);
    // Soft tonal variation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
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
        emissiveIntensity={0.45}
        roughness={0.35}
        transparent
      />
    </mesh>
  );
});

const GlassWall: React.FC<{
  position: [number, number, number];
  args: [number, number, number];
}> = ({ position, args }) => (
  <group position={position}>
    {/* Tempered glass pane */}
    <mesh>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color="#bae6fd"
        transparent
        opacity={0.22}
        roughness={0.08}
        metalness={0.12}
        reflectivity={0.65}
      />
    </mesh>
    {/* Top & bottom aluminum architectural frame */}
    <mesh position={[0, args[1] / 2 - 0.03, 0]}>
      <boxGeometry args={[args[0] + 0.02, 0.06, args[2] + 0.02]} />
      <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.32} />
    </mesh>
    <mesh position={[0, -args[1] / 2 + 0.04, 0]}>
      <boxGeometry args={[args[0] + 0.02, 0.08, args[2] + 0.02]} />
      <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.32} />
    </mesh>
    {/* Frosted privacy stripe at eye/mid level */}
    <mesh position={[0, -0.15, 0]}>
      <boxGeometry args={[args[0] + 0.005, 0.42, args[2] + 0.005]} />
      <meshStandardMaterial color="#e2e8f0" transparent opacity={0.14} roughness={0.6} />
    </mesh>
  </group>
);

const SolidWall: React.FC<{
  position: [number, number, number];
  args: [number, number, number];
}> = ({ position, args }) => (
  <group position={position}>
    <mesh receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#253146" roughness={0.82} />
    </mesh>
    {/* Architectural baseboard */}
    <mesh position={[0, -args[1] / 2 + 0.08, 0]}>
      <boxGeometry args={[args[0] + 0.04, 0.16, args[2] + 0.04]} />
      <meshStandardMaterial color="#0f172a" roughness={0.6} />
    </mesh>
  </group>
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
        <meshStandardMaterial map={floorTex} roughness={0.62} metalness={0.08} />
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
            <meshStandardMaterial color={room.floorColor} roughness={0.88} metalness={0.02} />
          </mesh>

          {/* Subtle LED Perimeter Accent Line */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.bounds.x, 0.014, room.bounds.z - room.bounds.depth / 2 + 0.18]}
          >
            <planeGeometry args={[room.bounds.width - 0.6, 0.08]} />
            <meshStandardMaterial
              color={room.accentColor}
              emissive={room.accentColor}
              emissiveIntensity={0.45}
            />
          </mesh>

          {/* Offline-safe Room Label Plaque */}
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

      {/* CEO Office Decorative Wood Slat Feature Wall */}
      {[-16.8, -15.9, -15.0, -14.1, -13.2, -12.3, -11.4].map((x) => (
        <mesh key={x} position={[x, 1.45, -11.82]}>
          <boxGeometry args={[0.14, 2.7, 0.08]} />
          <meshStandardMaterial color="#7c5338" roughness={0.62} />
        </mesh>
      ))}

      {/* Wall Whiteboards in Engineering, AI Research & Operations */}
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

      {/* North Room Glass Partitions — Exact match to collision.ts doorway openings */}
      <GlassWall position={[-10, 1.4, -9]} args={[0.12, 2.8, 6]} />
      <GlassWall position={[-3, 1.4, -9]} args={[0.12, 2.8, 6]} />
      <GlassWall position={[9, 1.4, -9]} args={[0.12, 2.8, 6]} />
      {/* Front glass wall Z=-6 with clean 2.0m doorways at X=-13.4, -6.6, 2.5, 13.0 */}
      <GlassWall position={[-16.2, 1.4, -6]} args={[3.6, 2.8, 0.12]} />
      <GlassWall position={[-10.0, 1.4, -6]} args={[4.8, 2.8, 0.12]} />
      <GlassWall position={[-2.05, 1.4, -6]} args={[7.1, 2.8, 0.12]} />
      <GlassWall position={[7.75, 1.4, -6]} args={[8.5, 2.8, 0.12]} />
      <GlassWall position={[16.0, 1.4, -6]} args={[4.0, 2.8, 0.12]} />

      {/* South Room Glass Partitions — Exact match to collision.ts doorway openings */}
      <GlassWall position={[-6, 1.4, 9]} args={[0.12, 2.8, 6]} />
      <GlassWall position={[6, 1.4, 9]} args={[0.12, 2.8, 6]} />
      {/* Front glass wall Z=+6 with clean 2.0m doorways at X=-12.0, 0.0, 12.0 */}
      <GlassWall position={[-15.5, 1.4, 6]} args={[5.0, 2.8, 0.12]} />
      <GlassWall position={[-6.0, 1.4, 6]} args={[10.0, 2.8, 0.12]} />
      <GlassWall position={[6.0, 1.4, 6]} args={[10.0, 2.8, 0.12]} />
      <GlassWall position={[15.5, 1.4, 6]} args={[5.0, 2.8, 0.12]} />

      {/* Central Meeting Room Glass Enclosure (Doors: North, South, East; Solid glass + LED on West) */}
      <GlassWall position={[-3.0, 1.4, -3.5]} args={[4.0, 2.8, 0.12]} />
      <GlassWall position={[3.0, 1.4, -3.5]} args={[4.0, 2.8, 0.12]} />
      <GlassWall position={[-3.0, 1.4, 3.5]} args={[4.0, 2.8, 0.12]} />
      <GlassWall position={[3.0, 1.4, 3.5]} args={[4.0, 2.8, 0.12]} />
      {/* Full West glass wall behind the Live Project Progress LED Screen */}
      <GlassWall position={[-5.0, 1.4, 0]} args={[0.12, 2.8, 7.0]} />
      {/* East glass wall with center doorway at Z=-1..1 */}
      <GlassWall position={[5.0, 1.4, -2.25]} args={[0.12, 2.8, 2.5]} />
      <GlassWall position={[5.0, 1.4, 2.25]} args={[0.12, 2.8, 2.5]} />

      {/* Central Meeting Room Table, 8 Chairs & Live Project Progress LED Screen */}
      <CentralMeetingRoom castShadow={castShadow} />

      {/* Instanced Semi-Realistic Office Furniture & Lights */}
      <InstancedFurniture castShadow={castShadow} />
    </group>
  );
};
