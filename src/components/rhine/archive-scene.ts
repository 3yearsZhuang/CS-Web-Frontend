'use client';

/**
 * @file ArchiveScene — Rhine 3D 档案阵列场景控制器（方案 B · FrontDoc-UID §17）
 *
 * 与 React 解耦的命令式场景（对齐上游 `scene.ts` / `archive-loop.ts` 的分层思路）：
 * React 负责 HUD、键盘与设置，本类负责 three.js 场景、材质、镜头编排与动画循环。
 *
 * 复用范围（经决策豁免 §11，仅限 §17 白名单作用域）：
 * - 上游 GLB 的透射 / 折射质感（Frosted_Polymer、Amber_Optical_Inlay 等材质原样保留）
 * - 远距窄视场镜头（交互 59°/19°，详情 18°/13.8°）与临界阻尼升降
 * - 选中浅抬 + 邻列正半波传播 + 静止呼吸起伏
 *
 * 降级：GLB 载入失败回退程序化几何；画质档位控制透射强度 / 像素比 / 阵列行数。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { QualityLevel } from './terminal-settings';

/* ============ 场景常量（沿用 DESIGN.md 的几何与镜头约束） ============ */
export const COLS = 5;
export const CARD_W = 5;
const COL_GAP = 5.4;
const ROW_GAP = 4.6;
const LIFT_PREVIEW = 0.9;
const LIFT_DETAIL = 4.05;
const PAPER = 0xeae5e1;
const AMBER = 0xe07b39;

/** 画质 → 阵列行数 */
export function rowsForQuality(q: QualityLevel): number {
  return q === 'low' ? 6 : 8;
}
/** 画质 → 设备像素比上限 */
export function pixelRatioForQuality(q: QualityLevel): number {
  return q === 'high' ? 2 : q === 'medium' ? 1.5 : 1;
}
/** 画质 → 透射强度（low 关闭透射改用半透明） */
export function transmissionForQuality(q: QualityLevel): number {
  return q === 'high' ? 1 : q === 'medium' ? 0.65 : 0;
}

/** 对材质应用画质档位（透射强度 / 半透明降级） */
export function applyQualityToMaterial(m: THREE.Material, q: QualityLevel): void {
  const mat = m as THREE.MeshPhysicalMaterial;
  if (!('transmission' in mat)) return;
  const t = transmissionForQuality(q);
  mat.transmission = t;
  if (t === 0) {
    mat.transparent = true;
    mat.opacity = 0.88;
  } else {
    mat.transparent = false;
    mat.opacity = 1;
  }
  mat.needsUpdate = true;
}

/**
 * 归一化模型：居中 → 把厚度（最小维）转到 Z 轴 → 宽度统一为 targetWidth。
 * 返回可直接克隆的包装组。
 */
export function normalizeCardObject(src: THREE.Object3D, targetWidth = CARD_W): THREE.Group {
  const b0 = new THREE.Box3().setFromObject(src);
  const s0 = b0.getSize(new THREE.Vector3());
  const order = ([['x', s0.x], ['y', s0.y], ['z', s0.z]] as const)
    .slice()
    .sort((a, b) => a[1] - b[1]);
  if (order[0][0] === 'y') src.rotation.x = -Math.PI / 2;
  else if (order[0][0] === 'x') src.rotation.y = Math.PI / 2;

  src.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(src);
  const size = b.getSize(new THREE.Vector3());
  const center = b.getCenter(new THREE.Vector3());
  src.position.sub(center);

  const wrap = new THREE.Group();
  wrap.add(src);
  wrap.scale.setScalar(targetWidth / (size.x || targetWidth));
  return wrap;
}

