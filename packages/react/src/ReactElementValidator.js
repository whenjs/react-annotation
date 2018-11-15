/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * ReactElementValidator provides a wrapper around a element factory
 * which validates the props passed to the element. This is intended to be
 * used only in DEV and could be replaced by a static type checker for languages
 * that support it.
 *
 * ReactElementValidator提供了一个验证element工厂函数传入参数的包裹。
 * 这个函数意在用于DEV环境下，并且可以被支持静态检查的语言静态类型检查器替代。
 */

import lowPriorityWarning from 'shared/lowPriorityWarning';
import isValidElementType from 'shared/isValidElementType';
import getComponentName from 'shared/getComponentName';
import {
  getIteratorFn,
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_ELEMENT_TYPE,
} from 'shared/ReactSymbols';
import checkPropTypes from 'prop-types/checkPropTypes';
import warning from 'shared/warning';
import warningWithoutStack from 'shared/warningWithoutStack';

import ReactCurrentOwner from './ReactCurrentOwner';
import {isValidElement, createElement, cloneElement} from './ReactElement';
import ReactDebugCurrentFrame, {
  setCurrentlyValidatingElement,
} from './ReactDebugCurrentFrame';

let propTypesMisspellWarningShown;

if (__DEV__) {
  propTypesMisspellWarningShown = false;
}

function getDeclarationErrorAddendum() {
  if (ReactCurrentOwner.current) {
    const name = getComponentName(ReactCurrentOwner.current.type);
    if (name) {
      return '\n\nCheck the render method of `' + name + '`.';
    }
  }
  return '';
}

function getSourceInfoErrorAddendum(elementProps) {
  if (
    elementProps !== null &&
    elementProps !== undefined &&
    elementProps.__source !== undefined
  ) {
    const source = elementProps.__source;
    const fileName = source.fileName.replace(/^.*[\\\/]/, '');
    const lineNumber = source.lineNumber;
    return '\n\nCheck your code at ' + fileName + ':' + lineNumber + '.';
  }
  return '';
}

/**
 * Warn if there's no key explicitly set on dynamic arrays of children or
 * object keys are not valid. This allows us to keep track of children between
 * updates.
 *
 * 当没有现实设定孩子节点动态数组的key或对象的keys不合法时发出警告；这样我们可以跟踪孩子节点的更新。
 */
const ownerHasKeyUseWarning = {};

function getCurrentComponentErrorInfo(parentType) {
  let info = getDeclarationErrorAddendum();

  if (!info) {
    const parentName =
      typeof parentType === 'string'
        ? parentType
        : parentType.displayName || parentType.name;
    if (parentName) {
      info = `\n\nCheck the top-level render call using <${parentName}>.`;
    }
  }
  return info;
}

/**
 * Warn if the element doesn't have an explicit key assigned to it.
 * This element is in an array. The array could grow and shrink or be
 * reordered. All children that haven't already been validated are required to
 * have a "key" property assigned to it. Error statuses are cached so a warning
 * will only be shown once.
 * 一个元素的key没有显式赋值时发出警告；当前元素是数组，并且数组的大小可以改变；
 * 所有没被验证的孩子节点都必须要有一个key的属性；错误状态会被缓存，所以只会显示一次。
 *
 * @internal
 * @param {ReactElement} element Element that requires a key.
 * @param {*} parentType element's parent's type.
 */
