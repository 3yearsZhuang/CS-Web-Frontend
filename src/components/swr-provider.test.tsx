// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SWRProvider } from './swr-provider';

describe('SWRProvider', () => {
  it('正确渲染 children 并注入配置', () => {
    render(
      <SWRProvider fallback={{ '/api/test': { data: 123 } }}>
        <div>SWR Child Content</div>
      </SWRProvider>,
    );
    expect(screen.getByText('SWR Child Content')).toBeInTheDocument();
  });
});
