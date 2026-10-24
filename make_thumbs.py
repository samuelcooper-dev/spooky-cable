"""
make_thumbs.py - make a thumbnail picture for every video so On-Demand can show a grid.

For each  media/<channel>/<name>.mp4  it writes  media/<channel>/<name>.jpg  (480 px wide)
next to the video. It skips videos that already have one, and 0-byte/broken files.
The frame is picked by ffmpeg's "thumbnail" filter (it avoids black/blank frames) a little
way into the video.

Run it any time new videos finish compressing:
    python C:\\Users\\sampc\\tv\\make_thumbs.py            # only the missing ones
    python C:\\Users\\sampc\\tv\\make_thumbs.py --force    # redo all
Needs ffmpeg + ffprobe on PATH (compress.py already needs them).
"""

import argparse
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"


def duration(path: Path) -> float:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, timeout=120)
        return float(out.stdout.strip())
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return 0.0


def make_one(video: Path, force: bool) -> str:
    jpg = video.with_suffix(".jpg")
    if jpg.exists() and not force:
        return "have"
    if video.stat().st_size == 0:
        return "skip (0 bytes)"
    length = duration(video)
    if length <= 0:
        return "skip (unreadable)"
    # ~12% in (past intros), but never past the end
    start = min(max(length * 0.12, 2.0), max(length - 2.0, 0.0))
    tmp = video.with_suffix(".jpg.tmp.jpg")           # ffmpeg picks the format from the extension
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.2f}", "-i", str(video),
           "-vf", "thumbnail=120,scale=480:-2", "-frames:v", "1", "-q:v", "4", str(tmp)]
    try:
        subprocess.run(cmd, check=True, timeout=180, capture_output=True)
        tmp.replace(jpg)
        return "made"
    except (subprocess.SubprocessError, OSError) as exc:
        tmp.unlink(missing_ok=True)
        return f"FAILED ({exc.__class__.__name__})"


def main() -> None:
    ap = argparse.ArgumentParser(description="Make thumbnails for On-Demand")
    ap.add_argument("--force", action="store_true", help="redo thumbnails that already exist")
    ap.add_argument("-w", "--workers", type=int, default=4)
    args = ap.parse_args()

    videos = sorted(MEDIA_DIR.glob("*/*.mp4"))
    if not videos:
        sys.exit(f"No videos found under {MEDIA_DIR}")
    print(f"{len(videos)} videos")
    counts = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for video, result in zip(videos, pool.map(lambda v: make_one(v, args.force), videos)):
            key = result.split(" ")[0]
            counts[key] = counts.get(key, 0) + 1
            if result not in ("have",):
                print(f"  {result:<18} {video.parent.name}/{video.name}")
    print("\nDone:", ", ".join(f"{n} {k}" for k, n in sorted(counts.items())))


if __name__ == "__main__":
    main()
