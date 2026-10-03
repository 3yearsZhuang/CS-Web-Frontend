// @vitest-environment jsdom

/**
 * @file ArchiveScene 控制器运行时测试：three / GLTFLoader / RoomEnvironment 全模块打桩。
 * 覆盖 start 的 GLB 与程序化兜底、WebGL2 守卫、选择状态机（切列记忆 / 详情进出）、
 * 动画循环（波浪 / 呼吸 / 镜头插值）与 dispose 释放。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const h = vi.hoisted(() => ({
  loadAsyncImpl: async (_url: string): Promise<{ scene: unknown }> => {
    throw new Error('no glb');
  },
  renderers: [] as Array<{ capabilities: { isWebGL2: boolean }; dispose: () => void }>,
  webgl2: true,
}));

vi.mock('three', () => {
  class V3 {
    x = 0;
    y = 0;
    z = 0;
    set(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    sub() {
      return this;
    }
  }
  class GroupLike {
    children: unknown[] = [];
    isMesh = false;
    position = new V3();
    scale = { setScalar: () => {} };
    rotation = { x: 0, y: 0 };
    updateMatrixWorld() {}
    add(...os: unknown[]) {
      this.children.push(...os);
      return this;
    }
    clear() {
      this.children = [];
    }
    clone() {
      const c = new GroupLike();
      c.children = this.children.map((ch) =>
        (ch as GroupLike).clone ? (ch as GroupLike).clone() : ch,
      );
      return c;
    }
    traverse(fn: (o: unknown) => void) {
      fn(this);
      for (const c of this.children) {
        (c as GroupLike).traverse?.call(c, fn);
      }
    }
  }
  class Group extends GroupLike {}
  class Material {
    needsUpdate = false;
    dispose = () => {};
  }
  class MeshPhysicalMaterial extends Material {
    transmission = 0;
    transparent = false;
    opacity = 1;
    constructor(opts: Record<string, unknown> = {}) {
      super();
      Object.assign(this, opts);
    }
  }
  class MeshStandardMaterial extends Material {
    constructor(opts: Record<string, unknown> = {}) {
      super();
      Object.assign(this, opts);
    }
  }
  class Mesh extends GroupLike {
    isMesh = true;
    geometry = { dispose: () => {} };
    material: unknown;
    constructor(geo?: unknown, mat?: unknown) {
      super();
      if (geo) this.geometry = geo as never;
      if (mat) this.material = mat;
    }
  }
  class BoxGeometry {
    dispose = () => {};
  }
  class Box3 {
    setFromObject() {
      return this;
    }
    getSize(t: V3) {
      return t.set(5, 3.7, 0.12);
    }
    getCenter(t: V3) {
      return t.set(0, 0, 0);
    }
  }
  class Scene extends GroupLike {
    background: unknown = null;
    fog: unknown = null;
    environment: unknown = null;
  }
  class Color {}
  class Fog {}
  class WebGLRenderer {
    capabilities = { isWebGL2: h.webgl2 };
    setPixelRatio = () => {};
    toneMapping = 0;
    toneMappingExposure = 1;
    setSize = () => {};
    render = () => {};
    dispose = () => {
      (this as unknown as { disposed?: boolean }).disposed = true;
    };
    constructor() {
      h.renderers.push(this);
    }
  }
  class PMREMGenerator {
    fromScene() {
      return { texture: { dispose: () => {} } };
    }
    dispose = () => {};
  }
  class HemisphereLight {
    position = new V3();
  }
  class DirectionalLight {
    position = new V3();
  }
  class PerspectiveCamera {
    position = new V3();
    aspect = 1;
    lookAt = () => {};
    updateProjectionMatrix = () => {};
  }
  const MathUtils = {
    degToRad: (d: number) => (d * Math.PI) / 180,
    clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
  };
  const ACESFilmicToneMapping = 4;
  return {
    V3,
    Vector3: V3,
    Group,
    Mesh,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    BoxGeometry,
    Box3,
    Scene,
    Color,
    Fog,
    WebGLRenderer,
    PMREMGenerator,
    HemisphereLight,
    DirectionalLight,
    PerspectiveCamera,
    MathUtils,
    ACESFilmicToneMapping,
  };
});

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    loadAsync(url: string) {
      return h.loadAsyncImpl(url);
    }
  },
}));

vi.mock('three/examples/jsm/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: class {},
}));

import { ArchiveScene, COLS, rowsForQuality } from './archive-scene';

const threeMock = THREE as unknown as { Group: new () => InstanceType<typeof THREE.Group> };

let rafCbs: Array<FrameRequestCallback>;
let nowMs: number;

function makeScene(reduceMotion: boolean, quality: 'low' | 'medium' | 'high' = 'medium') {
  const canvas = document.createElement('canvas');
  const events: { ready: Array<boolean>; selection: Array<[number, number]>; mode: Array<string> } = {
    ready: [],
    selection: [],
    mode: [],
  };
  const scene = new ArchiveScene({
    canvas,
    glbUrl: '/test.glb',
    quality,
    reduceMotion,
    callbacks: {
      onReady: (v: boolean) => events.ready.push(v),
      onSelection: (c: number, r: number) => events.selection.push([c, r]),
      onMode: (m: 'browse' | 'detail') => events.mode.push(m),
    },
  });
  return { scene, events };
}

function stepLoop() {
  const cb = rafCbs.shift();
  cb?.(0);
}

beforeEach(() => {
  rafCbs = [];
  nowMs = 10_000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCbs.push(cb);
    return rafCbs.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ArchiveScene 生命周期', () => {
  it('WebGL2 不可用：start 拒绝', async () => {
    h.webgl2 = false;
    const { scene } = makeScene(true);
    await expect(scene.start()).rejects.toThrow('WebGL2 not supported');
    h.webgl2 = true;
  });

  it('GLB 成功：建阵列 5×8、onReady(true)、循环渲染', async () => {
    h.loadAsyncImpl = async () => ({ scene: new threeMock.Group() });
    const { scene, events } = makeScene(true);
    await scene.start();
    expect(events.ready).toEqual([true]);
    expect((scene as unknown as { cards: unknown[] }).cards).toHaveLength(COLS * rowsForQuality('medium'));
    stepLoop();
    expect(rafCbs.length).toBeGreaterThan(0);
  });

  it('GLB 失败：程序化兜底几何 onReady(false)', async () => {
    h.loadAsyncImpl = async () => {
      throw new Error('404');
    };
    const { scene, events } = makeScene(true, 'low');
    await scene.start();
    expect(events.ready).toEqual([false]);
    const template = (scene as unknown as { template: { children: unknown[] } }).template;
    expect(template?.children).toHaveLength(3);
  });

  it('dispose 后循环停止且渲染器释放', async () => {
    h.loadAsyncImpl = async () => ({ scene: new threeMock.Group() });
    const { scene } = makeScene(true);
    await scene.start();
    scene.dispose();
    stepLoop(); // 消费挂起帧；loop 应因 disposed 直接返回，不再重挂
    stepLoop();
    expect(rafCbs.length).toBe(0);
    expect(
      (h.renderers[h.renderers.length - 1] as unknown as { disposed?: boolean }).disposed,
    ).toBe(true);
  });
});

describe('ArchiveScene 选择状态机', () => {
  it('切列/翻阅循环 + 每列行记忆 + onSelection 回调', async () => {
    h.loadAsyncImpl = async () => ({ scene: new threeMock.Group() });
    const { scene, events } = makeScene(true);
    await scene.start();
    scene.moveCol(1);
    scene.moveRow(2);
    expect(events.selection.at(-1)).toEqual([1, 2]);
    scene.moveCol(-1);
    scene.moveCol(1);
    expect(events.selection.at(-1)).toEqual([1, 2]); // 记忆恢复
    scene.moveCol(-1);
    scene.moveCol(-1);
    scene.moveCol(-1);
    scene.moveCol(-1); // 0 - 4 → wrap 到 2
    expect(events.selection.at(-1)?.[0]).toBe(2);
  });

  it('详情进出：onMode 回调与循环状态收敛（reduceMotion 直跳）', async () => {
    h.loadAsyncImpl = async () => ({ scene: new threeMock.Group() });
    const { scene, events } = makeScene(true);
    await scene.start();
    scene.openDetail();
    expect(events.mode).toEqual(['detail']);
    stepLoop(); // detail-in → detail（lift 直跳到 LIFT_DETAIL）
    scene.closeDetail();
    expect(events.mode).toEqual(['detail', 'browse']);
    stepLoop(); // detail-out → browse
    expect((scene as unknown as { mode: string }).mode).toBe('browse');
  });

  it('标准动效：镜头插值与呼吸/波浪分支执行', async () => {
    h.loadAsyncImpl = async () => ({ scene: new threeMock.Group() });
    const { scene, events } = makeScene(false);
    await scene.start();
    scene.openDetail(); // camT=0，进入插值
    nowMs += 500;
    stepLoop(); // 插值中 + lift 弹簧
    scene.closeDetail();
    nowMs += 5_000; // idle > 2.5 → 呼吸分支
    scene.moveCol(1); // fireWave → 波浪分支
    stepLoop();
    expect(events.mode).toEqual(['detail', 'browse']);
  });
});
