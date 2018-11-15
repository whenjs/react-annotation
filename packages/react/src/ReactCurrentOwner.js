/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactFiber';
import typeof {Dispatcher} from 'react-reconciler/src/ReactFiberDispatcher';

/**
 * Keeps track of the current owner.
 * 跟踪当前owner
 *
 * The current owner is the component who should own any components that are
 * currently being constructed.
 * 当前owner是拥有正在构建的任何组件的一种组件
 */
const ReactCurrentOwner = {
  /**
   * @internal
   * @type {ReactComponent}
   */
  current: (null: null | Fiber),
  currentDispatcher: (null: null | Dispatcher),
};

export default ReactCurrentOwner;