/** 程序化兜底档案盒（GLB 不可用时） */
export function proceduralCard(quality: QualityLevel): THREE.Group {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(CARD_W, 3.7, 0.12),
    new THREE.MeshPhysicalMaterial({
      color: 0xf5f1ea,
      roughness: 0.34,
      transmission: transmissionForQuality(quality),
      thickness: 0.6,
      ior: 1.45,
      clearcoat: 0.4,
    }),
  );
  cover.position.z = 0.31;
  const substrate = new THREE.Mesh(
    new THREE.BoxGeometry(CARD_W - 0.24, 3.46, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xefe9e0, roughness: 0.8 }),
  );
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 3.2, 0.06),
    new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.35, roughness: 0.5 }),
  );
  strip.position.set(-CARD_W / 2 + 0.32, 0, 0.34);
  g.add(cover, substrate, strip);
  return g;
}

/** 场景回调 */
export interface SceneCallbacks {
  /** 选中变化（列 / 行） */
  onSelection?: (col: number, row: number) => void;
  /** 模式变化 */
  onMode?: (mode: 'browse' | 'detail') => void;
  /** 就绪（usedGlb 表示是否成功使用 GLB） */
  onReady?: (usedGlb: boolean) => void;
}

/** 初始化参数 */
export interface SceneOptions {
  canvas: HTMLCanvasElement;
  glbUrl: string;
  quality: QualityLevel;
  reduceMotion: boolean;
  callbacks?: SceneCallbacks;
}

interface Card {
  grp: THREE.Group;
  lift: number;
  liftV: number;
  yaw: number;
  col: number;
  row: number;
  phase: number;
}

