# Spooky Cable - Feature Screenshots Reference

This document explains all the feature screenshots captured for documentation and marketing purposes.

## Complete Screenshot List

### Basic Features

**feature-01-power-screen.png**
- Shows the TV in "off" state before turning on
- Black screen with subtle power indicator
- First impression users see

**feature-02-live-tv.png**
- Standard live TV viewing mode
- Channel 2 (Spooky Cable Network)
- Shows channel watermark, clean UI
- Main viewing experience

**feature-03-info-banner.png**
- Info banner overlay (press I)
- Shows current program title, time, description
- "Up Next" section preview
- Demonstrates the retro cable TV aesthetic

**feature-04-volume.png**
- Volume indicator overlay
- Shows visual feedback for volume changes
- Retro-styled volume bar

### Guide Features

**feature-05-guide-channel.png**
- Channel 1 - The Guide Channel
- Full-screen scrolling program guide
- Shows all channels and current programming
- Prevue-style retro guide aesthetic

**feature-06-pip-guide.png**
- Picture-in-picture guide mode (press G)
- Video continues playing in top-left corner
- Guide fills the main area
- Allows browsing while watching

**feature-07-interactive-guide.png**
- Interactive guide with cursor navigation
- Arrow keys to navigate grid
- Current selection highlighted
- Shows time slots and program details

**feature-08-interactive-guide-nav.png**
- Interactive guide with different cell selected
- Shows navigation in action
- Different channel/time slot highlighted
- Demonstrates grid navigation UX

### Advanced Features

**feature-09-fullscreen.png**
- Fullscreen mode (press F)
- Immersive viewing experience
- Hides browser UI completely
- Best for TV/projector setups

**feature-10-retro-mode.png**
- Retro mode enabled (press R)
- CRT scanlines visible
- Vignette effect around edges
- Authentic 90s TV aesthetic
- Can be toggled on/off

### On-Demand Features

**feature-11-ondemand-library.png**
- On-demand library main screen (press D)
- Category list on left (Scooby-Doo, Disney, etc.)
- Program grid on right
- Search and navigation controls
- Modern streaming UI meets retro aesthetic

**feature-12-ondemand-programs.png**
- Program selection in on-demand
- Shows program titles, durations
- Resume progress indicators
- Category icons and metadata
- Demonstrates browsing UX

**feature-13-ondemand-player.png**
- On-demand video player
- Full playback of selected program
- Clean playback interface
- Shows video in fullscreen player mode

**feature-14-ondemand-controls.png**
- On-demand player with controls visible
- Seek bar, volume slider, playback controls
- Skip forward/back buttons
- Playlist controls (next/previous)
- Modern video player features

### Channel Demos

**feature-15-channel-5.png**
- Channel 5 (Classic Halloween Specials)
- Shows different channel branding
- Demonstrates channel variety
- Example of themed programming

**feature-16-pip-channel-switch.png**
- PiP mode with channel switching
- Shows you can change channels while in guide
- Video in corner updates to new channel
- Advanced feature demonstration

**feature-17-channel-8.png**
- Channel 8 (Adult Swim / Late Night)
- Another channel example
- Shows programming diversity
- Different aesthetic from other channels

## Usage Guide

### For README / Documentation
Use these screenshots to demonstrate:
- Core features (01-04)
- Guide functionality (05-08)
- Advanced modes (09-10)
- On-demand system (11-14)

### For Marketing / Social Media
Best screenshots for sharing:
- **feature-02** - Clean live TV view
- **feature-06** - Cool PiP guide feature
- **feature-07** - Retro guide aesthetic
- **feature-11** - Modern on-demand UI
- **feature-10** - Retro mode (nostalgic appeal)

### For Technical Documentation
Show implementation details with:
- **feature-08** - Interactive guide grid
- **feature-14** - Player controls
- **feature-16** - Advanced PiP functionality

## Screenshot Specifications

- **Resolution**: 1920×1080 (Full HD)
- **Format**: PNG (lossless)
- **Viewport**: Matches TV canvas size exactly
- **Browser**: Chromium (Playwright)
- **Captured**: Automated via `capture_features.js`

## Updating Screenshots

To recapture all screenshots:

```bash
# Make sure server is running
python serve.py

# In another terminal
cd tv
node capture_features.js
```

Or use the batch file:
```bash
cd tv
capture_screenshots.bat
```

## Notes

- Some screenshots may show "No media" if video files aren't available
- Screenshots capture the actual running app, not mockups
- All UI states are real and functional
- Guide data reflects actual media index

## Future Screenshot Ideas

Consider capturing:
- Multi-channel surfing animation (GIF)
- Mobile responsive view
- Different theme variations
- Search functionality in action
- Playlist creation flow
- Resume playback feature
- Error states / offline mode

---

**Last Updated**: October 24, 2026
**Script**: `capture_features.js`
**Total Screenshots**: 17 feature screenshots
