"""Prepare the selected-voice recording for this one approval sample. No synthesis.
Paragraph cuts were reviewed against silencedetect (-35dB, 0.28 seconds).
The first short paragraph gap is 14.485–15.089; others exceed 1.1 seconds.
"""
from pathlib import Path
import hashlib, json, re, subprocess
import imageio_ffmpeg
ROOT = Path(__file__).resolve().parents[2]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SOURCE = ROOT / 'docs/walkthroughs/v6-owner/source.json'
AUDIO = ROOT / 'public/videos/narration-v6-owner'
CACHE = ROOT / '.cache/walkthrough-recordings/audio'
CACHE.mkdir(parents=True, exist_ok=True)
source = json.loads(SOURCE.read_text())
cuts = [0, 14.787, 28.440, 42.818, 57.940, 71.038, 80.480]
ids = ['01', '02', '04', '05', '06', '07']
for i, key in enumerate(ids):
    subprocess.run([FFMPEG, '-y', '-v', 'error', '-ss', str(74.035 if key == '07' else cuts[i]), '-t', str(cuts[i+1]-(74.035 if key == '07' else cuts[i])), '-i', str(AUDIO/'combined.mp3'), '-ar', '24000', str(CACHE/f'{key}.wav')], check=True)
for scene in source['scenes']:
    key = scene['id']
    path = CACHE/f'{key}.wav'
    if key not in ids:
        subprocess.run([FFMPEG, '-y', '-v', 'error', '-i', str(AUDIO/f'{key}.mp3'), '-ar', '24000', str(path)], check=True)
    p = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path), '-f', 'null', '-'], capture_output=True, text=True, check=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', p.stderr)
    seconds = int(m[1])*3600 + int(m[2])*60 + float(m[3])
    scene['audioDurationSec'] = seconds
    scene['durationSec'] = round(seconds + 2, 3)
    scene['narrationSha256'] = hashlib.sha256(scene['narration'].encode()).hexdigest()
    scene['wavSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    print(key, scene['durationSec'])
source['audioSources'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(AUDIO.glob('*.mp3'))}
SOURCE.write_text(json.dumps(source, ensure_ascii=False, indent=2)+'\n')
