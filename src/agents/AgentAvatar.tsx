import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentEntity, HairStyle, OutfitStyle } from './types';
import { DEPARTMENT_META } from './roster';

interface AgentAvatarProps {
  agent: AgentEntity;
  isSelected: boolean;
  onSelect: (id: string) => void;
  showBubbles: boolean;
}

const STATE_COLOR: Record<AgentEntity['state'], string> = {
  Idle: '#94a3b8',
  Walking: '#38bdf8',
  Working: '#22c55e',
  Sitting: '#a3e635',
  Talking: '#f472b6',
  Meeting: '#a78bfa',
  Resting: '#fbbf24',
};

const STATE_LABEL_VI: Record<AgentEntity['state'], string> = {
  Idle: 'Sẵn sàng',
  Walking: 'Di chuyển',
  Working: 'Làm việc',
  Sitting: 'Đang ngồi',
  Talking: 'Trao đổi',
  Meeting: 'Đang họp',
  Resting: 'Nghỉ ngơi',
};

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

// Shared lightweight geometries across all 20 avatars to minimize GPU allocations
const GEO_SHOE = new THREE.BoxGeometry(0.13, 0.08, 0.21);
const GEO_LEG = new THREE.CapsuleGeometry(0.068, 0.44, 4, 8);
const GEO_ARM_UPPER = new THREE.CapsuleGeometry(0.05, 0.2, 4, 8);
const GEO_ARM_LOWER = new THREE.CapsuleGeometry(0.044, 0.18, 4, 8);
const GEO_HAND = new THREE.SphereGeometry(0.045, 8, 8);
const GEO_NECK = new THREE.CylinderGeometry(0.055, 0.065, 0.09, 8);
const GEO_HEAD = new THREE.SphereGeometry(0.165, 14, 12);
const GEO_EYE = new THREE.SphereGeometry(0.017, 6, 6);
const GEO_BROW = new THREE.BoxGeometry(0.042, 0.01, 0.012);
const GEO_NOSE = new THREE.ConeGeometry(0.018, 0.045, 6);
const GEO_EAR = new THREE.SphereGeometry(0.026, 6, 6);
const GEO_STATUS_RING = new THREE.RingGeometry(0.075, 0.105, 16);
const GEO_STATUS_DOT = new THREE.SphereGeometry(0.05, 10, 10);

