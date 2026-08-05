/**
 * @file 用户列表子视图 — 从 admin-users-panel 拆出（GENERAL 2.4 按关注点拆分）
 * 工具栏（搜索/角色/状态筛选）+ 用户表格/卡片 + 分页
 */
'use client';

import { RevealItem } from '@/components/effects/motion-primitives';
import { Avatar } from '@/components/avatar';
import { SectionLoading } from '@/components';
import type { SafeUser } from '@/modules/admin/ui/types';
import { formatDate } from '@/shared/utils/utils';
import { roleLabel } from './users-panel-utils';
import type { ActiveFilter, RoleFilter } from './users-panel-utils';

interface UserListViewProps {
  users: SafeUser[];
  total: number;
  page: number;
  totalPages: number;
  searchInput: string;
  setSearchInput: (v: string) => void;
  roleFilter: RoleFilter;
  setRoleFilter: (v: RoleFilter) => void;
  activeFilter: ActiveFilter;
  setActiveFilter: (v: ActiveFilter) => void;
  listLoading: boolean;
  listError: string | null;
  isSelf: (u: SafeUser) => boolean;
  isRootTarget: (u: SafeUser) => boolean;
  isRootAdmin: boolean;
  isForbiddenForAdmin: (u: SafeUser) => boolean;
  onFetch: (opts?: { page?: number }) => void;
  onEdit: (u: SafeUser) => void;
  onReset: (u: SafeUser) => void;
  onResetDefault: (u: SafeUser) => void;
  onDelete: (u: SafeUser) => void;
  onDisable: (u: SafeUser) => void;
}

