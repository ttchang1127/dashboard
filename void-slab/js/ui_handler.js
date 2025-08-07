/**
 * Initializes the tab switching functionality for the main navigation.
 */
export function initializeTabs() {
    const tabContainer = document.querySelector('#main-tabs');
    if (!tabContainer) return;

    tabContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.main-tab-button');
        if (!clickedTab) return;

        tabContainer.querySelectorAll('.main-tab-button').forEach(button => button.classList.remove('active'));
        document.querySelectorAll('#tab-content .tab-panel').forEach(panel => panel.classList.add('hidden'));

        clickedTab.classList.add('active');
        const targetPanel = document.querySelector(clickedTab.dataset.tabTarget);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
        }
    });
}

/**
 * Initializes the sub-tab switching functionality within a tab panel.
 */
export function initializeSubTabs() {
    const subTabContainer = document.querySelector('#sub-tabs');
    if (!subTabContainer) return;
    
    subTabContainer.addEventListener('click', (e) => {
        const clickedSubTab = e.target.closest('.sub-tab-button');
        if (!clickedSubTab) return;

        subTabContainer.querySelectorAll('.sub-tab-button').forEach(button => button.classList.remove('active'));
        document.querySelectorAll('#sub-tab-content .sub-tab-panel').forEach(panel => panel.classList.add('hidden'));

        clickedSubTab.classList.add('active');
        const targetPanel = document.querySelector(clickedSubTab.dataset.subtabTarget);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
        }
    });
}

/**
 * NEW: Initializes +/- buttons for number inputs.
 */
export function initializeNumberInputs() {
    const form = document.getElementById('dimensions-form');
    if (!form) return;

    form.addEventListener('click', (e) => {
        const target = e.target;
        const isPlus = target.classList.contains('number-button-plus');
        const isMinus = target.classList.contains('number-button-minus');

        if (isPlus || isMinus) {
            const inputId = target.dataset.target;
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                const step = parseFloat(inputElement.step) || 1;
                let currentValue = parseFloat(inputElement.value) || 0;
                
                if (isPlus) {
                    currentValue += step;
                } else {
                    currentValue -= step;
                }
                
                inputElement.value = currentValue;

                // Manually trigger an 'input' event to notify other listeners (e.g., plot updater)
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });
}
