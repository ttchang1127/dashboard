// js/main.js (最終修正版)
import { initializeUI, updateUI, updateDefaultsBySpan, syncTendonCounts, updateTendonProperties } from './ui_handler.js';

document.addEventListener('DOMContentLoaded', () => {

    function getCanvasContext(id) {
        const canvas = document.getElementById(id);
        if (!canvas) {
            console.error(`HTML 檔案錯誤：在 index.html 中找不到 ID 為 "${id}" 的 <canvas> 元素。`);
            return null;
        }
        return canvas.getContext('2d');
    }

    const domElements = {
        views: {
            section: document.getElementById('section-view'),
            tendon: document.getElementById('tendon-view'),
            table: document.getElementById('size-table-view'),
            lossCalc: document.getElementById('loss-calc-view'),
            stressCheck: document.getElementById('stress-check-view'),
            flexureCheck: document.getElementById('flexure-check-view'),
            deflectionCheck: document.getElementById('deflection-check-view'),
            shearCheck: document.getElementById('shear-check-view'),
        },
        inputs: {
            'bridge-span': document.getElementById('bridge-span'),
            'ght': document.getElementById('ght'), 'gwb': document.getElementById('gwb'),
            'tft': document.getElementById('tft'), 'h1': document.getElementById('h1'),
            'gtf': document.getElementById('gtf'), 'bft': document.getElementById('bft'),
            'h3': document.getElementById('h3'), 'f2': document.getElementById('f2'),
            'tendon-type': document.getElementById('tendon-type'),
            'tendon-mid-count': document.getElementById('tendon-mid-count'),
            'tendon-end-count': document.getElementById('tendon-end-count'),
            'tendon-initial-force': document.getElementById('tendon-initial-force'),
            'friction-mu': document.getElementById('friction-mu'),
            'friction-k': document.getElementById('friction-k'),
            'anchorage-slip': document.getElementById('anchorage-slip'),
            'mat-fci': document.getElementById('mat-fci'), 'mat-fc': document.getElementById('mat-fc'),
            'mat-gamma-c': document.getElementById('mat-gamma-c'),
            'creep-phi': document.getElementById('creep-phi'),
            'shrinkage-eps': document.getElementById('shrinkage-eps'),
            'relaxation-rate': document.getElementById('relaxation-rate'),
            'moment-sd': document.getElementById('moment-sd'), 'moment-ll': document.getElementById('moment-ll'),
            'shear-vu': document.getElementById('shear-vu'), 'shear-fyt': document.getElementById('shear-fyt'),
            'shear-bar-size': document.getElementById('shear-bar-size'),
            'shear-legs': document.getElementById('shear-legs'), 'shear-spacing': document.getElementById('shear-spacing'),
        },
        outputs: {
            'tendon-area-display': document.getElementById('tendon-area-display'),
            'recommended-force-summary': document.getElementById('recommended-force-summary'),
            'tendon-force-calculation-details': document.getElementById('tendon-force-calculation-details'),
            'recommended-msd': document.getElementById('recommended-msd'),
            'recommended-mll': document.getElementById('recommended-mll'),
        },
        tables: {
            'tendon-coord-table-body': document.getElementById('tendon-coord-table-body'),
            'immediate-loss-table-body': document.getElementById('immediate-loss-table-body'),
            'longterm-loss-table-body': document.getElementById('longterm-loss-table-body'),
            'total-loss-table-body': document.getElementById('total-loss-table-body'),
            'stress-check-results-table-body': document.getElementById('stress-check-results-table-body'),
        },
        containers: {
            'tendon-coord-container': document.getElementById('tendon-coord-container'),
            'main-content-wrapper': document.getElementById('main-content-wrapper'),
            'stress-check-results-container': document.getElementById('stress-check-results-container'),
            'flexure-check-results-container': document.getElementById('flexure-check-results-container'),
            'deflection-check-results-container': document.getElementById('deflection-check-results-container'),
            'shear-check-results-container': document.getElementById('shear-check-results-container'),
        },
        buttons: {
            mainTabs: document.querySelectorAll('.main-tab-button'),
            sectionSubTabs: document.querySelectorAll('#section-view .sub-tab-button'),
            tendonSubTabs: document.querySelectorAll('#tendon-view .sub-tab-button'),
            numberButtons: document.querySelectorAll('.number-button'),
        },
        canvases: {
            section: {
                mid: { ctx: getCanvasContext('midSpanCanvas'), parent: document.getElementById('mid-canvas-wrapper') },
                end: { ctx: getCanvasContext('endSpanCanvas'), parent: document.getElementById('end-canvas-wrapper') }
            },
            tendon: {
                mid: { ctx: getCanvasContext('tendonMidSpanCanvas'), parent: document.getElementById('tendon-content-mid') },
                end: { ctx: getCanvasContext('tendonEndSpanCanvas'), parent: document.getElementById('tendon-content-end') },
                side: { ctx: getCanvasContext('tendonSideViewCanvas'), parent: document.getElementById('tendon-content-side') }
            },
        },
        subTabContents: {
             section: {
                'sub-tab-mid': document.getElementById('mid-canvas-wrapper'),
                'sub-tab-end': document.getElementById('end-canvas-wrapper')
            },
            tendon: {
                'tendon-tab-mid': document.getElementById('tendon-content-mid'),
                'tendon-tab-end': document.getElementById('tendon-content-end'),
                'tendon-tab-side': document.getElementById('tendon-content-side')
            }
        }
    };

    domElements.canvases.views = {
        sectionView: domElements.views.section,
        tendonView: domElements.views.tendon
    };

    const staticData = {
        spanDefaults: {
            '25': { ght: 1500, gwb: 200, h1: 120, tft: 150, gtf: 1000, bft: 200, h3: 120, f2: 150, tendons: 3, vu: 800 },
            '30': { ght: 1700, gwb: 200, h1: 150, tft: 150, gtf: 1000, bft: 240, h3: 210, f2: 175, tendons: 4, vu: 1000 },
            '35': { ght: 2000, gwb: 200, h1: 150, tft: 150, gtf: 1100, bft: 240, h3: 210, f2: 235, tendons: 5, vu: 1200 },
            '40': { ght: 2000, gwb: 200, h1: 150, tft: 150, gtf: 1200, bft: 250, h3: 350, f2: 250, tendons: 6, vu: 1500 },
            '45': { ght: 2200, gwb: 200, h1: 150, tft: 200, gtf: 1400, bft: 350, h3: 250, f2: 250, tendons: 7, vu: 1800 }
        },
        momentDefaults: {
            '25': { msd: 300, mll: 1000 }, '30': { msd: 400, mll: 1300 }, '35': { msd: 500, mll: 1500 },
            '40': { msd: 650, mll: 1800 }, '45': { msd: 800, mll: 2200 }
        },
        tendonData: {
            '12S12.7A': { force: 1429, area: 1184.4, fpu: 1720, fpy: 1460, Es: 195000 },
            '12S12.7B': { force: 1547, area: 1184.4, fpu: 1850, fpy: 1580, Es: 195000 },
            '12S15.2': { force: 2164, area: 1664.4, fpu: 1850, fpy: 1580, Es: 195000 }
        },
        tendonLayouts: {
            mid: { '3': [{ id: 1, x: 0, y: 120 }, { id: 2, x: -120, y: 120 }, { id: 3, x: 120, y: 120 }], '4': [{ id: 1, x: 0, y: 240 }, { id: 2, x: 0, y: 120 }, { id: 3, x: -120, y: 120 }, { id: 4, x: 120, y: 120 }], '5': [{ id: 1, x: 0, y: 360 }, { id: 2, x: 0, y: 240 }, { id: 3, x: 0, y: 120 }, { id: 4, x: -120, y: 120 }, { id: 5, x: 120, y: 120 }], '6': [{ id: 1, x: 0, y: 240 }, { id: 2, x: 0, y: 120 }, { id: 3, x: -120, y: 240 }, { id: 4, x: 120, y: 240 }, { id: 5, x: -120, y: 120 }, { id: 6, x: 120, y: 120 }], '7': [{ id: 1, x: 0, y: 360 }, { id: 2, x: 0, y: 240 }, { id: 3, x: 0, y: 120 }, { id: 4, x: -120, y: 240 }, { id: 5, x: 120, y: 240 }, { id: 6, x: -120, y: 120 }, { id: 7, x: 120, y: 120 }] },
            end: { '3': [{ id: 1, x: 0, y: 1050 }, { id: 2, x: 0, y: 750 }, { id: 3, x: 0, y: 450 }], '4': [{ id: 1, x: 0, y: 1300 }, { id: 2, x: 0, y: 1000 }, { id: 3, x: 0, y: 700 }, { id: 4, x: 0, y: 400 }], '5': [{ id: 1, x: 0, y: 1600 }, { id: 2, x: 0, y: 1300 }, { id: 3, x: 0, y: 1000 }, { id: 4, x: 0, y: 700 }, { id: 5, x: 0, y: 400 }], '6': [{ id: 1, x: 0, y: 1850 }, { id: 2, x: 0, y: 1550 }, { id: 3, x: 0, y: 1250 }, { id: 4, x: 0, y: 950 }, { id: 5, x: 0, y: 650 }, { id: 6, x: 0, y: 350 }], '7': [{ id: 1, x: 0, y: 2000 }, { id: 2, x: 0, y: 1700 }, { id: 3, x: 0, y: 1400 }, { id: 4, x: 0, y: 1100 }, { id: 5, x: 0, y: 800 }, { id: 6, x: 0, y: 500 }, { id: 7, x: 0, y: 200 }] }
        }
    };
    
    initializeUI(domElements, staticData);

    Object.values(domElements.inputs).forEach(input => {
        if (input) input.addEventListener('input', () => requestAnimationFrame(updateUI));
    });
    
    domElements.buttons.numberButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const inputId = e.currentTarget.dataset.input;
            const action = e.currentTarget.dataset.action;
            const input = domElements.inputs[inputId];
            if (!input) return;
            let currentValue = parseFloat(input.value) || 0;
            const stepValue = parseFloat(input.step) || 1;
            const step = e.shiftKey ? 10 * stepValue : stepValue; 
            if (action === 'increment') currentValue += step;
            else if (action === 'decrement') currentValue = Math.max(0, currentValue - step);
            const stepString = input.step || "1";
            const precision = stepString.includes('.') ? stepString.split('.')[1].length : 0;
            input.value = currentValue.toFixed(precision);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
    
    domElements.buttons.mainTabs.forEach(button => {
        button.addEventListener('click', () => {
            domElements.buttons.mainTabs.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            Object.values(domElements.views).forEach(view => view.classList.add('hidden'));
            
            const viewId = button.id.replace('main-tab-', '').replace(/-/g, '');
            const viewKey = Object.keys(domElements.views).find(k => k.toLowerCase() === viewId);
            
            if (viewKey && domElements.views[viewKey]) {
                domElements.views[viewKey].classList.remove('hidden');
            }
            requestAnimationFrame(updateUI);
        });
    });

    [domElements.buttons.sectionSubTabs, domElements.buttons.tendonSubTabs].forEach(buttons => {
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const parentView = e.currentTarget.closest('#section-view, #tendon-view');
                const subTabs = parentView.querySelectorAll('.sub-tab-button');
                const contentWrappers = parentView.id === 'section-view' ? domElements.subTabContents.section : domElements.subTabContents.tendon;
                subTabs.forEach(btn => btn.classList.remove('active'));
                Object.values(contentWrappers).forEach(content => {
                    content.classList.add('hidden');
                    content.classList.remove('flex');
                });
                button.classList.add('active');
                const activeContent = contentWrappers[button.id];
                if (activeContent) {
                    activeContent.classList.remove('hidden');
                    if (parentView.id === 'tendon-view') activeContent.classList.add('flex');
                }
                requestAnimationFrame(updateUI);
            });
        });
    });

    domElements.inputs['bridge-span'].addEventListener('change', () => {
        updateDefaultsBySpan();
        requestAnimationFrame(updateUI);
    });
    domElements.inputs['tendon-mid-count'].addEventListener('change', () => {
        syncTendonCounts();
        requestAnimationFrame(updateUI);
    });
    domElements.inputs['tendon-type'].addEventListener('change', () => {
        updateTendonProperties();
        requestAnimationFrame(updateUI);
    });
    
    new ResizeObserver(() => requestAnimationFrame(updateUI)).observe(domElements.containers['main-content-wrapper']);
    
    requestAnimationFrame(updateUI);
});
