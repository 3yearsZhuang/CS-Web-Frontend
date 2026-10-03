'use client';

/**
 * @file ArchiveTerminal — /lab/terminal 3D 档案阵列（方案 B · FrontDoc-UID §17）
 *
 * React 侧只负责：HUD、键盘、设置消费（画质 / 音效 / 减少动效）与降级提示；
 * 三维部分全部委托给 `ArchiveScene`（命令式控制器）。
 *
 * 降级路径：
 * - WebGL2 不可用 / 场景初始化失败 → 展示降级面板，引导前往 2D 档案柜 `/lab/archive`
 * - GLB 载入失败 → 场景内部回退程序化几何（HUD 标注 fallback）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArchiveScene, rowsForQuality } from './archive-scene';
import { ARCHIVE_CATS } from './archive-demo-data';
import { useMotionPreference, useTerminalSettings } from './terminal-settings';

/** 资源地址（public/rhine-lab，占位素材，见该目录 README） */
const GLB_URL = '/rhine-lab/archive-cassette.glb';

export function ArchiveTerminal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ArchiveScene | null>(null);

  const { settings } = useTerminalSettings();
  const reduceMotion = useMotionPreference();

  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [usedGlb, setUsedGlb] = useState(true);
  const [mode, setMode] = useState<'browse' | 'detail'>('browse');
  const [pos, setPos] = useState({ col: 0, row: 0 });

  const rows = rowsForQuality(settings.quality);
  const item = useMemo(() => {
    const col = ARCHIVE_CATS[pos.col];
    return col ? col.items[Math.min(pos.row, col.items.length - 1)] : undefined;
  }, [pos]);

  /* 场景生命周期：仅挂载一次；画质 / 动效偏好通过 setter 更新 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new ArchiveScene({
      canvas,
      glbUrl: GLB_URL,
      quality: settings.quality,
      reduceMotion,
      callbacks: {
        onSelection: (col, row) => setPos({ col, row }),
        onMode: (m) => setMode(m),
        onReady: (glb) => {
          setUsedGlb(glb);
          setStatus('ready');
        },
      },
    });
    sceneRef.current = scene;
    scene.start().catch(() => setStatus('failed'));

    const onResize = () => scene.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      sceneRef.current = null;
    };
    // 初始化参数只在挂载时生效；后续变化由下方 effect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setQuality(settings.quality); }, [settings.quality]);
  useEffect(() => { sceneRef.current?.setReduceMotion(reduceMotion); }, [reduceMotion]);

  /* 键盘 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const scene = sceneRef.current;
      if (!scene) return;
      switch (e.key) {
        case 'ArrowLeft': scene.moveCol(-1); break;
        case 'ArrowRight': scene.moveCol(1); break;
        case 'ArrowUp': e.preventDefault(); scene.moveRow(-1); break;
        case 'ArrowDown': e.preventDefault(); scene.moveRow(1); break;
        case 'Enter': scene.openDetail(); break;
        case 'Escape': scene.closeDetail(); break;
        case 'r': case 'R': scene.resetView(); break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <main
      className="rhine-scope relative h-screen w-full overflow-hidden pt-16"
      style={{ background: 'var(--rhine-paper)', color: 'var(--rhine-ink)', fontFamily: 'var(--rhine-sans)' }}
    >
      <canvas ref={canvasRef} className="fixed inset-0 block" style={{ top: 64 }} aria-label="三维档案阵列" role="img" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(20,18,16,.10) 100%)' }}
      />

      {/* 顶栏 */}
      <header
        className="fixed left-0 right-0 top-16 z-10 flex min-h-[52px] items-center gap-[18px] border-b px-5"
        style={{ borderColor: 'var(--rhine-hairline)', background: 'color-mix(in srgb, var(--rhine-paper) 72%, transparent)', backdropFilter: 'blur(10px)', fontFamily: 'var(--rhine-mono)' }}
      >
        <span className="text-[12px] font-semibold tracking-[0.28em]">
          FZTBU·CS <em className="not-italic" style={{ color: 'var(--rhine-amber)' }}>TERMINAL</em>
        </span>
        <span className="text-[10px] tracking-[0.2em]" style={{ color: 'var(--rhine-ink-dim)' }}>
          POS <b style={{ color: 'var(--rhine-amber)' }}>{item?.id ?? '—'}</b>
        </span>
        <span className="flex-1" />
        {!usedGlb && (
          <span className="text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--rhine-amber)' }}>
            FALLBACK GEOMETRY
          </span>
        )}
        <span className="hidden text-[10px] tracking-[0.24em] uppercase sm:inline" style={{ color: 'var(--rhine-ink-dim)' }}>
          [ 0{pos.col + 1} ] {ARCHIVE_CATS[pos.col]?.en}
        </span>
        <Link href="/lab/archive" className="rhine-topbtn">2D 档案柜</Link>
        <Link href="/lab" className="rhine-topbtn">← LAB</Link>
      </header>

      {/* 选中信息 */}
      <div className="pointer-events-none fixed left-5 top-[132px] z-10" style={{ fontFamily: 'var(--rhine-mono)' }}>
        <div className="text-[12px] font-semibold tracking-[0.2em]" style={{ color: 'var(--rhine-amber)' }}>
          {item?.id ?? ''}
        </div>
        <div className="mt-1.5 text-[22px] font-semibold" style={{ fontFamily: 'var(--rhine-sans)' }}>
          {item?.title ?? ''}
        </div>
        <div className="mt-1 text-[9px] uppercase tracking-[0.24em]" style={{ color: 'var(--rhine-ink-dim)' }}>
          {item?.en ?? ''}
        </div>
      </div>

      {/* 底部提示 */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-10 flex min-h-[42px] items-center gap-5 overflow-x-auto border-t px-5"
        style={{ borderColor: 'var(--rhine-hairline)', background: 'color-mix(in srgb, var(--rhine-paper) 72%, transparent)', backdropFilter: 'blur(10px)', fontFamily: 'var(--rhine-mono)' }}
      >
        {([['←→', '切列'], ['↑↓', '翻阅'], ['ENTER', '抽取档案'], ['拖动', '详情内旋转'], ['R', '复位视角'], ['ESC', '归位']] as const).map(([k, v]) => (
          <span key={k} className="whitespace-nowrap text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--rhine-ink-dim)' }}>
            <b style={{ color: 'var(--rhine-ink)' }}>{k}</b> {v}
          </span>
        ))}
        <span className="ml-auto whitespace-nowrap text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--rhine-ink-dim)' }}>
          画质 {settings.quality.toUpperCase()} · 行 {rows} · {reduceMotion ? '减动效' : '标准动效'}
        </span>
      </footer>

      {/* 详情面板 */}
      <aside
        className="fixed right-0 z-10 w-[min(380px,88vw)] overflow-y-auto border-l px-[26px] py-7 transition-transform duration-500"
        style={{
          top: 116,
          bottom: 42,
          borderColor: 'var(--rhine-hairline)',
          background: 'color-mix(in srgb, var(--rhine-paper) 82%, transparent)',
          backdropFilter: 'blur(12px)',
          transform: mode === 'detail' ? 'none' : 'translateX(102%)',
        }}
        aria-hidden={mode !== 'detail'}
      >
        <div className="text-[9px] uppercase tracking-[0.3em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          ARCHIVE DETAIL
        </div>
        <div className="mt-3.5 text-[13px] font-semibold tracking-[0.18em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-amber)' }}>
          {item ? `ARCHIVE ${item.id}` : ''}
        </div>
        <h1 className="mb-1 mt-2 text-[24px] font-semibold">{item?.title ?? ''}</h1>
        <div className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          {item?.en ?? ''}
        </div>
        <div className="mt-4 flex justify-between border-t py-2.5 text-[12px]" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>OWNER</span>
          <span>{item?.owner ?? '—'}</span>
        </div>
        <div className="flex justify-between border-t py-2.5 text-[12px]" style={{ borderColor: 'var(--rhine-hairline)' }}>
          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>DATE</span>
          <span>{item?.date ?? '—'}</span>
        </div>
        <p className="mt-4 text-[13px] leading-[2] text-[#33302c]">
          档案「{item?.title ?? ''}」由透明档案盒封存，当前为抽取净空状态：镜头切至 18°/13.8° 特写，
          可拖动检查角度；ESC 先转正再归位。
          {usedGlb ? '（模型为上游占位素材，含磨砂聚合物盖板 / 琥珀光学镶嵌 / 光学扩散片等材质）' : '（GLB 未载入，当前为程序化兜底几何）'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/lab/archive" className="rhine-actbtn ghost">在 2D 档案柜打开</Link>
        </div>
      </aside>

      {/* 载入 / 降级 */}
      {status !== 'ready' && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3.5"
          style={{ background: 'var(--rhine-paper)' }}
        >
          <div className="text-[11px] uppercase tracking-[0.4em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
            {status === 'loading' ? 'LOADING 3D ARCHIVE' : '3D SCENE UNAVAILABLE'}
          </div>
          {status === 'loading' ? (
            <div className="h-px w-[180px] overflow-hidden" style={{ background: 'var(--rhine-hairline)' }} aria-hidden="true" />
          ) : (
            <>
              <p className="max-w-[460px] px-6 text-center text-[13px] leading-[1.8]" style={{ color: 'var(--rhine-ink-dim)' }}>
                当前环境不支持 WebGL2 或场景初始化失败。可改用 2D 档案柜获取同样的内容与交互。
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/lab/archive" className="rhine-actbtn">前往 2D 档案柜</Link>
                <button type="button" className="rhine-actbtn ghost" onClick={retry}>重试 RETRY</button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
