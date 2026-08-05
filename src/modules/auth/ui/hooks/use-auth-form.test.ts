// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthForm } from './use-auth-form';

/**
 * useAuthForm 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next-intl / next/navigation / fetch，聚焦登录、注册校验、2FA、忘记密码。
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => null }),
}));

describe('useAuthForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.push.mockClear();
  });

  it('登录成功：跳转 /profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('a@b.com');
      result.current.setPassword('secret123');
    });

    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/profile'));
  });

  it('密码过短：客户端拦截，不发起请求', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('a@b.com');
      result.current.setPassword('12');
    });

    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe('passwordTooShort');
  });

  it('登录触发 2FA：进入 2FA 流程，verify 后跳转', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ requires2FA: true, twoFactorToken: 'tok123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('a@b.com');
      result.current.setPassword('secret123');
    });
    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(result.current.in2FAFlow).toBe(true);

    act(() => {
      result.current.setTwoFactorCode('123456');
    });
    await act(async () => {
      await result.current.handle2FASubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/2fa/verify',
      expect.objectContaining({ method: 'POST' }),
    );
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/profile'));
  });

  it('忘记密码成功：显示成功态', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setIsLogin(true);
      result.current.openForgotPassword();
      result.current.setForgotEmail('a@b.com');
    });

    await act(async () => {
      await result.current.handleForgotPassword(new Event('submit') as unknown as React.FormEvent);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/forgot-password',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.forgotSuccess).toBe(true);
  });

  it('邮箱格式非法：客户端拦截', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('not-an-email');
      result.current.setPassword('secret123');
    });

    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe('invalidEmail');
  });
});
