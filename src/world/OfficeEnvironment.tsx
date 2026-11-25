import React from 'react';
import { Text } from '@react-three/drei';
import { OFFICE_ROOMS } from './officeLayout';
import { InstancedFurniture } from './InstancedFurniture';

interface OfficeEnvironmentProps {
  castShadow: boolean;
}

const GlassWall: React.FC<{
  position: [number, number, number];
  args: [number, number, number];
}> = ({ position, args }) => (
  <mesh position={position}>
    <boxGeometry args={args} />
    <meshPhysicalMaterial
      color="#93c5fd"
      transparent
      opacity={0.22}
      roughness={0.12}
      metalness={0.1}
    />
  </mesh>
);

const SolidWall: React.FC<{
  position: [number, number, number];
  args: [number, number, number];
}> = ({ position, args }) => (
  <mesh position={position} receiveShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color="#1e293b" roughness={0.85} />
  </mesh>
);

export const OfficeEnvironment: React.FC<OfficeEnvironmentProps> = ({ castShadow }) => {
  return (
    <group>
      {/* Main Base Floor (36m x 24m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[36, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>

      {/* Subtle Corridor Grid */}
      <gridHelper args={[36, 36, '#1e293b', '#172033']} position={[0, 0.005, 0]} />

      {/* 8 Designated Room Zones */}
      {OFFICE_ROOMS.map((room) => (
        <group key={room.id}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.bounds.x, 0.01, room.bounds.z]}
            receiveShadow
          >
            <planeGeometry args={[room.bounds.width - 0.18, room.bounds.depth - 0.18]} />
            <meshStandardMaterial color={room.floorColor} roughness={0.8} />
          </mesh>

          {/* Department Accent Strip */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.bounds.x, 0.015, room.bounds.z]}
          >
            <ringGeometry
              args={[
                Math.min(room.bounds.width, room.bounds.depth) * 0.44,
                Math.min(room.bounds.width, room.bounds.depth) * 0.46,
                4,
              ]}
            />
            <meshBasicMaterial color={room.accentColor} transparent opacity={0.15} />
          </mesh>

          {/* Room Label */}
          <Text
            position={[room.bounds.x, 2.75, room.bounds.z - room.bounds.depth / 2 + 0.4]}
            fontSize={0.42}
            color={room.accentColor}
            anchorX="center"
            anchorY="middle"
          >
            {room.name}
          </Text>
        </group>
      ))}

      {/* Outer Perimeter Walls */}
      <SolidWall position={[0, 1.5, -12]} args={[36, 3, 0.25]} />
      <SolidWall position={[0, 1.5, 12]} args={[36, 3, 0.25]} />
      <SolidWall position={[-18, 1.5, 0]} args={[0.25, 3, 24]} />
      <SolidWall position={[18, 1.5, 0]} args={[0.25, 3, 24]} />

      {/* North Room Glass Partitions (with doorway openings) */}
      <GlassWall position={[-10, 1.4, -9]} args={[0.12, 2.8, 6]} />
      <GlassWall position={[-3, 1.4, -9]} args={[0.12, 2.8, 6]} />
      <GlassWall position={[9, 1.4, -9]} args={[0.12, 2.8, 6]} />
      {/* Front glass strips leaving doors open */}
      <GlassWall position={[-16.2, 1.4, -6]} args={[3.5, 2.8, 0.12]} />
      <GlassWall position={[-11.2, 1.4, -6]} args={[2.3, 2.8, 0.12]} />
      <GlassWall position={[-8.6, 1.4, -6]} args={[2.4, 2.8, 0.12]} />
      <GlassWall position={[-4.4, 1.4, -6]} args={[2.5, 2.8, 0.12]} />
      <GlassWall position={[-0.6, 1.4, -6]} args={[4.4, 2.8, 0.12]} />
      <GlassWall position={[6.2, 1.4, -6]} args={[5.4, 2.8, 0.12]} />
      <GlassWall position={[10.5, 1.4, -6]} args={[2.8, 2.8, 0.12]} />
      <GlassWall position={[16.0, 1.4, -6]} args={[3.8, 2.8, 0.12]} />

      {/* South Room Glass Partitions */}
      <GlassWall position={[-6, 1.4, 9]} args={[0.12, 2.8, 6]} />
      <GlassWall position={[6, 1.4, 9]} args={[0.12, 2.8, 6]} />
      <GlassWall position={[-15.5, 1.4, 6]} args={[4.8, 2.8, 0.12]} />
      <GlassWall position={[-8.5, 1.4, 6]} args={[4.8, 2.8, 0.12]} />
      <GlassWall position={[-3.5, 1.4, 6]} args={[4.8, 2.8, 0.12]} />
      <GlassWall position={[3.5, 1.4, 6]} args={[4.8, 2.8, 0.12]} />
      <GlassWall position={[8.5, 1.4, 6]} args={[4.8, 2.8, 0.12]} />
      <GlassWall position={[15.5, 1.4, 6]} args={[4.8, 2.8, 0.12]} />

      {/* Central Meeting Room Glass Enclosure */}
      <GlassWall position={[-3.0, 1.4, -3.5]} args={[4.0, 2.8, 0.12]} />
      <GlassWall position={[3.0, 1.4, -3.5]} args={[4.0, 2.8, 0.12]} />
      <GlassWall position={[-3.0, 1.4, 3.5]} args={[4.0, 2.8, 0.12]} />
      <GlassWall position={[3.0, 1.4, 3.5]} args={[4.0, 2.8, 0.12]} />
      <GlassWall position={[-5.0, 1.4, -2.2]} args={[0.12, 2.8, 2.5]} />
      <GlassWall position={[-5.0, 1.4, 2.2]} args={[0.12, 2.8, 2.5]} />
      <GlassWall position={[5.0, 1.4, -2.2]} args={[0.12, 2.8, 2.5]} />
      <GlassWall position={[5.0, 1.4, 2.2]} args={[0.12, 2.8, 2.5]} />

      {/* Central Meeting Room: Conference Table + Giant LED Presentation Screen */}
      <mesh position={[0, 0.74, 0]} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[6.2, 0.12, 2.0]} />
        <meshStandardMaterial color="#334155" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[4.8, 0.68, 0.9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Large LED Screen on West Pillar of Meeting Room */}
      <group position={[-4.75, 1.75, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[3.4, 1.75, 0.12]} />
          <meshStandardMaterial color="#020617" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[3.15, 1.52]} />
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#0284c7"
            emissiveIntensity={0.7}
            roughness={0.2}
          />
        </mesh>
        <Text position={[0, 0.25, 0.09]} fontSize={0.24} color="#f8fafc" anchorX="center">
          AI COMPANY WORLD 3D
        </Text>
        <Text position={[0, -0.18, 0.09]} fontSize={0.14} color="#bae6fd" anchorX="center">
          V0.1 LIVE OPERATIONS DASHBOARD
        </Text>
      </group>

      {/* Instanced Office Furniture & Lights */}
      <InstancedFurniture castShadow={castShadow} />
    </group>
  );
};
