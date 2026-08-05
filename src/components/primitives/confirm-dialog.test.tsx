// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog, ConfirmProvider, useConfirm } from './confirm-dialog';
import { Button } from './button';

/**
 * ConfirmDialog 冒烟测试（GENERAL 3.8「tests 覆盖拆分后组件」）
 * 经 createPortal 渲染到 document.body。
 */

describe('ConfirmDialog', () => {
  it('open=false 时不渲染', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="t" message="m" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('open=true 渲染标题/消息/默认按钮', () => {
    render(
      <ConfirmDialog open title="删除用户" message="确认删除？" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText(/删除用户/)).toBeInTheDocument();
    expect(screen.getByText('确认删除？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('danger 变体显示不可撤销警告', () => {
    render(
      <ConfirmDialog open title="t" message="m" variant="danger" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText(/此操作不可撤销/)).toBeInTheDocument();
  });

  it('点击确认触发 onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open title="t" message="m" onConfirm={onConfirm} onCancel={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('点击取消触发 onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="t" message="m" onConfirm={() => {}} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('loading 时确认按钮显示处理中', () => {
    render(
      <ConfirmDialog open title="t" message="m" loading onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole('button', { name: '处理中...' })).toBeDisabled();
  });
});

describe('ConfirmProvider + useConfirm', () => {
  it('命令式 confirm() 返回 true 并关闭', async () => {
    const confirmSpy = vi.fn();
    function Trigger() {
      const { confirm } = useConfirm();
      return (
        <Button
          onClick={() => {
            confirm({ title: '确认操作', message: '是否继续？' }).then(confirmSpy);
          }}
        >
          触发
        </Button>
      );
    }
    render(
      <ConfirmProvider>
        <Trigger />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    await waitFor(() => expect(screen.getByText(/确认操作/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith(true));
  });
});
