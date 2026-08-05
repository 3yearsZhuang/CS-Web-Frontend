/**
 * @file 首页（/）— 极简单屏 Hero，莫比乌斯环背景 + 影院级交错入场
 * 点击彩蛋：全页点击弹出随机头像（配置角色 + 注册用户混合数据源）
 */
'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MobiusRing } from '@/components/effects/mobius-ring';
import { Avatar } from '@/components/avatar';
import { ADMIN_AVATARS, getAdminAvatarUrl, type AdminAvatar } from '@/shared/config';
import { EASE } from '@/shared/utils/ui-constants';
import { Button } from '@/components';
import { RevealItem, RevealTitle, StaggerContainer } from '@/components/effects/motion-primitives';
import { useAuth } from '@/shared/hooks/use-auth';
import { useBreakpoint, type Breakpoint } from '@/shared/hooks';
import type { MemberItem } from '@/modules/community/types';

/** 莫比乌斯环响应式配置 — 按断点分级
 *
 * 性能要点：只渲染 1 个 MobiusRing 实例（之前 4 个同时挂载导致 4 个 RAF + 12 个全局监听器）。
 * 通过 matchMedia 检测断点，动态切换 particleCount/radius/width 和定位样式。 */

interface MobiusConfig {
  particleCount: number;
  radius: number;
  width: number;
  repelRadius: number;
  repelStrength: number;
  opacity: string;
  /** 定位样式 — 不同断点环的位置不同 */
  positionClass: string;
  /** 尺寸样式 */
  sizeStyle: React.CSSProperties;
}

const MOBIUS_CONFIGS: Record<Breakpoint, MobiusConfig> = {
  mobile: {
    particleCount: 800,
    radius: 130,
    width: 36,
    repelRadius: 100,
    repelStrength: 40,
    opacity: 'opacity-60',
    positionClass: 'absolute top-[8%] left-1/2 -translate-x-1/2',
    sizeStyle: { width: '75vw', height: '75vw', maxWidth: '320px', maxHeight: '320px' },
  },
  tablet: {
    particleCount: 1400,
    radius: 180,
    width: 45,
    repelRadius: 130,
    repelStrength: 55,
    opacity: 'opacity-65',
    positionClass: 'absolute top-[12%] left-1/2 -translate-x-1/2',
    sizeStyle: { width: '80vw', height: '80vw', maxWidth: '480px', maxHeight: '480px' },
  },
  desktop: {
    particleCount: 1600,
    radius: 200,
    width: 50,
    repelRadius: 140,
    repelStrength: 58,
    opacity: '',
    positionClass: 'absolute top-1/2 right-[-8%] -translate-y-1/2',
    sizeStyle: { width: '55vw', height: '55vw', maxWidth: '600px', maxHeight: '600px' },
  },
  large: {
    particleCount: 2000,
    radius: 240,
    width: 58,
    repelRadius: 160,
    repelStrength: 65,
    opacity: '',
    positionClass: 'absolute top-1/2 right-[-5%] xl:right-[0%] -translate-y-1/2',
    sizeStyle: { width: '700px', height: '700px' },
  },
};

