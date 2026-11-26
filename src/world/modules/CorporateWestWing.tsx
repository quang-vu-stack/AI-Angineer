import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function coloredBox(
  w: number,
  h: number,
  d: number,
  hex: string,
  pos: [number, number, number],
  rotY = 0
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  if (rotY !== 0) g.rotateY(rotY);
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

function createBrandWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 1024, 384);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(1, '#122645');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 384);

    // Geometric corporate emblem
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 996, 356);

    ctx.beginPath();
    ctx.arc(140, 192, 66, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 48px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AI', 140, 208);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 54px Segoe UI, sans-serif';
    ctx.fillText('AI COMPANY WORLD 3D', 238, 178);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '600 24px Segoe UI, sans-serif';
    ctx.fillText('TRỤ SỞ ĐIỀU HÀNH DOANH NGHIỆP AI • HEADQUARTERS V0.4', 240, 232);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Segoe UI, sans-serif';
    ctx.fillText('Lễ tân • Phòng HĐQT • Phỏng vấn & Đào tạo • Trung tâm R&D', 240, 274);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTrainingScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#091c1e';
    ctx.fillRect(0, 0, 768, 384);
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 748, 364);

    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 26px Segoe UI, sans-serif';
    ctx.fillText('TRUNG TÂM PHỎNG VẤN & ĐÀO TẠO NHÂN SỰ', 32, 54);

    const levels = [
      { label: 'JUNIOR', xp: '0 XP', color: '#94a3b8' },
      { label: 'SPECIALIST', xp: '60 XP', color: '#38bdf8' },
      { label: 'SENIOR', xp: '180 XP', color: '#a78bfa' },
      { label: 'LEAD', xp: '360 XP', color: '#fbbf24' },
    ];
    levels.forEach((lv, i) => {
      const x = 32 + i * 178;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(x, 100, 164, 110);
      ctx.strokeStyle = lv.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 100, 164, 110);
      ctx.fillStyle = lv.color;
      ctx.font = 'bold 20px Segoe UI, sans-serif';
      ctx.fillText(lv.label, x + 16, 146);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '18px Segoe UI, sans-serif';
      ctx.fillText(`Mốc: ${lv.xp}`, x + 16, 184);
    });

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Segoe UI, sans-serif';
    ctx.fillText('Lộ trình phát triển: Học hỏi (Learn) → Thực chiến (Deliver) → Dẫn dắt (Mentor)', 32, 272);
    ctx.fillStyle = '#5eead4';
    ctx.font = '16px Segoe UI, sans-serif';
    ctx.fillText('Hệ thống đồng bộ trực tiếp với Career Policy AI Brain V0.4', 32, 316);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Modular Corporate West HQ Wing (X: -26..-18, Z: -12..+12):
 * 1. Reception & Brand Identity Lobby (Z: -3.7..+3.7)
 * 2. Executive Boardroom (Z: -11.9..-4.5)
 * 3. Interview & Training Center (Z: +4.5..+11.9)
 * All architectural walls, desks, chairs, sofas, podiums, and decor are merged into
 * ONE vertex-colored BufferGeometry + 2 crisp CanvasTexture brand/training walls = ONLY 3 DRAW CALLS!
 */
