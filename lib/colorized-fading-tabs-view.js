
'use babel';

/* eslint-env browser */

export default class ColorizedFadingTabsView {
  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }
}
