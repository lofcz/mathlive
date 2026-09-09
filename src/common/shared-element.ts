import { getStylesheetScope } from './stylesheet';

/**
 * Parent for shared overlay panels (popovers, keystroke caption). With a
 * stylesheet scope set, the panels must live inside a scope root or the
 * scoped rules never reach them.
 */
function sharedElementParent(): HTMLElement {
  const scope = getStylesheetScope();
  if (scope) {
    const root = document.querySelector<HTMLElement>(scope);
    if (root) return root;
  }
  return document.body;
}

export function getSharedElement(id: string): HTMLElement {
  let result = document.getElementById(id);
  if (result) {
    result.dataset.refcount = Number(
      Number.parseInt(result.dataset.refcount ?? '0') + 1
    ).toString();
  } else {
    result = document.createElement('div');
    result.setAttribute('aria-hidden', 'true');
    result.dataset.refcount = '1';
    result.id = id;
    sharedElementParent().append(result);
  }

  return result;
}

export function releaseSharedElement(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  const refcount = Number.parseInt(
    element.getAttribute('data-refcount') ?? '0'
  );
  if (refcount <= 1) element.remove();
  else element.dataset.refcount = Number(refcount - 1).toString();
}
