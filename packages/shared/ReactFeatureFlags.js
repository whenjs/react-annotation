/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export const enableUserTimingAPI = __DEV__;

export const enableHooks = false;
// Helps identify side effects in begin-phase lifecycle hooks and setState reducers:
// 辅助检测生命周期函数开始阶段和setState合并阶段的副作用：
export const debugRenderPhaseSideEffects = false;

// In some cases, StrictMode should also double-render lifecycles.
// This can be confusing for tests though,
// And it can be bad for performance in production.
// This feature flag can be used to control the behavior:
// 在某些情况下，StrictMode会导致生命周期函数运行两次，这会给测试带来困惑，并且在在生产环境下会带来性能问题；
// 这种行为可以通过这个功能开关控制：
export const debugRenderPhaseSideEffectsForStrictMode = __DEV__;

// To preserve the "Pause on caught exceptions" behavior of the debugger, we
// replay the begin phase of a failed component inside invokeGuardedCallback.
// 通过在失败的组件的invokeGuardedCallback中重新执行开始阶段来保留调试器『异常抛出时应用暂停』的特性。
export const replayFailedUnitOfWorkWithInvokeGuardedCallback = __DEV__;

// Warn about deprecated, async-unsafe lifecycles; relates to RFC #6:
// 对弃用的非安全异步生命周期函数发出警告；请参考RFC #6：
export const warnAboutDeprecatedLifecycles = false;

// Gather advanced timing metrics for Profiler subtrees.
// 收集性能分析子树高级运行时间基准
export const enableProfilerTimer = __PROFILE__;

// Trace which interactions trigger each commit.
// 追踪导致每一次提交的交互
export const enableSchedulerTracing = __PROFILE__;

// Only used in www builds.
// 仅在www编译时使用
export const enableSuspenseServerRenderer = false;

// Only used in www builds.
export function addUserTimingListener() {
  throw new Error('Not implemented.');
}

// React Fire: prevent the value and checked attributes from syncing
// with their related DOM properties
// React Fire: 阻止react值和选中的属性和与它们相关的DOM属性同步
export const disableInputAttributeSyncing = false;

// These APIs will no longer be "unstable" in the upcoming 16.7 release,
// Control this behavior with a flag to support 16.6 minor releases in the meanwhile.
// 该标识用于控制即将发布的16.7中将去掉『unstable』的APIs相关操作以支持16.6小版本的同步发布
export const enableStableConcurrentModeAPIs = false;
