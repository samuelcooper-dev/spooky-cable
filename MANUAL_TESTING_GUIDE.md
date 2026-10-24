# Manual Testing Guide for Spooky Cable Improvements

## Quick Start
1. Open http://localhost:8000 in your browser
2. Press any key to power on
3. Follow the tests below

---

## Test 1: Weather Channel-Style Muzak

**Steps:**
1. Press `1` to tune to the Guide channel
2. Listen carefully to the background music

**Expected Results:**
- ✅ You should hear a slow, somber chord progression (not an annoying hum)
- ✅ Music should fade in smoothly over 3 seconds (not instant)
- ✅ Chords change every 7 seconds: Am → F → C → G → (repeat)
- ✅ Music is very quiet and atmospheric (like Weather Channel 1980s)
- ✅ There's a subtle echo/reverb effect

**What to Listen For:**
- 🎵 Am chord: A-C-E (low, somber)
- 🎵 F chord: F-A-C (slightly brighter)
- 🎵 C chord: C-E-G (major, hopeful)
- 🎵 G chord: G-B-D (major, bright)

**Now Test Fade-Out:**
1. Press `3` to change channels
2. Listen as the music fades out

**Expected:**
- ✅ Music should fade out smoothly over 2 seconds (not abrupt cut)

---

## Test 2: Category Icons in Guide

**Steps:**
1. Press `1` to go to Guide channel
2. Look at the program grid (bottom section)

**Expected Results:**
- ✅ You should see emoji icons before each program title:
  - 🎃 = Halloween Specials (Great Pumpkin, Garfield)
  - 🦇 = Spooky Series (Scooby-Doo shows)
  - 🎬 = Movies (Hocus Pocus, Casper)
- ✅ Icons should be slightly smaller than the text
- ✅ Icons should appear on all program cells

---

## Test 3: Enhanced Interactive Guide Selection

**Steps:**
1. Press `1` to go to Guide channel
2. Press any arrow key to open Interactive Guide
3. Use arrow keys to move the cursor around

**Expected Results:**
- ✅ Selected cell has a bright ORANGE border (not subtle)
- ✅ Selected cell has a glowing effect around it
- ✅ Selected cell background is semi-transparent orange
- ✅ Selection is VERY obvious and easy to see

**Try This:**
- Move cursor with arrow keys
- Selection should move smoothly
- Press `ENTER` to tune to selected program
- Press `ESC` to exit

---

## Test 4: Category Icons in Interactive Guide

**Steps:**
1. Open Interactive Guide (arrow key from guide channel)
2. Look at all the program cells

**Expected Results:**
- ✅ All program titles should have category icons
- ✅ Same icons as regular guide (🎃 🦇 🎬 👻)
- ✅ Icons should be visible and clear

---

## Test 5: Smooth Channel Transitions

**Steps:**
1. Start on any channel
2. Press a number key to change channels (try `3`, then `4`, then `2`)

**Expected Results:**
- ✅ Screen should fade to black over ~150ms
- ✅ Then fade in from black over ~150ms
- ✅ Total transition feels smooth (not instant black)
- ✅ NO jarring instant cuts

**Watch For:**
- The fade should be subtle but noticeable
- It should feel more "professional" than instant switching

---

## Test 6: Channel Change Whoosh Sound

**Steps:**
1. Make sure volume is not muted
2. Change channels several times (press `↑` or `↓` or number keys)

**Expected Results:**
- ✅ You should hear a "whoosh" sound with each channel change
- ✅ Sound sweeps downward (high to low frequency)
- ✅ Sounds like: "wheeeeee-ooooo" (800Hz → 200Hz)
- ✅ Duration is very quick (~200ms)
- ✅ Sound is subtle, not loud

**What It Sounds Like:**
- Like a retro sci-fi sound effect
- Descending pitch sweep
- Adds tactile feedback to channel changes

---

## Test 7: Info Banner with Duration

**Steps:**
1. Tune to any channel with content (channels 2-5)
2. Press `i` to show info banner

**Expected Results:**
- ✅ Banner shows at the bottom
- ✅ You should see duration text like: "45 of 90 minutes (50% complete)"
- ✅ The format is: `[elapsed] of [total] minutes ([percent]% complete)`
- ✅ Progress bar matches the percentage
- ✅ Duration text is in pink/candy color

**What to Check:**
- Numbers should make sense (elapsed ≤ total)
- Percentage should match the progress bar
- Text should be clearly visible

---

## Test 8: Guide Footer with Current Time

**Steps:**
1. Press `1` to go to Guide channel
2. Look at the very bottom of the screen (footer area)

**Expected Results:**
- ✅ Footer should show: `[current time] | Press any arrow key for interactive guide`
- ✅ Time format: "8:35 PM"
- ✅ Time should update every second
- ✅ Both the clock (top section) and footer should show same time

**Watch For:**
- The time updates live (watch it change minutes)
- The footer text is NOT just "Press any arrow key..." alone
- It should have the time prefix

---

## Test 9: Muzak Fade-In Timing

**Steps:**
1. Start on channel 3
2. Press `1` to switch to Guide
3. Listen carefully as the music starts

