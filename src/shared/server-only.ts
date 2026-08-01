/**
 * @file server-only 标记模块（本地空实现）
 *
 * 官方 server-only 包依赖打包器 react-server 条件导出，本项目自定义 tsx dev-server 无法解析，故用本地空实现；
 * Next.js 生产构建中 import 语句作为文档标记存在，实际边界由模块目录结构（server/ vs ui/ vs types/）强制约束。
 */
export {};
