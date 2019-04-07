'use babel';

/* eslint-disable
  import/no-unresolved,
  no-restricted-syntax,
  no-console,
  no-loop-func,
  no-continue
*/
/* eslint-env browser */


import randomColor from 'randomcolor';
import { Harmonizer } from 'color-harmony';

const colorConverter = require('css-color-converter');

const toRGB = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

const eltAlias = elt => `${elt.tagName.toLowerCase()}.${Array.from(elt.classList).join('.')}`;

const nodesToObserve = [...document.querySelectorAll('[is="atom-tabs"]')];

const config = {
  attributes: true,
  childList: true,
  subtree: true,
};

const observed = new Map();

const fader = (initialState) => {
  console.count('fading');
  const state = Object.assign({}, initialState);
  const requestedAt = Date.now();

  requestAnimationFrame(() => {
    const dt = Date.now() - requestedAt;
    state.timeRemaining = Math.max(state.timeRemaining - dt, 0);
    console.count(`timeRemaining: ${state.timeRemaining}`);

    let totalDistance = 0;
    for (const col of ['color', 'backgroundColor']) {
      for (let i = 0; i < 3; i += 1) {
        const delay = initialState.timeRemaining / state.timeRemaining;
        state.current[col][i] += state.steps[col][i] * delay;
        state.current[col][i] = Math.max(state.current[col][i], 0);
        state.current[col][i] = Math.min(state.current[col][i], 255);
        totalDistance += Math.abs(state.current[col][i] - state.targets[col][i]);
      }
    }

    console.count(`distance ${totalDistance}`);
    if (Math.abs(totalDistance) > 0.1 && state.timeRemaining !== 0) {
      try {
        console.count(`current BG [${state.current.backgroundColor.join('/')}] current Color [${state.current.color.join('/')}]`);
        for (const col of ['color', 'backgroundColor']) {
          state.element.style[col] = toRGB(state.current[col]);
        }
        console.count(`set BG on ${eltAlias(state.element)} to ${toRGB(state.current.backgroundColor)}`, state.element, state);
      } catch (e) {
        console.count('Could not set style of', state.element);
      }
      fader(state);
    } else {
      state.targets = state.targetsCopy;
      for (const col of ['color', 'backgroundColor']) {
        state.element.style[col] = toRGB(state.current[col]);
      }
    }
  });
};

const onMutation = (mutationList) => {
  for (const mutation of mutationList) {
    const element = mutation.target;
    const elementStyle = window.getComputedStyle(element);
    if (!observed.has(element)) {
      if (element.classList.contains('active')) {
        const randomBackgroundColor = randomColor({
          luminosity: 'dark',
          format: 'rgb',
        });

        const { harmonize } = new Harmonizer();
        const current = {
          backgroundColor: colorConverter(randomBackgroundColor).toRgbaArray(),
          color: colorConverter(harmonize(randomBackgroundColor, 'complementary')[1]).toRgbaArray(),
        };

        const makeTargets = () => ({
          backgroundColor: colorConverter(elementStyle.backgroundColor).toRgbaArray(),
          color: colorConverter(elementStyle.color).toRgbaArray(),
        });

        const targets = makeTargets();

        const targetsCopy = makeTargets();

        const initialState = {
          current,
          targets,
          targetsCopy,
          element,
          timeRemaining: 10000,
        };

        const steps = {};
        for (const col of ['backgroundColor', 'color']) {
          steps[col] = {};
          for (let i = 0; i < 3; i += 1) {
            steps[col][i] = (targets[col][i] - current[col][i]) / initialState.timeRemaining;
          }
        }

        initialState.steps = steps;

        observed.set(element, initialState);
        fader(initialState);
      }
    }
  }
};

const observers = nodesToObserve.map((parentNode) => {
  const observer = new MutationObserver(onMutation);
  observer.observe(parentNode, config);
  return observer;
});

module.exports = {
  observers,
};
