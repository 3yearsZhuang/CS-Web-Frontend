// @vitest-environment jsdom

/**
 * @file ArchiveScene 纯函数与材质降级测试（三维部分无法在 jsdom 渲染，
 * 此处覆盖归一化数学、画质映射与材质降级——即回归风险最高的部分）
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  applyQualityToMaterial,
  normalizeCardObject,
  pixelRatioForQuality,
  proceduralCard,
  rowsForQuality,
  transmissionForQuality,
} from './archive-scene';

describe('画质档位映射', () => {
  it('行数：low 降为 6 行，其余 8 行', () => {
    expect(rowsForQuality('high')).toBe(8);
    expect(rowsForQuality('medium')).toBe(8);
    expect(rowsForQuality('low')).toBe(6);
  });

  it('像素比上限：high 2 / medium 1.5 / low 1', () => {
    expect(pixelRatioForQuality('high')).toBe(2);
    expect(pixelRatioForQuality('medium')).toBe(1.5);
    expect(pixelRatioForQuality('low')).toBe(1);
  });

  it('透射强度：low 关闭（0），medium 折中，high 全量', () => {
    expect(transmissionForQuality('high')).toBe(1);
    expect(transmissionForQuality('medium')).toBe(0.65);
    expect(transmissionForQuality('low')).toBe(0);
  });
});

describe('applyQualityToMaterial', () => {
  it('low 档关闭透射并转为半透明', () => {
    const m = new THREE.MeshPhysicalMaterial({ transmission: 1 });
    applyQualityToMaterial(m, 'low');
    expect(m.transmission).toBe(0);
    expect(m.transparent).toBe(true);
    expect(m.opacity).toBeCloseTo(0.88);
  });

  it('high 档恢复全透射且不透明', () => {
    const m = new THREE.MeshPhysicalMaterial({ transmission: 0, transparent: true, opacity: 0.88 });
    applyQualityToMaterial(m, 'high');
    expect(m.transmission).toBe(1);
    expect(m.transparent).toBe(false);
    expect(m.opacity).toBe(1);
  });

  it('无 transmission 字段的材质不受影响', () => {
    const m = new THREE.MeshStandardMaterial();
    expect(() => applyQualityToMaterial(m, 'low')).not.toThrow();
    expect(m.transparent).toBe(false);
  });
});

describe('normalizeCardObject', () => {
  it('把厚度（最小维）转到 Z 轴并按目标宽度缩放', () => {
    // 原始包围盒 2 × 8 × 4：最小维是 X（厚度）
    const src = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 4), new THREE.MeshBasicMaterial());
    const wrap = normalizeCardObject(src, 5);
    const size = new THREE.Box3().setFromObject(wrap).getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(5, 5);      // 宽度归一
    expect(size.z).toBeLessThan(size.y);    // 厚度沿 Z
    expect(size.z).toBeCloseTo(2.5, 5);     // 2（原厚度）× 2.5（缩放）
  });

  it('模型居中到原点', () => {
    const src = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 4), new THREE.MeshBasicMaterial());
    src.position.set(10, 20, 30);
    const wrap = normalizeCardObject(src, 5);
    const center = new THREE.Box3().setFromObject(wrap).getCenter(new THREE.Vector3());
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
  });
});

describe('proceduralCard 兜底几何', () => {
  it('返回含盖板 / 基板 / 光导条的组', () => {
    const g = proceduralCard('high');
    expect(g.children.length).toBeGreaterThanOrEqual(3);
    const cover = g.children[0] as THREE.Mesh;
    expect((cover.material as THREE.MeshPhysicalMaterial).transmission).toBe(transmissionForQuality('high'));
  });
});