**Expected Results:**
- ✅ Music starts at ZERO volume (completely silent)
- ✅ Over 3 seconds, it gradually increases to full (but quiet) volume
- ✅ The fade-in is smooth and natural
- ✅ You can hear it "growing" in volume

**Timing Check:**
- Start counting "one thousand one, one thousand two, one thousand three"
- Music should reach full volume by the time you finish

---

## Test 10: Complete User Flow

**Full Test:**
1. Power on (press any key)
2. Should start on channel 3
3. Press `1` → Guide channel
   - ✅ Muzak fades in (3 sec)
   - ✅ Category icons visible
   - ✅ Footer shows time
4. Press `↓` → Interactive Guide opens
   - ✅ Selection is bright and obvious
   - ✅ Category icons visible
5. Press arrow keys to move around
   - ✅ Beep sounds on each move
   - ✅ Selection updates
6. Press `ESC` → Back to guide
   - ✅ Interactive guide closes
7. Press `3` → Change to channel 3
   - ✅ Muzak fades out (2 sec)
   - ✅ Whoosh sound plays
   - ✅ Screen fades smoothly
8. Press `i` → Info banner
   - ✅ Duration display shows
   - ✅ Progress bar matches
9. Press `m` → Mute
   - ✅ Whoosh sound should NOT play on next channel change

---

## Comparison: Before vs After

### Before Improvements
- ❌ Muzak: Annoying 2-tone hum (330Hz + 440Hz)
- ❌ Muzak: Instant on/off (jarring)
- ❌ No category icons
- ❌ Selection hard to see
- ❌ Instant black screen on channel change
- ❌ No duration info
- ❌ Footer static, no time
- ❌ No channel change sound

### After Improvements
- ✅ Muzak: Pleasant chord progression (Am-F-C-G)
- ✅ Muzak: 3-sec fade-in, 2-sec fade-out
- ✅ Category icons (🎃 🦇 🎬 👻)
- ✅ Selection bright and obvious
- ✅ Smooth 300ms fade transition
- ✅ Duration display ("45 of 90 min, 50%")
- ✅ Footer shows live time
- ✅ Whoosh sound on channel change

---

## Common Issues & Fixes

### "I don't hear any muzak"
- Make sure you're on channel 1 (Guide)
- Check volume is not muted
- Wait 3 seconds for fade-in to complete

### "I don't see category icons"
- Wait for guide to fully load
- Icons appear before program titles
- Check if media index is loaded (console.log)

### "Selection not bright enough"
- Open Interactive Guide (arrow key)
- Selection should have orange glow
- If too subtle, check CSS was updated

### "No whoosh sound"
- Make sure not muted
- Sound is subtle (listen carefully)
- Should play when changing channels

### "Footer doesn't show time"
- On Guide channel (1)?
- Wait 1 second for clock to update
- Check browser console for errors

---

## Success Checklist

Use this checklist to verify all improvements:

- [ ] Muzak is ambient chord progression (not annoying hum)
- [ ] Muzak fades in over 3 seconds
- [ ] Muzak fades out over 2 seconds
- [ ] Category icons appear in guide grid
- [ ] Category icons appear in interactive guide
- [ ] Interactive guide selection is bright orange with glow
- [ ] Channel changes have smooth fade (300ms)
- [ ] Whoosh sound plays on channel change
- [ ] Info banner shows duration ("X of Y minutes")
- [ ] Guide footer shows current time
- [ ] All sounds respect mute state
- [ ] No console errors

---

## Browser Console Check

Open browser console (F12) and check for:

**Should NOT see:**
- ❌ Any red error messages
- ❌ "Failed to load..." errors
- ❌ Audio context errors

**SHOULD see (if you want to verify):**
- ✅ "📺 Tuning to Channel 1: GUIDE"
- ✅ "▶ Playing: [program title]"
- ✅ Channel numbers logged

---

## Audio Quality Assessment

Listen to the muzak for 30 seconds and rate:

**Is it annoying?**
- Should be: NO (ambient, ignorable)

**Is it Weather Channel-like?**
- Should be: YES (somber, atmospheric)

**Can you ignore it easily?**
- Should be: YES (very quiet, background)

**Does it change over time?**
- Should be: YES (chords change every 7 seconds)

**Does it have reverb/echo?**
- Should be: YES (subtle delay effect)

---

## Final Verification

If ALL of these are true, the implementation is successful:

1. ✅ I can barely notice the muzak (it's ambient)
2. ✅ Category icons help me identify content types
3. ✅ Interactive guide selection is easy to see
4. ✅ Channel changes feel smooth and polished
5. ✅ Info banner tells me how much of the program is left
6. ✅ Footer keeps me informed of the time
7. ✅ Whoosh sound adds tactile feedback
8. ✅ Everything feels more authentic and retro

---

## Need Help?

- Check IMPROVEMENTS_SUMMARY.md for technical details
- Check browser console for errors
- Verify server is running (http://localhost:8000)
- Ensure media/index.json is accessible
- Try refreshing the page (Ctrl+R)

🎃 Happy Halloween! Enjoy your improved Spooky Cable experience! 📺👻
