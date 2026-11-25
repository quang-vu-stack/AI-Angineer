import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

const dummy = new THREE.Object3D();

const MEETING_CHAIRS: Array<{ pos: [number, number, number]; rotY: number }> = [
  { pos: [-2.1, 0, -1.75], rotY: 0 },
  { pos: [-0.7, 0, -1.75], rotY: 0 },
  { pos: [0.7, 0, -1.75], rotY: 0 },
  { pos: [2.1, 0, -1.75], rotY: 0 },
  { pos: [-2.1, 0, 1.75], rotY: Math.PI },
  { pos: [-0.7, 0, 1.75], rotY: Math.PI },
  { pos: [0.7, 0, 1.75], rotY: Math.PI },
  { pos: [2.1, 0, 1.75], rotY: Math.PI },
];

function formatVndCompact(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
}

export const CentralMeetingRoom: React.FC<{ castShadow: boolean }> = ({ castShadow }) => {
  const company = useGameStore((s) => s.company);
  const companyVersion = useGameStore((s) => s.companyVersion);
  const agents = useGameStore((s) => s.agents);
  const day = useGameStore((s) => s.day);

  const seatRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    MEETING_CHAIRS.forEach((c, i) => {
      const cos = Math.cos(c.rotY);
      const sin = Math.sin(c.rotY);
      const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
        c.pos[0] + lx * cos + lz * sin,
        ly,
        c.pos[2] - lx * sin + lz * cos,
      ];

      dummy.position.set(...toWorld(0, 0.44, 0));
      dummy.rotation.set(0, c.rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      seatRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(...toWorld(0, 0.72, -0.21));
      dummy.updateMatrix();
      backRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(...toWorld(0, 0.22, 0));
      dummy.updateMatrix();
      baseRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (seatRef.current) seatRef.current.instanceMatrix.needsUpdate = true;
    if (backRef.current) backRef.current.instanceMatrix.needsUpdate = true;
    if (baseRef.current) baseRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { canvas: c, texture: tex };
  }, []);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  const metrics = useMemo(() => {
    const projects = company.projects.list();
    const allTasks = company.tasks.getAllTasks();
    const nowIso = new Date().toISOString();
    const projectRows = projects.map((p) => ({
      project: p,
      kpi: company.projectKpi(p.id, nowIso),
    }));
    const completed = allTasks.filter((t) => t.status === 'completed').length;
    const inProgress = allTasks.filter((t) => t.status === 'in_progress').length;
    const queued = allTasks.filter((t) => t.status === 'queued').length;
    const blocked = allTasks.filter((t) => t.status === 'blocked').length;
    const avgProgress =
      allTasks.length === 0
        ? 0
        : Math.round(allTasks.reduce((acc, t) => acc + t.progress, 0) / allTasks.length);
    const finance = company.finance.summary();
    const workingCount = agents.filter((a) => a.state === 'Working').length;
    const meetingCount = agents.filter((a) => a.state === 'Meeting').length;
    return {
      projectRows,
      totalTasks: allTasks.length,
      completed,
      inProgress,
      queued,
      blocked,
      avgProgress,
      finance,
      workingCount,
      meetingCount,
      totalEmployees: company.staff.listEmployees().length,
    };
  }, [company, companyVersion, agents]);

  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#09111f');
    grad.addColorStop(1, '#0f1e36');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 1000, 488);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px Segoe UI, sans-serif';
    ctx.fillText('TIẾN ĐỘ DỰ ÁN TRỰC TIẾP — PHÒNG HỌP TRUNG TÂM', 38, 60);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '19px Segoe UI, sans-serif';
    ctx.fillText(
      `Ngày ${day}  •  Nhân sự: ${metrics.totalEmployees}  •  Đang làm: ${metrics.workingCount}  •  Đang họp: ${metrics.meetingCount}`,
      38,
      92
    );

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 22px Segoe UI, sans-serif';
    ctx.fillText(`Tiến độ tổng thể: ${metrics.avgProgress}%`, 38, 140);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(38, 154, 948, 28);
    const barW = Math.round((948 * Math.min(100, Math.max(0, metrics.avgProgress))) / 100);
    const barGrad = ctx.createLinearGradient(38, 0, 986, 0);
    barGrad.addColorStop(0, '#0284c7');
    barGrad.addColorStop(1, '#22c55e');
    ctx.fillStyle = barGrad;
    ctx.fillRect(38, 154, barW, 28);

    const cards = [
      { label: 'HOÀN THÀNH', value: `${metrics.completed}/${metrics.totalTasks}`, color: '#22c55e' },
      { label: 'ĐANG THỰC HIỆN', value: String(metrics.inProgress), color: '#38bdf8' },
      { label: 'CHỜ / BỊ CHẶN', value: `${metrics.queued} / ${metrics.blocked}`, color: '#f59e0b' },
      { label: 'QUỸ CÔNG TY (VND)', value: formatVndCompact(metrics.finance.balanceVnd), color: '#a78bfa' },
    ];
    cards.forEach((card, i) => {
      const x = 38 + i * 240;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(x, 204, 224, 88);
      ctx.strokeStyle = `${card.color}88`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 204, 224, 88);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px Segoe UI, sans-serif';
      ctx.fillText(card.label, x + 14, 232);

      ctx.fillStyle = card.color;
      ctx.font = 'bold 24px Segoe UI, sans-serif';
      ctx.fillText(card.value, x + 14, 272);
    });

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 18px Segoe UI, sans-serif';
    ctx.fillText('DANH SÁCH DỰ ÁN (DỮ LIỆU BACKEND)', 38, 330);

    const visibleProjects = metrics.projectRows.slice(0, 3);
    visibleProjects.forEach((row, idx) => {
      const y = 350 + idx * 48;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
      ctx.fillRect(38, y, 948, 38);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 17px Segoe UI, sans-serif';
      ctx.fillText(`${row.project.name} (${row.project.id})`, 52, y + 25);

      ctx.fillStyle = '#7dd3fc';
      ctx.font = '16px Segoe UI, sans-serif';
      ctx.fillText(
        `${row.kpi.completed}/${row.kpi.total} xong  •  ${row.kpi.progressPercent}%`,
        650,
        y + 25
      );

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(835, y + 12, 134, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(835, y + 12, Math.round((134 * row.kpi.progressPercent) / 100), 14);
    });

    texture.needsUpdate = true;
  }, [canvas, texture, metrics, day]);

  return (
    <group>
      {/* Conference Table */}
      <mesh position={[0, 0.74, 0]} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[5.8, 0.09, 1.96]} />
        <meshStandardMaterial color="#6e4b3a" roughness={0.38} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.79, 0]}>
        <boxGeometry args={[3.4, 0.02, 0.24]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-1.7, 0.36, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.7, 0.7, 1.1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[1.7, 0.36, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.7, 0.7, 1.1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Tabletop speakerphone */}
      <mesh position={[0, 0.81, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.04, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.6} />
      </mesh>

      {/* 8 Instanced Conference Chairs */}
      <instancedMesh ref={seatRef} args={[undefined, undefined, MEETING_CHAIRS.length]} castShadow={castShadow}>
        <boxGeometry args={[0.48, 0.07, 0.46]} />
        <meshStandardMaterial color="#1e293b" roughness={0.72} />
      </instancedMesh>
      <instancedMesh ref={backRef} args={[undefined, undefined, MEETING_CHAIRS.length]} castShadow={castShadow}>
        <boxGeometry args={[0.44, 0.5, 0.06]} />
        <meshStandardMaterial color="#334155" roughness={0.65} />
      </instancedMesh>
      <instancedMesh ref={baseRef} args={[undefined, undefined, MEETING_CHAIRS.length]}>
        <cylinderGeometry args={[0.04, 0.22, 0.42, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.28} />
      </instancedMesh>

      {/* Live Project Progress Wall Display on West Glass Wall */}
      <group position={[-4.82, 1.72, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow={castShadow}>
          <boxGeometry args={[4.4, 2.25, 0.1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[4.16, 2.04]} />
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={0.75}
            roughness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
};
