import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { AgentEntity, HairStyle, OutfitStyle } from './types';
import { DEPARTMENT_META } from './roster';

export interface AgentRigGeometries {
  torso: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  leftArm: THREE.BufferGeometry;
  rightArm: THREE.BufferGeometry;
  leftLeg: THREE.BufferGeometry;
  rightLeg: THREE.BufferGeometry;
}

const RIG_CACHE = new Map<string, AgentRigGeometries>();
const SHARED_RIG_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.64,
  metalness: 0.06,
});

export function getSharedRigMaterial(): THREE.MeshStandardMaterial {
  return SHARED_RIG_MATERIAL;
}

function makeColoredPart(
  geo: THREE.BufferGeometry,
  hexColor: string,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();

  const mat = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2])
  );
  nonIndexed.applyMatrix4(mat);
  if (!nonIndexed.getAttribute('normal')) {
    nonIndexed.computeVertexNormals();
  }
  // Remove UV so all merged primitives share identical attribute layout (position + normal + color)
  if (nonIndexed.getAttribute('uv')) {
    nonIndexed.deleteAttribute('uv');
  }

  const count = nonIndexed.getAttribute('position').count;
  const color = new THREE.Color(hexColor);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return nonIndexed;
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) {
    throw new Error('Failed to merge avatar rig geometries');
  }
  merged.computeBoundingSphere();
  return merged;
}