const HairMesh: React.FC<{ style: HairStyle; color: string }> = React.memo(({ style, color }) => {
  const mat = <meshStandardMaterial color={color} roughness={0.82} />;
  switch (style) {
    case 'sidepart':
      return (
        <group>
          <mesh position={[0, 0.07, -0.01]} castShadow>
            <sphereGeometry args={[0.172, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
            {mat}
          </mesh>
          <mesh position={[0.04, 0.12, 0.08]} rotation={[0.15, 0, -0.25]}>
            <boxGeometry args={[0.16, 0.05, 0.11]} />
            {mat}
          </mesh>
        </group>
      );
    case 'spiky':
      return (
        <group>
          <mesh position={[0, 0.06, -0.01]} castShadow>
            <sphereGeometry args={[0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            {mat}
          </mesh>
          {[-0.07, 0, 0.07].map((x, idx) => (
            <mesh
              key={idx}
              position={[x, 0.18, 0.03 - idx * 0.01]}
              rotation={[0.25, 0, -x * 2]}
              castShadow
            >
              <coneGeometry args={[0.048, 0.11, 5]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case 'bob':
      return (
        <group>
          <mesh position={[0, 0.05, -0.01]} castShadow>
            <sphereGeometry args={[0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            {mat}
          </mesh>
          <mesh position={[-0.145, -0.03, -0.02]} castShadow>
            <capsuleGeometry args={[0.048, 0.14, 4, 6]} />
            {mat}
          </mesh>
          <mesh position={[0.145, -0.03, -0.02]} castShadow>
            <capsuleGeometry args={[0.048, 0.14, 4, 6]} />
            {mat}
          </mesh>
          <mesh position={[0, -0.02, -0.13]} castShadow>
            <boxGeometry args={[0.26, 0.2, 0.08]} />
            {mat}
          </mesh>
        </group>
      );
    case 'long':
      return (
        <group>
          <mesh position={[0, 0.05, -0.01]} castShadow>
            <sphereGeometry args={[0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            {mat}
          </mesh>
          <mesh position={[0, -0.14, -0.12]} castShadow>
            <boxGeometry args={[0.28, 0.38, 0.09]} />
            {mat}
          </mesh>
          <mesh position={[-0.14, -0.08, -0.02]}>
            <capsuleGeometry args={[0.042, 0.22, 4, 6]} />
            {mat}
          </mesh>
          <mesh position={[0.14, -0.08, -0.02]}>
            <capsuleGeometry args={[0.042, 0.22, 4, 6]} />
            {mat}
          </mesh>
        </group>
      );
    case 'ponytail':
      return (
        <group>
          <mesh position={[0, 0.05, -0.01]} castShadow>
            <sphereGeometry args={[0.176, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.04, -0.18]} rotation={[0.45, 0, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            {mat}
          </mesh>
        </group>
      );
    case 'bun':
      return (
        <group>
          <mesh position={[0, 0.05, -0.01]} castShadow>
            <sphereGeometry args={[0.175, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.16, -0.12]} castShadow>
            <sphereGeometry args={[0.085, 10, 8]} />
            {mat}
          </mesh>
        </group>
      );
    case 'curly':
      return (
        <group>
          {[
            [0, 0.14, 0],
            [-0.1, 0.12, 0.03],
            [0.1, 0.12, 0.03],
            [-0.11, 0.1, -0.07],
            [0.11, 0.1, -0.07],
            [0, 0.12, -0.11],
            [0, 0.15, 0.08],
          ].map((pos, idx) => (
            <mesh key={idx} position={pos as [number, number, number]} castShadow>
              <sphereGeometry args={[0.085, 8, 8]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case 'short':
    default:
      return (
        <mesh position={[0, 0.06, -0.01]} castShadow>
          <sphereGeometry args={[0.172, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
          {mat}
        </mesh>
      );
  }
});

export const AgentAvatar: React.FC<AgentAvatarProps> = React.memo(
  ({ agent, isSelected, onSelect, showBubbles }) => {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    const torsoRef = useRef<THREE.Group>(null);
    const leftLegRef = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const leftForearmRef = useRef<THREE.Group>(null);
    const rightForearmRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const statusHaloRef = useRef<THREE.Mesh>(null);
    const visualPos = useRef(new THREE.Vector3(agent.position[0], 0, agent.position[2]));
    const visualRotY = useRef(agent.rotationY);

    const appearance = agent.appearance;
    const buildScale = appearance.buildScale ?? (agent.gender === 'Nam' ? 1.02 : 0.94);
    const hairStyle: HairStyle = appearance.hairStyle ?? (agent.gender === 'Nữ' ? 'bob' : 'short');
    const outfitStyle: OutfitStyle = appearance.outfitStyle ?? 'shirt';
    const jacketColor = appearance.jacketColor ?? appearance.shirtColor;
    const shoesColor = appearance.shoesColor ?? '#1e293b';
    const eyeColor = appearance.eyeColor ?? '#1e293b';
    const facialHair = appearance.facialHair ?? 'none';
    const accessory = appearance.accessory ?? 'none';

    const hasJacket =
      outfitStyle === 'suit' || outfitStyle === 'blazer' || outfitStyle === 'cardigan';
    const sleeveColor = hasJacket || outfitStyle === 'hoodie' ? jacketColor : appearance.shirtColor;
    const deptColor = DEPARTMENT_META[agent.department].accent;

    const mouthColor = useMemo(
      () => (agent.gender === 'Nữ' ? '#be6a6c' : '#9f6a56'),
      [agent.gender]
    );

    useFrame((state, delta) => {
      if (!groupRef.current) return;
      const t = state.clock.elapsedTime;
      const dt = Math.min(delta, 0.08);
      const phase = agent.numericIndex * 1.17;
      const isSeated =
        agent.state === 'Working' ||
        agent.state === 'Sitting' ||
        agent.state === 'Meeting' ||
        agent.state === 'Resting';

      const targetY = isSeated ? -0.22 : 0;
      const posLerp = Math.min(1, dt * 12);
      visualPos.current.x = THREE.MathUtils.lerp(visualPos.current.x, agent.position[0], posLerp);
      visualPos.current.y = THREE.MathUtils.lerp(visualPos.current.y, targetY, Math.min(1, dt * 8));
      visualPos.current.z = THREE.MathUtils.lerp(visualPos.current.z, agent.position[2], posLerp);
      visualRotY.current = lerpAngle(visualRotY.current, agent.rotationY, Math.min(1, dt * 10));

      groupRef.current.position.copy(visualPos.current);
      groupRef.current.rotation.y = visualRotY.current;

      // Reset body bounce / lean defaults
      let bounceY = 0;
      let torsoPitch = 0;
      let torsoYaw = 0;
      let lLegX = 0;
      let rLegX = 0;
      let lArmX = 0;
      let rArmX = 0;
      let lArmZ = 0.08;
      let rArmZ = -0.08;
      let lForeX = -0.1;
      let rForeX = -0.1;
      let headPitch = 0;
      let headYaw = 0;

      if (agent.state === 'Walking') {
        const stride = Math.sin(t * 8.5 + phase);
        bounceY = Math.abs(Math.cos(t * 8.5 + phase)) * 0.035;
        torsoPitch = 0.06;
        torsoYaw = stride * 0.06;
        lLegX = stride * 0.52;
        rLegX = -stride * 0.52;
        lArmX = -stride * 0.42;
        rArmX = stride * 0.42;
        lForeX = -0.22 - Math.max(0, -stride) * 0.25;
        rForeX = -0.22 - Math.max(0, stride) * 0.25;
        headYaw = Math.sin(t * 2.1 + phase) * 0.06;
      } else if (agent.state === 'Working') {
        const typeL = Math.sin(t * 15 + phase) * 0.11;
        const typeR = Math.sin(t * 15 + phase + 2.3) * 0.11;
        torsoPitch = 0.12 + Math.sin(t * 1.8 + phase) * 0.015;
        lLegX = -1.32;
        rLegX = -1.32;
        lArmX = -0.72 + typeL * 0.35;
        rArmX = -0.72 + typeR * 0.35;
        lArmZ = 0.16;
        rArmZ = -0.16;
        lForeX = -0.75 + typeL;
        rForeX = -0.75 + typeR;
        headPitch = 0.08 + Math.sin(t * 2.2 + phase) * 0.03;
        headYaw = Math.sin(t * 0.85 + phase) * 0.18;
      } else if (agent.state === 'Meeting') {
        const gesture = Math.sin(t * 3.2 + phase);
        torsoPitch = 0.04 + Math.sin(t * 1.4 + phase) * 0.02;
        lLegX = -1.3;
        rLegX = -1.3;
        lArmX = -0.58 + Math.max(0, gesture) * 0.22;
        rArmX = -0.52 + Math.max(0, -gesture) * 0.18;
        lForeX = -0.68 + gesture * 0.14;
        rForeX = -0.62 - gesture * 0.12;
        headYaw = Math.sin(t * 1.15 + phase) * 0.28;
        headPitch = Math.sin(t * 2.8 + phase) * 0.06;
      } else if (agent.state === 'Talking') {
        const talk = Math.sin(t * 5.2 + phase);
        const talk2 = Math.cos(t * 3.7 + phase);
        torsoYaw = talk2 * 0.08;
        lArmX = -0.45 + talk * 0.28;
        rArmX = -0.35 - talk2 * 0.24;
        lArmZ = 0.22;
        rArmZ = -0.22;
        lForeX = -0.65 + talk * 0.2;
        rForeX = -0.55 + talk2 * 0.2;
        headYaw = Math.sin(t * 3.4 + phase) * 0.22;
        headPitch = Math.sin(t * 5.6 + phase) * 0.07;
      } else if (agent.state === 'Resting') {
        const breath = Math.sin(t * 1.4 + phase);
        torsoPitch = -0.14 + breath * 0.025;
        lLegX = -1.25;
        rLegX = -1.25;
        lArmX = -0.22;
        rArmX = -0.22;
        lArmZ = 0.14;
        rArmZ = -0.14;
        lForeX = -0.42;
        rForeX = -0.42;
        headPitch = -0.06 + breath * 0.05;
        headYaw = Math.sin(t * 0.55 + phase) * 0.14;
      } else if (agent.state === 'Sitting') {
        const breath = Math.sin(t * 2 + phase);
        torsoPitch = 0.02 + breath * 0.015;
        lLegX = -1.3;
        rLegX = -1.3;
        lArmX = -0.36;
        rArmX = -0.36;
        lForeX = -0.55;
        rForeX = -0.55;
        headYaw = Math.sin(t * 0.9 + phase) * 0.14;
      } else {
        // Idle standing
        const breath = Math.sin(t * 2.2 + phase);
        bounceY = breath * 0.01;
        lArmX = breath * 0.04;
        rArmX = -breath * 0.04;
        lForeX = -0.12;
        rForeX = -0.12;
        headYaw = Math.sin(t * 0.9 + phase) * 0.15;
      }

      if (bodyRef.current) bodyRef.current.position.y = bounceY;
      if (torsoRef.current) {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(torsoRef.current.rotation.x, torsoPitch, 0.2);
        torsoRef.current.rotation.y = THREE.MathUtils.lerp(torsoRef.current.rotation.y, torsoYaw, 0.2);
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, lLegX, 0.22);
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, rLegX, 0.22);
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, lArmX, 0.24);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, lArmZ, 0.2);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, rArmX, 0.24);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, rArmZ, 0.2);
      }
      if (leftForearmRef.current) leftForearmRef.current.rotation.x = THREE.MathUtils.lerp(leftForearmRef.current.rotation.x, lForeX, 0.28);
      if (rightForearmRef.current) rightForearmRef.current.rotation.x = THREE.MathUtils.lerp(rightForearmRef.current.rotation.x, rForeX, 0.28);
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headPitch, 0.2);
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, headYaw, 0.2);
      }
      if (statusHaloRef.current) {
        const pulse = 1 + Math.sin(t * 3.5 + phase) * 0.14;
        statusHaloRef.current.scale.set(pulse, pulse, 1);
      }
    });

    const h = appearance.heightScale;

    return (
      <group
        ref={groupRef}
        scale={[buildScale, h, buildScale]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(agent.id);
        }}
      >
        {/* Selection ring on floor */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.42, 0.56, 24]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
        )}

        <group ref={bodyRef}>
          {/* Left Leg (pivots at hip y=0.68) */}
          <group ref={leftLegRef} position={[-0.1, 0.68, 0]}>
            <mesh position={[0, -0.31, 0]} geometry={GEO_LEG} castShadow>
              <meshStandardMaterial color={appearance.pantsColor} roughness={0.82} />
            </mesh>
            <mesh position={[0, -0.63, 0.04]} geometry={GEO_SHOE} castShadow>
              <meshStandardMaterial color={shoesColor} roughness={0.55} />
            </mesh>
          </group>

          {/* Right Leg (pivots at hip y=0.68) */}
          <group ref={rightLegRef} position={[0.1, 0.68, 0]}>
            <mesh position={[0, -0.31, 0]} geometry={GEO_LEG} castShadow>
              <meshStandardMaterial color={appearance.pantsColor} roughness={0.82} />
            </mesh>
            <mesh position={[0, -0.63, 0.04]} geometry={GEO_SHOE} castShadow>
              <meshStandardMaterial color={shoesColor} roughness={0.55} />
            </mesh>
          </group>

          {/* Upper Body Group (pivots at waist y=0.68) */}
          <group ref={torsoRef} position={[0, 0.68, 0]}>
            {/* Pelvis / Belt */}
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[0.36, 0.09, 0.21]} />
              <meshStandardMaterial color="#1e293b" roughness={0.6} />
            </mesh>

            {/* Main Torso */}
            <mesh position={[0, 0.32, 0]} castShadow>
              <boxGeometry args={[0.38, 0.48, 0.22]} />
              <meshStandardMaterial
                color={hasJacket ? appearance.shirtColor : sleeveColor}
                roughness={0.68}
              />
            </mesh>

            {/* Suit / Blazer / Cardigan Open Jacket Panels */}
            {hasJacket && (
              <>
                <mesh position={[-0.12, 0.31, 0.02]} castShadow>
                  <boxGeometry args={[0.16, 0.49, 0.21]} />
                  <meshStandardMaterial color={jacketColor} roughness={0.62} />
                </mesh>
                <mesh position={[0.12, 0.31, 0.02]} castShadow>
                  <boxGeometry args={[0.16, 0.49, 0.21]} />
                  <meshStandardMaterial color={jacketColor} roughness={0.62} />
                </mesh>
                <mesh position={[0, 0.31, -0.06]} castShadow>
                  <boxGeometry args={[0.39, 0.49, 0.13]} />
                  <meshStandardMaterial color={jacketColor} roughness={0.62} />
                </mesh>
              </>
            )}

            {/* Hoodie Hood & Front Pocket */}
            {outfitStyle === 'hoodie' && (
              <>
                <mesh position={[0, 0.54, -0.11]}>
                  <boxGeometry args={[0.26, 0.12, 0.11]} />
                  <meshStandardMaterial color={jacketColor} roughness={0.78} />
                </mesh>
                <mesh position={[0, 0.17, 0.115]}>
                  <boxGeometry args={[0.24, 0.13, 0.03]} />
                  <meshStandardMaterial color={appearance.shirtColor} roughness={0.8} />
                </mesh>
              </>
            )}

            {/* Tie accessory */}
            {accessory === 'tie' && (
              <mesh position={[0, 0.34, 0.118]}>
                <boxGeometry args={[0.045, 0.28, 0.015]} />
                <meshStandardMaterial color={deptColor} roughness={0.4} />
              </mesh>
            )}

            {/* Scarf accessory */}
            {accessory === 'scarf' && (
              <mesh position={[0, 0.55, 0.02]}>
                <torusGeometry args={[0.11, 0.038, 8, 14]} />
                <meshStandardMaterial color={deptColor} roughness={0.85} />
              </mesh>
            )}

            {/* Department lanyard badge */}
            <mesh position={[0.1, 0.37, 0.126]}>
              <boxGeometry args={[0.065, 0.085, 0.016]} />
              <meshStandardMaterial
                color={deptColor}
                emissive={deptColor}
                emissiveIntensity={0.25}
                roughness={0.35}
              />
            </mesh>

            {/* Left Arm (pivots at shoulder) */}
            <group ref={leftArmRef} position={[-0.24, 0.51, 0]}>
              <mesh position={[0, -0.12, 0]} geometry={GEO_ARM_UPPER} castShadow>
                <meshStandardMaterial color={sleeveColor} roughness={0.7} />
              </mesh>
              <group ref={leftForearmRef} position={[0, -0.24, 0]}>
                <mesh position={[0, -0.11, 0]} geometry={GEO_ARM_LOWER} castShadow>
                  <meshStandardMaterial
                    color={outfitStyle === 'polo' ? appearance.skinColor : sleeveColor}
                    roughness={0.65}
                  />
                </mesh>
                <mesh position={[0, -0.23, 0]} geometry={GEO_HAND}>
                  <meshStandardMaterial color={appearance.skinColor} roughness={0.6} />
                </mesh>
                {accessory === 'watch' && (
                  <mesh position={[0, -0.18, 0]}>
                    <cylinderGeometry args={[0.048, 0.048, 0.03, 10]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
                  </mesh>
                )}
              </group>
            </group>

            {/* Right Arm (pivots at shoulder) */}
            <group ref={rightArmRef} position={[0.24, 0.51, 0]}>
              <mesh position={[0, -0.12, 0]} geometry={GEO_ARM_UPPER} castShadow>
                <meshStandardMaterial color={sleeveColor} roughness={0.7} />
              </mesh>
              <group ref={rightForearmRef} position={[0, -0.24, 0]}>
                <mesh position={[0, -0.11, 0]} geometry={GEO_ARM_LOWER} castShadow>
                  <meshStandardMaterial
                    color={outfitStyle === 'polo' ? appearance.skinColor : sleeveColor}
                    roughness={0.65}
                  />
                </mesh>
                <mesh position={[0, -0.23, 0]} geometry={GEO_HAND}>
                  <meshStandardMaterial color={appearance.skinColor} roughness={0.6} />
                </mesh>
              </group>
            </group>

            {/* Neck */}
            <mesh position={[0, 0.59, 0]} geometry={GEO_NECK}>
              <meshStandardMaterial color={appearance.skinColor} roughness={0.6} />
            </mesh>

            {/* Head & Facial Details */}
            <group ref={headRef} position={[0, 0.77, 0]}>
              <mesh geometry={GEO_HEAD} castShadow>
                <meshStandardMaterial color={appearance.skinColor} roughness={0.58} />
              </mesh>

              {/* Ears */}
              <mesh position={[-0.16, -0.01, 0]} geometry={GEO_EAR}>
                <meshStandardMaterial color={appearance.skinColor} roughness={0.6} />
              </mesh>
              <mesh position={[0.16, -0.01, 0]} geometry={GEO_EAR}>
                <meshStandardMaterial color={appearance.skinColor} roughness={0.6} />
              </mesh>

              {/* Earrings */}
              {accessory === 'earrings' && (
                <>
                  <mesh position={[-0.168, -0.045, 0.01]}>
                    <sphereGeometry args={[0.015, 6, 6]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
                  </mesh>
                  <mesh position={[0.168, -0.045, 0.01]}>
                    <sphereGeometry args={[0.015, 6, 6]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
                  </mesh>
                </>
              )}

              {/* Eyes & Eyebrows */}
              <mesh position={[-0.055, 0.02, 0.148]} geometry={GEO_EYE}>
                <meshStandardMaterial color={eyeColor} roughness={0.2} />
              </mesh>
              <mesh position={[0.055, 0.02, 0.148]} geometry={GEO_EYE}>
                <meshStandardMaterial color={eyeColor} roughness={0.2} />
              </mesh>
              <mesh position={[-0.055, 0.052, 0.15]} geometry={GEO_BROW}>
                <meshStandardMaterial color={appearance.hairColor} roughness={0.8} />
              </mesh>
              <mesh position={[0.055, 0.052, 0.15]} geometry={GEO_BROW}>
                <meshStandardMaterial color={appearance.hairColor} roughness={0.8} />
              </mesh>

              {/* Nose */}
              <mesh position={[0, -0.01, 0.164]} rotation={[Math.PI / 2, 0, 0]} geometry={GEO_NOSE}>
                <meshStandardMaterial color={appearance.skinColor} roughness={0.62} />
              </mesh>

              {/* Mouth */}
              <mesh position={[0, -0.062, 0.148]}>
                <boxGeometry args={[0.052, 0.012, 0.012]} />
                <meshStandardMaterial color={mouthColor} roughness={0.5} />
              </mesh>

              {/* Facial Hair */}
              {facialHair === 'beard' && (
                <mesh position={[0, -0.085, 0.085]}>
                  <boxGeometry args={[0.18, 0.095, 0.14]} />
                  <meshStandardMaterial color={appearance.hairColor} roughness={0.9} />
                </mesh>
              )}
              {facialHair === 'mustache' && (
                <mesh position={[0, -0.042, 0.155]}>
                  <boxGeometry args={[0.085, 0.018, 0.018]} />
                  <meshStandardMaterial color={appearance.hairColor} roughness={0.9} />
                </mesh>
              )}
              {facialHair === 'stubble' && (
                <mesh position={[0, -0.08, 0.09]}>
                  <boxGeometry args={[0.17, 0.06, 0.12]} />
                  <meshStandardMaterial
                    color={appearance.hairColor}
                    transparent
                    opacity={0.35}
                    roughness={0.9}
                  />
                </mesh>
              )}

              {/* Glasses */}
              {appearance.hasGlasses && (
                <group position={[0, 0.02, 0.162]}>
                  <mesh position={[-0.055, 0, 0]}>
                    <boxGeometry args={[0.075, 0.048, 0.014]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.2} />
                  </mesh>
                  <mesh position={[0.055, 0, 0]}>
                    <boxGeometry args={[0.075, 0.048, 0.014]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, 0.005, 0]}>
                    <boxGeometry args={[0.036, 0.012, 0.012]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.2} />
                  </mesh>
                </group>
              )}

              {/* Headphones */}
              {accessory === 'headphones' && (
                <group>
                  <mesh position={[0, 0.06, 0]} rotation={[0, 0, 0]}>
                    <torusGeometry args={[0.175, 0.018, 8, 16, Math.PI]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.3} />
                  </mesh>
                  <mesh position={[-0.175, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.048, 0.048, 0.035, 10]} />
                    <meshStandardMaterial color={deptColor} roughness={0.35} />
                  </mesh>
                  <mesh position={[0.175, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.048, 0.048, 0.035, 10]} />
                    <meshStandardMaterial color={deptColor} roughness={0.35} />
                  </mesh>
                </group>
              )}

              {/* Hairstyle */}
              <HairMesh style={hairStyle} color={appearance.hairColor} />
            </group>
          </group>
        </group>

        {/* Overhead Status Indicator (Glowing Core + Pulse Halo) */}
        <group position={[0, 1.88, 0]}>
          <mesh geometry={GEO_STATUS_DOT}>
            <meshBasicMaterial color={STATE_COLOR[agent.state]} />
          </mesh>
          <mesh
            ref={statusHaloRef}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={GEO_STATUS_RING}
          >
            <meshBasicMaterial
              color={STATE_COLOR[agent.state]}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Upgraded Speech Bubble & Overhead Status Card */}
        {showBubbles && (agent.speechText || isSelected) && (
          <Html
            position={[0, 2.22, 0]}
            center
            distanceFactor={14}
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className={`agent-bubble ${isSelected ? 'agent-bubble-selected' : ''}`}
              style={{ borderLeftColor: deptColor }}
            >
              <div className="agent-bubble-head">
                <span className="agent-bubble-name">{agent.name}</span>
                <span
                  className="agent-bubble-pill"
                  style={{
                    backgroundColor: `${STATE_COLOR[agent.state]}26`,
                    color: STATE_COLOR[agent.state],
                    borderColor: `${STATE_COLOR[agent.state]}66`,
                  }}
                >
                  {STATE_LABEL_VI[agent.state]}
                </span>
              </div>
              {agent.speechText && <div className="agent-bubble-text">{agent.speechText}</div>}
              {isSelected && (
                <div className="agent-bubble-progress">
                  <div
                    className="agent-bubble-progress-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, agent.taskProgress))}%`,
                      backgroundColor: deptColor,
                    }}
                  />
                </div>
              )}
              <div className="agent-bubble-tail" />
            </div>
          </Html>
        )}
      </group>
    );
  }
);
