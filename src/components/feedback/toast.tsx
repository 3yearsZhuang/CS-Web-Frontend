'use client'
/**
 * @file Toast 提示组件
 */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';

/** Toast 消息 */
export interface Toast {
  id: number;
  type: 'success' | 'error';
  text: string;
}

interface ToastContextValue {
  toasts: Toast[];
  pushToast: (type: 'success' | 'error', text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Toast hook — 获取 pushToast 方法 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 返回 no-op — 允许在 ToastProvider 外部安全调用（如 admin 页面的加载中/无权限分支）
    return { toasts: [], pushToast: () => {} };
  }
  return ctx;
}

/** Toast 上下文提供者 — 全局 Toast 容器 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, pushToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-4 sm:right-6 z-[60] flex flex-col gap-2 max-w-[90vw] pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 border-l-2 text-[12px] font-mono leading-relaxed backdrop-blur-sm pointer-events-auto ${
                t.type === 'success'
                  ? 'border-[var(--primary)] bg-[var(--background)]/[0.95] text-[var(--primary)]'
                  : 'border-[var(--destructive)] bg-[var(--background)]/[0.95] text-[var(--destructive)]'
              }`}
            >
              {t.type === 'success' ? '[ OK ] ' : '[ Error ] '}
              {t.text}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}