# 🎃 Spooky Cable

A fully-functional retro 90s cable TV simulator with Halloween programming. Watch live channels, browse an interactive program guide, and stream on-demand content—all in a pixel-perfect CRT aesthetic.

![Spooky Cable](https://img.shields.io/badge/channels-9-orange?style=flat-square) ![Status](https://img.shields.io/badge/status-haunted-purple?style=flat-square) ![Made with](https://img.shields.io/badge/made%20with-👻-yellow?style=flat-square)

## ✨ Features

### 📺 Live TV
- **9 themed channels** with continuous Halloween programming
- **Schedule-based playback** - channels play at the "correct" time (using HTTP Range requests for seeking)
- **Channel surfing** with smooth transitions and retro static effects
- **Video watermarks** and channel branding

### 📋 Interactive Guide
- **Picture-in-Picture guide** - video keeps playing in the corner while browsing
- **Full-screen interactive grid** with cursor navigation
- **Click-to-tune** - click any now-airing program to watch it
- **Auto-scrolling channel listings** with program schedules

### 🎬 On-Demand Library
- **Thumbnail grid** with all available content
- **Search and filters** by title, channel, or category
- **Persistent playlists** - add videos, reorder, and save across sessions
- **Full video player** with:
  - Play/pause, seek bar, volume controls
  - 10-second skip forward/backward
  - Resume playback from where you left off
  - Playlist autoplay
  - Mouse and keyboard controls

### 🎨 Retro Aesthetic
- **CRT scanlines** and vignette effects (toggle with R)
- **Retro UI elements** - channel numbers, info banners, volume display
- **Period-accurate fonts** and color schemes
- **Static burst** and channel change sounds

## 🚀 Quick Start

### Prerequisites
- Python 3.7+ (for the server)
- Modern web browser (Chrome, Firefox, Edge)
- Optional: ffmpeg (for generating video thumbnails)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/samuelcooper-dev/spooky-cable.git
   cd spooky-cable
   ```

2. **Add your media**

   Create folders in `../media/` (parent directory) for each channel:
   ```
   media/
   ├── scooby-doo/
   ├── disney-halloween/
   ├── cartoon-network/
   ├── disney-classics/
   ├── classic-specials/
   ├── kids-family/
   ├── casper/
   └── adult-swim/
   ```

   Add `.mp4` video files to these folders.

3. **Generate the media index**
   ```bash
   python generate_index.py
   ```

4. **Start the server**
   ```bash
   python serve.py
   ```

5. **Open in browser**

   Navigate to: `http://localhost:8000/tv/`

### Optional: Generate Thumbnails

For the On-Demand library to show video thumbnails:
```bash
# Requires ffmpeg
python make_thumbs.py
```

## 🎮 Controls

### General
- **Power On**: Any key
- **Channel Up/Down**: ↑ / ↓ or Page Up/Down
- **Number Entry**: 1-9 (type channel number)
- **Last Channel**: Enter
- **Volume**: + / - or mouse wheel
- **Mute**: M
- **Info**: I (show program info)
- **Fullscreen**: F
- **Retro Mode**: R (toggle scanlines)

### Guide
- **Open Guide**: G
- **Interactive Guide**: Arrow keys while in guide
- **Exit Guide**: Escape or G again

### On-Demand
- **Open Library**: D
- **Navigate**: Arrow keys
- **Search**: / (slash)
- **Play Video**: Enter
- **Add to Playlist**: +
- **Player Controls**: Space (play/pause), J/L (skip), Arrow keys (seek/volume)
- **Exit**: D or Escape

## 📁 Project Structure

```
tv/
├── index.html          # Main HTML structure
├── app.js              # Live TV and guide logic
├── style.css           # Main styles
├── ondemand.js         # On-Demand library (wraps app.js)
├── ondemand.css        # On-Demand styles
├── scale.js            # Viewport scaling for retro TV look
├── serve.py            # HTTP server with Range request support
├── make_thumbs.py      # Generate thumbnails from videos
└── config.json         # Network name and personalization

media/
├── index.json          # Auto-generated media catalog
└── [channel-folders]/  # Video files organized by channel
```

## 🔧 Configuration

Edit `config.json` to customize:
```json
{
  "networkName": "Spooky Cable",
  "girlfriendName": "Your Name"
}
```

## 🎃 Channel Lineup

1. **Program Guide** - Auto-scrolling schedule
2. **Scooby-Doo** - Classic mysteries
3. **Disney Channel** - Halloween specials
4. **Cartoon Network** - Spooky cartoons
5. **Disney Classics** - Vintage Halloween
6. **Classic Specials** - Nostalgic favorites
7. **Kids & Family** - Family-friendly scares
8. **Casper** - The friendly ghost
9. **Adult Swim** - Late-night programming

## 🛠️ Technical Details

### Key Technologies
- **Vanilla JavaScript** - No frameworks, pure DOM manipulation
- **CSS Grid** - Responsive layouts
- **Web Audio API** - Retro sound effects and muzak
- **HTML5 Video** - Schedule-based playback with Range requests
- **LocalStorage** - Persistent playlists and resume points

### How It Works
- **Schedule Engine**: Each channel has a looping schedule based on video durations
- **Seeking**: Custom Python server supports HTTP Range requests for mid-video seeks
- **PiP Guide**: CSS grid layout keeps video visible while browsing
- **On-Demand**: Separate module that wraps live TV without modifying core code

## 📝 Testing

Run the included Playwright tests:
```bash
# Regression test (live TV + guide)
node regression_test.js

# On-Demand test suite
node od_test.js

# Guide requirements test
node test_guide_requirements.js
```

## 🎨 Future Ideas

- [ ] Multiple theme packs (80s, 2000s, etc.)
- [ ] DVR functionality (record and playback)
- [ ] Picture-in-Picture mode (browser API)
- [ ] Multi-user watch parties
- [ ] Custom channel creation
- [ ] Video analytics dashboard

## 📜 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

Built with nostalgia for the golden age of cable TV, before streaming took over. Remember when you had to actually *find* what was on TV?

---

**Happy Halloween! 👻📺**

*Built by [Sam](https://github.com/samuelcooper-dev) with assistance from Claude*
