'use babel';

import randomColor from 'randomcolor';
import complementary from 'postcss-complementary';
import hexRgb from 'hex-rgb';

const toRGB = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

/* eslint-disable import/no-unresolved, no-restricted-syntax, no-console, no-loop-func */
/* eslint-env browser */

const nodesToObserve = [...document.querySelectorAll('[is="atom-tabs"]')];

const config = {
  attributes: true,
  childList: true,
  subtree: true,
};

const observed = new Map();
const mutating = new Set();

const rgbaToArray = color => /.*?([0-9]+)/g.exec(color).slice(1, 4);

const onMutation = (mutationList) => {
  for (const mutation of mutationList) {
    const elt = mutation.target;
    if (mutating.has(elt)) {
      break;
    }
    mutating.add(elt);
    const eltStyle = window.getComputedStyle(elt);

    if (!observed.has(elt)) {
      const backgroundColor = randomColor({
        luminosity: 'dark',
        format: 'rgb',
      });

      const color = hexRgb(
        complementary(backgroundColor),
        { format: 'array' },
      );

      const targets = {
        backgroundColor: rgbaToArray(backgroundColor),
        color,
      };

      const initialSettings = {
        mana: 1,
        base: {
          backgroundColor: eltStyle.backgroundColor,
          color: eltStyle.color,
        },
        defaults: {
          backgroundColor,
          color,
        },
        current: Object.assign({}, targets),
        targets,
      };

      requestAnimationFrame(() => {
        elt.style.backgroundColor = backgroundColor;
        elt.style.color = toRGB(color);
      });

      observed.set(elt, initialSettings);
    }

    const data = observed.get(elt);

    const fader = () => {
      const requestedAt = Date.now();
      requestAnimationFrame(() => {
        const { mana } = data;
        const timeRemaining = mana * 1000;
        const approxFrameRate = Date.now() - requestedAt;
        const nbFramesRemaining = timeRemaining / approxFrameRate;

        const fade = (color, target) => {
          const newColor = color.slice(0);
          let distance = 0;
          for (let i = 0; i < 3; i += 1) {
            const step = (color[i] - target[i]) / nbFramesRemaining;
            distance += Math.abs(step);
            newColor[i] += step;
            newColor[i] = Math.max(newColor[i], 0);
            newColor[i] = Math.min(newColor[i], 255);
          }
          return { newColor, distance };
        };

        let totalDistance = 0;
        for (const col of ['color', 'backgroundColor']) {
          const { newColor, distance } = fade(
            data.current[col],
            data.target[col],
          ).newColor;
          data.current[col] = newColor;
          elt[col] = toRGB(newColor);
          totalDistance += distance;
        }

        data.totalDistance = totalDistance;

        if (Math.abs(totalDistance) > 0.1) {
          fader();
        }
      });
    };

    console.log(data);
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