function validateExplicitKey(element, parentType) {
  if (!element._store || element._store.validated || element.key != null) {
    return;
  }
  element._store.validated = true;

  const currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
  if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
    return;
  }
  ownerHasKeyUseWarning[currentComponentErrorInfo] = true;

  // Usually the current owner is the offender, but if it accepts children as a
  // property, it may be the creator of the child that's responsible for
  // assigning it a key.
  // ##openquestion##
  // 通常情况下当前owner会违反上面的规则；但如果当前owner接收孩子节点作为属性，它可能就成了为这些孩子节点key赋值的新的孩子节点的创造者。
  let childOwner = '';
  if (
    element &&
    element._owner &&
    element._owner !== ReactCurrentOwner.current
  ) {
    // Give the component that originally created this child.
    // 基于创建当前孩子节点的原始组件
    childOwner = ` It was passed a child from ${getComponentName(
      element._owner.type,
    )}.`;
  }

  setCurrentlyValidatingElement(element);
  if (__DEV__) {
    warning(
      false,
      'Each child in an array or iterator should have a unique "key" prop.' +
        '%s%s See https://fb.me/react-warning-keys for more information.',
      currentComponentErrorInfo,
      childOwner,
    );
  }
  setCurrentlyValidatingElement(null);
}

/**
 * Ensure that every element either is passed in a static location, in an
 * array with an explicit keys property defined, or in an object literal
 * with valid key property.
 *
 * 保证不管是通过静态位置传入的元素，还是有显式属性key定义的数组，或者一个字面对象，都有一个合法的key属性。
 *
 * @internal
 * @param {ReactNode} node Statically passed child of any type.
 * @param {*} parentType node's parent's type.
 */
function validateChildKeys(node, parentType) {
  if (typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      if (isValidElement(child)) {
        validateExplicitKey(child, parentType);
      }
    }
  } else if (isValidElement(node)) {
    // This element was passed in a valid location.
    if (node._store) {
      node._store.validated = true;
    }
  } else if (node) {
    const iteratorFn = getIteratorFn(node);
    if (typeof iteratorFn === 'function') {
      // Entry iterators used to provide implicit keys,
      // but now we print a separate warning for them later.
      if (iteratorFn !== node.entries) {
        const iterator = iteratorFn.call(node);
        let step;
        while (!(step = iterator.next()).done) {
          if (isValidElement(step.value)) {
            validateExplicitKey(step.value, parentType);
          }
        }
      }
    }
  }
}

/**
 * Given an element, validate that its props follow the propTypes definition,
 * provided by the type.
 *
 *验证指定元素符合type提供的propTypes定义
 *
 * @param {ReactElement} element
 */
function validatePropTypes(element) {
  const type = element.type;
  let name, propTypes;
  if (typeof type === 'function') {
    // Class or function component
    name = type.displayName || type.name;
    propTypes = type.propTypes;
  } else if (
    typeof type === 'object' &&
    type !== null &&
    type.$$typeof === REACT_FORWARD_REF_TYPE
  ) {
    // ForwardRef
    const functionName = type.render.displayName || type.render.name || '';
    name =
      type.displayName ||
      (functionName !== '' ? `ForwardRef(${functionName})` : 'ForwardRef');
    propTypes = type.propTypes;
  } else {
    return;
  }
  if (propTypes) {
    setCurrentlyValidatingElement(element);
    checkPropTypes(
      propTypes,
      element.props,
      'prop',
      name,
      ReactDebugCurrentFrame.getStackAddendum,
    );
    setCurrentlyValidatingElement(null);
  } else if (type.PropTypes !== undefined && !propTypesMisspellWarningShown) {
    propTypesMisspellWarningShown = true;
    warningWithoutStack(
      false,
      'Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?',
      name || 'Unknown',
    );
  }
  if (typeof type.getDefaultProps === 'function') {
    warningWithoutStack(
      type.getDefaultProps.isReactClassApproved,
      'getDefaultProps is only used on classic React.createClass ' +
        'definitions. Use a static property named `defaultProps` instead.',
    );
  }
}

/**
 * Given a fragment, validate that it can only be provided with fragment props
 * 所有提供给fragment的props都是合法的
 * @param {ReactElement} fragment
 */
