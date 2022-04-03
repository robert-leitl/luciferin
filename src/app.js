import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { Luciferin } from './luciferin';

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const debugParam = urlParams.get('debug');

let DEBUG = debugParam !== null;

if (process.env.NODE_ENV !== 'production') {
    // Only runs in development and will be stripped in production builds.
    DEBUG = true;
}

let sketch;
let resizeTimeoutId;

window.addEventListener('load', () => {
    const canvas = document.body.querySelector('#c');

    let pane;
    if (DEBUG) {
        pane = new Pane({ title: 'Settings' });
        pane.registerPlugin(EssentialsPlugin);
    }

    sketch = new Luciferin(canvas, pane, (sketch) => {
        sketch.run(); 
    });
});

window.addEventListener('resize', () => {
    if (sketch) {
        if (resizeTimeoutId)
            clearTimeout(resizeTimeoutId);

        resizeTimeoutId = setTimeout(() => {
            resizeTimeoutId = null;
            sketch.resize();
        }, 300);
    }
});


