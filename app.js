/**
 * Spooky Cable - 90s Cable TV Experience
 * Authentic cable TV interface with guide channel and scheduled programming
 */

class SpookyCable {
    constructor() {
        // Configuration
        this.config = null;
        this.mediaIndex = null;
        this.channels = new Map();

        // State
        this.isPoweredOn = false;
        this.currentChannel = 2;
        this.lastChannel = 2;
        this.volume = 0.5;
        this.isMuted = false;
        this.isRetroMode = false;

        // UI modes
        this.activeScreen = 'none';  // 'channel', 'guide', 'miniGuide', 'interactive', 'pipGuide', 'onDemand'
        this.numberEntryBuffer = '';
        this.numberEntryTimer = null;
        this.isPipGuideMode = false;  // Picture-in-picture guide mode
        this.beforePipChannel = null;  // Channel before entering PiP guide

        // Guide state
        this.guideScrollIndex = 0;
        this.guideScrollTimer = null;
        this.guideMessageIndex = 0;
        this.guideMessageTimer = null;
        this.interactiveRow = 0;
        this.interactiveCol = 0;
        this.interactiveIdleTimer = null;
        this.miniGuideRow = 0;

        // On-demand state
        this.onDemandCategoryIndex = 0;
        this.onDemandProgramIndex = 0;
        this.onDemandPane = 'categories';
        this.onDemandCategories = [];
        this.isOnDemandMode = false;
        this.onDemandCurrentProgram = null;
        this.onDemandCurrentChannel = null;
        this.onDemandProgressInterval = null;

        // Channel position tracking (for continuous playback when switching)
        this.channelPositions = new Map(); // channelNum -> { path, time, timestamp }

        // Audio context
        this.audioContext = null;
        this.muzakOscillator = null;

        // Time (with debug clock support)
        this.debugClockOffset = 0;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('clock')) {
            const debugTime = new Date(urlParams.get('clock')).getTime();
            this.debugClockOffset = debugTime - Date.now();
        }

        // DOM elements
        this.video = document.getElementById('mainVideo');
        this.powerScreen = document.getElementById('powerScreen');
        this.channelNumber = document.getElementById('channelNumber');
        this.numberEntry = document.getElementById('numberEntry');
        this.infoBanner = document.getElementById('infoBanner');
        this.miniGuide = document.getElementById('miniGuide');
        this.guideChannel = document.getElementById('guideChannel');
        this.interactiveGuide = document.getElementById('interactiveGuide');
        this.onDemandOverlay = document.getElementById('onDemandOverlay');
        this.volumeDisplay = document.getElementById('volumeDisplay');
        this.staticBurst = document.getElementById('staticBurst');
        this.helpHint = document.getElementById('helpHint');
        this.retroOverlay = document.getElementById('retroOverlay');
        this.promoCanvas = document.getElementById('promoCanvas');
        this.channelWatermark = document.getElementById('channelWatermark');

