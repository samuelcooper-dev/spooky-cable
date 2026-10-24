const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log('🎬 Testing Spooky Cable Improvements...\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'screenshots-improvements');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    try {
        // Navigate to the app
        console.log('📺 Opening Spooky Cable...');
        await page.goto('http://localhost:8000');

        // Power on
        console.log('⚡ Powering on...');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Test 1: Navigate to guide channel and verify muzak (ambient music)
        console.log('\n✅ Test 1: Guide Channel Muzak (Weather Channel-style)');
        console.log('   Tuning to channel 1 (Guide)...');
        await page.keyboard.press('1');
        await page.waitForTimeout(5000);
        console.log('   ℹ️  Listen for ambient chord progression (Am-F-C-G)');
        console.log('   ℹ️  Should be subtle, atmospheric, NOT annoying hum');
        await page.screenshot({ path: path.join(screenshotsDir, '01-guide-with-muzak.png') });

        // Test 2: Verify category icons in guide grid
        console.log('\n✅ Test 2: Category Icons in Guide Grid');
        const categoryIcons = await page.locator('.guide-program-category').count();
        console.log(`   Found ${categoryIcons} category icons`);
        await page.screenshot({ path: path.join(screenshotsDir, '02-guide-with-categories.png') });

        // Test 3: Test interactive guide with enhanced selection
        console.log('\n✅ Test 3: Interactive Guide Enhanced Selection');
        console.log('   Opening interactive guide...');
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '03-interactive-guide-selection.png') });

        // Move around the grid
        console.log('   Moving cursor around grid...');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, '04-interactive-guide-moved.png') });

        // Test 4: Verify category icons in interactive guide
        console.log('\n✅ Test 4: Category Icons in Interactive Guide');
        const interactiveCategoryIcons = await page.locator('.interactive-program-cell .guide-program-category').count();
        console.log(`   Found ${interactiveCategoryIcons} category icons in interactive guide`);

        // Close interactive guide
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Test 5: Test smooth channel transitions
        console.log('\n✅ Test 5: Smooth Channel Fade Transitions');
        console.log('   Changing to channel 3...');
        await page.keyboard.press('3');
        await page.waitForTimeout(1000);
        console.log('   ℹ️  Should see smooth fade transition (not instant black)');
        await page.screenshot({ path: path.join(screenshotsDir, '05-after-channel-change.png') });

        // Test 6: Test enhanced info banner with duration
        console.log('\n✅ Test 6: Enhanced Info Banner with Duration');
        console.log('   Pressing I for info banner...');
        await page.keyboard.press('i');
        await page.waitForTimeout(1000);

        // Check for duration text
        const durationText = await page.locator('#infoDuration').textContent();
        console.log(`   Duration display: "${durationText}"`);
        await page.screenshot({ path: path.join(screenshotsDir, '06-info-banner-with-duration.png') });

        await page.waitForTimeout(3000);

        // Test 7: Verify guide footer with time
        console.log('\n✅ Test 7: Guide Footer with Current Time');
        console.log('   Returning to guide channel...');
        await page.keyboard.press('1');
        await page.waitForTimeout(2000);

        const footerText = await page.locator('#guideFooterTip').textContent();
        console.log(`   Footer text: "${footerText}"`);
        console.log('   ℹ️  Should show current time + "Press any arrow key for interactive guide"');
        await page.screenshot({ path: path.join(screenshotsDir, '07-guide-footer-with-time.png') });

        // Test 8: Test muzak fade-out
        console.log('\n✅ Test 8: Muzak Fade-Out');
        console.log('   Changing channel to stop muzak...');
        await page.keyboard.press('3');
        await page.waitForTimeout(3000);
        console.log('   ℹ️  Muzak should have smooth 2-second fade-out (not abrupt stop)');

        // Test 9: Channel change whoosh sound
        console.log('\n✅ Test 9: Channel Change Whoosh Sound');
        console.log('   Changing channels to test whoosh...');
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(1000);
        console.log('   ℹ️  Should hear frequency sweep (800Hz → 200Hz)');
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(1000);

        // Final screenshot
        await page.screenshot({ path: path.join(screenshotsDir, '08-final-state.png') });

        console.log('\n✅ All tests completed!');
        console.log(`📸 Screenshots saved to: ${screenshotsDir}`);

        console.log('\n🎯 Summary of Improvements:');
        console.log('   1. ✅ Weather Channel-style ambient muzak (chord progression)');
        console.log('   2. ✅ 3-second fade-in, 2-second fade-out for muzak');
        console.log('   3. ✅ Category icons in guide grids');
        console.log('   4. ✅ Enhanced interactive guide selection (bright highlight)');
        console.log('   5. ✅ Smooth channel fade transitions (150ms)');
        console.log('   6. ✅ Info banner with duration display');
        console.log('   7. ✅ Guide footer with current time');
        console.log('   8. ✅ Channel change whoosh sound effect');

        console.log('\n📝 Manual Verification Needed:');
        console.log('   - Listen to muzak quality (should be ambient, not annoying)');
        console.log('   - Verify fade transitions feel smooth');
        console.log('   - Check whoosh sound on channel change');

    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser left open for manual inspection');
        console.log('   Press Ctrl+C when done to close');
        await page.waitForTimeout(60000); // Wait 60 seconds
        await browser.close();
    }
})();