function buildHairParts(style: HairStyle, hairColor: string): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  switch (style) {
    case 'sidepart':
      parts.push(
        makeColoredPart(new THREE.SphereGeometry(0.172, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hairColor, [0, 0.068, -0.01]),
        makeColoredPart(new THREE.BoxGeometry(0.16, 0.05, 0.11), hairColor, [0.04, 0.125, 0.08], [0.15, 0, -0.25])
      );
      break;
    case 'spiky':
      parts.push(
        makeColoredPart(new THREE.SphereGeometry(0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hairColor, [0, 0.06, -0.01])
      );
      [-0.07, 0, 0.07].forEach((x, idx) => {
        parts.push(
          makeColoredPart(new THREE.ConeGeometry(0.048, 0.11, 5), hairColor, [x, 0.18, 0.03 - idx * 0.01], [0.25, 0, -x * 2])
        );
      });
      break;
    case 'bob':
      parts.push(
        makeColoredPart(new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairColor, [0, 0.05, -0.01]),
        makeColoredPart(new THREE.CapsuleGeometry(0.046, 0.14, 4, 6), hairColor, [-0.145, -0.03, -0.02]),
        makeColoredPart(new THREE.CapsuleGeometry(0.046, 0.14, 4, 6), hairColor, [0.145, -0.03, -0.02]),
        makeColoredPart(new THREE.BoxGeometry(0.26, 0.2, 0.08), hairColor, [0, -0.02, -0.13])
      );
      break;
    case 'long':
      parts.push(
        makeColoredPart(new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hairColor, [0, 0.05, -0.01]),
        makeColoredPart(new THREE.BoxGeometry(0.28, 0.36, 0.09), hairColor, [0, -0.13, -0.12]),
        makeColoredPart(new THREE.CapsuleGeometry(0.042, 0.22, 4, 6), hairColor, [-0.14, -0.08, -0.02]),
        makeColoredPart(new THREE.CapsuleGeometry(0.042, 0.22, 4, 6), hairColor, [0.14, -0.08, -0.02])
      );
      break;
    case 'ponytail':
      parts.push(
        makeColoredPart(new THREE.SphereGeometry(0.176, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairColor, [0, 0.05, -0.01]),
        makeColoredPart(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), hairColor, [0, 0.04, -0.18], [0.45, 0, 0])
      );
      break;
    case 'bun':
      parts.push(
        makeColoredPart(new THREE.SphereGeometry(0.175, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairColor, [0, 0.05, -0.01]),
        makeColoredPart(new THREE.SphereGeometry(0.085, 10, 8), hairColor, [0, 0.16, -0.12])
      );
      break;
    case 'curly':
      [
        [0, 0.14, 0],
        [-0.1, 0.12, 0.03],
        [0.1, 0.12, 0.03],
        [-0.11, 0.1, -0.07],
        [0.11, 0.1, -0.07],
        [0, 0.12, -0.11],
        [0, 0.15, 0.08],
      ].forEach((pos) => {
        parts.push(
          makeColoredPart(new THREE.SphereGeometry(0.085, 8, 8), hairColor, pos as [number, number, number])
        );
      });
      break;
    case 'short':
    default:
      parts.push(
        makeColoredPart(new THREE.SphereGeometry(0.172, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.54), hairColor, [0, 0.06, -0.01])
      );
      break;
  }
  return parts;
}

/**
 * Builds and caches 6 vertex-colored merged BufferGeometries per employee:
 * torso, head, leftArm, rightArm, leftLeg, rightLeg.
 * Slashes per-agent draw calls from ~30 to exactly 6 (total 120 DC for 20 employees)
 * while preserving semi-realistic sculpted faces, 8 hairstyles, 7 outfits, and articulated animation.
 */
export function getOrBuildAgentRig(agent: AgentEntity): AgentRigGeometries {
  const cached = RIG_CACHE.get(agent.id);
  if (cached) return cached;

  const app = agent.appearance;
  const hairStyle: HairStyle = app.hairStyle ?? (agent.gender === 'Nữ' ? 'bob' : 'short');
  const outfitStyle: OutfitStyle = app.outfitStyle ?? 'shirt';
  const jacketColor = app.jacketColor ?? app.shirtColor;
  const shoesColor = app.shoesColor ?? '#1e293b';
  const eyeColor = app.eyeColor ?? '#1e293b';
  const facialHair = app.facialHair ?? 'none';
  const accessory = app.accessory ?? 'none';
  const deptColor = DEPARTMENT_META[agent.department].accent;
  const mouthColor = agent.gender === 'Nữ' ? '#be6a6c' : '#9f6a56';

  const hasJacket =
    outfitStyle === 'suit' || outfitStyle === 'blazer' || outfitStyle === 'cardigan';
  const sleeveColor = hasJacket || outfitStyle === 'hoodie' ? jacketColor : app.shirtColor;

  // 1. TORSO (pivots at waist y=0)
  const torsoParts: THREE.BufferGeometry[] = [
    // Pelvis & belt
    makeColoredPart(new THREE.BoxGeometry(0.35, 0.08, 0.2), '#1e293b', [0, 0.04, 0]),
    makeColoredPart(new THREE.BoxGeometry(0.06, 0.04, 0.02), '#cbd5e1', [0, 0.04, 0.105]),
    // Sculpted upper torso + shoulder rounding
    makeColoredPart(new THREE.BoxGeometry(0.37, 0.46, 0.21), hasJacket ? app.shirtColor : sleeveColor, [0, 0.31, 0]),
    makeColoredPart(new THREE.CylinderGeometry(0.11, 0.11, 0.41, 10), sleeveColor, [0, 0.51, 0], [0, 0, Math.PI / 2]),
    // Shirt collar
    makeColoredPart(new THREE.CylinderGeometry(0.075, 0.095, 0.06, 10), app.shirtColor, [0, 0.555, 0.01]),
    // Neck
    makeColoredPart(new THREE.CylinderGeometry(0.054, 0.064, 0.1, 10), app.skinColor, [0, 0.6, 0]),
    // Department lanyard & badge
    makeColoredPart(new THREE.BoxGeometry(0.062, 0.082, 0.016), deptColor, [0.1, 0.36, 0.12]),
  ];

  if (hasJacket) {
    torsoParts.push(
      makeColoredPart(new THREE.BoxGeometry(0.155, 0.48, 0.205), jacketColor, [-0.115, 0.3, 0.018]),
      makeColoredPart(new THREE.BoxGeometry(0.155, 0.48, 0.205), jacketColor, [0.115, 0.3, 0.018]),
      makeColoredPart(new THREE.BoxGeometry(0.385, 0.48, 0.125), jacketColor, [0, 0.3, -0.055])
    );
  }
  if (outfitStyle === 'hoodie') {
    torsoParts.push(
      makeColoredPart(new THREE.BoxGeometry(0.26, 0.12, 0.11), jacketColor, [0, 0.54, -0.11]),
      makeColoredPart(new THREE.BoxGeometry(0.24, 0.13, 0.03), app.shirtColor, [0, 0.17, 0.112])
    );
  }
  if (accessory === 'tie') {
    torsoParts.push(makeColoredPart(new THREE.BoxGeometry(0.044, 0.28, 0.015), deptColor, [0, 0.34, 0.116]));
  }
  if (accessory === 'scarf') {
    torsoParts.push(makeColoredPart(new THREE.TorusGeometry(0.108, 0.036, 8, 14), deptColor, [0, 0.55, 0.02], [Math.PI / 2, 0, 0]));
  }

  // 2. HEAD (pivots at head center)
  const headParts: THREE.BufferGeometry[] = [
    // Slightly oval sculpted cranium + face
    makeColoredPart(new THREE.SphereGeometry(0.16, 14, 12), app.skinColor, [0, 0, 0], [0, 0, 0], [0.96, 1.05, 0.98]),
    // Ears
    makeColoredPart(new THREE.SphereGeometry(0.026, 6, 6), app.skinColor, [-0.154, -0.01, 0]),
    makeColoredPart(new THREE.SphereGeometry(0.026, 6, 6), app.skinColor, [0.154, -0.01, 0]),
    // Eye sclera + irises
    makeColoredPart(new THREE.SphereGeometry(0.022, 6, 6), '#f8fafc', [-0.054, 0.022, 0.138]),
    makeColoredPart(new THREE.SphereGeometry(0.022, 6, 6), '#f8fafc', [0.054, 0.022, 0.138]),
    makeColoredPart(new THREE.SphereGeometry(0.014, 6, 6), eyeColor, [-0.054, 0.022, 0.152]),
    makeColoredPart(new THREE.SphereGeometry(0.014, 6, 6), eyeColor, [0.054, 0.022, 0.152]),
    // Eyebrows
    makeColoredPart(new THREE.BoxGeometry(0.045, 0.011, 0.012), app.hairColor, [-0.054, 0.055, 0.148]),
    makeColoredPart(new THREE.BoxGeometry(0.045, 0.011, 0.012), app.hairColor, [0.054, 0.055, 0.148]),
    // Nose & Mouth
    makeColoredPart(new THREE.ConeGeometry(0.018, 0.044, 6), app.skinColor, [0, -0.01, 0.158], [Math.PI / 2, 0, 0]),
    makeColoredPart(new THREE.BoxGeometry(0.052, 0.013, 0.012), mouthColor, [0, -0.064, 0.144]),
    // Hairstyle
    ...buildHairParts(hairStyle, app.hairColor),
  ];

  if (accessory === 'earrings') {
    headParts.push(
      makeColoredPart(new THREE.SphereGeometry(0.015, 6, 6), '#fbbf24', [-0.162, -0.045, 0.01]),
      makeColoredPart(new THREE.SphereGeometry(0.015, 6, 6), '#fbbf24', [0.162, -0.045, 0.01])
    );
  }
  if (facialHair === 'beard') {
    headParts.push(makeColoredPart(new THREE.BoxGeometry(0.175, 0.092, 0.135), app.hairColor, [0, -0.088, 0.08]));
  } else if (facialHair === 'mustache') {
    headParts.push(makeColoredPart(new THREE.BoxGeometry(0.082, 0.018, 0.018), app.hairColor, [0, -0.042, 0.15]));
  } else if (facialHair === 'stubble') {
    headParts.push(makeColoredPart(new THREE.BoxGeometry(0.165, 0.055, 0.115), '#52525b', [0, -0.082, 0.082]));
  }
  if (app.hasGlasses) {
    headParts.push(
      makeColoredPart(new THREE.BoxGeometry(0.072, 0.046, 0.014), '#0f172a', [-0.054, 0.022, 0.158]),
      makeColoredPart(new THREE.BoxGeometry(0.072, 0.046, 0.014), '#0f172a', [0.054, 0.022, 0.158]),
      makeColoredPart(new THREE.BoxGeometry(0.036, 0.011, 0.012), '#0f172a', [0, 0.026, 0.158])
    );
  }
  if (accessory === 'headphones') {
    headParts.push(
      makeColoredPart(new THREE.TorusGeometry(0.174, 0.018, 8, 16, Math.PI), '#1e293b', [0, 0.06, 0]),
      makeColoredPart(new THREE.CylinderGeometry(0.046, 0.046, 0.034, 10), deptColor, [-0.174, 0, 0], [0, 0, Math.PI / 2]),
      makeColoredPart(new THREE.CylinderGeometry(0.046, 0.046, 0.034, 10), deptColor, [0.174, 0, 0], [0, 0, Math.PI / 2])
    );
  }

  // 3. ARMS (pivot at shoulder y=0, natural slight elbow curve)
  const forearmColor = outfitStyle === 'polo' ? app.skinColor : sleeveColor;
  const buildArm = (withWatch: boolean) => {
    const parts: THREE.BufferGeometry[] = [
      makeColoredPart(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), sleeveColor, [0, -0.12, 0]),
      makeColoredPart(new THREE.CapsuleGeometry(0.044, 0.18, 4, 8), forearmColor, [0, -0.33, 0.05], [-0.26, 0, 0]),
      makeColoredPart(new THREE.SphereGeometry(0.044, 8, 8), app.skinColor, [0, -0.45, 0.085]),
    ];
    if (withWatch) {
      parts.push(
        makeColoredPart(new THREE.CylinderGeometry(0.048, 0.048, 0.028, 10), '#cbd5e1', [0, -0.4, 0.072], [-0.26, 0, 0])
      );
    }
    return mergeParts(parts);
  };

  // 4. LEGS (pivot at hip y=0, tailored trousers + shoe + sole)
  const buildLeg = () =>
    mergeParts([
      makeColoredPart(new THREE.CapsuleGeometry(0.068, 0.44, 4, 8), app.pantsColor, [0, -0.31, 0]),
      makeColoredPart(new THREE.BoxGeometry(0.128, 0.07, 0.205), shoesColor, [0, -0.625, 0.038]),
      makeColoredPart(new THREE.BoxGeometry(0.132, 0.022, 0.212), '#e2e8f0', [0, -0.665, 0.038]),
    ]);

  const rig: AgentRigGeometries = {
    torso: mergeParts(torsoParts),
    head: mergeParts(headParts),
    leftArm: buildArm(accessory === 'watch'),
    rightArm: buildArm(false),
    leftLeg: buildLeg(),
    rightLeg: buildLeg(),
  };

  RIG_CACHE.set(agent.id, rig);
  return rig;
}