function validateFragmentProps(fragment) {
  setCurrentlyValidatingElement(fragment);

  const keys = Object.keys(fragment.props);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key !== 'children' && key !== 'key') {
      warning(
        false,
        'Invalid prop `%s` supplied to `React.Fragment`. ' +
          'React.Fragment can only have `key` and `children` props.',
        key,
      );
      break;
    }
  }

  if (fragment.ref !== null) {
    warning(false, 'Invalid attribute `ref` supplied to `React.Fragment`.');
  }

  setCurrentlyValidatingElement(null);
}

export function createElementWithValidation(type, props, children) {
  const validType = isValidElementType(type);

  // We warn in this case but don't throw. We expect the element creation to
  // succeed and there will likely be errors in render.
  // 一个元素创建成功但是渲染时可能会出错，这种情况发出警告，不抛出错误。
  if (!validType) {
    let info = '';
    if (
      type === undefined ||
      (typeof type === 'object' &&
        type !== null &&
        Object.keys(type).length === 0)
    ) {
      info +=
        ' You likely forgot to export your component from the file ' +
        "it's defined in, or you might have mixed up default and named imports.";
    }

    const sourceInfo = getSourceInfoErrorAddendum(props);
    if (sourceInfo) {
      info += sourceInfo;
    } else {
      info += getDeclarationErrorAddendum();
    }

    let typeString;
    if (type === null) {
      typeString = 'null';
    } else if (Array.isArray(type)) {
      typeString = 'array';
    } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
      typeString = `<${getComponentName(type.type) || 'Unknown'} />`;
      info =
        ' Did you accidentally export a JSX literal instead of a component?';
    } else {
      typeString = typeof type;
    }

    warning(
      false,
      'React.createElement: type is invalid -- expected a string (for ' +
        'built-in components) or a class/function (for composite ' +
        'components) but got: %s.%s',
      typeString,
      info,
    );
  }

  const element = createElement.apply(this, arguments);

  // The result can be nullish if a mock or a custom function is used.
  // TODO: Drop this when these are no longer allowed as the type argument.
  // 当是mock数据或自定以函数是，该结果可能为空；
  // TODO：当mock数据和自定义函数不允许作为type参数传入时，该判断弃用。
  if (element == null) {
    return element;
  }

  // Skip key warning if the type isn't valid since our key validation logic
  // doesn't expect a non-string/function type and can throw confusing errors.
  // We don't want exception behavior to differ between dev and prod.
  // (Rendering will throw with a helpful message and as soon as the type is
  // fixed, the key warnings will appear.)
  // 要保持开发和生产环境异常行为信息提示一致，当type类型不合法时，与key相关的警告会被忽略，因为在key的验证逻辑中，传入非字符串或函数的类型会抛出令人迷惑的错误信息。
  // （这样渲染过程中始终能给出有效的提示，当type类型的错误修复后，key相关的警告自然就会现实）
  if (validType) {
    for (let i = 2; i < arguments.length; i++) {
      validateChildKeys(arguments[i], type);
    }
  }

  if (type === REACT_FRAGMENT_TYPE) {
    validateFragmentProps(element);
  } else {
    validatePropTypes(element);
  }

  return element;
}

export function createFactoryWithValidation(type) {
  const validatedFactory = createElementWithValidation.bind(null, type);
  validatedFactory.type = type;
  // Legacy hook: remove it
  if (__DEV__) {
    Object.defineProperty(validatedFactory, 'type', {
      enumerable: false,
      get: function() {
        lowPriorityWarning(
          false,
          'Factory.type is deprecated. Access the class directly ' +
            'before passing it to createFactory.',
        );
        Object.defineProperty(this, 'type', {
          value: type,
        });
        return type;
      },
    });
  }

  return validatedFactory;
}

export function cloneElementWithValidation(element, props, children) {
  const newElement = cloneElement.apply(this, arguments);
  for (let i = 2; i < arguments.length; i++) {
    validateChildKeys(arguments[i], newElement.type);
  }
  validatePropTypes(newElement);
  return newElement;
}
