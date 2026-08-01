'use client';

/**
 * @file useCollapsingHero — Hero 区域折叠 hook（首次滚动触发折叠，点击标题回顶展开）
 *
 * 设计要点：
 *   - 折叠由"用户首次滚动"触发，而非固定延时，让用户掌控节奏
 *   - 字体浮现期间不锁滚动，用户可自由滚动
 *   - 折叠后延迟 800ms（CSS transition 结束）胶囊才淡入；展开时立即淡出
 *   - 折叠后立即移除 scroll listener；展开不重播动画，仅用 CSS transition 还原
 *   - 兜底：SAFETY_MAX 内未收到 onRevealComplete 则强制推进（防永久无 scroll listener）
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_TIMING } from '@/components/effects/motion-primitives';

/** 触发折叠的滚动阈值（px）— 过滤微小误触 */
const SCROLL_THRESHOLD = 4;

/** 折叠 CSS transition 结束后胶囊才出现的延迟（ms） */
const CAPSULE_APPEAR_DELAY = 800;

export function useCollapsingHero() {
  const [collapsed, setCollapsed] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const [capsuleVisible, setCapsuleVisible] = useState(false);
  const collapsedRef = useRef(false);
  const capsuleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 字体浮现完成回调 — 交由 Hero 内 StaggerContainer 的 onComplete 触发 */
  const onRevealComplete = useCallback(() => setRevealComplete(true), []);

  /** 挂载/重挂 scroll listener — revealComplete 或展开后调用 */
  useEffect(() => {
    if (!revealComplete) return;

    const onScroll = () => {
      if (collapsedRef.current) return;
      if (window.scrollY > SCROLL_THRESHOLD) {
        collapsedRef.current = true;
        setCollapsed(true);
        // 折叠 CSS transition 结束后胶囊淡入
        if (capsuleTimerRef.current) clearTimeout(capsuleTimerRef.current);
        capsuleTimerRef.current = setTimeout(() => setCapsuleVisible(true), CAPSULE_APPEAR_DELAY);
        window.removeEventListener('scroll', onScroll);
      }
    };
    // 立即检查当前滚动位置 — 用户可能在动画完成前已滚动，
    // 仅靠 scroll 事件监听会漏掉已发生的滚动
    onScroll();
    if (!collapsedRef.current) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (capsuleTimerRef.current) clearTimeout(capsuleTimerRef.current);
    };
  }, [revealComplete]);

  // 兜底：SAFETY_MAX 内未收到完成事件则强制推进
  useEffect(() => {
    if (revealComplete) return;
    const timer = setTimeout(() => setRevealComplete(true), HERO_TIMING.SAFETY_MAX);
    return () => clearTimeout(timer);
  }, [revealComplete]);

  /** 点击折叠态标题：胶囊淡出 → 平滑回顶 → 展开还原
   *  - 展开时立即 capsuleVisible = false，胶囊淡出
   *  - scrollTo(smooth) 不返回 Promise，用 requestAnimationFrame 轮询 scrollY 检测到位
   *  - 已在顶部则立即展开（无需等待）
   *  - 超时兜底：1.2s 内未到顶则强制展开（防异常）
   *  - 展开后重新挂载 scroll listener（toggle revealComplete 触发 effect 重跑） */
  const onTitleClick = useCallback(() => {
    if (!collapsedRef.current) return;

    // 立即让胶囊淡出
    setCapsuleVisible(false);
    if (capsuleTimerRef.current) {
      clearTimeout(capsuleTimerRef.current);
      capsuleTimerRef.current = null;
    }

    /** 执行展开：重置折叠态 + 重新挂载 scroll listener */
    const expand = () => {
      collapsedRef.current = false;
      setCollapsed(false);
      // toggle revealComplete 触发 scroll-listener effect 重新挂载
      setRevealComplete(false);
      requestAnimationFrame(() => setRevealComplete(true));
    };

    // 已在顶部 → 立即展开
    if (window.scrollY <= SCROLL_THRESHOLD) {
      expand();
      return;
    }

    // 平滑回顶 → rAF 轮询 scrollY 到位后展开（超时 1.2s 兜底）
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const start = performance.now();
    const check = () => {
      if (window.scrollY <= SCROLL_THRESHOLD || performance.now() - start > 1200) {
        expand();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }, []);

  // 组件卸载时清理 timer
  useEffect(() => {
    return () => {
      if (capsuleTimerRef.current) clearTimeout(capsuleTimerRef.current);
    };
  }, []);

  return { collapsed, capsuleVisible, onRevealComplete, onTitleClick };
}