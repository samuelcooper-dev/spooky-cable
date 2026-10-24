const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    console.log('📺 Starting Spooky Cable Feature Screenshots\n');

    await page.goto('http://127.0.0.1:8000/tv/');
    await page.waitForTimeout(1500);

    // 1. Power screen (before turning on)
    await page.screenshot({ path: 'shots/feature-01-power-screen.png', fullPage: false });
    console.log('✓ 01: Power screen (TV off)');

    // Turn on TV
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.click('body');
    await page.waitForTimeout(3000);

    // 2. Live TV - Regular view (Channel 2)
    await page.screenshot({ path: 'shots/feature-02-live-tv.png', fullPage: false });
    console.log('✓ 02: Live TV - Regular view');

    // 3. Info banner
    await page.keyboard.press('i');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shots/feature-03-info-banner.png', fullPage: false });
    console.log('✓ 03: Info banner with program info');
    await page.waitForTimeout(4000); // Let banner fade

    // 4. Volume indicator
    await page.keyboard.press('+');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'shots/feature-04-volume.png', fullPage: false });
    console.log('✓ 04: Volume indicator');
    await page.waitForTimeout(2000);

    // 5. Guide Channel (Channel 1 - fullscreen guide)
    await page.evaluate((app) => app.tuneToChannel(1), await page.evaluateHandle(() => window.spookyCable));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'shots/feature-05-guide-channel.png', fullPage: false });
    console.log('✓ 05: Guide Channel (Channel 1)');

    // Go back to a content channel for next tests
    await page.evaluate((app) => app.tuneToChannel(3), await page.evaluateHandle(() => window.spookyCable));
    await page.waitForTimeout(2000);

    // 6. PiP Guide (Picture-in-picture guide)
    await page.keyboard.press('g');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'shots/feature-06-pip-guide.png', fullPage: false });
    console.log('✓ 06: PiP Guide (video in corner)');

    // 7. Interactive Guide (with cursor navigation)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shots/feature-07-interactive-guide.png', fullPage: false });
    console.log('✓ 07: Interactive Guide (cursor navigation)');

    // 8. Interactive guide - different channel selected
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shots/feature-08-interactive-guide-nav.png', fullPage: false });
    console.log('✓ 08: Interactive Guide (navigated)');

    // Exit guide
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 9. Fullscreen mode
    await page.keyboard.press('f');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'shots/feature-09-fullscreen.png', fullPage: false });
    console.log('✓ 09: Fullscreen mode');

    // Exit fullscreen
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 10. Retro mode (with scanlines)
    await page.keyboard.press('r');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'shots/feature-10-retro-mode.png', fullPage: false });
    console.log('✓ 10: Retro mode (scanlines enabled)');

    // Toggle retro off for cleaner on-demand screenshots
    await page.keyboard.press('r');
    await page.waitForTimeout(500);

    // 11. On-Demand Library
    await page.keyboard.press('d');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'shots/feature-11-ondemand-library.png', fullPage: false });
    console.log('✓ 11: On-Demand Library');

    // 12. On-Demand - Navigate to programs
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shots/feature-12-ondemand-programs.png', fullPage: false });
    console.log('✓ 12: On-Demand - Program selection');

    // 13. On-Demand Player (if media available)
    try {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'shots/feature-13-ondemand-player.png', fullPage: false });
        console.log('✓ 13: On-Demand Player (playing)');

        // Show player controls
        await page.mouse.move(960, 900);
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'shots/feature-14-ondemand-controls.png', fullPage: false });
        console.log('✓ 14: On-Demand Player (controls visible)');

        // Exit player
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    } catch (e) {
        console.log('⚠ 13-14: Skipped (no media available)');
    }

    // Exit on-demand
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 15. Channel switching demonstration
    await page.evaluate((app) => app.tuneToChannel(5), await page.evaluateHandle(() => window.spookyCable));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'shots/feature-15-channel-5.png', fullPage: false });
    console.log('✓ 15: Channel 5');

    // 16. Channel switching in PiP mode
    await page.keyboard.press('g');
    await page.waitForTimeout(1500);
    await page.keyboard.press('7');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'shots/feature-16-pip-channel-switch.png', fullPage: false });
    console.log('✓ 16: PiP mode - Channel switching');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 17. Different channel for variety
    await page.evaluate((app) => app.tuneToChannel(8), await page.evaluateHandle(() => window.spookyCable));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'shots/feature-17-channel-8.png', fullPage: false });
    console.log('✓ 17: Channel 8');

    console.log('\n✅ All feature screenshots captured!');
    console.log('📁 Screenshots saved to tv/shots/');
    console.log('\nScreenshots captured:');
    console.log('  - Power screen & live TV');
    console.log('  - Info banner & volume');
    console.log('  - Guide channel (fullscreen)');
    console.log('  - PiP guide & interactive guide');
    console.log('  - Fullscreen & retro modes');
    console.log('  - On-demand library & player');
    console.log('  - Channel switching demos');

    await page.waitForTimeout(1000);
    await browser.close();
})();
