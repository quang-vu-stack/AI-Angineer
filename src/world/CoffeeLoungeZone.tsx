import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function coloredBox(
  w: number,
  h: number,
  d: number,
  hex: string,
  pos: [number, number, number]
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  g.translate(pos[0], pos[1], pos[2]);
  const count = g.getAttribute('position').count;
  const col = new THREE.Color(hex);
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function coloredCyl(
  rt: number,
  rb: number,
  h: number,
  hex: string,
  pos: [number, number, number]
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, 10).toNonIndexed();
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  g.translate(pos[0], pos[1], pos[2]);
  const count = g.getAttribute('position').count;
  const col = new THREE.Color(hex);
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/**
 * Semi-realistic Coffee, Rest & Communication Lounge in the East Atrium (X: 9.4..16.2, Z: -2.9..2.9).
 * Entire furniture set (2 sofas, low coffee table, espresso bar, espresso machine, cups, pastry case)
 * is merged into ONE vertex-colored BufferGeometry = 1 draw call!
 */
export const CoffeeLoungeZone: React.FC<{ castShadow: boolean }> = ({ castShadow }) => {
  const loungeGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [
      // Low Oak Coffee Table (X: 11.8, Z: 0)
      coloredBox(2.1, 0.07, 0.86, '#b08968', [11.8, 0.44, 0]),
      coloredBox(0.08, 0.42, 0.72, '#1e293b', [10.85, 0.21, 0]),
      coloredBox(0.08, 0.42, 0.72, '#1e293b', [12.75, 0.21, 0]),
      // Coffee cups & tray on coffee table
      coloredBox(0.48, 0.02, 0.32, '#334155', [11.8, 0.485, 0]),
      coloredCyl(0.045, 0.04, 0.09, '#f8fafc', [11.68, 0.54, -0.05]),
      coloredCyl(0.045, 0.04, 0.09, '#fde68a', [11.92, 0.54, 0.06]),
      coloredCyl(0.045, 0.04, 0.09, '#bae6fd', [12.35, 0.52, -0.14]),

      // North Plush Lounge Sofa (facing South, Z = -2.15)
      coloredBox(2.9, 0.36, 0.72, '#334155', [11.8, 0.22, -1.95]),
      coloredBox(2.9, 0.52, 0.22, '#475569', [11.8, 0.58, -2.26]),
      coloredBox(0.2, 0.42, 0.78, '#475569', [10.42, 0.38, -1.95]),
      coloredBox(0.2, 0.42, 0.78, '#475569', [13.18, 0.38, -1.95]),
      // Accent throw pillows on North Sofa
      coloredBox(0.34, 0.26, 0.14, '#f59e0b', [10.8, 0.5, -2.05]),
      coloredBox(0.34, 0.26, 0.14, '#38bdf8', [12.8, 0.5, -2.05]),

      // South Plush Lounge Sofa (facing North, Z = +2.15)
      coloredBox(2.9, 0.36, 0.72, '#334155', [11.8, 0.22, 1.95]),
      coloredBox(2.9, 0.52, 0.22, '#475569', [11.8, 0.58, 2.26]),
      coloredBox(0.2, 0.42, 0.78, '#475569', [10.42, 0.38, 1.95]),
      coloredBox(0.2, 0.42, 0.78, '#475569', [13.18, 0.38, 1.95]),
      // Accent throw pillows on South Sofa
      coloredBox(0.34, 0.26, 0.14, '#10b981', [10.8, 0.5, 2.05]),
      coloredBox(0.34, 0.26, 0.14, '#f472b6', [12.8, 0.5, 2.05]),

      // Espresso & Coffee Bar Counter (X: 15.6, Z: 0)
      coloredBox(1.02, 0.94, 3.3, '#5c4033', [15.6, 0.47, 0]),
      coloredBox(1.12, 0.07, 3.4, '#e2e8f0', [15.58, 0.97, 0]),
      // Espresso Machine
      coloredBox(0.46, 0.42, 0.56, '#1e293b', [15.65, 1.21, -0.75]),
      coloredBox(0.14, 0.12, 0.42, '#94a3b8', [15.38, 1.22, -0.75]),
      coloredCyl(0.09, 0.08, 0.22, '#78350f', [15.65, 1.52, -0.75]),
      // Pastry Display Case
      coloredBox(0.44, 0.34, 0.72, '#cbd5e1', [15.62, 1.18, 0.65]),
      // Stacked Ceramic Mugs
      coloredCyl(0.045, 0.04, 0.09, '#f8fafc', [15.42, 1.05, 0.0]),
      coloredCyl(0.045, 0.04, 0.09, '#f8fafc', [15.42, 1.05, 0.14]),
      coloredCyl(0.045, 0.04, 0.09, '#fbbf24', [15.42, 1.05, -0.14]),
    ];
    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    if (!merged) throw new Error('Failed to merge CoffeeLoungeZone geometry');
    merged.computeBoundingSphere();
    return merged;
  }, []);

  useEffect(() => {
    return () => {
      loungeGeo.dispose();
    };
  }, [loungeGeo]);

  return (
    <group>
      {/* Warm Acoustic Lounge Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12.8, 0.011, 0]} receiveShadow>
        <planeGeometry args={[6.4, 5.4]} />
        <meshStandardMaterial color="#3b2f2f" roughness={0.92} />
      </mesh>
      {/* Merged Coffee & Lounge Furniture (1 draw call!) */}
      <mesh geometry={loungeGeo} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.62} metalness={0.08} />
      </mesh>
    </group>
  );
};