        this.init();
    }

    async init() {
        console.log('🎃 Spooky Cable initializing...');

        await this.loadConfig();
        await this.loadMediaIndex();
        this.buildChannels();
        this.setupEventListeners();

        console.log('✓ Ready! Press any key to power on.');
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json');
            this.config = await response.json();

            // Update personalized greeting
            if (this.config.girlfriendName && this.config.girlfriendName !== 'PLACEHOLDER_NAME') {
                document.getElementById('powerGreeting').textContent =
                    `Happy Halloween, ${this.config.girlfriendName}!`;
            }
        } catch (error) {
            console.warn('Could not load config, using defaults');
            this.config = { girlfriendName: '', networkName: 'Spooky Cable' };
        }
    }

    async loadMediaIndex() {
        try {
            const response = await fetch('media/index.json');
            this.mediaIndex = await response.json();
        } catch (error) {
            console.warn('Could not load media index');
            this.mediaIndex = { channels: {} };
        }
    }

    buildChannels() {
        // Channel 1: Guide
        this.channels.set(1, {
            number: 1,
            name: 'GUIDE',
            displayName: 'Program Guide',
            type: 'guide',
            logo: '📺'
        });

        // Channel 2: Scooby-Doo
        this.channels.set(2, {
            number: 2,
            name: 'SCOOBY',
            displayName: 'Scooby-Doo',
            type: 'media',
            logo: '🐕',
            files: this.getChannelFiles('scooby-doo'),
            totalDuration: this.getChannelTotalDuration('scooby-doo')
        });

        // Channel 3: Disney Channel Halloween
        this.channels.set(3, {
            number: 3,
            name: 'DISNEY',
            displayName: 'Disney Channel',
            type: 'media',
            logo: '✨',
            files: this.getChannelFiles('disney-halloween'),
            totalDuration: this.getChannelTotalDuration('disney-halloween')
        });

        // Channel 4: Cartoon Network Halloween
        this.channels.set(4, {
            number: 4,
            name: 'CN',
            displayName: 'Cartoon Network',
            type: 'media',
            logo: '🎨',
            files: this.getChannelFiles('cartoon-network'),
            totalDuration: this.getChannelTotalDuration('cartoon-network')
        });

        // Channel 5: Disney Classics
        this.channels.set(5, {
            number: 5,
            name: 'CLASSIC',
            displayName: 'Disney Classics',
            type: 'media',
            logo: '🏰',
            files: this.getChannelFiles('disney-classics'),
            totalDuration: this.getChannelTotalDuration('disney-classics')
        });

        // Channel 6: Classic Specials
        this.channels.set(6, {
            number: 6,
            name: 'SPECIAL',
            displayName: 'Classic Specials',
            type: 'media',
            logo: '📻',
            files: this.getChannelFiles('classic-specials'),
            totalDuration: this.getChannelTotalDuration('classic-specials')
        });

        // Channel 7: Kids & Family
        this.channels.set(7, {
            number: 7,
            name: 'FAMILY',
            displayName: 'Kids & Family',
            type: 'media',
            logo: '👨‍👩‍👧‍👦',
            files: this.getChannelFiles('kids-family'),
            totalDuration: this.getChannelTotalDuration('kids-family')
        });

        // Channel 8: Casper
        this.channels.set(8, {
            number: 8,
            name: 'CASPER',
            displayName: 'Casper',
            type: 'media',
            logo: '👻',
            files: this.getChannelFiles('casper'),
            totalDuration: this.getChannelTotalDuration('casper')
        });

        // Channel 9: Adult Swim
        this.channels.set(9, {
            number: 9,
            name: 'SWIM',
            displayName: 'Adult Swim',
            type: 'media',
            logo: '🌊',
            files: this.getChannelFiles('adult-swim'),
            totalDuration: this.getChannelTotalDuration('adult-swim')
        });

        console.log(`✓ Built ${this.channels.size} channels`);

        // Log channel content for debugging
        this.channels.forEach((channel, num) => {
            if (channel.type === 'media') {
                const fileCount = channel.files?.length || 0;
                const duration = channel.totalDuration ? (channel.totalDuration / 60000).toFixed(1) : '0';
                console.log(`  Ch ${num} (${channel.name}): ${fileCount} files, ${duration} min`);
            }
        });
    }

    getChannelFiles(channelKey) {
        // Get files from media index if available
        const channelData = this.mediaIndex.channels?.[channelKey];
        if (channelData && channelData.files) {
            return channelData.files;
        }
        // Return empty array if not found yet
        return [];
    }

    getChannelTotalDuration(channelKey) {
        // Get total duration from media index (in seconds) and convert to milliseconds
        const channelData = this.mediaIndex.channels?.[channelKey];
        if (channelData && channelData.total_duration) {
            return Math.floor(channelData.total_duration * 1000);
        }
        return 0;
    }

    // ============================================================
    // SCHEDULE ENGINE - Single source of truth
    // ============================================================

    getCurrentTime() {
        return Date.now() + this.debugClockOffset;
    }

    roundToHalfHour(timestamp) {
        const date = new Date(timestamp);
        const minutes = date.getMinutes();
        if (minutes < 30) {
            date.setMinutes(0);
        } else {
            date.setMinutes(30);
        }
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date.getTime();
    }

    getSchedule(channelNum, fromTime, toTime) {
        const channel = this.channels.get(channelNum);
        if (!channel) return [];

        const schedule = [];

        if (channel.type === 'guide') {
            // Guide channel shows itself
            for (let t = fromTime; t < toTime; t += 30 * 60 * 1000) {
                schedule.push({
                    channelNum,
                    title: 'Program Guide',
                    startTime: t,
                    endTime: t + 30 * 60 * 1000,
                    type: 'guide'
                });
            }
        } else if (channel.type === 'network') {
            // Network: rotating ads and bumpers
            const ads = [
                'Boo-Berry Bubble Bath',
                'Candy Corn Crunch',
                'Vampire Toothpaste',
                'Haunted House Realty',
                'Pumpkin Spice Everything'
            ];

            for (let t = fromTime; t < toTime; t += 30 * 60 * 1000) {
                const index = Math.floor(t / (30 * 60 * 1000)) % ads.length;
                schedule.push({
                    channelNum,
                    title: ads[index],
                    startTime: t,
                    endTime: t + 30 * 60 * 1000,
                    type: 'ad'
                });
            }
        } else if (channel.type === 'media' && channel.files && channel.files.length > 0 && channel.totalDuration > 0) {
            // Media channel: real content padded to 30-min boundaries
            const EPOCH = new Date('2024-10-01T00:00:00').getTime();

            for (let slotStart = fromTime; slotStart < toTime; slotStart += 30 * 60 * 1000) {
                const elapsed = (slotStart - EPOCH) % channel.totalDuration;

                // Find program at this time
                let programOffset = 0;
                let foundProgram = null;

                for (const file of channel.files) {
                    const fileDuration = file.duration * 1000;
                    if (elapsed >= programOffset && elapsed < programOffset + fileDuration) {
                        foundProgram = {
                            ...file,
                            startOffsetInFile: elapsed - programOffset,
                            programStart: slotStart - (elapsed - programOffset)
                        };
                        break;
                    }
                    programOffset += fileDuration;
                }

                if (foundProgram) {
                    schedule.push({
                        channelNum,
                        title: foundProgram.title,
                        startTime: foundProgram.programStart,
                        endTime: foundProgram.programStart + (foundProgram.duration * 1000),
                        duration: foundProgram.duration,
                        type: 'content',
                        path: foundProgram.path
                    });
                } else {
                    // Fallback
                    schedule.push({
                        channelNum,
                        title: 'Programming',
                        startTime: slotStart,
                        endTime: slotStart + 30 * 60 * 1000,
                        type: 'filler'
                    });
                }
            }
        }

        return schedule;
    }

    getCurrentProgram(channelNum) {
        const now = this.getCurrentTime();
        const schedule = this.getSchedule(channelNum, now - 2 * 60 * 60 * 1000, now + 1000);

        for (const prog of schedule) {
            if (now >= prog.startTime && now < prog.endTime) {
                return prog;
            }
        }

        return schedule[0] || null;
    }

    getNextProgram(channelNum) {
        const now = this.getCurrentTime();
        const schedule = this.getSchedule(channelNum, now, now + 4 * 60 * 60 * 1000);

        for (const prog of schedule) {
            if (prog.startTime > now) {
                return prog;
            }
        }

        return schedule[1] || null;
    }

    getCategoryIcon(program, channelNum) {
        if (!program || !program.title) return '';

        const channel = this.channels.get(channelNum);
        const channelName = channel ? channel.name.toLowerCase() : '';
        const title = program.title.toLowerCase();

        // Determine category based on channel name and title
        if (channelName.includes('halloween') || title.includes('pumpkin') || title.includes('halloween')) {
            return '🎃'; // Halloween Special
        } else if (channelName.includes('scooby') || title.includes('scooby')) {
            return '🦇'; // Spooky Series
        } else if (channelName.includes('movie') || title.includes('hocus pocus') || title.includes('casper')) {
            return '🎬'; // Movie
        } else if (title.includes('special')) {
            return '📺'; // TV Special
        }

        return '👻'; // Default spooky icon
    }

    formatProgramDuration(durationSeconds) {
        // Format duration for display in guide
        if (!durationSeconds) return '';

        const minutes = Math.floor(durationSeconds / 60);
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
    }

    shortenTitle(title, maxLength = 40) {
        if (!title || title.length <= maxLength) return title;

        // Remove common suffixes
        title = title.replace(/@\w+/g, '').trim();
        title = title.replace(/\(.*?\)/g, '').trim();
        title = title.replace(/Full Episode/gi, '').trim();
        title = title.replace(/Classic/gi, '').trim();

        // Abbreviate common words if still too long
        if (title.length > maxLength) {
            title = title.replace(/Halloween/gi, 'Hallow');
            title = title.replace(/Special/gi, 'Spcl');
            title = title.replace(/Episode/gi, 'Ep');
            title = title.replace(/Season/gi, 'S');
        }

        // Truncate if still too long
        if (title.length > maxLength) {
            title = title.substring(0, maxLength - 3) + '...';
        }

        return title;
    }

    // ============================================================
    // AUDIO SYSTEM
    // ============================================================

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playStaticSound() {
        this.initAudio();

        // White noise burst
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.15;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start();
    }

    playClickSound() {
        this.initAudio();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    playBeepSound() {
        this.initAudio();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.2);
    }

    playChannelWhoosh() {
        this.initAudio();

        if (this.isMuted) return;

        // Frequency sweep: 800Hz -> 200Hz over 200ms
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.start();
        osc.stop(now + 0.2);
    }

    startMuzak() {
        this.initAudio();

        if (this.muzakOscillator) return;  // Already playing

        // Weather Channel-style ambient music
        // Chord progression: Am - F - C - G (somber, atmospheric)
        const chords = [
            [220, 261.63, 329.63],  // Am (A3, C4, E4)
            [174.61, 220, 261.63],  // F  (F3, A3, C4)
            [261.63, 329.63, 392],  // C  (C4, E4, G4)
            [196, 246.94, 293.66]   // G  (G3, B3, D4)
        ];

        const gain = this.audioContext.createGain();

        // Add subtle delay for atmosphere
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = 0.3;
        const delayGain = this.audioContext.createGain();
        delayGain.gain.value = 0.15;

        gain.connect(this.audioContext.destination);
        gain.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.audioContext.destination);

        // Start with 3-second fade-in
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 3);

        const oscillators = [];
        let chordIndex = 0;
        const chordDuration = 7; // 7 seconds per chord

        const playChord = (startTime) => {
            const chord = chords[chordIndex];

            // Create 3 oscillators for the current chord
            const chordOscs = chord.map(freq => {
                const osc = this.audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                // Add subtle vibrato with LFO
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                lfo.frequency.value = 0.5; // Slow vibrato
                lfoGain.gain.value = 2; // Subtle pitch variation

                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);

                osc.connect(gain);

                osc.start(startTime);
                lfo.start(startTime);
                osc.stop(startTime + chordDuration);
                lfo.stop(startTime + chordDuration);

                return { osc, lfo };
            });

            oscillators.push(...chordOscs);

            // Schedule next chord
            chordIndex = (chordIndex + 1) % chords.length;
            this.muzakChordTimer = setTimeout(() => {
                if (this.muzakOscillator) {
                    playChord(this.audioContext.currentTime);
                }
            }, chordDuration * 1000);
        };

        // Start first chord
        playChord(this.audioContext.currentTime);

        this.muzakOscillator = { oscillators, gain, delay, delayGain };
    }

    stopMuzak() {
        if (this.muzakOscillator) {
            // 2-second fade-out
            const now = this.audioContext.currentTime;
            this.muzakOscillator.gain.gain.linearRampToValueAtTime(0, now + 2);

            // Clear chord timer
            if (this.muzakChordTimer) {
                clearTimeout(this.muzakChordTimer);
                this.muzakChordTimer = null;
            }

            // Stop all oscillators after fade-out
            setTimeout(() => {
                if (this.muzakOscillator) {
                    this.muzakOscillator = null;
                }
            }, 2100);
        }
    }

    // ============================================================
    // EVENT HANDLERS
    // ============================================================

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Mouse: click what is on now in any guide to tune to it
        document.getElementById('interactiveGridBody').addEventListener('click', (e) => this.handleInteractiveGuideClick(e));
        document.getElementById('guideGridBody').addEventListener('click', (e) => this.handlePassiveGuideClick(e));
        document.getElementById('miniGuideContent').addEventListener('click', (e) => this.handleMiniGuideClick(e));
        this.video.addEventListener('ended', () => this.onVideoEnded());
        this.video.addEventListener('error', () => this.onVideoError());
    }

    handleKeyPress(e) {
        // Power on
        if (!this.isPoweredOn) {
            this.powerOn();
            e.preventDefault();
            return;
        }

        // Route to active screen handler
        if (this.activeScreen === 'interactive') {
            this.handleInteractiveGuideKey(e);
        } else if (this.activeScreen === 'miniGuide') {
            this.handleMiniGuideKey(e);
        } else if (this.activeScreen === 'pipGuide') {
            this.handlePipGuideKey(e);
        } else if (this.activeScreen === 'onDemand') {
            this.handleOnDemandKey(e);
        } else {
            this.handleChannelKey(e);
        }

        e.preventDefault();
    }

    handleChannelKey(e) {
        // Number entry
        if (e.key >= '0' && e.key <= '9') {
            this.handleNumberEntry(e.key);
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
                this.channelUp();
                break;
            case 'ArrowDown':
                this.channelDown();
                break;
            case 'ArrowLeft':
                this.volumeDown();
                break;
            case 'ArrowRight':
                this.volumeUp();
                break;
            case 'Enter':
            case 'i':
            case 'I':
                this.showInfoBanner();
                break;
            case 'g':
            case 'G':
                this.togglePipGuide();
                break;
            case 'd':
            case 'D':
                this.openOnDemand();
                break;
            case 'l':
            case 'L':
                this.jumpToLastChannel();
                break;
            case 'm':
            case 'M':
                this.toggleMute();
                break;
            case 'r':
            case 'R':
                this.toggleRetroMode();
                break;
            case 'f':
            case 'F':
                this.toggleFullscreen();
                break;
        }
    }

    handleMiniGuideKey(e) {
        switch (e.key) {
            case 'ArrowUp':
                this.miniGuideUp();
                break;
            case 'ArrowDown':
                this.miniGuideDown();
                break;
            case 'Enter':
                this.selectMiniGuideChannel();
                break;
            case 'Escape':
                this.closeMiniGuide();
                break;
        }
    }

    handlePipGuideKey(e) {
        // Number keys switch channels while staying in PiP mode
        if (e.key >= '0' && e.key <= '9') {
            this.handleNumberEntry(e.key);
            return;
        }

        // In PiP guide mode, arrow keys open interactive guide
        if (e.key.startsWith('Arrow')) {
            this.switchToInteractiveGuideFromPip();
        } else if (e.key === 'g' || e.key === 'G') {
            // 'g' toggles back to full screen
            this.togglePipGuide();
        } else if (e.key === 'd' || e.key === 'D') {
            // 'd' opens on-demand mode
            this.exitPipGuide();
            this.openOnDemand();
        }
    }

    handleInteractiveGuideKey(e) {
        // Beside the PiP video, number keys change the PiP channel (same as the plain PiP guide)
        if (this.isPipGuideMode && e.key >= '0' && e.key <= '9') {
            this.handleNumberEntry(e.key);
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
                this.interactiveGuideUp();
                break;
            case 'ArrowDown':
                this.interactiveGuideDown();
                break;
            case 'ArrowLeft':
                this.interactiveGuideLeft();
                break;
            case 'ArrowRight':
                this.interactiveGuideRight();
                break;
            case 'PageUp':
                this.interactiveGuidePageUp();
                break;
            case 'PageDown':
                this.interactiveGuidePageDown();
                break;
            case 'Enter':
                this.selectInteractiveGuideCell();
                break;
            case 'Escape':
                this.closeInteractiveGuide();
                break;
        }

        // Reset idle timer
        clearTimeout(this.interactiveIdleTimer);
        this.interactiveIdleTimer = setTimeout(() => {
            if (this.currentChannel === 1) {
                this.closeInteractiveGuide();
            }
        }, 30000);
    }

    // ============================================================
    // POWER & CHANNEL SWITCHING
    // ============================================================

    powerOn() {
        console.log('📺 Powering on...');

        this.powerScreen.classList.add('hidden');
        this.isPoweredOn = true;

        this.initAudio();
        this.video.muted = false;
        this.video.volume = this.volume;

        // Show help hint
        this.helpHint.classList.remove('hidden');
        setTimeout(() => {
            this.helpHint.classList.add('hidden');
        }, 5000);

        this.tuneToChannel(this.currentChannel);
    }

    tuneToChannel(channelNum) {
        const channel = this.channels.get(channelNum);
        if (!channel) {
            console.warn(`Channel ${channelNum} not found`);
            return;
        }

        console.log(`📺 Tuning to Channel ${channelNum}: ${channel.name}`);

        // Save last channel (but not if we're on guide)
        if (this.currentChannel !== 1 && channelNum !== 1) {
            this.lastChannel = this.currentChannel;
        }

        this.currentChannel = channelNum;

        // Add smooth fade transition
        this.video.classList.add('fade-out');

        // Show static burst
        this.showStaticBurst();

        // Play tuner sound
        this.playClickSound();
        setTimeout(() => this.playStaticSound(), 50);

        // Play channel change whoosh sound
        this.playChannelWhoosh();

        // Show channel number and switch after fade
        setTimeout(() => {
            this.showChannelNumber(channelNum);

            // Clear any active screens (unless in PiP mode)
            if (!this.isPipGuideMode) {
                this.closeAllOverlays();
            }

            // Update channel watermark
            this.updateChannelWatermark(channel);

            // Keep any open guide pointing at the channel being watched
            this.syncGuideToCurrentChannel();

            // Tune based on type
            if (channel.type === 'guide') {
                this.showGuideChannel();
            } else if (channel.type === 'network') {
                this.playNetworkChannel();
            } else {
                this.playMediaChannel(channel);
            }

            // Fade in
            this.video.classList.remove('fade-out');
            this.video.classList.add('fade-in');

            setTimeout(() => {
                this.video.classList.remove('fade-in');
            }, 150);
        }, 150);
    }

    updateChannelWatermark(channel) {
        // Hide watermark on guide channel, show on all others
        if (channel.type === 'guide') {
            this.channelWatermark.classList.add('hidden');
        } else {
            document.getElementById('watermarkLogo').textContent = channel.logo || '📺';
            document.getElementById('watermarkName').textContent = channel.name || 'TV';
            this.channelWatermark.classList.remove('hidden');
        }
    }

    // Address of a video file. Each part of the path is encoded so names containing
    // '#', '?' or '%' still load (a raw '#' would cut the address short).
    mediaUrl(path) {
        return 'media/' + path.split('/').map(encodeURIComponent).join('/');
    }

    playMediaChannel(channel) {
        // Only change activeScreen if not in PiP guide mode
        if (!this.isPipGuideMode) {
            this.activeScreen = 'channel';
        }
        this.video.style.display = 'block';

        const now = this.getCurrentTime();
        const program = this.getCurrentProgram(channel.number);

        if (!program || !program.path) {
            console.warn('No program to play - showing off air screen');
            this.showOffAirScreen(channel);
            return;
        }

        // Calculate where in the video we should be based on schedule
        const elapsed = now - program.startTime;
        const seekTime = Math.max(0, elapsed / 1000);

        const newSrc = this.mediaUrl(program.path);

        // Check if we're already playing this exact file
        const currentPath = this.video.src ? this.video.src.split('media/').pop() : '';
        const newPath = program.path;
        const alreadyPlaying = currentPath && decodeURIComponent(currentPath) === newPath;

        if (alreadyPlaying) {
            // Already playing the right video - don't restart it
            console.log(`▶ Already playing: ${program.title} at ${this.video.currentTime.toFixed(1)}s`);
            if (this.video.paused) {
                this.video.play().catch(err => console.error('Playback error:', err));
            }
        } else {
            // Load new video and seek to schedule position
            console.log(`▶ Loading: ${program.title} at ${seekTime.toFixed(1)}s`);
            this.video.src = newSrc;

            // Wait for video to be ready, then seek
            this.video.onloadedmetadata = () => {
                this.video.currentTime = seekTime;
                this.video.play().catch(err => console.error('Playback error:', err));
            };
        }

        // When video ends, play next program in schedule
        this.video.onended = () => {
            console.log('Video ended, loading next program...');
            const nextProgram = this.getNextProgram(channel.number);
            if (nextProgram) {
                this.playMediaChannel(channel);
            }
        };
    }

    showOffAirScreen(channel) {
        this.video.style.display = 'none';

        // Create off-air screen
        const canvas = document.createElement('canvas');
        canvas.id = 'offAirCanvas';
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '10';

        const ctx = canvas.getContext('2d');

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
        gradient.addColorStop(0, '#1b1747');
        gradient.addColorStop(1, '#2a2370');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1920, 1080);

        // Channel logo
        ctx.font = '200px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(channel.logo || '📺', 960, 400);

        // Text
        ctx.font = 'bold 80px Fredoka, sans-serif';
        ctx.fillStyle = '#ff8a3d';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.fillText('Coming Soon', 960, 600);

        ctx.font = '48px Fredoka, sans-serif';
        ctx.fillStyle = '#fff4e0';
        ctx.fillText(channel.displayName || channel.name, 960, 700);

        // Remove any existing off-air canvas
        const existing = document.getElementById('offAirCanvas');
        if (existing) existing.remove();

        document.getElementById('stage').appendChild(canvas);
    }

    playNetworkChannel() {
        this.activeScreen = 'channel';

        // Render network promo content
        this.renderNetworkPromo();
    }

    renderNetworkPromo() {
        // Simple animated promo on canvas
        this.video.style.display = 'none';

        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '10';

        const ctx = canvas.getContext('2d');

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
        gradient.addColorStop(0, '#1b1747');
        gradient.addColorStop(1, '#2a2370');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1920, 1080);

        // Network name
        ctx.font = 'bold 140px Fredoka, sans-serif';
        ctx.fillStyle = '#ff8a3d';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.fillText(this.config.networkName || 'Spooky Cable', 960, 540);

        // Insert canvas
        document.getElementById('stage').appendChild(canvas);

        setTimeout(() => {
            canvas.remove();
            this.video.style.display = 'block';
        }, 3000);
    }

    showGuideChannel() {
        this.activeScreen = 'guide';
        this.video.style.display = 'none';
        this.guideChannel.classList.remove('hidden');

        // Start muzak
        this.startMuzak();

        // Build guide grid
        this.buildGuideGrid();

        // Start auto-scroll
        this.startGuideAutoScroll();

        // Start message rotation
        this.startMessageRotation();

        // Render promo window
        this.renderPromoWindow();

        // Update clock
        this.updateGuideClock();
        setInterval(() => this.updateGuideClock(), 1000);
    }

    buildGuideGrid() {
        const now = this.getCurrentTime();
        const roundedNow = this.roundToHalfHour(now);

        // Time column headers
        const header = document.getElementById('guideGridHeader');
        header.innerHTML = '';

        const cornerCell = document.createElement('div');
        cornerCell.className = 'guide-time-header';
        cornerCell.textContent = new Date(now).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        header.appendChild(cornerCell);

        for (let i = 0; i < 3; i++) {
            const slotTime = roundedNow + (i * 30 * 60 * 1000);
            const cell = document.createElement('div');
            cell.className = 'guide-time-header';
            cell.textContent = new Date(slotTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            header.appendChild(cell);
        }

        // Channel rows (7 visible at a time, will scroll)
        const body = document.getElementById('guideGridBody');
        body.innerHTML = '';

        const channelNums = Array.from(this.channels.keys()).sort((a, b) => a - b);

        for (let i = 0; i < channelNums.length; i++) {
            const channelNum = channelNums[i];
            const channel = this.channels.get(channelNum);

            const row = document.createElement('div');
            row.className = 'guide-channel-row';
            row.style.display = 'grid';
            row.dataset.index = i;

            // Channel cell
            const chCell = document.createElement('div');
            chCell.className = 'guide-channel-cell';
            chCell.innerHTML = `
                <div class="guide-ch-num">${channel.number}</div>
                <div class="guide-ch-name">${channel.displayName || channel.name}</div>
            `;
            row.appendChild(chCell);

            // Program cells with color coding
            let skip = 0;
            for (let slot = 0; slot < 3; slot++) {
                if (skip > 0) {
                    skip--;
                    continue;
                }

                const slotTime = roundedNow + (slot * 30 * 60 * 1000);
                const schedule = this.getSchedule(channelNum, slotTime, slotTime + 30 * 60 * 1000);
                const program = schedule[0];

                const progCell = document.createElement('div');
                progCell.className = 'guide-program-cell';

                if (slot === 0) {
                    progCell.classList.add('now-airing');
                }

                if (program) {
                    // Calculate how many 30-min slots this program spans
                    const programDurationMs = (program.duration || 1800) * 1000;
                    const slotsSpanned = Math.min(Math.ceil(programDurationMs / (30 * 60 * 1000)), 3 - slot);

                    // Color code based on program title hash
                    const colorIndex = Math.abs(program.title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 8;
                    progCell.classList.add(`program-color-${colorIndex}`);

                    if (slotsSpanned > 1) {
                        progCell.style.gridColumn = `span ${slotsSpanned}`;
                        skip = slotsSpanned - 1;
                    }

                    const categoryIcon = this.getCategoryIcon(program, channelNum);
                    const shortTitle = this.shortenTitle(program.title, 35);
                    const duration = program.duration ? this.formatProgramDuration(program.duration) : '';
                    progCell.innerHTML = `
                        <div class="guide-program-title">
                            <span class="guide-program-category">${categoryIcon}</span> ${shortTitle}
                        </div>
                        ${duration ? `<div class="guide-program-duration">${duration}</div>` : ''}
                    `;
                } else {
                    progCell.innerHTML = `<div class="guide-program-title">Off Air</div>`;
                }

                row.appendChild(progCell);
            }

            body.appendChild(row);
        }

        this.applyGuideRows({ ensureVisible: this.currentChannel });
        this.markCurrentChannelInGuides();
    }

    startGuideAutoScroll() {
        clearInterval(this.guideScrollTimer);

        // Beside the PiP video the list holds still on your channel; the arrow keys scroll it
        if (this.isPipGuideMode) return;

        this.guideScrollTimer = setInterval(() => {
            const body = document.getElementById('guideGridBody');
            const rows = body.querySelectorAll('.guide-channel-row');

            if (rows.length === 0) return;

            // Advance scroll position by 1 row each time
            this.guideScrollIndex = (this.guideScrollIndex + 1) % rows.length;

            // Show 7 consecutive rows starting from guideScrollIndex
            this.applyGuideRows();
        }, 8000);
    }

    startMessageRotation() {
        const messages = [
            `Happy Halloween${this.config.girlfriendName ? ', ' + this.config.girlfriendName : ''}! 🎃`,
            'Tonight: Spooky movies all night!',
            'Press G anytime for the guide',
            'Channel 3: Scooby-Doo Marathon',
            'Enjoy your Spooky Cable experience! 👻'
        ];

        const updateMessage = () => {
            document.getElementById('guideMessage').textContent = messages[this.guideMessageIndex];
            this.guideMessageIndex = (this.guideMessageIndex + 1) % messages.length;
        };

        updateMessage();
        clearInterval(this.guideMessageTimer);
        this.guideMessageTimer = setInterval(updateMessage, 5000);
    }

    renderPromoWindow() {
        const canvas = this.promoCanvas;
        const ctx = canvas.getContext('2d');

        canvas.width = 800;
        canvas.height = 400;

        let frame = 0;

        const animate = () => {
            if (this.activeScreen !== 'guide') return;

            // Gradient background
            const gradient = ctx.createLinearGradient(0, 0, 800, 400);
            gradient.addColorStop(0, '#5b3fa8');
            gradient.addColorStop(1, '#2a2370');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 800, 400);

            // Animated pumpkin
            const pumpkinY = 200 + Math.sin(frame * 0.05) * 20;
            ctx.font = '120px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🎃', 400, pumpkinY);

            // Text
            ctx.font = 'bold 48px Fredoka, sans-serif';
            ctx.fillStyle = '#fff4e0';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.fillText('Spooky Cable', 400, 350);

            frame++;
            requestAnimationFrame(animate);
        };

        animate();
    }

    updateGuideClock() {
        const now = new Date(this.getCurrentTime());
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });

        document.getElementById('guideClock').textContent = timeStr;

        const interactiveClock = document.getElementById('interactiveClock');
        if (interactiveClock) interactiveClock.textContent = timeStr;

        // Update footer with current time
        const footerTip = document.getElementById('guideFooterTip');
        if (footerTip) {
            footerTip.innerHTML = `${timeStr} | Press any arrow key for interactive guide`;
        }
    }

    // ============================================================
    // MINI GUIDE
    // ============================================================

    openMiniGuide() {
        // If on guide channel, switch to interactive instead
        if (this.currentChannel === 1) {
            this.switchToInteractiveGuide();
            return;
        }

        this.activeScreen = 'miniGuide';
        this.miniGuide.classList.remove('hidden');
        this.miniGuideRow = 2;  // Center on current channel

        this.buildMiniGuide();

        // Auto-close after 8 seconds
        setTimeout(() => {
            if (this.activeScreen === 'miniGuide') {
                this.closeMiniGuide();
            }
        }, 8000);
    }

    buildMiniGuide() {
        const content = document.getElementById('miniGuideContent');
        content.innerHTML = '';

        const channelNums = Array.from(this.channels.keys()).slice(1);  // Skip guide
        const centerIdx = channelNums.indexOf(this.currentChannel);

        // Show 5 channels centered on current
        for (let i = -2; i <= 2; i++) {
            const idx = centerIdx + i;
            if (idx < 0 || idx >= channelNums.length) continue;

            const channelNum = channelNums[idx];
            const channel = this.channels.get(channelNum);
            const program = this.getCurrentProgram(channelNum);

            const row = document.createElement('div');
            row.className = 'mini-guide-row';
            if (i === 0) row.classList.add('selected');
            row.dataset.offset = i;

            row.innerHTML = `
                <div class="mini-guide-channel">${channel.number}</div>
                <div class="mini-guide-name">${channel.displayName || channel.name}</div>
                <div class="mini-guide-show">${program ? program.title : 'Off Air'}</div>
                <div class="mini-guide-time">${program ? new Date(program.startTime).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'}) : ''}</div>
            `;

            content.appendChild(row);
        }
    }

    miniGuideUp() {
        this.playBeepSound();

        const rows = this.miniGuide.querySelectorAll('.mini-guide-row');
        rows.forEach(row => {
            let offset = parseInt(row.dataset.offset);
            offset++;
            row.dataset.offset = offset;
            row.classList.toggle('selected', offset === 0);
        });
    }

    miniGuideDown() {
        this.playBeepSound();

        const rows = this.miniGuide.querySelectorAll('.mini-guide-row');
        rows.forEach(row => {
            let offset = parseInt(row.dataset.offset);
            offset--;
            row.dataset.offset = offset;
            row.classList.toggle('selected', offset === 0);
        });
    }

    selectMiniGuideChannel() {
        const selected = this.miniGuide.querySelector('.mini-guide-row.selected');
        if (selected) {
            const channelNum = parseInt(selected.querySelector('.mini-guide-channel').textContent);
            this.closeMiniGuide();
            this.tuneToChannel(channelNum);
        }
    }

    closeMiniGuide() {
        this.activeScreen = 'channel';
        this.miniGuide.classList.add('hidden');
    }

    // ============================================================
    // PICTURE-IN-PICTURE GUIDE
    // ============================================================

    togglePipGuide() {
        if (this.isPipGuideMode) {
            // Exit PiP guide, return to full screen
            this.exitPipGuide();
        } else {
            // Enter PiP guide
            this.enterPipGuide();
        }
    }

    enterPipGuide() {
        // Save current channel
        this.beforePipChannel = this.currentChannel;

        // Set PiP mode
        this.isPipGuideMode = true;
        this.activeScreen = 'pipGuide';

        // Shrink video to top-left corner
        this.video.classList.add('pip-mode');
        this.channelWatermark.classList.add('hidden');

        // Show guide overlay
        this.guideChannel.classList.remove('hidden');

        // DON'T start muzak in PiP mode (only on channel 1)

        // Build guide grid
        this.buildGuideGrid();

        // Start auto-scroll
        this.startGuideAutoScroll();

        // Start message rotation
        this.startMessageRotation();

        // Render promo window
        this.renderPromoWindow();

        // Update clock
        this.updateGuideClock();
        if (!this.guideClockInterval) {
            this.guideClockInterval = setInterval(() => this.updateGuideClock(), 1000);
        }
    }

    exitPipGuide() {
        // Exit PiP mode
        this.isPipGuideMode = false;

        // Restore video to full screen
        this.video.classList.remove('pip-mode');

        // Hide guide
        this.guideChannel.classList.add('hidden');

        // Stop muzak
        this.stopMuzak();

        // Clear timers
        clearInterval(this.guideScrollTimer);
        clearInterval(this.guideMessageTimer);
        clearInterval(this.guideClockInterval);
        this.guideClockInterval = null;

        // Return to channel view
        this.activeScreen = 'channel';

        // Update watermark for current channel
        const channel = this.channels.get(this.currentChannel);
        if (channel) {
            this.updateChannelWatermark(channel);
        }
    }

    // ============================================================
    // GUIDE HELPERS: open on your channel, "you are here", click to tune
    // ============================================================

    sortedChannelNums() {
        return Array.from(this.channels.keys()).sort((a, b) => a - b);
    }

    getChannelRowIndex(channelNum) {
        const idx = this.sortedChannelNums().indexOf(channelNum);
        return idx >= 0 ? idx : 0;
    }

    // Show as many consecutive rows of the plain guide as actually fit on screen.
    //   { ensureVisible: channelNum }  start at that channel (pulled back when it is near the end
    //                                  of the list so the bottom of the list is all in view)
    //   no option                      start at guideScrollIndex and wrap around (the ambient auto-scroll)
    applyGuideRows({ ensureVisible = null } = {}) {
        const rows = Array.from(document.querySelectorAll('#guideGridBody .guide-channel-row'));
        if (rows.length === 0) return;
        const total = rows.length;

        const bottomEl = document.querySelector('.guide-bottom');
        const bottomRect = bottomEl.getBoundingClientRect();
        const k = (bottomRect.height / bottomEl.offsetHeight) || 1;   // the TV is scaled to fit the window
        const limit = bottomRect.bottom - 20 * k;                      // .guide-bottom has 20px bottom padding

        // Show rows from `start`; returns how many fit
        const fill = (start, wrap) => {
            rows.forEach((row) => { row.style.display = 'none'; });
            let shown = 0;
            for (let n = 0; n < total; n++) {
                if (!wrap && start + n >= total) break;
                const row = rows[(start + n) % total];
                row.style.display = 'grid';
                if (shown > 0 && row.getBoundingClientRect().bottom > limit) {
                    row.style.display = 'none';
                    break;
                }
                shown++;
            }
            return shown;
        };

        if (ensureVisible === null) {
            fill(((this.guideScrollIndex % total) + total) % total, true);
            return;
        }

        let start = this.getChannelRowIndex(ensureVisible);
        let shown = fill(start, false);
        while (start > 0 && start + shown >= total) {
            const earlier = fill(start - 1, false);
            if (start - 1 + earlier >= total) {
                start -= 1;
                shown = earlier;
            } else {
                break;
            }
        }
        fill(start, false);
        this.guideScrollIndex = start;
    }

    // Highlight the channel being watched in both guides
    markCurrentChannelInGuides() {
        const nums = this.sortedChannelNums();
        document.querySelectorAll('#guideGridBody .guide-channel-row').forEach((row) => {
            row.classList.toggle('current-channel', nums[parseInt(row.dataset.index)] === this.currentChannel);
        });
        document.querySelectorAll('#interactiveGridBody .interactive-channel-row').forEach((row) => {
            row.classList.toggle('current-channel', nums[parseInt(row.dataset.row)] === this.currentChannel);
        });
    }

    // The channel changed while a guide is open (e.g. number keys next to the PiP video)
    syncGuideToCurrentChannel() {
        this.markCurrentChannelInGuides();
        if (!this.isPipGuideMode) return;

        if (this.activeScreen === 'interactive') {
            this.interactiveRow = this.getChannelRowIndex(this.currentChannel);
            this.interactiveCol = 0;
            this.updateInteractiveCursor();
        } else {
            this.applyGuideRows({ ensureVisible: this.currentChannel });
        }
    }

    // Put the cursor on the program airing now on the channel being watched
    placeInteractiveCursorOnCurrentChannel() {
        this.interactiveRow = this.getChannelRowIndex(this.currentChannel);
        this.interactiveCol = 0;
    }

    // Scroll the interactive grid so the selected row is visible (the sticky time header is allowed for)
    scrollInteractiveRowIntoView({ center = false, smooth = true } = {}) {
        const grid = document.querySelector('.interactive-guide-grid');
        const row = document.querySelector(`.interactive-channel-row[data-row="${this.interactiveRow}"]`);
        if (!grid || !row) return;

        const header = document.getElementById('interactiveGridHeader');
        const headerH = header ? header.offsetHeight : 0;

        // The TV is scaled to fit the window, so convert screen pixels back to stage pixels
        const gridRect = grid.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const k = (gridRect.height / grid.clientHeight) || 1;
        const rowTop = (rowRect.top - gridRect.top) / k + grid.scrollTop;
        const rowH = rowRect.height / k;
        const viewH = grid.clientHeight;
        const pad = 12;

        let target = grid.scrollTop;
        if (this.interactiveRow === 0) {
            target = 0;
        } else if (center) {
            target = rowTop - headerH - ((viewH - headerH) - rowH) / 2;
        } else if (rowTop - headerH - pad < grid.scrollTop) {
            target = rowTop - headerH - pad;
        } else if (rowTop + rowH + pad > grid.scrollTop + viewH) {
            target = rowTop + rowH + pad - viewH;
        }

        grid.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
    }

    // Leave the guide and watch a channel (what Enter does on a program that is on now)
    tuneFromGuide(channelNum) {
        clearTimeout(this.interactiveIdleTimer);
        const sameChannel = channelNum === this.currentChannel;

        this.interactiveGuide.classList.add('hidden');
        this.interactiveGuide.classList.remove('pip-layout');

        if (this.isPipGuideMode) {
            this.exitPipGuide();   // the PiP video goes back to full screen
        } else if (sameChannel) {
            // Already on the Guide channel: back to the plain guide
            this.guideChannel.classList.remove('hidden');
            this.activeScreen = 'guide';
            this.startGuideAutoScroll();
            this.startMessageRotation();
            return;
        }

        if (!sameChannel) {
            this.tuneToChannel(channelNum);
        }
    }

    handleInteractiveGuideClick(e) {
        const rowEl = e.target.closest('.interactive-channel-row');
        if (!rowEl) return;

        const cell = e.target.closest('.interactive-program-cell');
        const onChannelCell = !!e.target.closest('.guide-channel-cell');
        if (!cell && !onChannelCell) return;

        // The cursor follows the click
        this.interactiveRow = parseInt(rowEl.dataset.row);
        this.interactiveCol = cell ? parseInt(cell.dataset.col) : 0;
        this.updateInteractiveCursor();

        // What is on now (or the channel itself): watch it and close the guide
        if (onChannelCell || cell.classList.contains('now-airing')) {
            this.tuneFromGuide(this.sortedChannelNums()[this.interactiveRow]);
        }
    }

    handlePassiveGuideClick(e) {
        const rowEl = e.target.closest('.guide-channel-row');
        if (!rowEl) return;

        const onNow = e.target.closest('.guide-channel-cell') || e.target.closest('.guide-program-cell.now-airing');
        if (!onNow) return;

        this.tuneFromGuide(this.sortedChannelNums()[parseInt(rowEl.dataset.index)]);
    }

    handleMiniGuideClick(e) {
        const row = e.target.closest('.mini-guide-row');
        if (!row) return;

        const channelNum = parseInt(row.querySelector('.mini-guide-channel').textContent);
        this.closeMiniGuide();
        if (channelNum !== this.currentChannel) {
            this.tuneToChannel(channelNum);
        }
    }

    // ============================================================
    // INTERACTIVE GUIDE
    // ============================================================

    switchToInteractiveGuideFromPip() {
        // Similar to switchToInteractiveGuide, but keeps PiP video visible
        this.activeScreen = 'interactive';
        this.guideChannel.classList.add('hidden');
        this.interactiveGuide.classList.add('pip-layout');   // PiP video on top-left, grid scrolls below it
        this.interactiveGuide.classList.remove('hidden');
        this.placeInteractiveCursorOnCurrentChannel();

        clearInterval(this.guideScrollTimer);
        clearInterval(this.guideMessageTimer);

        this.buildInteractiveGuide();

        // Start idle timer to return to PiP guide
        this.interactiveIdleTimer = setTimeout(() => {
            if (this.isPipGuideMode) {
                this.closeInteractiveGuideToPip();
            }
        }, 30000);
    }

    closeInteractiveGuideToPip() {
        clearTimeout(this.interactiveIdleTimer);

        // Return to PiP guide mode
        this.interactiveGuide.classList.add('hidden');
        this.interactiveGuide.classList.remove('pip-layout');
        this.guideChannel.classList.remove('hidden');
        this.activeScreen = 'pipGuide';
        this.startGuideAutoScroll();
        this.startMessageRotation();
    }

    switchToInteractiveGuide() {
        this.activeScreen = 'interactive';
        this.guideChannel.classList.add('hidden');
        this.interactiveGuide.classList.remove('pip-layout');
        this.interactiveGuide.classList.remove('hidden');
        this.placeInteractiveCursorOnCurrentChannel();

        clearInterval(this.guideScrollTimer);
        clearInterval(this.guideMessageTimer);

        this.buildInteractiveGuide();

        // Start idle timer
        this.interactiveIdleTimer = setTimeout(() => {
            if (this.currentChannel === 1) {
                this.closeInteractiveGuide();
            }
        }, 30000);
    }

    buildInteractiveGuide() {
        const now = this.getCurrentTime();
        const roundedNow = this.roundToHalfHour(now);

        // Time headers
        const header = document.getElementById('interactiveGridHeader');
        header.innerHTML = '';

        const cornerCell = document.createElement('div');
        cornerCell.className = 'guide-time-header';
        cornerCell.textContent = 'CHANNEL';
        header.appendChild(cornerCell);

        for (let i = 0; i < 6; i++) {
            const slotTime = roundedNow + (i * 30 * 60 * 1000);
            const cell = document.createElement('div');
            cell.className = 'guide-time-header';
            cell.textContent = new Date(slotTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            header.appendChild(cell);
        }

        // Channel rows
        const body = document.getElementById('interactiveGridBody');
        body.innerHTML = '';

        const channelNums = Array.from(this.channels.keys()).sort((a, b) => a - b);

        channelNums.forEach((channelNum, rowIdx) => {
            const channel = this.channels.get(channelNum);

            const row = document.createElement('div');
            row.className = 'interactive-channel-row';
            row.dataset.row = rowIdx;

            // Channel cell
            const chCell = document.createElement('div');
            chCell.className = 'guide-channel-cell';
            chCell.innerHTML = `
                <div class="guide-ch-num">${channel.number}</div>
                <div class="guide-ch-name">${channel.displayName || channel.name}</div>
            `;
            row.appendChild(chCell);

            // Program cells with color coding
            let skip = 0;
            for (let col = 0; col < 6; col++) {
                if (skip > 0) {
                    skip--;
                    continue;
                }

                const slotTime = roundedNow + (col * 30 * 60 * 1000);
                const schedule = this.getSchedule(channelNum, slotTime, slotTime + 30 * 60 * 1000);
                const program = schedule[0];

                const cell = document.createElement('div');
                cell.className = 'interactive-program-cell';
                cell.dataset.row = rowIdx;
                cell.dataset.col = col;

                if (col === 0) cell.classList.add('now-airing');
                if (rowIdx === this.interactiveRow && col === this.interactiveCol) {
                    cell.classList.add('selected');
                }

                if (program) {
                    // Calculate how many 30-min slots this program spans
                    const programDurationMs = (program.duration || 1800) * 1000;
                    const slotsSpanned = Math.min(Math.ceil(programDurationMs / (30 * 60 * 1000)), 6 - col);

                    // Color code based on program title hash
                    const colorIndex = Math.abs(program.title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 8;
                    cell.classList.add(`program-color-${colorIndex}`);

                    if (slotsSpanned > 1) {
                        cell.style.gridColumn = `span ${slotsSpanned}`;
                        skip = slotsSpanned - 1;
                    }

                    const categoryIcon = this.getCategoryIcon(program, channelNum);
                    const shortTitle = this.shortenTitle(program.title, 30);
                    const duration = program.duration ? this.formatProgramDuration(program.duration) : '';
                    cell.innerHTML = `
                        <span class="guide-program-category">${categoryIcon}</span> ${shortTitle}
                        ${duration ? `<div class="guide-program-duration">${duration}</div>` : ''}
                    `;
                } else {
                    cell.textContent = 'Off Air';
                }

                row.appendChild(cell);
            }

            body.appendChild(row);
        });

        this.markCurrentChannelInGuides();
        this.updateGuideClock();
        this.updateInteractiveDetail();
        this.scrollInteractiveRowIntoView({ center: true, smooth: false });
    }

    updateInteractiveDetail() {
        const detail = document.getElementById('interactiveDetail');
        const channelNums = Array.from(this.channels.keys()).sort((a, b) => a - b);
        const channelNum = channelNums[this.interactiveRow];
        const channel = this.channels.get(channelNum);

        const now = this.getCurrentTime();
        const roundedNow = this.roundToHalfHour(now);
        const slotTime = roundedNow + (this.interactiveCol * 30 * 60 * 1000);

        const schedule = this.getSchedule(channelNum, slotTime, slotTime + 30 * 60 * 1000);
        const program = schedule[0];

        if (program) {
            const startStr = new Date(program.startTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            const endStr = new Date(program.endTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });

            detail.innerHTML = `
                <div class="interactive-detail-left">CH ${channel.number}</div>
                <div>
                    <div class="interactive-detail-title">${program.title}</div>
                    <div class="interactive-detail-info">${channel.displayName || channel.name} • ${startStr} - ${endStr}</div>
                </div>
            `;
        } else {
            detail.innerHTML = `
                <div class="interactive-detail-left">CH ${channel.number}</div>
                <div>
                    <div class="interactive-detail-title">Off Air</div>
                    <div class="interactive-detail-info">${channel.displayName || channel.name}</div>
                </div>
            `;
        }
    }

    interactiveGuideUp() {
        this.playBeepSound();

        const channelCount = this.channels.size;
        this.interactiveRow = (this.interactiveRow - 1 + channelCount) % channelCount;

        this.updateInteractiveCursor();
    }

    interactiveGuideDown() {
        this.playBeepSound();

        const channelCount = this.channels.size;
        this.interactiveRow = (this.interactiveRow + 1) % channelCount;

        this.updateInteractiveCursor();
    }

    interactiveGuideLeft() {
        if (this.interactiveCol > 0) {
            this.playBeepSound();
            this.interactiveCol--;
            this.updateInteractiveCursor();
        }
    }

    interactiveGuideRight() {
        if (this.interactiveCol < 5) {
            this.playBeepSound();
            this.interactiveCol++;
            this.updateInteractiveCursor();
        }
    }

    interactiveGuidePageUp() {
        this.interactiveRow = Math.max(0, this.interactiveRow - 7);
        this.updateInteractiveCursor();
    }

    interactiveGuidePageDown() {
        const channelCount = this.channels.size;
        this.interactiveRow = Math.min(channelCount - 1, this.interactiveRow + 7);
        this.updateInteractiveCursor();
    }

    updateInteractiveCursor() {
        document.querySelectorAll('.interactive-program-cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            cell.classList.toggle('selected', row === this.interactiveRow && col === this.interactiveCol);
        });

        // Scroll selected row into view
        this.scrollInteractiveRowIntoView({ center: false, smooth: true });

        this.updateInteractiveDetail();
    }

    selectInteractiveGuideCell() {
        const channelNums = Array.from(this.channels.keys()).sort((a, b) => a - b);
        const channelNum = channelNums[this.interactiveRow];

        // Only tune if it's currently airing (col 0)
        if (this.interactiveCol === 0) {
            this.tuneFromGuide(channelNum);
        } else {
            // Show "Starts at" message
            const now = this.getCurrentTime();
            const roundedNow = this.roundToHalfHour(now);
            const slotTime = roundedNow + (this.interactiveCol * 30 * 60 * 1000);
            const timeStr = new Date(slotTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });

            alert(`This program starts at ${timeStr}`);
        }
    }

    closeInteractiveGuide() {
        clearTimeout(this.interactiveIdleTimer);

        if (this.isPipGuideMode) {
            // Return to PiP guide
            this.closeInteractiveGuideToPip();
        } else if (this.currentChannel === 1) {
            // Return to passive guide
            this.interactiveGuide.classList.add('hidden');
            this.guideChannel.classList.remove('hidden');
            this.activeScreen = 'guide';
            this.startGuideAutoScroll();
            this.startMessageRotation();
        } else {
            // Back to channel view
            this.interactiveGuide.classList.add('hidden');
            this.activeScreen = 'channel';
        }
    }

    // ============================================================
    // ON-DEMAND MODE
    // ============================================================

    openOnDemand() {
        this.activeScreen = 'onDemand';
        this.onDemandOverlay.classList.remove('hidden');

        // Initialize cursor position
        this.onDemandCategoryIndex = 0;
        this.onDemandProgramIndex = 0;
        this.onDemandPane = 'categories'; // 'categories' or 'programs'

        // Build category list
        this.buildOnDemandCategories();

        // Build program list for first category
        this.buildOnDemandPrograms();
    }

    buildOnDemandCategories() {
        const container = document.getElementById('onDemandCategories');
        container.innerHTML = '';

        // Get all media channels
        const mediaChannels = Array.from(this.channels.entries())
            .filter(([num, ch]) => ch.type === 'media' && ch.files && ch.files.length > 0)
            .sort((a, b) => a[0] - b[0]);

        mediaChannels.forEach(([num, channel], idx) => {
            const div = document.createElement('div');
            div.className = 'on-demand-category';
            div.dataset.index = idx;

            if (idx === this.onDemandCategoryIndex && this.onDemandPane === 'categories') {
                div.classList.add('selected');
            }

            div.innerHTML = `
                ${channel.logo || '📺'} ${channel.displayName || channel.name}
                <div style="font-size: 20px; margin-top: 5px; color: var(--candy-pink);">
                    ${channel.files.length} programs
                </div>
            `;

            container.appendChild(div);
        });

        this.onDemandCategories = mediaChannels;
    }

    buildOnDemandPrograms() {
        const container = document.getElementById('onDemandPrograms');
        container.innerHTML = '';

        if (this.onDemandCategories.length === 0) return;

        const [channelNum, channel] = this.onDemandCategories[this.onDemandCategoryIndex];

        channel.files.forEach((program, idx) => {
            const div = document.createElement('div');
            div.className = 'on-demand-program';
            div.dataset.index = idx;

            if (idx === this.onDemandProgramIndex && this.onDemandPane === 'programs') {
                div.classList.add('selected');
            }

            const categoryIcon = this.getCategoryIcon(program, channelNum);
            const duration = program.duration ? this.formatProgramDuration(program.duration) : 'Unknown';

            // Get saved progress from localStorage
            const progressKey = `spooky-cable-progress-${program.path}`;
            const savedProgress = localStorage.getItem(progressKey);
            let progressText = '';
            if (savedProgress) {
                const progress = JSON.parse(savedProgress);
                const percent = Math.floor((progress.time / program.duration) * 100);
                progressText = `<div class="on-demand-program-progress">Resume at ${percent}%</div>`;
            }

            div.innerHTML = `
                <div class="on-demand-program-icon">${categoryIcon}</div>
                <div class="on-demand-program-info">
                    <div class="on-demand-program-title">${program.title}</div>
                    <div class="on-demand-program-meta">${channel.displayName || channel.name}</div>
                    ${progressText}
                </div>
                <div class="on-demand-program-duration">${duration}</div>
            `;

            container.appendChild(div);
        });

        this.updateOnDemandDetail();
    }

    updateOnDemandDetail() {
        const detail = document.getElementById('onDemandDetail');

        if (this.onDemandCategories.length === 0) return;

        const [channelNum, channel] = this.onDemandCategories[this.onDemandCategoryIndex];
        const program = channel.files[this.onDemandProgramIndex];

        if (program) {
            const duration = program.duration ? this.formatProgramDuration(program.duration) : 'Unknown';
            const categoryIcon = this.getCategoryIcon(program, channelNum);

            detail.innerHTML = `
                <div class="on-demand-detail-title">${categoryIcon} ${program.title}</div>
                <div class="on-demand-detail-info">
                    ${channel.displayName || channel.name} • ${duration}
                </div>
            `;
        }
    }

    onDemandCategoryUp() {
        this.playBeepSound();
        const categoryCount = this.onDemandCategories.length;
        this.onDemandCategoryIndex = (this.onDemandCategoryIndex - 1 + categoryCount) % categoryCount;
        this.onDemandProgramIndex = 0; // Reset program index
        this.buildOnDemandCategories();
        this.buildOnDemandPrograms();
    }

    onDemandCategoryDown() {
        this.playBeepSound();
        const categoryCount = this.onDemandCategories.length;
        this.onDemandCategoryIndex = (this.onDemandCategoryIndex + 1) % categoryCount;
        this.onDemandProgramIndex = 0; // Reset program index
        this.buildOnDemandCategories();
        this.buildOnDemandPrograms();
    }

    onDemandProgramUp() {
        this.playBeepSound();
        if (this.onDemandCategories.length === 0) return;
        const [channelNum, channel] = this.onDemandCategories[this.onDemandCategoryIndex];
        const programCount = channel.files.length;
        this.onDemandProgramIndex = (this.onDemandProgramIndex - 1 + programCount) % programCount;
        this.buildOnDemandPrograms();
    }

    onDemandProgramDown() {
        this.playBeepSound();
        if (this.onDemandCategories.length === 0) return;
        const [channelNum, channel] = this.onDemandCategories[this.onDemandCategoryIndex];
        const programCount = channel.files.length;
        this.onDemandProgramIndex = (this.onDemandProgramIndex + 1) % programCount;
        this.buildOnDemandPrograms();
    }

    onDemandSwitchPane() {
        this.playClickSound();
        this.onDemandPane = this.onDemandPane === 'categories' ? 'programs' : 'categories';
        this.buildOnDemandCategories();
        this.buildOnDemandPrograms();
    }

    selectOnDemandProgram() {
        if (this.onDemandCategories.length === 0) return;

        const [channelNum, channel] = this.onDemandCategories[this.onDemandCategoryIndex];
        const program = channel.files[this.onDemandProgramIndex];

        if (!program) return;

        // Close on-demand overlay
        this.closeOnDemand();

        // Play the program
        this.playOnDemandProgram(channelNum, program);
    }

    playOnDemandProgram(channelNum, program) {
        // Set to on-demand mode
        this.isOnDemandMode = true;
        this.onDemandCurrentProgram = program;
        this.onDemandCurrentChannel = channelNum;

        // Load video
        const channel = this.channels.get(channelNum);
        this.video.style.display = 'block';
        this.video.src = this.mediaUrl(program.path);

        // Check for saved progress
        const progressKey = `spooky-cable-progress-${program.path}`;
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            this.video.currentTime = progress.time;
        } else {
            this.video.currentTime = 0;
        }

        this.video.play();

        // Update watermark
        this.updateChannelWatermark(channel);

        // Save progress periodically
        this.onDemandProgressInterval = setInterval(() => {
            const progress = {
                time: this.video.currentTime,
                duration: this.video.duration,
                timestamp: Date.now()
            };
            localStorage.setItem(progressKey, JSON.stringify(progress));
        }, 5000);

        // Handle video end
        this.video.onended = () => {
            // Clear progress
            localStorage.removeItem(progressKey);
            clearInterval(this.onDemandProgressInterval);

            // Return to on-demand menu
            this.openOnDemand();
        };
    }

    closeOnDemand() {
        this.activeScreen = 'channel';
        this.onDemandOverlay.classList.add('hidden');

        // Clear on-demand mode if active
        if (this.isOnDemandMode) {
            clearInterval(this.onDemandProgressInterval);
            this.isOnDemandMode = false;
            this.video.onended = null;
        }
    }

    handleOnDemandKey(e) {
        switch (e.key) {
            case 'ArrowUp':
                if (this.onDemandPane === 'categories') {
                    this.onDemandCategoryUp();
                } else {
                    this.onDemandProgramUp();
                }
                break;
            case 'ArrowDown':
                if (this.onDemandPane === 'categories') {
                    this.onDemandCategoryDown();
                } else {
                    this.onDemandProgramDown();
                }
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                this.onDemandSwitchPane();
                break;
            case 'Enter':
                this.selectOnDemandProgram();
                break;
            case 'd':
            case 'D':
            case 'Escape':
                this.closeOnDemand();
                break;
        }
    }

    // ============================================================
    // UI HELPERS
    // ============================================================

    showStaticBurst() {
        this.staticBurst.classList.remove('hidden');
        setTimeout(() => {
            this.staticBurst.classList.add('hidden');
        }, 300);
    }

    showChannelNumber(num) {
        document.getElementById('channelNumText').textContent = num;
        this.channelNumber.classList.remove('hidden');

        setTimeout(() => {
            this.channelNumber.classList.add('hidden');
        }, 3000);
    }

    showInfoBanner() {
        const channel = this.channels.get(this.currentChannel);
        const program = this.getCurrentProgram(this.currentChannel);
        const nextProgram = this.getNextProgram(this.currentChannel);

        if (!channel || !program) return;

        document.getElementById('infoChannelNum').textContent = channel.number;
        document.getElementById('infoChannelName').textContent = channel.displayName || channel.name;
        document.getElementById('infoTitle').textContent = program.title;

        const startStr = new Date(program.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        const endStr = new Date(program.endTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        document.getElementById('infoTime').textContent = `${startStr} - ${endStr}`;

        // Duration and progress
        const now = this.getCurrentTime();
        const totalDuration = (program.endTime - program.startTime) / 60000; // minutes
        const elapsed = (now - program.startTime) / 60000; // minutes
        const progress = ((now - program.startTime) / (program.endTime - program.startTime)) * 100;

        const elapsedMin = Math.floor(Math.max(0, elapsed));
        const totalMin = Math.floor(totalDuration);
        const progressPercent = Math.floor(Math.min(100, Math.max(0, progress)));

        document.getElementById('infoDuration').textContent = `${elapsedMin} of ${totalMin} minutes (${progressPercent}% complete)`;
        document.getElementById('infoProgress').style.width = `${progressPercent}%`;

        // Next program
        if (nextProgram) {
            document.getElementById('infoNextTitle').textContent = nextProgram.title;
            const nextTimeStr = new Date(nextProgram.startTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            document.getElementById('infoNextTime').textContent = `at ${nextTimeStr}`;
        }

        this.infoBanner.classList.remove('hidden');

        setTimeout(() => {
            this.infoBanner.classList.add('hidden');
        }, 5000);
    }

    handleNumberEntry(digit) {
        this.numberEntryBuffer += digit;
        document.getElementById('entryText').textContent = this.numberEntryBuffer;
        this.numberEntry.classList.remove('hidden');

        clearTimeout(this.numberEntryTimer);
        this.numberEntryTimer = setTimeout(() => {
            const num = parseInt(this.numberEntryBuffer);
            this.numberEntryBuffer = '';
            this.numberEntry.classList.add('hidden');

            if (this.channels.has(num)) {
                this.tuneToChannel(num);
            } else {
                // Show "No channel" briefly
                document.getElementById('entryText').textContent = 'No channel';
                this.numberEntry.classList.remove('hidden');
                setTimeout(() => {
                    this.numberEntry.classList.add('hidden');
                }, 2000);
            }
        }, 2000);
    }

    closeAllOverlays() {
        this.miniGuide.classList.add('hidden');
        this.guideChannel.classList.add('hidden');
        this.interactiveGuide.classList.add('hidden');
        this.infoBanner.classList.add('hidden');

        clearInterval(this.guideScrollTimer);
        clearInterval(this.guideMessageTimer);
        clearTimeout(this.interactiveIdleTimer);

        this.stopMuzak();

        // Remove off-air or network promo canvases
        const offAir = document.getElementById('offAirCanvas');
        if (offAir) offAir.remove();

        const existingCanvases = document.querySelectorAll('#stage > canvas');
        existingCanvases.forEach(canvas => {
            if (canvas.id !== 'promoCanvas') canvas.remove();
        });

        this.video.style.display = 'block';
    }

    channelUp() {
        const channelNums = Array.from(this.channels.keys());
        const idx = channelNums.indexOf(this.currentChannel);
        const nextIdx = (idx + 1) % channelNums.length;
        this.tuneToChannel(channelNums[nextIdx]);
    }

    channelDown() {
        const channelNums = Array.from(this.channels.keys());
        const idx = channelNums.indexOf(this.currentChannel);
        const nextIdx = (idx - 1 + channelNums.length) % channelNums.length;
        this.tuneToChannel(channelNums[nextIdx]);
    }

    jumpToLastChannel() {
        if (this.lastChannel !== this.currentChannel) {
            this.tuneToChannel(this.lastChannel);
        }
    }

    volumeUp() {
        this.volume = Math.min(1, this.volume + 0.1);
        this.video.volume = this.volume;
        this.showVolumeDisplay();
    }

    volumeDown() {
        this.volume = Math.max(0, this.volume - 0.1);
        this.video.volume = this.volume;
        this.showVolumeDisplay();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.video.muted = this.isMuted;
        this.showVolumeDisplay();
    }

    showVolumeDisplay() {
        document.getElementById('volumeBar').style.width = `${this.volume * 100}%`;
        document.getElementById('volumeMuteIndicator').classList.toggle('active', this.isMuted);

        this.volumeDisplay.classList.remove('hidden');

        setTimeout(() => {
            this.volumeDisplay.classList.add('hidden');
        }, 2000);
    }

    toggleRetroMode() {
        this.isRetroMode = !this.isRetroMode;
        this.retroOverlay.classList.toggle('hidden', !this.isRetroMode);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    onVideoEnded() {
        // Loop or move to next
        this.playMediaChannel(this.channels.get(this.currentChannel));
    }

    onVideoError() {
        console.error('Video error - skipping');
        setTimeout(() => {
            this.playMediaChannel(this.channels.get(this.currentChannel));
        }, 1000);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.spookyCable = new SpookyCable();
    });
} else {
    window.spookyCable = new SpookyCable();
}