/** 用户列表子视图 */
export function UserListView({
  users,
  total,
  page,
  totalPages,
  searchInput,
  setSearchInput,
  roleFilter,
  setRoleFilter,
  activeFilter,
  setActiveFilter,
  listLoading,
  listError,
  isSelf,
  isRootTarget,
  isRootAdmin,
  isForbiddenForAdmin,
  onFetch,
  onEdit,
  onReset,
  onResetDefault,
  onDelete,
  onDisable,
}: UserListViewProps) {
  return (
    <>
      {/* 工具栏 */}
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-5">
              <label htmlFor="admin-search" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                [ 搜索 / Search ]
              </label>
              <input
                id="admin-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[13px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors"
                placeholder="搜索 email 或显示名..."
              />
            </div>

            <div className="col-span-6 md:col-span-3">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 角色 / Role ]</div>
              <div className="flex gap-1.5">
                {(['all', 'admin', 'user'] as RoleFilter[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                      roleFilter === r
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {r === 'all' ? '全部' : r === 'admin' ? '管理员' : '用户'}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-6 md:col-span-3">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 状态 / Status ]</div>
              <div className="flex gap-1.5">
                {(
                  [
                    { v: 'all', label: '全部' },
                    { v: 'active', label: '启用' },
                    { v: 'inactive', label: '禁用' },
                  ] as { v: ActiveFilter; label: string }[]
                ).map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setActiveFilter(s.v)}
                    className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                      activeFilter === s.v
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-1 flex md:justify-end">
              <button
                type="button"
                onClick={() => onFetch()}
                disabled={listLoading}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {listLoading ? 'Loading' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </RevealItem>

      {/* 列表区 */}
      <RevealItem>
        {listError && (
          <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
            [ Error ] {listError}
            <button type="button" onClick={() => onFetch()} className="focus-amber ml-3 underline hover:opacity-80">
              重试
            </button>
          </div>
        )}

        {listLoading && users.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label="加载用户中 / Loading..." />
          </div>
        )}

        {!listLoading && !listError && users.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无记录 / No Record ]</div>
            <p className="text-[14px] text-[var(--muted-foreground)]">没有符合条件的用户。</p>
          </div>
        )}

        {/* 桌面表格（md+） */}
        {!listError && users.length > 0 && (
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left meta-mono py-3 pr-4 w-[34%]">用户 / User</th>
                  <th className="text-left meta-mono py-3 pr-4">角色 / Role</th>
                  <th className="text-left meta-mono py-3 pr-4">状态 / Status</th>
                  <th className="text-left meta-mono py-3 pr-4">创建 / Created</th>
                  <th className="text-right meta-mono py-3 pl-4">操作 / Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = isSelf(u);
                  return (
                    <tr key={u.id} className="border-b border-[var(--border)] card-minimal align-middle">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar email={u.email} displayName={u.displayName} avatarUrl={u.avatarUrl} avatarType={u.avatarType} size={36} />
                          <div className="min-w-0">
                            <div className="text-[14px] text-[var(--foreground)] truncate font-mono">
                              {u.displayName || <span className="text-[var(--muted-foreground)]">未命名</span>}
                            </div>
                            <div className="meta-mono mt-0.5 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`meta-mono ${u.role === 'admin' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
                          {u.role === 'admin' ? '● Admin' : '○ User'}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`meta-mono ${u.isActive ? 'text-[var(--foreground)]' : 'text-[var(--destructive)]'}`}>
                          {u.isActive ? '● Active' : '● Disabled'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 meta-mono">{formatDate(u.createdAt)}</td>
                      <td className="py-4 pl-4">
                        <div className="flex items-center justify-end gap-3">
                          {isRootTarget(u) ? (
                            <span className="meta-mono text-[var(--muted-foreground)]">— 不可操作 —</span>
                          ) : isRootAdmin ? (
                            <>
                              <button type="button" disabled={self} onClick={() => onEdit(u)} className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline" title={self ? '不能编辑自己' : '编辑（仅超级管理员）'}>
                                编辑
                              </button>
                              <button type="button" onClick={() => onReset(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow" title="自定义重置密码（仅超级管理员）">
                                重置密码
                              </button>
                              <button type="button" disabled={self} onClick={() => onDelete(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline" title={self ? '不能删除自己' : '硬删除（仅超级管理员）'}>
                                删除
                              </button>
                              <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`} title={self ? '不能禁用自己' : u.isActive ? '禁用' : '启用'}>
                                {u.isActive ? '禁用' : '启用'}
                              </button>
                            </>
                          ) : isForbiddenForAdmin(u) ? (
                            <span className="meta-mono text-[var(--muted-foreground)]">— 不可操作 —</span>
                          ) : (
                            <>
                              <button type="button" onClick={() => onResetDefault(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow" title="重置为默认密码 FZTBU_CS">
                                重置密码
                              </button>
                              <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`} title={self ? '不能禁用自己' : u.isActive ? '禁用' : '启用'}>
                                {u.isActive ? '禁用' : '启用'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 移动端卡片列表（< md） */}
        {!listError && users.length > 0 && (
          <div className="md:hidden divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {users.map((u) => {
              const self = isSelf(u);
              return (
                <div key={u.id} className="p-4 card-minimal">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar email={u.email} displayName={u.displayName} avatarUrl={u.avatarUrl} avatarType={u.avatarType} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] text-[var(--foreground)] truncate font-mono">
                        {u.displayName || <span className="text-[var(--muted-foreground)]">未命名</span>}
                      </div>
                      <div className="meta-mono mt-0.5 truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <div className="meta-mono text-[var(--muted-foreground)]">角色 / Role</div>
                      <div className={`meta-mono mt-1 ${u.role === 'admin' ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>{roleLabel(u.role)}</div>
                    </div>
                    <div>
                      <div className="meta-mono text-[var(--muted-foreground)]">状态 / Status</div>
                      <div className={`meta-mono mt-1 ${u.isActive ? 'text-[var(--foreground)]' : 'text-[var(--destructive)]'}`}>{u.isActive ? '启用' : '禁用'}</div>
                    </div>
                    <div>
                      <div className="meta-mono text-[var(--muted-foreground)]">创建 / Created</div>
                      <div className="meta-mono mt-1 text-[var(--foreground)]">{formatDate(u.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {isRootTarget(u) ? (
                      <span className="meta-mono text-[var(--muted-foreground)] ml-auto">— 不可操作 —</span>
                    ) : isRootAdmin ? (
                      <>
                        <button type="button" disabled={self} onClick={() => onEdit(u)} className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline">编辑</button>
                        <button type="button" onClick={() => onReset(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow">重置密码</button>
                        <button type="button" disabled={self} onClick={() => onDelete(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline">删除</button>
                        <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ml-auto ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`}>{u.isActive ? '禁用' : '启用'}</button>
                      </>
                    ) : isForbiddenForAdmin(u) ? (
                      <span className="meta-mono text-[var(--muted-foreground)] ml-auto">— 不可操作 —</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => onResetDefault(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow">重置密码</button>
                        <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ml-auto ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`}>{u.isActive ? '禁用' : '启用'}</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {!listError && users.length > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-5">
            <div className="meta-mono text-[var(--muted-foreground)]">
              共 {total} 条 · 第 {page} / {Math.max(1, totalPages)} 页
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1 || listLoading}
                onClick={() => onFetch({ page: page - 1 })}
                className="focus-amber meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← 上一页
              </button>
              <button
                type="button"
                disabled={page >= totalPages || listLoading}
                onClick={() => onFetch({ page: page + 1 })}
                className="focus-amber meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                下一页 →
              </button>
            </div>
          </div>
        )}
      </RevealItem>
    </>
  );
}