export const CorporateWestWing: React.FC<{ castShadow: boolean }> = ({ castShadow }) => {
  const wingFurnitureGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [
      // === 1. RECEPTION & BRAND LOBBY (X: -26..-18, Z: -3.7..3.7) ===
      // Reception marble-top curved desk (X: -22.2, Z: 0)
      coloredBox(1.1, 1.02, 3.2, '#1e293b', [-22.4, 0.51, 0]),
      coloredBox(1.22, 0.08, 3.32, '#e2e8f0', [-22.36, 1.05, 0]),
      coloredBox(0.08, 0.85, 3.0, '#38bdf8', [-21.82, 0.45, 0]),
      // Reception monitor
      coloredBox(0.06, 0.36, 0.58, '#0f172a', [-22.45, 1.28, -0.3]),
      // Visitor waiting bench (South side of lobby)
      coloredBox(2.4, 0.36, 0.68, '#334155', [-21.2, 0.22, 2.5]),
      coloredBox(2.4, 0.44, 0.14, '#475569', [-21.2, 0.52, 2.78]),
      // Decorative lobby planters
      coloredCyl(0.28, 0.22, 0.5, '#d6d3d1', [-24.6, 0.25, -2.8]),
      coloredCyl(0.36, 0.12, 0.65, '#15803d', [-24.6, 0.8, -2.8]),
      coloredCyl(0.28, 0.22, 0.5, '#d6d3d1', [-24.6, 0.25, 2.8]),
      coloredCyl(0.36, 0.12, 0.65, '#15803d', [-24.6, 0.8, 2.8]),

      // === 2. EXECUTIVE BOARDROOM (X: -26..-18, Z: -11.9..-4.5) ===
      // Mahogany Executive Board Table (X: -22.2, Z: -8.2)
      coloredBox(3.6, 0.1, 1.7, '#4a2511', [-22.2, 0.74, -8.2]),
      coloredBox(2.2, 0.02, 0.22, '#f59e0b', [-22.2, 0.8, -8.2]),
      coloredBox(0.6, 0.7, 0.9, '#1e293b', [-23.2, 0.35, -8.2]),
      coloredBox(0.6, 0.7, 0.9, '#1e293b', [-21.2, 0.35, -8.2]),
      // 6 Leather Boardroom Chairs (3 North, 3 South aligned to board_seat_1..6)
      ...[-23.4, -22.2, -21.0].flatMap((x) => [
        coloredBox(0.5, 0.08, 0.48, '#292524', [x, 0.44, -9.65]),
        coloredBox(0.46, 0.56, 0.07, '#44403c', [x, 0.74, -9.88]),
        coloredCyl(0.05, 0.22, 0.42, '#94a3b8', [x, 0.21, -9.65]),
        coloredBox(0.5, 0.08, 0.48, '#292524', [x, 0.44, -6.75]),
        coloredBox(0.46, 0.56, 0.07, '#44403c', [x, 0.74, -6.52]),
        coloredCyl(0.05, 0.22, 0.42, '#94a3b8', [x, 0.21, -6.75]),
      ]),

      // === 3. INTERVIEW & TRAINING CENTER (X: -26..-18, Z: +4.5..+11.9) ===
      // Instructor Podium facing trainee rows (X: -24.5, Z: 7.4)
      coloredBox(0.75, 1.04, 1.1, '#0f766e', [-24.6, 0.52, 7.6]),
      coloredBox(0.84, 0.06, 1.2, '#e2e8f0', [-24.58, 1.06, 7.6]),
      // 2 Training Bench Desks + 4 Trainee Chairs (aligned to training_seat_1..4)
      coloredBox(0.76, 0.07, 2.5, '#b08968', [-22.4, 0.74, 7.6]),
      coloredBox(0.06, 0.7, 2.3, '#1e293b', [-22.4, 0.35, 7.6]),
      ...([6.9, 8.3] as const).flatMap((z) => [
        coloredBox(0.46, 0.07, 0.46, '#1e293b', [-21.55, 0.44, z]),
        coloredBox(0.06, 0.48, 0.42, '#334155', [-21.34, 0.7, z]),
        coloredCyl(0.04, 0.2, 0.42, '#64748b', [-21.55, 0.21, z]),
      ]),
      // 1-on-1 Interview Table & 2 Chairs (South-East corner of Training Center: X: -20.5, Z: 10.3)
      coloredBox(1.5, 0.07, 0.9, '#b08968', [-20.6, 0.74, 10.4]),
      coloredCyl(0.06, 0.26, 0.72, '#1e293b', [-20.6, 0.36, 10.4]),
      coloredBox(0.46, 0.07, 0.46, '#0f766e', [-20.6, 0.44, 9.55]),
      coloredBox(0.46, 0.07, 0.46, '#334155', [-20.6, 0.44, 11.25]),

      // === ARCHITECTURAL PERIMETER WALLS FOR WEST HQ WING (X: -26) ===
      coloredBox(0.25, 3, 24, '#2b3a52', [-26, 1.5, 0]),
      coloredBox(8, 3, 0.25, '#2b3a52', [-22, 1.5, -12]),
      coloredBox(8, 3, 0.25, '#2b3a52', [-22, 1.5, 12]),
      // Interior wing divider walls (with wide 2.4m doorways at X = -19.6)
      coloredBox(5.2, 2.8, 0.14, '#334155', [-23.4, 1.4, -4.1]),
      coloredBox(5.2, 2.8, 0.14, '#334155', [-23.4, 1.4, 4.1]),
    ];

    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    if (!merged) throw new Error('Failed to merge CorporateWestWing geometry');
    merged.computeBoundingSphere();
    return merged;
  }, []);

  const brandTex = useMemo(() => createBrandWallTexture(), []);
  const trainTex = useMemo(() => createTrainingScreenTexture(), []);

  useEffect(() => {
    return () => {
      wingFurnitureGeo.dispose();
      brandTex.dispose();
      trainTex.dispose();
    };
  }, [wingFurnitureGeo, brandTex, trainTex]);

  return (
    <group>
      {/* Merged West HQ Wing Furniture & Perimeter Walls (1 DC) */}
      <mesh geometry={wingFurnitureGeo} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.62} metalness={0.1} />
      </mesh>
      {/* Reception Brand Identity & Logo Wall (1 DC) */}
      <mesh position={[-25.78, 1.72, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5.2, 1.95]} />
        <meshStandardMaterial
          map={brandTex}
          emissiveMap={brandTex}
          emissive="#ffffff"
          emissiveIntensity={0.65}
          roughness={0.22}
        />
      </mesh>
      {/* Training & Interview Career Roadmap Screen (1 DC) */}
      <mesh position={[-25.78, 1.72, 7.6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.8, 1.9]} />
        <meshStandardMaterial
          map={trainTex}
          emissiveMap={trainTex}
          emissive="#ffffff"
          emissiveIntensity={0.6}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
};
