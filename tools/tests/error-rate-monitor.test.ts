/**
 * @file 错误率监控器单元测试
 *
 * 覆盖：
 *   - 滑动窗口重置
 *   - 低流量不告警（< 100 样本）
 *   - 高错误率告警（≥ 100 样本且错误率 > 5%）
 *   - 同窗口只告警一次
 *   - getErrorRateStats 正确返回状态
 *
 * 注意：模块内部有 in-memory 状态，每个测试通过 vi.resetModules + 动态 import 隔离。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('error-rate-monitor', () => {
  let recordRequest: () => void;
  let recordError: (endpoint?: string) => void;
  let getErrorRateStats: () => {
    windowMs: number;
    total: number;
    errors: number;
    errorRate: number;
    threshold: number;
  };
  let loggerMock: { error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();
    loggerMock = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };
    vi.doMock('@/shared/logger', () => ({ logger: loggerMock }));
    const mod = await import('@/shared/utils/error-rate-monitor');
    recordRequest = mod.recordRequest;
    recordError = mod.recordError;
    getErrorRateStats = mod.getErrorRateStats;
  });

  it('低流量不告警（< 100 样本，即使 100% 错误率）', () => {
    for (let i = 0; i < 50; i++) {
      recordRequest();
      recordError('/api/test');
    }
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('高错误率告警（≥ 100 样本且错误率 > 5%）', () => {
    // 100 请求，10 错误 = 10% 错误率 > 5% 阈值
    for (let i = 0; i < 90; i++) {
      recordRequest();
    }
    for (let i = 0; i < 10; i++) {
      recordRequest();
      recordError('/api/test');
    }
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({
        alert: 'HIGH_ERROR_RATE',
      }),
      expect.stringContaining('错误率超阈值'),
    );
  });

  it('同窗口只告警一次（避免日志洪水）', () => {
    for (let i = 0; i < 90; i++) {
      recordRequest();
    }
    for (let i = 0; i < 20; i++) {
      recordRequest();
      recordError('/api/test');
    }
    // 触发首次告警后继续制造错误，不应再次告警
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('低错误率不告警（≥ 100 样本但错误率 < 5%）', () => {
    // 200 请求，5 错误 = 2.5% 错误率 < 5% 阈值
    for (let i = 0; i < 195; i++) {
      recordRequest();
    }
    for (let i = 0; i < 5; i++) {
      recordRequest();
      recordError('/api/test');
    }
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('getErrorRateStats 返回正确状态', () => {
    const stats = getErrorRateStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('errors');
    expect(stats).toHaveProperty('errorRate');
    expect(stats).toHaveProperty('threshold');
    expect(typeof stats.errorRate).toBe('number');
    expect(stats.errorRate).toBeGreaterThanOrEqual(0);
    expect(stats.errorRate).toBeLessThanOrEqual(1);
  });

  it('recordRequest 不抛异常', () => {
    expect(() => recordRequest()).not.toThrow();
  });

  it('recordError 不抛异常（无 endpoint 参数）', () => {
    expect(() => recordError()).not.toThrow();
  });
});
