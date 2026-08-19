/**
 * @file 演示模式 mock 数据入口
 *
 * 各模块文件在 import 时通过 registerDemoMock 注册 mock 路由；
 * 本入口被 backend-client 副作用导入，保证演示模式下路由表已就绪。
 */
import './auth';
import './announcements';
import './events';
import './community';
import './join';