/** 3D 档案阵列场景控制器 */
export class ArchiveScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly glbUrl: string;
  private readonly cb: SceneCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private cards: Card[] = [];
  private template: THREE.Group | null = null;
  private quality: QualityLevel;
  private reduceMotion: boolean;
  private rows: number;
  private sel = { col: 0, row: 0, memory: [] as number[] };
  private mode: 'browse' | 'detail-in' | 'detail' | 'detail-out' = 'browse';
  private wave = { t0: -10, col: 0, row: 0 };
  private cam = { az: 59, el: 19, r: 36, tx: 0, ty: 0.8, tz: -2 };
  private camFrom = { ...this.cam };
  private camTo = { ...this.cam };
  private camT = 1;
  private lastAction = 0;
  private clock = 0;
  private raf = 0;
  private prev = 0;
  private drag: { x: number; yaw: number } | null = null;
  private disposed = false;

  constructor(opts: SceneOptions) {
    this.canvas = opts.canvas;
    this.glbUrl = opts.glbUrl;
    this.quality = opts.quality;
    this.reduceMotion = opts.reduceMotion;
    this.rows = rowsForQuality(opts.quality);
    this.cb = opts.callbacks ?? {};
    this.sel.memory = Array.from({ length: COLS }, () => 0);
  }

  /** 初始化渲染器 / 灯光 / 载入模型 / 建阵列并启动循环 */
  async start(): Promise<void> {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    if (!this.renderer.capabilities.isWebGL2) throw new Error('WebGL2 not supported');
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioForQuality(this.quality)));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PAPER);
    this.scene.fog = new THREE.Fog(PAPER, 34, 105);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight(0xfff8ef, 0xd8cfc4, 0.5));
    const key = new THREE.DirectionalLight(0xfff4e6, 1.7);
    key.position.set(-8, 14, 4);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(10, 6, -8);
    this.scene.add(fill);
    this.scene.add(this.root);

    let usedGlb = false;
    try {
      const gltf = await new GLTFLoader().loadAsync(this.glbUrl);
      this.template = normalizeCardObject(gltf.scene);
      usedGlb = true;
    } catch {
      this.template = proceduralCard(this.quality);
    }
    this.applyQualityToTemplate();
    this.camera = new THREE.PerspectiveCamera(24, window.innerWidth / window.innerHeight, 0.3, 240);
    this.buildCards();
    this.bindPointer();
    this.resize();
    this.placeCamera();
    this.wave = { t0: 0.4, col: 0, row: 0 };
    this.cb.onReady?.(usedGlb);
    this.prev = performance.now() / 1000;
    this.loop();
  }

  /** 重建阵列（画质切换时行数变化） */
  private buildCards(): void {
    this.root.clear();
    this.cards = [];
    if (!this.template) return;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < this.rows; r++) {
        const grp = this.template.clone(true);
        grp.position.set((c - (COLS - 1) / 2) * COL_GAP, 0, (r - (this.rows - 1) / 2) * ROW_GAP);
        this.root.add(grp);
        this.cards.push({ grp, lift: 0, liftV: 0, yaw: 0, col: c, row: r, phase: Math.random() * Math.PI * 2 });
      }
    }
    this.sel.col = Math.min(this.sel.col, COLS - 1);
    this.sel.row = Math.min(this.sel.row, this.rows - 1);
    this.sel.memory = Array.from({ length: COLS }, (_, i) => Math.min(this.sel.memory[i] ?? 0, this.rows - 1));
  }

  private applyQualityToTemplate(): void {
    this.template?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
      mats.forEach((m) => applyQualityToMaterial(m, this.quality));
    });
  }

  /** 切换画质：更新像素比、透射强度；行数变化时重建阵列 */
  setQuality(q: QualityLevel): void {
    if (q === this.quality) return;
    const rowsChanged = rowsForQuality(q) !== this.rows;
    this.quality = q;
    this.rows = rowsForQuality(q);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioForQuality(q)));
    this.applyQualityToTemplate();
    if (rowsChanged) this.buildCards();
    this.resize();
  }

  /** 减少动态效果（关闭呼吸 / 波浪 / 过渡） */
  setReduceMotion(v: boolean): void {
    this.reduceMotion = v;
  }

  private selCard(): Card | undefined {
    return this.cards[this.sel.col * this.rows + this.sel.row];
  }

  private fireWave(): void {
    this.wave = { t0: this.clock, col: this.sel.col, row: this.sel.row };
    this.lastAction = this.clock;
    this.cb.onSelection?.(this.sel.col, this.sel.row);
  }

  /** 切列（保留每列上次的行选择） */
  moveCol(delta: number): void {
    if (this.mode !== 'browse') return;
    this.sel.col = (this.sel.col + delta + COLS) % COLS;
    this.sel.row = Math.min(this.sel.memory[this.sel.col] ?? 0, this.rows - 1);
    this.fireWave();
  }

  /** 行内翻阅（循环） */
  moveRow(delta: number): void {
    if (this.mode !== 'browse') return;
    this.sel.row = (this.sel.row + delta + this.rows) % this.rows;
    this.sel.memory[this.sel.col] = this.sel.row;
    this.fireWave();
  }

  /** 抽取到详情（镜头编排） */
  openDetail(): void {
    if (this.mode !== 'browse') return;
    const cd = this.selCard();
    if (!cd) return;
    this.mode = 'detail-in';
    this.cb.onMode?.('detail');
    this.tweenCamera({
      az: 18,
      el: 13.8,
      r: 15,
      tx: cd.grp.position.x + 3.6,
      ty: cd.grp.position.y + LIFT_DETAIL + 0.6,
      tz: cd.grp.position.z,
    });
  }

  /** 归位（先转正再下降） */
  closeDetail(): void {
    if (this.mode === 'detail' || this.mode === 'detail-in') {
      this.mode = 'detail-out';
      this.cb.onMode?.('browse');
    }
  }

  /** 复位视角（详情态可用） */
  resetView(): void {
    const cd = this.selCard();
    if (cd) cd.yaw = 0;
  }

  private tweenCamera(to: Partial<typeof this.cam>): void {
    this.camFrom = { ...this.cam };
    this.camTo = { ...this.cam, ...to };
    this.camT = this.reduceMotion ? 1 : 0;
    if (this.camT === 1) this.placeCamera();
  }

  private placeCamera(): void {
    const az = THREE.MathUtils.degToRad(this.cam.az);
    const el = THREE.MathUtils.degToRad(this.cam.el);
    this.camera.position.set(
      this.cam.tx + this.cam.r * Math.cos(el) * Math.sin(az),
      this.cam.ty + this.cam.r * Math.sin(el),
      this.cam.tz + this.cam.r * Math.cos(el) * Math.cos(az),
    );
    this.camera.lookAt(this.cam.tx, this.cam.ty, this.cam.tz);
  }

  /** 详情态拖拽旋转（±0.8 rad） */
  private bindPointer(): void {
    const down = (e: PointerEvent) => {
      if (this.mode === 'detail') {
        const cd = this.selCard();
        if (cd) this.drag = { x: e.clientX, yaw: cd.yaw };
      }
    };
    const move = (e: PointerEvent) => {
      if (!this.drag) return;
      const cd = this.selCard();
      if (cd) cd.yaw = THREE.MathUtils.clamp(this.drag.yaw + (e.clientX - this.drag.x) * 0.006, -0.8, 0.8);
    };
    const up = () => { this.drag = null; };
    this.canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    this.canvasCleanup = () => {
      this.canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }
  private canvasCleanup: (() => void) | null = null;

  /** 尺寸自适应 */
  resize(): void {
    if (!this.renderer || !this.camera) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now() / 1000;
    const dt = Math.min(now - this.prev, 0.05);
    this.prev = now;
    this.clock = now;

    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 1.15);
      const e = 1 - Math.pow(1 - this.camT, 4);
      (['az', 'el', 'r', 'tx', 'ty', 'tz'] as const).forEach((k) => {
        this.cam[k] = this.camFrom[k] + (this.camTo[k] - this.camFrom[k]) * e;
      });
      this.placeCamera();
    }

    const idle = now - this.lastAction;
    const breathing = !this.reduceMotion && this.mode === 'browse' && idle > 2.5
      ? Math.min(1, (idle - 2.5) / 1.2)
      : 0;
    const selCard = this.selCard();

    for (const cd of this.cards) {
      let target = 0;
      const isSel = cd === selCard;
      if (this.mode === 'browse') {
        if (isSel) target = LIFT_PREVIEW;
        const dist = Math.abs(cd.col - this.wave.col) + Math.abs(cd.row - this.wave.row);
        const lt = now - (this.wave.t0 + dist * 0.06);
        if (lt > 0 && lt < 1.4) {
          const amp = 0.7 * Math.max(0, 1 - dist * 0.1);
          target += amp * Math.max(0, Math.cos(lt * 8.5)) * Math.exp(-lt * 2.4);
        }
        if (breathing > 0) {
          target += breathing * 0.102 * (
            0.6 * Math.sin(now * ((Math.PI * 2) / 8) + cd.phase)
            + 0.4 * Math.sin(now * ((Math.PI * 2) / 13) + cd.phase * 1.7)
          );
        }
      } else if (isSel) {
        target = this.mode === 'detail-out' ? LIFT_PREVIEW : LIFT_DETAIL;
      }

      if (this.reduceMotion) {
        cd.lift = target;
        cd.liftV = 0;
      } else {
        cd.liftV += (target - cd.lift) * 90 * dt;
        cd.liftV *= Math.exp(-11 * dt);
        cd.lift += cd.liftV * dt;
      }
      cd.grp.position.y = cd.lift;

      if (this.mode === 'detail-out') {
        cd.yaw += (0 - cd.yaw) * Math.min(1, dt * 8);
        if (Math.abs(cd.yaw) < 0.01 && cd.lift < LIFT_PREVIEW + 0.06) {
          this.mode = 'browse';
          this.tweenCamera({ az: 59, el: 19, r: 36, tx: 0, ty: 0.8, tz: -2 });
          this.lastAction = now;
        }
      }
      if (this.mode === 'detail-in' && this.camT >= 1 && Math.abs(cd.lift - LIFT_DETAIL) < 0.05) {
        this.mode = 'detail';
      }
      cd.grp.rotation.y = cd.yaw;
    }

    this.renderer.render(this.scene, this.camera);
  };

  /** 释放资源 */
  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvasCleanup?.();
    this.template?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose?.();
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
      mats.forEach((m) => m?.dispose?.());
    });
    this.renderer?.dispose?.();
    this.scene?.environment?.dispose?.();
  }
}
