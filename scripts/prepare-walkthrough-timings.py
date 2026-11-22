#!/usr/bin/env python3
"""Align scene cuts to paragraph pauses in the seven already-synthesised narrations.
Requires imageio-ffmpeg (or FFMPEG_BINARY); never synthesises/substitutes a voice.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
try:
    import imageio_ffmpeg
    FFMPEG = os.environ.get('FFMPEG_BINARY') or imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG = os.environ.get('FFMPEG_BINARY', 'ffmpeg')
source = ROOT / 'docs/walkthroughs/v5/source.json'
pack = json.loads(source.read_text())
pack['status'] = 'narrated-illustrated-release'
pack['timingBasis'] = 'Scene cuts conformed to measured paragraph pauses in the selected narration; English caption phrases timed within each spoken scene.'
pack['voiceDescription'] = 'User-selected English female educational narrator; not a verified Nigerian-English accent.'
pack['visualFormat'] = 'Illustrated workflow guides, not recordings of a live school account.'
for role in pack['roles']:
    audio = ROOT / 'public/videos/narration-v5' / (role['roleId'] + '.mp3')
    result = subprocess.run([FFMPEG, '-hide_banner', '-i', str(audio), '-af', 'silencedetect=noise=-35dB:d=0.2', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    log = result.stderr
    match = re.search(r'Duration: (\d+):(\d+):([\d.]+)', log)
    if not match:
        raise ValueError('No audio duration: ' + role['roleId'])
    duration = int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3])
    gaps = [tuple(map(float, values)) for values in re.findall(r'silence_start: ([\d.]+)\s*\n.*?silence_end: ([\d.]+) \| silence_duration: ([\d.]+)', log)]
    internal = [gap for gap in gaps if gap[0] > 1 and gap[1] < duration - 0.5]
    chosen = sorted(sorted(internal, key=lambda gap: -gap[2])[:len(role['scenes']) - 1])
    if len(chosen) != len(role['scenes']) - 1 or min(g[2] for g in chosen) < 0.6:
        raise ValueError('Paragraph pauses need manual review: ' + role['roleId'])
    cuts = [0] + [round((g[0] + g[1]) / 2, 3) for g in chosen] + [round(duration + 0.6, 3)]
    leading = next((g[1] for g in gaps if g[0] == 0), 0)
    for i, scene in enumerate(role['scenes']):
        scene['durationSec'] = round(cuts[i + 1] - cuts[i], 3)
        scene['speechStartSec'] = round(leading if i == 0 else chosen[i - 1][1], 3)
        scene['speechEndSec'] = round(chosen[i][0] if i < len(chosen) else duration - 0.08, 3)
        assert scene['durationSec'] > 4 and scene['speechEndSec'] > scene['speechStartSec']
    text = '\n\n'.join(s['narration'] for s in role['scenes'])
    role['audioSource'] = '/videos/narration-v5/' + role['roleId'] + '.mp3'
    role['narrationSha256'] = hashlib.sha256(text.encode()).hexdigest()
    role['audioSha256'] = hashlib.sha256(audio.read_bytes()).hexdigest()
    print(role['roleId'], 'duration', cuts[-1], 'paragraph cuts', cuts[1:-1])
source.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + '\n')