/** 首页组件 — 极简单屏 Hero */
export default function Home() {
  const breakpoint = useBreakpoint();
  const mobius = MOBIUS_CONFIGS[breakpoint];
  const { isLoggedIn } = useAuth();

  // ============ 彩蛋：全页点击触发头像 ============
  // 数据源：配置文件中的管理员角色 + 所有已注册用户
  const [showAvatar, setShowAvatar] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [currentPerson, setCurrentPerson] = useState<AdminAvatar | MemberItem | null>(null);
  const [avatarPos, setAvatarPos] = useState({ x: 0, y: 0 });
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [allMembers, setAllMembers] = useState<MemberItem[]>([]);

  // 挂载时获取所有注册用户
  useEffect(() => {
    fetch('/api/community/members')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) setAllMembers(data.members as MemberItem[]);
      })
      .catch(() => {});
  }, []);

  /** 判断是否为 AdminAvatar */
  const isAdminAvatar = (p: AdminAvatar | MemberItem): p is AdminAvatar =>
    'qq' in p && 'grade' in p;

  /** 随机选择一个人：30% 概率来自配置文件角色，70% 来自注册用户 */
  const pickRandomPerson = useCallback(() => {
    const roll = Math.random();
    if (roll < 0.3 || allMembers.length === 0) {
      // 配置文件中的角色
      const idx = Math.floor(Math.random() * ADMIN_AVATARS.length);
      return ADMIN_AVATARS[idx];
    }
    // 随机注册用户
    const idx = Math.floor(Math.random() * allMembers.length);
    return allMembers[idx];
  }, [allMembers]);

  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  /** 全页点击 — 在点击位置弹出随机头像，2秒后自动淡出 */
  const handlePageClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button')) return;

      clearAutoHideTimer();
      setIsHiding(false);
      setCurrentPerson(pickRandomPerson());
      setAvatarPos({ x: e.clientX, y: e.clientY });
      setShowAvatar(true);

      autoHideTimerRef.current = setTimeout(() => {
        setIsHiding(true);
        setTimeout(() => {
          setShowAvatar(false);
          setIsHiding(false);
        }, 500);
      }, 2000);
    },
    [clearAutoHideTimer, pickRandomPerson],
  );

  useEffect(() => {
    return () => clearAutoHideTimer();
  }, [clearAutoHideTimer]);

  return (
    <main className="relative" onClick={handlePageClick}>
      {/* ============ 顶部数字章节标记 + 元数据（固定） ============ */}
      <div className="fixed top-16 left-0 right-0 z-10 pointer-events-none">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-4 flex justify-between items-center text-[var(--muted-foreground)]">
          <span className="section-marker">[ 00 ] — Index</span>
          {/* ark-divider 的 display:inline-flex 会覆盖 Tailwind hidden，用外层包裹控制显隐 */}
          <div className="hidden md:block">
            <span className="ark-divider">
              Computer Association / Est. 2017
            </span>
          </div>
        </div>
      </div>

      {/* ============ Hero 区 — 单屏沉浸 ============ */}
      <section className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 md:px-8 pt-28 sm:pt-32 pb-8 sm:pb-10 overflow-hidden">
        {/* 12 栏栅格背景发丝线 — 极淡背景纹理 */}
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--grid-line) 1px, transparent 1px)',
            backgroundSize: 'calc(100% / 12) 100%',
          }}
        />

        {/* 粒子莫比乌斯环 — 单实例响应式（之前 4 个同时挂载导致 4 个 RAF + 12 监听器）
         *
         * 堆叠策略：父容器 pointer-events-none 不拦截点击，点击穿透到 <section> 后
         * 冒泡到 <main> 的 onClick 彩蛋处理器。CTA 按钮通过 pointer-events-auto
         * 恢复可点击，彩蛋 handler 中通过 closest('a, button') 跳过这些点击。 */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className={mobius.positionClass} style={mobius.sizeStyle}>
            <MobiusRing
              className={`w-full h-full ${mobius.opacity}`}
              particleCount={mobius.particleCount}
              radius={mobius.radius}
              width={mobius.width}
              repelRadius={mobius.repelRadius}
              repelStrength={mobius.repelStrength}
            />
          </div>

          {/* 渐变遮罩 — 让环与背景融合
           * 桌面端：从左到右淡出（与文字区融合）
           * 移动端：顶部底部淡出（避免与文字冲突）
           * pointer-events-none 确保不阻挡莫比乌斯环点击
           */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to right, var(--background) 0%, var(--background) 30%, transparent 70%)',
            }}
          />
          <div
            className="md:hidden absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, var(--background) 60%, var(--background) 100%)',
            }}
          />
        </div>

        {/* 顶部右对齐元数据 — 季节 + 招新状态
         * pointer-events-none: 纯展示元素，不拦截莫比乌斯环点击 */}
        <motion.div
          className="absolute top-28 sm:top-32 right-4 sm:right-6 md:right-8 hidden sm:block z-10 pointer-events-none"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
        >
          <div className="meta-mono mb-2">2026 / Autumn</div>
          <div className="meta-mono text-[var(--primary)] flex items-center gap-2">
            <span className="ark-status-dot" />
            <span>Recruiting</span>
          </div>
        </motion.div>

        {/* 主标题区 — 交错入场
         * pointer-events-none: 让点击穿透到下层莫比乌斯环（z-auto），使环可点击
         * CTA 按钮单独 pointer-events-auto 恢复可点击 */}
        <StaggerContainer
          className="relative max-w-[1600px] mx-auto w-full z-10 pointer-events-none"
        >
          <div className="grid grid-cols-12 gap-0">
            <div className="col-span-12 md:col-span-9">
              <RevealItem className="ark-divider mb-6 sm:mb-8 md:mb-10" duration={0.9}>
                A Community of Code, Curiosity &amp; Craft
              </RevealItem>

              <RevealTitle
                className="ark-corner-bracket inline-block display-serif text-[clamp(38px,10vw,180px)] text-[var(--foreground)] mb-0 leading-[1.05] tracking-tight"
                duration={1.4}
              >
                探索<span className="text-[var(--primary)]">技术</span>
                <br />
                的无限可能
              </RevealTitle>

              <div className="mt-8 sm:mt-12 md:mt-16 grid grid-cols-12 gap-6 sm:gap-8 items-start">
                <RevealItem className="col-span-12 md:col-span-6" duration={0.9}>
                  <p className="text-[var(--muted-foreground)] text-[clamp(14px,1.2vw,17px)] leading-[1.8] max-w-xl">
                    我们是校园中最纯粹的技术社区。在这里，代码不只是工具，
                    <span className="text-[var(--foreground)] font-medium">
                      {' '}
                      而是表达创意、解决问题、连接未来的语言。
                    </span>
                  </p>
                </RevealItem>

                <RevealItem className="col-span-12 md:col-span-6 flex flex-row md:flex-col gap-3" duration={0.9}>
                  <Link
                    href={isLoggedIn ? '/profile' : '/login'}
                    className="pointer-events-auto flex-1 md:flex-none md:max-w-[260px]"
                  >
                    <Button className="w-full">
                      <span>立即加入</span>
                      <span>→</span>
                    </Button>
                  </Link>
                  <Link
                    href="/about"
                    className="pointer-events-auto flex-1 md:flex-none md:max-w-[260px]"
                  >
                    <Button variant="outline" className="w-full">
                      <span>了解更多</span>
                      <span>→</span>
                    </Button>
                  </Link>
                </RevealItem>
              </div>
            </div>

            <div className="hidden md:block md:col-span-3" />
          </div>

          <motion.div
            className="mt-12 sm:mt-16 md:mt-24 h-[1px] bg-[var(--primary)] origin-left"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: EASE, delay: 1 }}
            style={{ width: '40%' }}
          />
        </StaggerContainer>
      </section>

      {/* ============ 彩蛋：头像浮层 — 跟随点击位置出现 ============
       * 数据源混合：配置文件角色 + 随机注册用户
       * fixed 定位在点击坐标，z-50 确保在最上层
       * pointer-events-none 不拦截后续点击，允许反复点击切换
       * transform: translate(-50%, -50%) 让浮层以点击点为中心 */}
      <AnimatePresence>
        {showAvatar && currentPerson && (
          <motion.div
            key="easter-egg-avatar"
            className="fixed z-50 pointer-events-none flex flex-col items-center gap-3 px-6 py-4 backdrop-blur-xl border border-[var(--border)] shadow-2xl"
            style={{
              left: avatarPos.x,
              top: avatarPos.y,
              transform: 'translate(-50%, -50%)',
              background: 'color-mix(in srgb, var(--background) 10%, transparent)',
            }}
            initial={{ opacity: 0, y: 24, scale: 1.02, filter: 'blur(14px)' }}
            animate={
              isHiding
                ? { opacity: 0, y: -12, scale: 0.95, filter: 'blur(8px)' }
                : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
            }
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
            transition={
              isHiding
                ? { duration: 0.5, ease: EASE }
                : { duration: 1.0, ease: EASE }
            }
          >
            <div className="ark-corner-bracket">
              <Avatar
                email={isAdminAvatar(currentPerson) ? currentPerson.qq : currentPerson.id}
                displayName={isAdminAvatar(currentPerson) ? currentPerson.name : (currentPerson.displayName ?? undefined)}
                avatarUrl={
                  isAdminAvatar(currentPerson)
                    ? getAdminAvatarUrl(currentPerson, 140)
                    : (currentPerson.avatarUrl ?? undefined)
                }
                avatarType={isAdminAvatar(currentPerson) ? undefined : (currentPerson.avatarType as 'identicon' | 'mp' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | undefined)}
                size={72}
                className="border-[var(--primary)]"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="display-serif text-[18px] text-[var(--foreground)]">
                {isAdminAvatar(currentPerson) ? currentPerson.name : (currentPerson.displayName || '未命名')}
              </span>
              {isAdminAvatar(currentPerson) ? (
                <span className="meta-mono text-[var(--primary)]">
                  {currentPerson.grade} {currentPerson.position}
                </span>
              ) : (
                <span className="meta-mono text-[var(--primary)]">
                  {currentPerson.id}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
