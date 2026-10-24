/* ondemand.js  -  NEW FILE, load it AFTER app.js  (<script src="ondemand.js"></script>)
 *
 * Replaces the On-Demand screen with:
 *   - a thumbnail grid you can click, with search and category chips
 *   - a playlist you build (press + / click +), that autoplays in order
 *   - a real video player: play/pause, rewind 10s, forward 10s, clickable/draggable
 *     seek bar, volume/mute, next/previous
 *
 * It lives in its own file on purpose: it patches SpookyCable.prototype and touches NOTHING
 * in app.js, so live-TV playback, the guide and channel tuning cannot regress because of it.
 * Nothing here runs unless the On-Demand screen is opened (D key).
 */
(() => {
    'use strict';
    const P = SpookyCable.prototype;

    const LS_QUEUE = 'spooky-cable-playlist';   // [ "channel-folder/file.mp4", ... ] in play order
        const LS_VOL   = 'spooky-cable-volume';     // 0..1
    const COLS = 5;                             // cards per row (must match the CSS grid)
    const SKIP = 10;                            // seconds for rewind / forward

    // ---------- small helpers ----------
    // Same idea as app.js mediaUrl(): encode each path piece so '#', '?', '%' in names still load.
    const enc    = (p) => 'media/' + p.split('/').map(encodeURIComponent).join('/');
    // Thumbnails sit NEXT TO the video:  Show.mp4 -> Show.jpg
    const beside = (p, ext) => p.replace(/\.[^./]+$/, ext);
    const esc    = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
                      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const clamp  = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const fmt    = (s) => {
        s = Math.max(0, Math.floor(s || 0));
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
        return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
    };
    const read  = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: fine */ } };
    // Resume points use the SAME key the old on-demand code used, so existing progress still works.
    const progressOf = (path) => read('spooky-cable-progress-' + path, null);

    // =====================================================================================
    // SETUP  (builds the screens once, the first time On-Demand is opened)
    // =====================================================================================
    P.odInit = function () {
        if (this.od) return;
        const od = this.od = {
            items: [], byKey: new Map(),        // every playable video
            queue: read(LS_QUEUE, []),          // the playlist (array of keys = paths)
            view: 'all', query: '',             // chip + search text
            list: [], sel: 0,                   // what the grid shows, selected card
            context: [], playing: null, playlistMode: false,
            hijacked: false, saved: null,       // true once we borrowed the TV's video element
            seeking: false, hideTimer: null, saveTimer: null, toastTimer: null, osdTimer: null,
        };

        const html = `
        <div id="odRoot" class="od-root hidden">
          <div class="od-top">
            <div class="od-title">ON DEMAND</div>
            <input id="odSearch" type="text" placeholder="Search titles...   ( / )" autocomplete="off" spellcheck="false">
            <button class="od-btn" id="odPlayAll" data-act="playall">&#9654; Play playlist (0)</button>
            <button class="od-btn" data-act="close">&#10005;</button>
          </div>
          <div class="od-chips" id="odChips"></div>
          <div class="od-grid" id="odGrid"></div>
          <div class="od-help">
            <span>Arrows: move</span><span>Enter: play</span><span>+ : add to playlist</span>
            <span>P: play playlist</span><span>/ : search</span><span>[ ] : category</span><span>D / Esc: exit</span>
          </div>
        </div>
        <div id="odPlayer" class="od-player hidden">
          <div id="odOsd" class="od-osd"></div>
          <div class="od-bar">
            <div class="od-now" id="odNow"></div>
            <div class="od-seek" id="odSeek"><div class="od-fill" id="odFill"></div></div>
            <div class="od-row">
              <button data-a="prev"  title="Previous (P)">&#9198;</button>
              <button data-a="back"  title="Back 10s (J / Left)">&#9194; 10</button>
              <button data-a="play"  id="odPlayBtn" title="Play / pause (Space / K)">&#9208;</button>
              <button data-a="fwd"   title="Forward 10s (L / Right)">10 &#9193;</button>
              <button data-a="next"  title="Next (N)">&#9197;</button>
              <span id="odTime">0:00 / 0:00</span>
              <span class="od-spacer"></span>
              <button data-a="mute" id="odMuteBtn" title="Mute (M)">&#128266;</button>
              <input id="odVol" type="range" min="0" max="1" step="0.05" value="1">
              <button data-a="exit" title="Back to library (Esc)">&#10005; Library</button>
            </div>
          </div>
        </div>
        <div id="odToast" class="od-toast"></div>`;
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const stage = document.getElementById('stage');
        while (wrap.firstChild) stage.appendChild(wrap.firstChild);

        const $ = (id) => document.getElementById(id);
        Object.assign(od, {
            root: $('odRoot'), search: $('odSearch'), playAll: $('odPlayAll'), chips: $('odChips'), grid: $('odGrid'),
            player: $('odPlayer'), osd: $('odOsd'), now: $('odNow'), seek: $('odSeek'),
            fill: $('odFill'), time: $('odTime'), playBtn: $('odPlayBtn'), muteBtn: $('odMuteBtn'),
            vol: $('odVol'), toast: $('odToast'),
        });

        // ----- library mouse + typing -----
        od.root.addEventListener('click', (e) => this.odLibraryClick(e));
        od.search.addEventListener('input', () => { od.query = od.search.value; od.sel = 0; this.odRender(); });

        // ----- player mouse -----
        od.player.addEventListener('click', (e) => this.odPlayerClick(e));
        od.player.addEventListener('mousemove', () => this.odShowBar());
        // Seek bar: click or drag. Uses on-screen fractions, so the TV's scaling doesn't matter.
        const seekTo = (e) => {
            const r = od.seek.getBoundingClientRect(), v = this.video;
            if (v.duration) v.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * v.duration;
        };
        od.seek.addEventListener('pointerdown', (e) => { od.seeking = true; od.seek.setPointerCapture(e.pointerId); seekTo(e); });
        od.seek.addEventListener('pointermove', (e) => { if (od.seeking) seekTo(e); });
        od.seek.addEventListener('pointerup',   () => { od.seeking = false; });
        od.vol.addEventListener('input', () => {
            this.video.muted = false; this.video.volume = +od.vol.value; write(LS_VOL, +od.vol.value);
        });

        // ----- <video> events. Every handler ignores the video unless On-Demand is playing. -----
        const v = this.video;
        v.addEventListener('timeupdate',   () => this.odTick());
        v.addEventListener('play',         () => { if (this.isOnDemandMode) { this.odSyncButtons(); this.odShowBar(); } });
        v.addEventListener('pause',        () => { if (this.isOnDemandMode) { this.odSaveProgress(); this.odSyncButtons(); this.odShowBar(); } });
        v.addEventListener('volumechange', () => { if (this.isOnDemandMode) this.odSyncButtons(); });
        v.addEventListener('ended',        () => this.odEnded());
        v.addEventListener('error',        () => this.odError());
    };

    // =====================================================================================
    // HOOKS INTO app.js  (wrapping, not editing)
    // =====================================================================================
    // 1) Keys: typing in the search box must not be swallowed by the TV remote handler,
    //    and the player screen has its own keys.
    const origKey = P.handleKeyPress;
    P.handleKeyPress = function (e) {
        if (this.isPoweredOn) {
            if (this.od && e.target === this.od.search) return this.odSearchKey(e);
            if (this.activeScreen === 'onDemandPlayer') { this.odPlayerKey(e); e.preventDefault(); return; }
        }
        return origKey.call(this, e);
    };
    // 2) app.js restarts the LIVE channel whenever the video ends/errors. While On-Demand is
    //    playing that would yank the picture away, so step aside.
    const origEnded = P.onVideoEnded, origError = P.onVideoError;
    P.onVideoEnded = function () { if (this.isOnDemandMode) return; return origEnded.call(this); };
    P.onVideoError = function () { if (this.isOnDemandMode) return; return origError.call(this); };

    // =====================================================================================
    // LIBRARY  (thumbnail grid + search + chips + playlist view)
    // =====================================================================================
    P.openOnDemand = function () {                      // replaces the old one ('D' key)
        this.odInit();
        const od = this.od;
        od.items = this.odCatalog();
        od.byKey = new Map(od.items.map((i) => [i.key, i]));
        od.queue = od.queue.filter((k) => od.byKey.has(k));      // forget videos that were deleted
        write(LS_QUEUE, od.queue);
        this.activeScreen = 'onDemand';
        od.player.classList.add('hidden');
        od.root.classList.remove('hidden');
        od.search.value = od.query = '';
        od.view = 'all'; od.sel = 0;
        this.odRender();
    };

    // Every playable video, from the same channel data the old on-demand screen used.
    // (If buildOnDemandCategories() filters channels some other way, copy that filter here.)
    P.odCatalog = function () {
        const items = [];
        for (const [num, ch] of this.channels) {
            if (!ch || !Array.isArray(ch.files)) continue;
            for (const f of ch.files) {
                items.push({
                    key: f.path, path: f.path, title: f.title || f.filename, duration: f.duration || 0,
                    channelNum: num, channelName: ch.displayName || ch.name || ('Channel ' + num),
                });
            }
        }
        return items;
    };

    P.odResumable = function (it) {          // a started-but-not-finished video, or null
        const p = progressOf(it.path);
        return p && p.duration && p.time >= 5 && p.time < p.duration - 15 ? p : null;
    };

    // What the grid should show right now.
    P.odList = function () {
        const od = this.od, q = od.query.trim().toLowerCase();
        let list;
        if (od.view === 'playlist') list = od.queue.map((k) => od.byKey.get(k)).filter(Boolean);
        else if (q) list = od.items;                                   // searching looks at everything
        else if (od.view === 'continue') {
            list = od.items.filter((i) => this.odResumable(i))
                .sort((a, b) => progressOf(b.path).timestamp - progressOf(a.path).timestamp);
        } else if (od.view === 'all') list = od.items;
        else list = od.items.filter((i) => String(i.channelNum) === od.view);
        if (q) list = list.filter((i) => (i.title + ' ' + i.channelName).toLowerCase().includes(q));
        return list;
    };

    P.odChipList = function () {
        const od = this.od;
        const chips = [['all', 'All'], ['continue', '▶ Continue'], ['playlist', `★ Playlist (${od.queue.length})`]];
        const seen = new Map();
        od.items.forEach((i) => seen.set(String(i.channelNum), i.channelName));
        seen.forEach((name, num) => chips.push([num, name]));
        return chips;
    };

    P.odRender = function () {
        const od = this.od;
        od.list = this.odList();
        od.sel = clamp(od.sel, 0, Math.max(0, od.list.length - 1));
        od.chips.innerHTML = this.odChipList().map(([v, label]) =>
            `<button class="od-chip ${od.view === v && !od.query ? 'on' : ''}" data-act="view" data-v="${esc(v)}">${esc(label)}</button>`).join('');
        this.odRefreshCounts();
        const inPl = od.view === 'playlist';
        od.grid.innerHTML = od.list.length
            ? od.list.map((it, i) => this.odCard(it, i, inPl)).join('')
            : `<div class="od-empty">${inPl && !od.query
                ? 'Your playlist is empty.<br>Press + on any video to add it.' : 'Nothing matches.'}</div>`;
        this.odMarkSel();
    };

    P.odRefreshCounts = function () {
        const od = this.od, n = od.queue.length;
        od.playAll.innerHTML = `&#9654; Play playlist (${n})`;
        od.playAll.disabled = n === 0;
        const chip = od.chips.querySelector('[data-v="playlist"]');
        if (chip) chip.textContent = `★ Playlist (${n})`;
    };

    P.odCard = function (it, i, inPl) {
        const od = this.od, inQ = od.queue.includes(it.key), p = this.odResumable(it);
        const pct = p ? Math.round((p.time / p.duration) * 100) : 0;
        return `<div class="od-card" data-i="${i}">
          <div class="od-thumb"><span class="od-ph">👻</span>
            <img loading="lazy" alt="" src="${esc(enc(beside(it.path, '.jpg')))}" onerror="this.remove()">
            <span class="od-dur">${fmt(it.duration)}</span>
            ${pct ? `<div class="od-resume"><i style="width:${pct}%"></i></div>` : ''}
            ${inPl
                ? `<span class="od-num">${i + 1}</span>
                   <span class="od-tools"><button data-act="up">▲</button><button data-act="down">▼</button><button data-act="rm">✕</button></span>`
                : `<button class="od-add ${inQ ? 'on' : ''}" data-act="toggle" title="Add to playlist">${inQ ? '✓' : '+'}</button>`}
          </div>
          <div class="od-name">${esc(it.title)}</div>
          <div class="od-ch">${esc(it.channelName)}${p ? ' · resume ' + fmt(p.time) : ''}</div>
        </div>`;
    };

    // Highlight the selected card and scroll it into view. Done by hand (offsetTop is in
    // layout pixels, so the TV's scaling doesn't matter, and no ancestor gets shifted).
    P.odMarkSel = function () {
        const g = this.od.grid;
        const prev = g.querySelector('.od-card.sel'); if (prev) prev.classList.remove('sel');
        const el = g.children[this.od.sel];
        if (!el || !el.classList.contains('od-card')) return;
        el.classList.add('sel');
        const top = el.offsetTop, bot = top + el.offsetHeight;
        if (top < g.scrollTop) g.scrollTop = top - 12;
        else if (bot > g.scrollTop + g.clientHeight) g.scrollTop = bot - g.clientHeight + 12;
    };

    P.odCycleView = function (dir) {
        const od = this.od, views = this.odChipList().map((c) => c[0]);
        od.view = views[(views.indexOf(od.view) + dir + views.length) % views.length];
        od.query = od.search.value = ''; od.sel = 0;
        this.odRender();
    };

    // ----- playlist editing -----
    P.odToggleQueue = function (key) {
        if (!key) return;
        const od = this.od, i = od.queue.indexOf(key);
        if (i >= 0) od.queue.splice(i, 1); else od.queue.push(key);
        write(LS_QUEUE, od.queue);
        if (od.view === 'playlist' && !od.query) { this.odRender(); return; }
        const idx = od.list.findIndex((x) => x.key === key);              // update just that card
        const btn = od.grid.children[idx] && od.grid.children[idx].querySelector('.od-add');
        if (btn) { const on = i < 0; btn.classList.toggle('on', on); btn.textContent = on ? '✓' : '+'; }
        this.odRefreshCounts();
        this.odFlash(i < 0 ? `Added to playlist (${od.queue.length})` : `Removed from playlist (${od.queue.length})`);
    };
    P.odMoveInQueue = function (key, dir) {
        const od = this.od, i = od.queue.indexOf(key), j = i + dir;
        if (i < 0 || j < 0 || j >= od.queue.length) return;
        [od.queue[i], od.queue[j]] = [od.queue[j], od.queue[i]];
        write(LS_QUEUE, od.queue);
        od.sel = j;
        this.odRender();
    };
    P.odRemoveFromQueue = function (key) {
        const od = this.od, i = od.queue.indexOf(key);
        if (i < 0) return;
        od.queue.splice(i, 1);
        write(LS_QUEUE, od.queue);
        this.odRender();
    };

    P.odLibraryClick = function (e) {
        const od = this.od, a = e.target.closest('[data-act]'), card = e.target.closest('.od-card');
        const it = card ? od.list[+card.dataset.i] : null;
        if (card) { od.sel = +card.dataset.i; this.odMarkSel(); }
        switch (a && a.dataset.act) {
            case 'view':    od.view = a.dataset.v; od.query = od.search.value = ''; od.sel = 0; return this.odRender();
            case 'playall': return this.odPlayPlaylist();
            case 'close':   return this.closeOnDemand();
            case 'toggle':  return this.odToggleQueue(it && it.key);
            case 'up':      return this.odMoveInQueue(it && it.key, -1);
            case 'down':    return this.odMoveInQueue(it && it.key, 1);
            case 'rm':      return this.odRemoveFromQueue(it && it.key);
            default:        if (card) this.odPlayCard();
        }
    };

    // Keys on the library screen (replaces the old handleOnDemandKey).
    P.handleOnDemandKey = function (e) {
        const od = this.od, n = od.list.length, k = e.key;
        const it = od.list[od.sel];
        const move = (d) => { od.sel = clamp(od.sel + d, 0, Math.max(0, n - 1)); this.odMarkSel(); };
        const inPl = od.view === 'playlist' && !od.query;
        if (k === 'ArrowRight') { if (e.shiftKey && inPl && it) this.odMoveInQueue(it.key, 1); else move(1); }
        else if (k === 'ArrowLeft') { if (e.shiftKey && inPl && it) this.odMoveInQueue(it.key, -1); else move(-1); }
        else if (k === 'ArrowDown') move(COLS);
        else if (k === 'ArrowUp') move(-COLS);
        else if (k === 'Enter') this.odPlayCard();
        else if (k === '+' || k === '=' || k === 'a' || k === 'A') { if (!inPl && it) this.odToggleQueue(it.key); }
        else if ((k === 'Delete' || k === 'x' || k === 'X') && inPl && it) this.odRemoveFromQueue(it.key);
        else if (k === 'p' || k === 'P') this.odPlayPlaylist();
        else if (k === '/') od.search.focus();
        else if (k === ']') this.odCycleView(1);
        else if (k === '[') this.odCycleView(-1);
        else if (k === 'Escape' || k === 'd' || k === 'D') {
            if (od.query) { od.query = od.search.value = ''; od.sel = 0; this.odRender(); }   // first Esc clears search
            else this.closeOnDemand();
        }
    };

    // Keys while typing in the search box: normal typing, plus Enter/Down = back to the grid.
    P.odSearchKey = function (e) {
        const od = this.od;
        if (e.key === 'Escape') {
            if (od.search.value) { od.query = od.search.value = ''; od.sel = 0; this.odRender(); }
            od.search.blur();
        } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
            od.search.blur(); e.preventDefault();
        }
        // anything else: leave alone so the letters actually appear in the box
    };

    // Leaving On-Demand for live TV. If we borrowed the video, hand it back to the channel.
    P.closeOnDemand = function () {                     // replaces the old one
        const od = this.od, v = this.video;
        this.isOnDemandMode = false;
        this.activeScreen = 'channel';
        if (!od) return;
        clearInterval(od.saveTimer);
        od.search.blur();
        od.root.classList.add('hidden');
        od.player.classList.add('hidden');
        if (od.hijacked) {
            od.hijacked = false;
            v.pause();
            if (od.saved) { v.volume = od.saved.volume; v.muted = od.saved.muted; }
            this.tuneToChannel(this.currentChannel);   // back to where the channel is "live" right now
        }
    };

    // =====================================================================================
    // PLAYER
    // =====================================================================================
    P.odPlayCard = function () {
        const od = this.od, it = od.list[od.sel];
        if (!it) return;
        // From the playlist view, playing a card plays the playlist on from there.
        if (od.view === 'playlist' && !od.query) this.odPlay(it, { queue: true, context: od.list });
        else this.odPlay(it, { context: od.list });
    };

    P.odPlayPlaylist = function () {
        const od = this.od, items = od.queue.map((k) => od.byKey.get(k)).filter(Boolean);
        if (!items.length) { this.odFlash('Playlist is empty. Press + on a video.'); return; }
        this.odPlay(items[0], { queue: true, context: items });
    };

    P.odPlay = function (item, { queue = false, context = null } = {}) {
        const od = this.od, v = this.video;
        this.odSaveProgress();                                     // remember the video we're leaving
        if (!od.hijacked) { od.saved = { volume: v.volume, muted: v.muted }; od.hijacked = true; }
        od.playing = item; od.playlistMode = queue; od.context = context || od.list;
        this.isOnDemandMode = true;
        this.onDemandCurrentProgram = item;                        // keep the old fields in step
        this.onDemandCurrentChannel = item.channelNum;
        this.activeScreen = 'onDemandPlayer';
        od.search.blur();
        od.root.classList.add('hidden');
        od.player.classList.remove('hidden');

        const channel = this.channels.get(item.channelNum);
        if (channel) this.updateChannelWatermark(channel);
        v.style.display = 'block';
        v.classList.remove('pip-mode');
        v.onloadedmetadata = null; v.onended = null;               // drop any leftover live-TV handlers
        v.muted = false; v.volume = read(LS_VOL, 1);

        const p = progressOf(item.path);
        const startAt = p && p.duration && p.time < p.duration - 15 ? p.time : 0;
        v.src = enc(item.path);
        v.addEventListener('loadedmetadata', () => { if (od.playing === item && startAt) v.currentTime = startAt; }, { once: true });
        const started = v.play(); if (started && started.catch) started.catch(() => {});

        const pos = od.context.findIndex((i) => i.key === item.key);
        od.now.textContent = item.title + (queue && pos >= 0 ? `    (${pos + 1} of ${od.context.length})` : '');
        this.odSyncButtons();
        this.odShowBar();
        clearInterval(od.saveTimer);
        od.saveTimer = setInterval(() => this.odSaveProgress(), 5000);
    };

    P.odSaveProgress = function () {
        const od = this.od, v = this.video;
        if (!od || !this.isOnDemandMode || !od.playing || v.ended || !isFinite(v.duration) || v.currentTime < 1) return;
        write('spooky-cable-progress-' + od.playing.path, { time: v.currentTime, duration: v.duration, timestamp: Date.now() });
    };

    P.odNeighbor = function (dir) {
        const od = this.od, i = od.context.findIndex((x) => x.key === od.playing.key);
        return i < 0 ? null : (od.context[i + dir] || null);
    };

    P.odEnded = function () {
        if (!this.isOnDemandMode) return;
        const od = this.od;
        try { localStorage.removeItem('spooky-cable-progress-' + od.playing.path); } catch (e) { /* ignore */ }
        const next = od.playlistMode ? this.odNeighbor(1) : null;
        if (next) this.odPlay(next, { queue: true, context: od.context });     // AUTOPLAY the playlist
        else this.odBackToLibrary();
    };

    P.odError = function () {
        if (!this.isOnDemandMode) return;
        this.odFlash('Could not play this video');
        const next = this.od.playlistMode ? this.odNeighbor(1) : null;
        if (next) setTimeout(() => { if (this.isOnDemandMode) this.odPlay(next, { queue: true, context: this.od.context }); }, 1500);
    };

    P.odBackToLibrary = function () {
        const od = this.od;
        this.odSaveProgress();
        this.video.pause();
        clearInterval(od.saveTimer);
        this.isOnDemandMode = false;          // closeOnDemand() hands the video back to live TV later
        od.player.classList.add('hidden');
        this.activeScreen = 'onDemand';
        od.root.classList.remove('hidden');
        this.odRender();                      // refresh "resume" bars; keeps view + selection
    };

    // ----- controls -----
    P.odTogglePlay = function () {
        const v = this.video;
        if (v.paused) { const r = v.play(); if (r && r.catch) r.catch(() => {}); } else v.pause();
    };
    P.odSkip = function (sec) {
        const v = this.video;
        v.currentTime = clamp(v.currentTime + sec, 0, v.duration || 0);
        this.odFlash(`${sec < 0 ? '⏪' : '⏩'} ${Math.abs(sec)}s`, true);
    };
    P.odVolume = function (d) {
        const v = this.video; v.muted = false;
        v.volume = clamp(Math.round((v.volume + d) * 100) / 100, 0, 1);
        write(LS_VOL, v.volume);
        this.odFlash(`🔊 ${Math.round(v.volume * 100)}%`, true);
    };
    P.odStep = function (dir) {                // next / previous video in the list being played
        const od = this.od, v = this.video;
        if (dir < 0 && v.currentTime > 5) { v.currentTime = 0; return; }       // like a CD player: restart first
        const t = this.odNeighbor(dir);
        if (t) this.odPlay(t, { queue: od.playlistMode, context: od.context });
        else this.odFlash(dir > 0 ? 'That was the last one' : 'This is the first one');
    };

    P.odPlayerClick = function (e) {
        const b = e.target.closest('[data-a]');
        if (!b) { if (!e.target.closest('.od-bar')) this.odTogglePlay(); return; }   // click the picture = play/pause
        ({
            play: () => this.odTogglePlay(), back: () => this.odSkip(-SKIP), fwd: () => this.odSkip(SKIP),
            prev: () => this.odStep(-1), next: () => this.odStep(1),
            mute: () => { this.video.muted = !this.video.muted; },
            exit: () => this.odBackToLibrary(),
        })[b.dataset.a]();
    };

    P.odPlayerKey = function (e) {
        const v = this.video, k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        this.odShowBar();
        if (k === ' ' || k === 'k') this.odTogglePlay();
        else if (k === 'ArrowLeft' || k === 'j') this.odSkip(-SKIP);
        else if (k === 'ArrowRight' || k === 'l') this.odSkip(SKIP);
        else if (k === 'ArrowUp') this.odVolume(0.1);
        else if (k === 'ArrowDown') this.odVolume(-0.1);
        else if (k === 'm') v.muted = !v.muted;
        else if (k === 'n') this.odStep(1);
        else if (k === 'p') this.odStep(-1);
        else if (k.length === 1 && k >= '0' && k <= '9') { if (v.duration) v.currentTime = (v.duration * +k) / 10; }   // 0-9 = jump to 0%-90%
        else if (k === 'Escape' || k === 'Backspace' || k === 'd') this.odBackToLibrary();
    };

    P.odTick = function () {
        if (!this.isOnDemandMode) return;
        const v = this.video, od = this.od, d = v.duration || 0;
        od.fill.style.width = d ? (v.currentTime / d) * 100 + '%' : '0%';
        od.time.textContent = fmt(v.currentTime) + ' / ' + fmt(d);
    };

    P.odSyncButtons = function () {
        const v = this.video, od = this.od;
        od.playBtn.innerHTML = v.paused ? '&#9654;' : '&#9208;';
        od.muteBtn.innerHTML = v.muted || v.volume === 0 ? '&#128263;' : '&#128266;';
        od.vol.value = v.muted ? 0 : v.volume;
    };

    // Show the control bar; hide it again after 3s of no activity (never while paused).
    P.odShowBar = function () {
        const od = this.od;
        od.player.classList.add('show');
        clearTimeout(od.hideTimer);
        if (!this.video.paused) od.hideTimer = setTimeout(() => od.player.classList.remove('show'), 3000);
    };

    P.odFlash = function (text, center) {            // little message: centre of the picture, or top toast
        const od = this.od, el = center ? od.osd : od.toast, timer = center ? 'osdTimer' : 'toastTimer';
        el.textContent = text; el.classList.add('show');
        clearTimeout(od[timer]); od[timer] = setTimeout(() => el.classList.remove('show'), 1300);
    };
})();
