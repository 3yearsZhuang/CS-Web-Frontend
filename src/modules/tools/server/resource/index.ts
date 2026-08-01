/**
 * @file 资源服务层统一导出
 */

export {
  RESOURCE_TYPE_LABELS,
  createResource,
  updateResource,
  deleteResource,
  listResources,
  getResourceById,
  getUserResources,
  incrementResourceView,
} from './crud';

export {
  reviewResource,
  listPendingResources,
} from './review';

export {
  saveResourceFile,
  readResourceFile,
} from './upload';

export type {
  ResourceType,
  ResourceStatus,
  Resource,
  ResourceWithAuthor,
  CreateResourceInput,
  UpdateResourceInput,
  ReviewResourceInput,
  ResourceQueryInput,
  ResourceListResult,
} from '../../types';
