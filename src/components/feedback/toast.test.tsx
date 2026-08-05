// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './toast';
import { Button } from '../primitives/button';

/** Toast 冒烟测试（GENERAL 3.8） */

function Trigger() {
  const { pushToast } = useToast();
  return (
    <>
      <Button onClick={() => pushToast('success', '已保存')}>成功</Button>
      <Button onClick={() => pushToast('error', '加载失败')}>失败</Button>
    </>
  );
}

describe('Toast', () => {
  it('成功 toast 显示 [ OK ] 与文本', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '成功' }));
    expect(screen.getByText(/已保存/)).toBeInTheDocument();
    expect(screen.getByText(/\[ OK \]/)).toBeInTheDocument();
  });

  it('错误 toast 显示 [ Error ] 与文本', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '失败' }));
    expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    expect(screen.getByText(/\[ Error \]/)).toBeInTheDocument();
  });

  it('toast 约 3.5s 后自动消失', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '成功' }));
    expect(screen.getByText(/已保存/)).toBeInTheDocument();
    // 真实 timer 等待 3.5s 自动移除
    await waitFor(() => expect(screen.queryByText(/已保存/)).toBeNull(), { timeout: 5000 });
  });
});
