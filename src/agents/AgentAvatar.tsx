import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentEntity } from './types';
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

export const AgentAvatar: React.FC<AgentAvatarProps> = React.memo(
  ({ agent, isSelected, onSelect, showBubbles }) => {
    const groupRef = useRef<THREE.Group>(null);
    const leftLegRef = useRef<THREE.Mesh>(null);
    const rightLegRef = useRef<THREE.Mesh>(null);
    const leftArmRef = useRef<THREE.Mesh>(null);
    const rightArmRef = useRef<THREE.Mesh>(null);
    const headRef = useRef<THREE.Group>(null);

    useFrame((state) => {
      if (!groupRef.current) return;
      const t = state.clock.elapsedTime;
      const isSeated =
        agent.state === 'Working' ||
        agent.state === 'Sitting' ||
        agent.state === 'Meeting' ||
        agent.state === 'Resting';

      // Smooth visual interpolation to store position
      const targetY = isSeated ? -0.18 : 0;
      groupRef.current.position.set(agent.position[0], targetY, agent.position[2]);
      groupRef.current.rotation.y = agent.rotationY;

      if (agent.state === 'Walking') {
        const swing = Math.sin(t * 9 + agent.numericIndex) * 0.45;
        if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
        if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
      } else if (agent.state === 'Working') {
        const typeAnim = Math.sin(t * 14 + agent.numericIndex) * 0.08;
        if (leftLegRef.current) leftLegRef.current.rotation.x = -1.2;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -1.2;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.85 + typeAnim;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.85 - typeAnim;
      } else if (isSeated) {
        if (leftLegRef.current) leftLegRef.current.rotation.x = -1.2;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -1.2;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.35;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.35;
      } else {
        const idleBreath = Math.sin(t * 2.5 + agent.numericIndex) * 0.04;
        if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
        if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
        if (leftArmRef.current) leftArmRef.current.rotation.x = idleBreath;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -idleBreath;
      }

      if (headRef.current) {
        if (agent.state === 'Talking' || agent.state === 'Meeting') {
          headRef.current.rotation.y = Math.sin(t * 4 + agent.numericIndex) * 0.22;
        } else {
          headRef.current.rotation.y = Math.sin(t * 1.1 + agent.numericIndex) * 0.06;
        }
      }
    });

    const deptColor = DEPARTMENT_META[agent.department].accent;
    const h = agent.appearance.heightScale;

    return (
      <group
        ref={groupRef}
        scale={[1, h, 1]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(agent.id);
        }}
      >
        {/* Selection ring */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.42, 0.56, 24]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Legs */}
        <mesh ref={leftLegRef} position={[-0.11, 0.36, 0]} castShadow>
          <boxGeometry args={[0.14, 0.68, 0.16]} />
          <meshStandardMaterial color={agent.appearance.pantsColor} roughness={0.8} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.11, 0.36, 0]} castShadow>
          <boxGeometry args={[0.14, 0.68, 0.16]} />
          <meshStandardMaterial color={agent.appearance.pantsColor} roughness={0.8} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, 0.96, 0]} castShadow>
          <boxGeometry args={[0.42, 0.56, 0.24]} />
          <meshStandardMaterial color={agent.appearance.shirtColor} roughness={0.65} />
        </mesh>

        {/* Department lanyard badge */}
        <mesh position={[0.08, 1.04, 0.13]}>
          <boxGeometry args={[0.07, 0.09, 0.02]} />
          <meshStandardMaterial color={deptColor} emissive={deptColor} emissiveIntensity={0.25} />
        </mesh>

        {/* Arms */}
        <mesh ref={leftArmRef} position={[-0.27, 0.95, 0]} castShadow>
          <boxGeometry args={[0.11, 0.48, 0.12]} />
          <meshStandardMaterial color={agent.appearance.shirtColor} roughness={0.7} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.27, 0.95, 0]} castShadow>
          <boxGeometry args={[0.11, 0.48, 0.12]} />
          <meshStandardMaterial color={agent.appearance.shirtColor} roughness={0.7} />
        </mesh>

        {/* Head */}
        <group ref={headRef} position={[0, 1.44, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.3, 0.28]} />
            <meshStandardMaterial color={agent.appearance.skinColor} roughness={0.6} />
          </mesh>
          {/* Hair cap */}
          <mesh position={[0, 0.13, -0.02]}>
            <boxGeometry args={[0.32, 0.11, 0.31]} />
            <meshStandardMaterial color={agent.appearance.hairColor} roughness={0.85} />
          </mesh>
          {/* Glasses */}
          {agent.appearance.hasGlasses && (
            <mesh position={[0, 0.02, 0.15]}>
              <boxGeometry args={[0.22, 0.06, 0.02]} />
              <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.2} />
            </mesh>
          )}
        </group>

        {/* Floating status dot */}
        <mesh position={[0, 1.78, 0]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial color={STATE_COLOR[agent.state]} />
        </mesh>

        {/* Speech Bubble or Selected Nameplate */}
        {showBubbles && (agent.speechText || isSelected) && (
          <Html
            position={[0, 2.05, 0]}
            center
            distanceFactor={15}
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div className="agent-bubble">
              <div className="agent-bubble-name">
                {agent.name} <span className="agent-bubble-state">({agent.state})</span>
              </div>
              {agent.speechText && <div className="agent-bubble-text">{agent.speechText}</div>}
            </div>
          </Html>
        )}
      </group>
    );
  }
);
