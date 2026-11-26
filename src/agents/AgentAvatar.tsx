import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentEntity } from './types';
import { DEPARTMENT_META } from './roster';
import { getOrBuildAgentRig, getSharedRigMaterial } from './avatarGeometry';
import { AGENT_STATE_COLOR } from './InstancedAgentIndicators';

interface AgentAvatarProps {
  agent: AgentEntity;
  isSelected: boolean;
  onSelect: (id: string) => void;
  showBubbles: boolean;
  castShadow?: boolean;
}

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

export const AgentAvatar: React.FC<AgentAvatarProps> = React.memo(
  ({ agent, isSelected, onSelect, showBubbles, castShadow = true }) => {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    const torsoRef = useRef<THREE.Group>(null);
    const leftLegRef = useRef<THREE.Mesh>(null);
    const rightLegRef = useRef<THREE.Mesh>(null);
    const leftArmRef = useRef<THREE.Mesh>(null);
    const rightArmRef = useRef<THREE.Mesh>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const visualPos = useRef(new THREE.Vector3(agent.position[0], 0, agent.position[2]));
    const visualRotY = useRef(agent.rotationY);

    const rig = useMemo(() => getOrBuildAgentRig(agent), [agent.id]);
    const rigMaterial = useMemo(() => getSharedRigMaterial(), []);
    const buildScale = agent.appearance.buildScale ?? (agent.gender === 'Nam' ? 1.02 : 0.94);
    const deptColor = DEPARTMENT_META[agent.department].accent;

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
      const inCoffeeLounge = agent.position[0] > 8.5 && Math.abs(agent.position[2]) < 3.8;
      const inTrainingCenter = agent.position[0] < -18.5 && agent.position[2] > 4.2;

      const targetY = isSeated ? -0.22 : 0;
      const posLerp = Math.min(1, dt * 12);
      visualPos.current.x = THREE.MathUtils.lerp(visualPos.current.x, agent.position[0], posLerp);
      visualPos.current.y = THREE.MathUtils.lerp(visualPos.current.y, targetY, Math.min(1, dt * 8));
      visualPos.current.z = THREE.MathUtils.lerp(visualPos.current.z, agent.position[2], posLerp);
      visualRotY.current = lerpAngle(visualRotY.current, agent.rotationY, Math.min(1, dt * 10));

      groupRef.current.position.copy(visualPos.current);
      groupRef.current.rotation.y = visualRotY.current;

      let bounceY = 0;
      let torsoPitch = 0;
      let torsoYaw = 0;
      let lLegX = 0;
      let rLegX = 0;
      let lArmX = 0;
      let rArmX = 0;
      let lArmZ = 0.08;
      let rArmZ = -0.08;
      let headPitch = 0;
      let headYaw = 0;

      if (agent.state === 'Walking') {
        const stride = Math.sin(t * 8.6 + phase);
        bounceY = Math.abs(Math.cos(t * 8.6 + phase)) * 0.036;
        torsoPitch = 0.07;
        torsoYaw = stride * 0.07;
        lLegX = stride * 0.54;
        rLegX = -stride * 0.54;
        lArmX = -stride * 0.48;
        rArmX = stride * 0.48;
        headYaw = Math.sin(t * 2.1 + phase) * 0.08;
      } else if (agent.state === 'Working') {
        // Seated ergonomic typing with rhythmic alternating hands + dual-monitor glance
        const typeL = Math.sin(t * 15.5 + phase) * 0.1;
        const typeR = Math.sin(t * 15.5 + phase + 2.4) * 0.1;
        torsoPitch = 0.13 + Math.sin(t * 1.9 + phase) * 0.018;
        lLegX = -1.32;
        rLegX = -1.32;
        lArmX = -1.08 + typeL;
        rArmX = -1.08 + typeR;
        lArmZ = 0.18;
        rArmZ = -0.18;
        headPitch = 0.09 + Math.sin(t * 2.4 + phase) * 0.03;
        headYaw = Math.sin(t * 0.9 + phase) * 0.22;
      } else if (agent.state === 'Meeting') {
        // Attentive meeting posture with periodic presenting / note-taking gesture
        const gesture = Math.sin(t * 3.1 + phase);
        torsoPitch = 0.05 + Math.sin(t * 1.5 + phase) * 0.025;
        torsoYaw = Math.sin(t * 0.8 + phase) * 0.08;
        lLegX = -1.3;
        rLegX = -1.3;
        lArmX = -0.82 + Math.max(0, gesture) * 0.26;
        rArmX = -0.78 + Math.max(0, -gesture) * 0.22;
        lArmZ = 0.15;
        rArmZ = -0.15;
        headYaw = Math.sin(t * 1.2 + phase) * 0.3;
        headPitch = Math.sin(t * 2.8 + phase) * 0.06;
      } else if (agent.state === 'Talking') {
        // Expressive conversational / mentoring / training gestures
        const talk = Math.sin(t * 5.4 + phase);
        const talk2 = Math.cos(t * 3.8 + phase);
        torsoYaw = talk2 * (inTrainingCenter ? 0.16 : 0.1);
        torsoPitch = inTrainingCenter ? 0.06 : 0.02;
        lArmX = (inTrainingCenter ? -1.15 : -0.75) + talk * 0.36;
        rArmX = (inTrainingCenter ? -0.95 : -0.62) - talk2 * 0.32;
        lArmZ = inTrainingCenter ? 0.34 : 0.24;
        rArmZ = inTrainingCenter ? -0.3 : -0.24;
        headYaw = Math.sin(t * (inTrainingCenter ? 2.4 : 3.5) + phase) * 0.28;
        headPitch = Math.sin(t * 5.8 + phase) * 0.09;
      } else if (agent.state === 'Resting') {
        // Relaxed lean-back; if in Coffee Lounge, occasional coffee-sip right-arm motion
        const breath = Math.sin(t * 1.4 + phase);
        const sipWave = inCoffeeLounge ? Math.max(0, Math.sin(t * 1.1 + phase) - 0.55) * 1.8 : 0;
        torsoPitch = -0.14 + breath * 0.025;
        lLegX = -1.24;
        rLegX = -1.24;
        lArmX = -0.42;
        rArmX = -0.45 - sipWave * 0.72;
        lArmZ = 0.15;
        rArmZ = -0.15 + sipWave * 0.12;
        headPitch = -0.06 + breath * 0.05 - sipWave * 0.12;
        headYaw = Math.sin(t * 0.6 + phase) * 0.16;
      } else if (agent.state === 'Sitting') {
        const breath = Math.sin(t * 2 + phase);
        torsoPitch = 0.02 + breath * 0.015;
        lLegX = -1.3;
        rLegX = -1.3;
        lArmX = -0.6;
        rArmX = -0.6;
        headYaw = Math.sin(t * 0.9 + phase) * 0.15;
      } else {
        const breath = Math.sin(t * 2.2 + phase);
        bounceY = breath * 0.012;
        lArmX = breath * 0.05;
        rArmX = -breath * 0.05;
        headYaw = Math.sin(t * 0.9 + phase) * 0.16;
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
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headPitch, 0.2);
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, headYaw, 0.2);
      }
    });

    const h = agent.appearance.heightScale;

    return (
      <group
        ref={groupRef}
        scale={[buildScale, h, buildScale]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(agent.id);
        }}
      >
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.42, 0.56, 24]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* 6 Merged Vertex-Colored Articulated Meshes = 6 Draw Calls per Employee */}
        <group ref={bodyRef}>
          <mesh
            ref={leftLegRef}
            position={[-0.1, 0.68, 0]}
            geometry={rig.leftLeg}
            material={rigMaterial}
            castShadow={castShadow}
          />
          <mesh
            ref={rightLegRef}
            position={[0.1, 0.68, 0]}
            geometry={rig.rightLeg}
            material={rigMaterial}
            castShadow={castShadow}
          />

          <group ref={torsoRef} position={[0, 0.68, 0]}>
            <mesh geometry={rig.torso} material={rigMaterial} castShadow={castShadow} />
            <mesh
              ref={leftArmRef}
              position={[-0.24, 0.51, 0]}
              geometry={rig.leftArm}
              material={rigMaterial}
              castShadow={castShadow}
            />
            <mesh
              ref={rightArmRef}
              position={[0.24, 0.51, 0]}
              geometry={rig.rightArm}
              material={rigMaterial}
              castShadow={castShadow}
            />
            <mesh
              ref={headRef}
              position={[0, 0.77, 0]}
              geometry={rig.head}
              material={rigMaterial}
              castShadow={castShadow}
            />
          </group>
        </group>

        {/* Speech Bubble & Overhead Status Card */}
        {showBubbles && (agent.speechText || isSelected) && (
          <Html
            position={[0, 2.22, 0]}
            center
            distanceFactor={14}
            occlude={false}
            zIndexRange={[10, 0]}
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
                    backgroundColor: `${AGENT_STATE_COLOR[agent.state]}26`,
                    color: AGENT_STATE_COLOR[agent.state],
                    borderColor: `${AGENT_STATE_COLOR[agent.state]}66`,
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
