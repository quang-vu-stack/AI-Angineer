import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGameStore } from '../../store/useGameStore';

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

function formatVnd(v: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(v)} ₫`;
}

/**
 * Upgraded CEO Executive Suite (X: -18..-10, Z: -12..-6):
 * - Walnut L-shaped executive side credenza & bookshelf
 * - VIP guest seating lounge (2 leather armchairs + glass table)
 * - Live Executive Strategy Display driven by real Backend KPIs & finance
 * Total draw call cost: 2 draw calls (1 merged furniture mesh + 1 strategy screen).
 */
export const CeoExecutiveSuite: React.FC<{ castShadow: boolean }> = ({ castShadow }) => {
  const company = useGameStore((s) => s.company);
  const companyVersion = useGameStore((s) => s.companyVersion);
  const agents = useGameStore((s) => s.agents);
  const day = useGameStore((s) => s.day);

  const ceoFurnitureGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [
      // Executive walnut side credenza behind/beside CEO desk (X: -11.4, Z: -10.8)
      coloredBox(1.8, 0.72, 0.52, '#5c3d2e', [-11.4, 0.36, -11.2]),
      coloredBox(1.86, 0.05, 0.56, '#7c5338', [-11.4, 0.74, -11.2]),
      // Executive trophy & binder props on credenza
      coloredBox(0.18, 0.24, 0.14, '#f59e0b', [-11.9, 0.88, -11.2]),
      coloredBox(0.28, 0.22, 0.2, '#1e3a8a', [-11.1, 0.87, -11.2]),

      // VIP Guest Reception Lounge (West side of CEO Office: X: -16.5, Z: -7.6)
      // Low glass-top guest table
      coloredBox(1.05, 0.05, 0.62, '#93c5fd', [-16.3, 0.44, -7.8]),
      coloredBox(0.95, 0.42, 0.06, '#1e293b', [-16.3, 0.21, -8.06]),
      coloredBox(0.95, 0.42, 0.06, '#1e293b', [-16.3, 0.21, -7.54]),
      // Executive Guest Leather Armchair 1 (North)
      coloredBox(0.72, 0.36, 0.66, '#3b2c26', [-16.3, 0.22, -8.8]),
      coloredBox(0.72, 0.46, 0.14, '#4b3830', [-16.3, 0.56, -9.08]),
      coloredBox(0.12, 0.34, 0.66, '#4b3830', [-16.62, 0.38, -8.8]),
      coloredBox(0.12, 0.34, 0.66, '#4b3830', [-15.98, 0.38, -8.8]),
      // Executive Guest Leather Armchair 2 (South)
      coloredBox(0.72, 0.36, 0.66, '#3b2c26', [-16.3, 0.22, -6.8]),
      coloredBox(0.72, 0.46, 0.14, '#4b3830', [-16.3, 0.56, -6.52]),
      coloredBox(0.12, 0.34, 0.66, '#4b3830', [-16.62, 0.38, -6.8]),
      coloredBox(0.12, 0.34, 0.66, '#4b3830', [-15.98, 0.38, -6.8]),
      // Executive carpet border under VIP lounge
      coloredBox(2.2, 0.015, 3.2, '#1e293b', [-16.3, 0.014, -7.8]),
    ];
    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    if (!merged) throw new Error('Failed to merge CeoExecutiveSuite geometry');
    merged.computeBoundingSphere();
    return merged;
  }, []);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 384;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: tex };
  }, []);

  useEffect(() => {
    return () => {
      ceoFurnitureGeo.dispose();
      texture.dispose();
    };
  }, [ceoFurnitureGeo, texture]);

  useEffect(() => {
    void companyVersion;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snap = company.snapshot();
    const fin = company.finance.summary();
    const completed = snap.tasks.filter((t) => t.status === 'completed').length;
    const avgProg =
      snap.tasks.length === 0
        ? 0
        : Math.round(snap.tasks.reduce((s, t) => s + t.progress, 0) / snap.tasks.length);
    const avgProd = Math.round(agents.reduce((s, a) => s + a.productivity, 0) / Math.max(1, agents.length));

    ctx.fillStyle = '#091224';
    ctx.fillRect(0, 0, 768, 384);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 752, 368);

    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 24px Segoe UI, sans-serif';
    ctx.fillText('MÀN HÌNH CHIẾN LƯỢC ĐIỀU HÀNH — CEO SUITE', 28, 48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Segoe UI, sans-serif';
    ctx.fillText(`Ngày ${day} • Nhân sự: ${snap.employees.length} • Dự án: ${snap.projects.length}`, 28, 78);

    const rows = [
      { label: 'TIẾN ĐỘ NHIỆM VỤ', value: `${avgProg}% (${completed}/${snap.tasks.length})`, color: '#22c55e' },
      { label: 'NĂNG SUẤT TOÀN CÔNG TY', value: `${avgProd}%`, color: '#38bdf8' },
      { label: 'QUỸ TIỀN MẶT (VND)', value: formatVnd(fin.balanceVnd), color: '#fbbf24' },
      { label: 'LỢI NHUẬN HOẠT ĐỘNG', value: formatVnd(fin.operatingProfitVnd), color: '#a78bfa' },
    ];
    rows.forEach((r, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 28 + col * 364;
      const y = 108 + row * 124;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.fillRect(x, y, 348, 106);
      ctx.strokeStyle = `${r.color}77`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 348, 106);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px Segoe UI, sans-serif';
      ctx.fillText(r.label, x + 16, y + 32);
      ctx.fillStyle = r.color;
      ctx.font = 'bold 26px Segoe UI, sans-serif';
      ctx.fillText(r.value, x + 16, y + 78);
    });

    texture.needsUpdate = true;
  }, [canvas, texture, company, companyVersion, agents, day]);

  return (
    <group>
      {/* Merged CEO Credenza & VIP Guest Lounge (1 DC) */}
      <mesh geometry={ceoFurnitureGeo} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.12} />
      </mesh>
      {/* Live Executive Strategy Screen on West Wall of CEO Office (1 DC) */}
      <mesh position={[-17.78, 1.72, -9.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.8, 1.4]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.65}
          roughness={0.22}
        />
      </mesh>
    </group>
  );
};
