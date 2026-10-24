/**
 * Stage scaling logic - runs before app.js
 * Scales 1920x1080 stage to fit window while maintaining aspect ratio
 */

function scaleStage() {
    const stage = document.getElementById('stage');
    if (!stage) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const stageWidth = 1920;
    const stageHeight = 1080;

    // Calculate scale to fit window while maintaining 16:9 aspect ratio
    const scaleX = windowWidth / stageWidth;
    const scaleY = windowHeight / stageHeight;
    const scale = Math.min(scaleX, scaleY);

    // Apply scale and center
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Scale on load and resize
window.addEventListener('load', scaleStage);
window.addEventListener('resize', scaleStage);
document.addEventListener('DOMContentLoaded', scaleStage);

// Initial scale
if (document.readyState !== 'loading') {
    scaleStage();
}
