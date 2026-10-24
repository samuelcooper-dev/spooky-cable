"""
Fill the empty Late Night channel (channel 9) and add it to media/index.json.

Why channel 9 was off air: the app builds each channel from media/index.json. The
`late-night` folder was empty and had no entry in the index, so the channel had nothing
to schedule and showed the off-air screen.

What this does:
  1. Shows every channel and how many videos it has (so you can spot any other empty one).
  2. Links the videos listed in PICKS (below) into media/late-night. These are hard links,
     so they take no extra disk space and the originals stay on their own channels.
     (If a hard link isn't possible it copies the file instead.)
  3. Measures each video's length with ffprobe.
  4. Adds a "late-night" entry to media/index.json (a backup is saved first).

Usage:
    python C:\\Users\\sampc\\tv\\fill_late_night.py              # do it
    python C:\\Users\\sampc\\tv\\fill_late_night.py --dry-run    # just show what would happen
Then refresh the TV page (Ctrl+Shift+R).

To change what plays on Late Night, edit PICKS below and run it again. Paths are relative
to the media folder. Videos that are in late-night but no longer in PICKS are left alone.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

TV_DIR = Path(__file__).resolve().parent
MEDIA_DIR = TV_DIR.parent / "media"
INDEX = MEDIA_DIR / "index.json"
CHANNEL_KEY = "late-night"
CHANNEL_DIR = MEDIA_DIR / CHANNEL_KEY

# What plays on Late Night, in this order (path relative to the media folder).
PICKS = [
    "kids-family/Season 2 Marathon Full Episodes Goosebumps.mp4",
    "classic-specials/Wishbone - The Legend of Sleepy Hollow.mp4",
    "classic-specials/Arthur's Scary Stories (FULL VHS).mp4",
    "cartoon-network/FULL EPISODE Haunted Teen Titans Cartoon Network.mp4",
    "disney-classics/Disneys Haunted Halloween 1983.mp4",
]


def probe_duration(path: Path) -> float | None:
    """Length in seconds, or None if the file can't be read."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, timeout=120,
        )
        value = float(out.stdout.strip())
        return value if value > 0 else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def show_channels(index: dict) -> None:
    print("Channels in the index:")
    channels = index.get("channels", {})
    folders = sorted(p.name for p in MEDIA_DIR.iterdir() if p.is_dir())
    for name in sorted(set(folders) | set(channels)):
        files = channels.get(name, {}).get("files", [])
        on_disk = len(list((MEDIA_DIR / name).glob("*.mp4"))) if (MEDIA_DIR / name).is_dir() else 0
        mark = "" if files else "   <-- EMPTY (this channel would show off air)"
        print(f"  {name:<20} {len(files):>2} in index, {on_disk:>2} on disk{mark}")
    print()


def link_into_channel(source: Path, target: Path) -> str:
    if target.exists() and target.stat().st_size == source.stat().st_size:
        return "already there"
    if target.exists():
        target.unlink()
    try:
        os.link(source, target)
        return "linked (no extra space)"
    except OSError:
        shutil.copy2(source, target)
        return "copied"


def main() -> None:
    parser = argparse.ArgumentParser(description="Fill the Late Night channel")
    parser.add_argument("--dry-run", action="store_true", help="show what would happen, change nothing")
    args = parser.parse_args()

    if not INDEX.exists():
        sys.exit(f"Could not find {INDEX}")
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    index.setdefault("channels", {})

    show_channels(index)

    if not args.dry_run:
        CHANNEL_DIR.mkdir(exist_ok=True)

    entries, problems = [], []
    for rel in PICKS:
        source = MEDIA_DIR / rel
        name = source.name
        if not source.exists():
            problems.append(f"missing: {rel}")
            continue
        if source.stat().st_size == 0:
            problems.append(f"empty (0 bytes): {rel}")
            continue
        duration = probe_duration(source)
        if duration is None:
            problems.append(f"could not read (is ffprobe installed?): {rel}")
            continue

        target = CHANNEL_DIR / name
        how = "would link" if args.dry_run else link_into_channel(source, target)
        print(f"  {how:<24} {duration / 60:6.1f} min  {name}")
        entries.append({
            "filename": name,
            "path": f"{CHANNEL_KEY}/{name}",
            "duration": round(duration, 3),
            "title": source.stem,
        })

    for problem in problems:
        print(f"  SKIPPED  {problem}")

    if not entries:
        sys.exit("\nNothing to add - check the names in PICKS.")

    total = round(sum(e["duration"] for e in entries), 3)
    print(f"\nLate Night: {len(entries)} videos, {total / 3600:.1f} hours total")

    if args.dry_run:
        print("Dry run - nothing was changed.")
        return

    shutil.copy2(INDEX, INDEX.with_name("index.json.bak"))
    index["channels"][CHANNEL_KEY] = {"files": entries, "total_duration": total}
    index["generated"] = time.time()
    tmp = INDEX.with_name("index.json.tmp")
    tmp.write_text(json.dumps(index, indent=2), encoding="utf-8")
    tmp.replace(INDEX)
    print(f"Updated {INDEX} (backup: index.json.bak)")
    print("Now refresh the TV page with Ctrl+Shift+R.")


if __name__ == "__main__":
    main()
