const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 300 });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    console.log('\n🎃 REGRESSION TEST\n');

    await page.goto('http://127.0.0.1:8000/tv/');
    await page.waitForTimeout(1500);
    await page.keyboard.press('Enter'); // Power on
    await page.waitForTimeout(2000);
    await page.click('body'); // Allow autoplay
    await page.waitForTimeout(2000);

    const app = await page.evaluateHandle(() => window.spookyCable);

    // TEST 1: Live TV - Channel 2 (file with '#' in name)
    console.log('TEST 1: Live TV - Channel 2 (file with # in name)');
    await page.evaluate((app) => app.tuneToChannel(2), app);
    await page.waitForTimeout(3000);

    const ch2 = await page.evaluate(() => {
        const v = document.getElementById('mainVideo');
        return {
            channel: spookyCable.currentChannel,
            time1: v.currentTime,
            playing: !v.paused,
            error: v.error !== null
        };
    });
    await page.waitForTimeout(2000);

    const ch2_time2 = await page.evaluate(() => document.getElementById('mainVideo').currentTime);
    console.log(`  Channel: ${ch2.channel}, Time: ${ch2.time1.toFixed(1)}s → ${ch2_time2.toFixed(1)}s`);
    console.log(`  ${ch2.playing ? '✓' : '✗'} Video playing`);
    console.log(`  ${!ch2.error ? '✓' : '✗'} No video error`);
    console.log(`  ${ch2_time2 > ch2.time1 ? '✓' : '✗'} Time advancing (${(ch2_time2 - ch2.time1).toFixed(1)}s)`);

    // TEST 2: Live TV - Channel 3
    console.log('\nTEST 2: Live TV - Channel 3');
    await page.evaluate((app) => app.tuneToChannel(3), app);
    await page.waitForTimeout(3000);

    const ch3 = await page.evaluate(() => {
        const v = document.getElementById('mainVideo');
        return {
            channel: spookyCable.currentChannel,
            time: v.currentTime,
            playing: !v.paused,
            src: v.src
        };
    });
    console.log(`  ${ch3.channel === 3 ? '✓' : '✗'} On channel 3`);
    console.log(`  ${ch3.time > 10 ? '✓' : '✗'} Video seeked to schedule position (${ch3.time.toFixed(1)}s, not 0:00)`);
    console.log(`  ${ch3.playing ? '✓' : '✗'} Video playing`);

    // TEST 3: Live TV - Channel 8
    console.log('\nTEST 3: Live TV - Channel 8');
    await page.evaluate((app) => app.tuneToChannel(8), app);
    await page.waitForTimeout(3000);

    const ch8 = await page.evaluate(() => {
        const v = document.getElementById('mainVideo');
        return {
            channel: spookyCable.currentChannel,
            time: v.currentTime,
            playing: !v.paused
        };
    });
    console.log(`  ${ch8.channel === 8 ? '✓' : '✗'} On channel 8`);
    console.log(`  ${ch8.time > 10 ? '✓' : '✗'} Video seeked to schedule position (${ch8.time.toFixed(1)}s)`);
    console.log(`  ${ch8.playing ? '✓' : '✗'} Video playing`);

    // TEST 4: Guide - PiP mode
    console.log('\nTEST 4: Guide - PiP video stays visible');
    await page.keyboard.press('g'); // Open PiP guide
    await page.waitForTimeout(1000);

    const pipBefore = await page.evaluate(() => {
        const v = document.getElementById('mainVideo');
        const rect = v.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const el = document.elementFromPoint(centerX, centerY);
        return el === v;
    });
    console.log(`  ${pipBefore ? '✓' : '✗'} PiP video visible before scrolling`);

    await page.keyboard.press('ArrowDown'); // Open interactive guide
    await page.waitForTimeout(800);

    for (let i = 0; i < 3; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
    }

    const pipAfter = await page.evaluate(() => {
        const v = document.getElementById('mainVideo');
        const rect = v.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const el = document.elementFromPoint(centerX, centerY);
        return el === v;
    });
    console.log(`  ${pipAfter ? '✓' : '✗'} PiP video still visible after scrolling`);

    await page.keyboard.press('Escape'); // Back to PiP guide
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape'); // Exit guide
    await page.waitForTimeout(500);

    console.log('  (Guide click test verified in test_guide_requirements.js)');

    // TEST 6: On-Demand - Full cycle
    console.log('\nTEST 6: On-Demand - D, play, Esc, Esc returns to live TV');
    const beforeOD = await page.evaluate(() => ({
        channel: spookyCable.currentChannel,
        volume: document.getElementById('mainVideo').volume,
        src: document.getElementById('mainVideo').src
    }));

    await page.keyboard.press('d'); // Open On-Demand
    await page.waitForTimeout(1000);

    const odOpen = await page.evaluate(() => spookyCable.activeScreen === 'onDemand');
    console.log(`  ${odOpen ? '✓' : '✗'} On-Demand library opened`);

    await page.keyboard.press('Enter'); // Play first video
    await page.waitForTimeout(2000);

    const playing = await page.evaluate(() => ({
        mode: spookyCable.isOnDemandMode,
        screen: spookyCable.activeScreen,
        paused: document.getElementById('mainVideo').paused
    }));
    console.log(`  ${playing.mode ? '✓' : '✗'} On-Demand mode active`);
    console.log(`  ${!playing.paused ? '✓' : '✗'} Video playing`);

    await page.keyboard.press('Escape'); // Back to library
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape'); // Exit to live TV
    await page.waitForTimeout(1500);

    const afterOD = await page.evaluate(() => ({
        channel: spookyCable.currentChannel,
        volume: document.getElementById('mainVideo').volume,
        playing: !document.getElementById('mainVideo').paused,
        mode: spookyCable.isOnDemandMode,
        time: document.getElementById('mainVideo').currentTime
    }));

    console.log(`  ${afterOD.channel === beforeOD.channel ? '✓' : '✗'} Back on same channel (${afterOD.channel})`);
    console.log(`  ${afterOD.volume === beforeOD.volume ? '✓' : '✗'} Same volume (${afterOD.volume})`);
    console.log(`  ${afterOD.playing ? '✓' : '✗'} Video playing`);
    console.log(`  ${!afterOD.mode ? '✓' : '✗'} On-Demand mode exited`);
    console.log(`  ${afterOD.time > 10 ? '✓' : '✗'} Video at live position (${afterOD.time.toFixed(1)}s)`);

    console.log('\n✅ Regression test complete!\n');

    await page.waitForTimeout(3000);
    await browser.close();
})();
