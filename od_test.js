// Drives the new On-Demand screen in a real browser. node od_test.js
const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra) => { (ok ? pass++ : fail++); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(extra))); };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => { errors.push('DIALOG ' + d.message()); d.dismiss(); });
  await page.goto('http://127.0.0.1:8000/tv/');
  await page.waitForFunction(() => window.spookyCable && window.spookyCable.channels.size > 5);
  await page.keyboard.press('Enter'); await sleep(500);
  await page.evaluate(() => window.spookyCable.tuneToChannel(3)); await sleep(1200);
  const live = await page.evaluate(() => ({ ch: spookyCable.currentChannel, src: decodeURIComponent(document.getElementById('mainVideo').src.split('/media/')[1]), vol: document.getElementById('mainVideo').volume }));

  const S = () => page.evaluate(() => {
    const a = window.spookyCable, v = document.getElementById('mainVideo'), od = a.od;
    return { screen: a.activeScreen, mode: a.isOnDemandMode, paused: v.paused, t: v.currentTime, dur: v.duration, src: decodeURIComponent(v.src.split('/media/')[1] || ''),
      cards: od ? document.querySelectorAll('.od-card').length : 0, sel: od && od.sel, queue: od && od.queue.slice(), view: od && od.view,
      rootHidden: od && od.root.classList.contains('hidden'), playerHidden: od && od.player.classList.contains('hidden'),
      ch: a.currentChannel, vol: v.volume, muted: v.muted };
  });

  // ---- open library
  await page.keyboard.press('d'); await sleep(500);
  let s = await S();
  check('library opens as onDemand', s.screen === 'onDemand' && s.rootHidden === false, s);
  const total = await page.evaluate(() => Object.values(Object.fromEntries(spookyCable.channels)).reduce((n, c) => n + (c.files ? c.files.length : 0), 0));
  check('grid shows every video', s.cards === total && total > 20, { cards: s.cards, total });
  await page.screenshot({ path: 'shots/od-1-library.png' });
  const thumbOk = await page.evaluate(() => Array.from(document.querySelectorAll('.od-thumb img')).filter((i) => i.complete && i.naturalWidth > 0).length);
  check('thumbnail loads where a .jpg exists (1 expected)', thumbOk === 1, thumbOk);

  // ---- keyboard nav
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  s = await S(); check('arrows move selection (1 + 5 = 6)', s.sel === 6, s.sel);

  // ---- search
  await page.keyboard.press('/'); await sleep(100);
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check('/ focuses search', focused === 'odSearch', focused);
  await page.keyboard.type('scooby'); await sleep(200);   // includes 'd' and other hot keys
  s = await S();
  const scoobyCount = await page.evaluate(() => spookyCable.od.items.filter((i) => (i.title + ' ' + i.channelName).toLowerCase().includes('scooby')).length);
  check('typing "scooby" filters (and screen stays open)', s.screen === 'onDemand' && s.cards === scoobyCount && scoobyCount > 0, { s: s.screen, cards: s.cards, scoobyCount });
  await page.keyboard.press('Escape'); await sleep(100);       // clears + blurs
  s = await S(); check('Esc in search clears it', s.cards === total && s.screen === 'onDemand', s);

  // ---- playlist building (mouse + key)
  await page.click('.od-card[data-i="0"] .od-add');
  await page.click('.od-card[data-i="2"] .od-add');
  s = await S(); check('clicking + adds to playlist', s.queue.length === 2, s.queue);
  await page.evaluate(() => { spookyCable.od.sel = 4; spookyCable.odMarkSel(); });
  await page.keyboard.press('+');
  s = await S(); check('+ key adds selected card', s.queue.length === 3, s.queue);
  const savedQ = await page.evaluate(() => JSON.parse(localStorage.getItem('spooky-cable-playlist')).length);
  check('playlist persisted in localStorage', savedQ === 3, savedQ);

  // playlist view + reorder
  await page.click('[data-v="playlist"]'); await sleep(200);
  s = await S(); check('playlist view lists 3', s.view === 'playlist' && s.cards === 3, s);
  const before = s.queue.slice();
  await page.click('.od-card[data-i="1"] [data-act="up"]'); await sleep(100);
  s = await S(); check('▲ reorders', s.queue[0] === before[1] && s.queue[1] === before[0], { before, after: s.queue });
  await page.screenshot({ path: 'shots/od-2-playlist.png' });

  // ---- play the playlist (autoplay); shrink every video's end by seeking near the end
  await page.click('#odPlayAll'); await sleep(1500);
  s = await S();
  check('play playlist -> player, first item, playing', s.screen === 'onDemandPlayer' && s.mode === true && !s.paused && s.src === s.queue[0], s);
  const first = s.src;
  // video on top of nothing blocking? player layer is transparent
  const el = await page.evaluate(() => { const v = document.getElementById('mainVideo').getBoundingClientRect(); const e = document.elementFromPoint(v.left + v.width / 2, v.top + 200); return e && (e.id || e.className); });
  check('clicking the picture hits the player layer (not live-TV UI)', /odPlayer|od-player/.test(el), el);

  // ---- controls
  await page.keyboard.press('Space'); await sleep(300);
  s = await S(); check('Space pauses', s.paused === true, s.paused);
  await page.keyboard.press('Space'); await sleep(300);
  s = await S(); check('Space resumes', s.paused === false, s.paused);
  await page.evaluate(() => { document.getElementById('mainVideo').currentTime = 100; }); await sleep(400);
  const t0 = (await S()).t;
  await page.keyboard.press('ArrowLeft'); await sleep(500);
  let t1 = (await S()).t; check('Left rewinds ~10s', t0 - t1 > 8 && t0 - t1 < 12, { t0, t1 });
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await sleep(500);
  let t2 = (await S()).t; check('Right x2 forwards ~20s', t2 - t1 > 18 && t2 - t1 < 23, { t1, t2 });
  // seek bar click at 50%
  const box = await page.evaluate(() => { document.getElementById('odPlayer').classList.add('show'); const r = document.getElementById('odSeek').getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width }; });
  await page.mouse.click(box.x + box.w * 0.5, box.y); await sleep(500);
  s = await S(); check('clicking seek bar jumps to ~50%', Math.abs(s.t / s.dur - 0.5) < 0.05, { t: s.t, dur: s.dur });
  await page.keyboard.press('ArrowDown'); s = await S(); check('Down lowers volume', s.vol < 1, s.vol);
  await page.keyboard.press('m'); s = await S(); check('M mutes', s.muted === true, s.muted);
  await page.keyboard.press('m');
  await page.keyboard.press('7'); await sleep(400); s = await S(); check('7 jumps to 70%', Math.abs(s.t / s.dur - 0.7) < 0.05, { t: s.t, dur: s.dur });
  await page.screenshot({ path: 'shots/od-3-player.png' });
  // buttons
  await page.evaluate(() => document.getElementById('odPlayer').classList.add('show'));
  await page.click('#odPlayBtn'); await sleep(200); s = await S(); check('play button pauses', s.paused === true, s.paused);
  await page.click('#odPlayBtn'); await sleep(200);

  // ---- autoplay: jump to the end of video 1
  await page.evaluate(() => { const v = document.getElementById('mainVideo'); v.currentTime = v.duration - 1; }); await sleep(3500);
  s = await S();
  check('autoplay moved to playlist item 2', s.screen === 'onDemandPlayer' && s.src === s.queue[1] && s.src !== first, { src: s.src, q: s.queue });
  check('finished video progress cleared', await page.evaluate((p) => localStorage.getItem('spooky-cable-progress-' + p) === null, first));

  // next / previous
  await page.keyboard.press('n'); await sleep(1000); s = await S(); check('N -> item 3', s.src === s.queue[2], s.src);
  await page.keyboard.press('n'); await sleep(600); s = await S(); check('N at last item stays', s.src === s.queue[2], s.src);

  // ---- Esc -> library, resume bar, then back to live TV
  await sleep(1500);
  await page.keyboard.press('Escape'); await sleep(500);
  s = await S(); check('Esc returns to library', s.screen === 'onDemand' && s.mode === false && s.paused, s);
  await page.keyboard.press('Escape'); await sleep(2500);
  s = await S();
  check('Esc again returns to live TV on same channel', s.screen === 'channel' && s.ch === live.ch && !s.paused && s.src === live.src && s.t > 0, s);
  check('live volume restored', s.vol === live.vol && s.muted === false, s);

  // ---- mouse: click a card to play, click picture to pause, bar button exits
  await page.keyboard.press('d'); await sleep(300);
  await page.click('.od-card[data-i="3"]'); await sleep(1200);
  s = await S(); check('clicking a card plays it', s.screen === 'onDemandPlayer' && !s.paused, s);
  await page.mouse.click(960, 400); await sleep(300);
  s = await S(); check('clicking the picture pauses', s.paused === true, s.paused);
  await page.mouse.move(900, 900); await sleep(200);
  await page.click('[data-a="exit"]'); await sleep(300);
  s = await S(); check('exit button -> library', s.screen === 'onDemand', s.screen);
  await page.keyboard.press('Escape'); await sleep(1500);

  // ---- app.js untouched behaviors: live ended handler still works when NOT on demand
  const live2 = await page.evaluate(() => { const a = spookyCable; return typeof a.onVideoEnded === 'function' && a.isOnDemandMode === false; });
  check('live handlers intact', live2);

  check('no page errors / dialogs', errors.length === 0, errors);
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST CRASHED', e); process.exit(2); });
