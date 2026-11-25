export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  label: string;
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  antialias: boolean;
}

export const QUALITY_CONFIGS: Record<QualityLevel, QualityPreset> = {
  low: {
    label: 'Low',
    dpr: [0.75, 1],
    shadows: false,
    shadowMapSize: 512,
    antialias: false,
  },
  medium: {
    label: 'Medium',
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    antialias: true,
  },
  high: {
    label: 'High',
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    antialias: true,
  },
};

export interface PerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  heapMB: number | null;
}
