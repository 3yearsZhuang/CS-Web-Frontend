'use client';

/**
 * @file use-auth Hook
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** 认证用户信息（useAuth hook 的返回值类型） */
interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  avatarUrl: string | null;
  avatarType: string | null;
}

/**
 * 轻量认证 hook — 用于判断登录状态
 */
export function useAuth() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setUser(data?.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { user, loading, isLoggedIn: !loading && user !== null };
}