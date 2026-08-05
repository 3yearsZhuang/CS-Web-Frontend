// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading, LoadingOverlay, SectionLoading, SkeletonLine, SkeletonCard, SkeletonBlock } from './loading';

/** Loading 系列冒烟测试（GENERAL 3.8） */

describe('Loading', () => {
  it('渲染默认文案', () => {
    render(<Loading />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('渲染自定义 label', () => {
    render(<Loading label="页面加载中" />);
    expect(screen.getByText('页面加载中')).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('enter 阶段显示 label', () => {
    render(<LoadingOverlay phase="enter" label="INIT" />);
    expect(screen.getByText('[ INIT ]')).toBeInTheDocument();
  });

  it('exit 阶段显示 READY', () => {
    render(<LoadingOverlay phase="exit" label="INIT" />);
    expect(screen.getByText('[ READY ]')).toBeInTheDocument();
  });
});

describe('SectionLoading', () => {
  it('渲染 label', () => {
    render(<SectionLoading label="加载列表中" />);
    expect(screen.getByText('加载列表中')).toBeInTheDocument();
  });

  it('无 label 时不渲染文本', () => {
    render(<SectionLoading />);
    expect(screen.queryByText(/加载/)).toBeNull();
  });
});

describe('Skeleton 系列', () => {
  it('SkeletonLine 渲染占位元素', () => {
    const { container } = render(<SkeletonLine />);
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('SkeletonCard 按 lines 渲染骨架行', () => {
    const { container } = render(<SkeletonCard lines={4} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(4);
  });

  it('SkeletonBlock 按 rows 渲染', () => {
    const { container } = render(<SkeletonBlock rows={3} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3);
  });
});
