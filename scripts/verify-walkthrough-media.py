#!/usr/bin/env python3
"""Read-only checksum, full A/V decode and audible-narration verification."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
try:
    import imageio_ffmpeg
    FF = os.environ.get('FFMPEG_BINARY') or imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FF = os.environ.get('FFMPEG_BINARY', 'ffmpeg')
manifest = json.loads((ROOT/'docs/walkthroughs/v5/media-manifest.json').read_text())
metadata = json.loads((ROOT/'docs/walkthroughs/v5/chapters.json').read_text())
for role, plan in zip(manifest['roles'], metadata['roles']):
    assert role['roleId'] == plan['roleId']
    for name, expected in role['files'].items():
        data = (ROOT/'public'/name.lstrip('/')).read_bytes()
        assert len(data) == expected['bytes'] and hashlib.sha256(data).hexdigest() == expected['sha256'], name
    video = ROOT/'public'/plan['videoSrc'].lstrip('/')
    result = subprocess.run([FF, '-hide_banner', '-xerror', '-i', str(video), '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    log = result.stderr
    assert 'Video: h264' in log and 'Audio: aac' in log
    mean = float(re.search(r'mean_volume: ([-\d.]+) dB', log)[1])
    assert -45 < mean < -3, f'{role["roleId"]}: inaudible or over-loud narration ({mean} dB)'
    match = re.search(r'Duration: (\d+):(\d+):([\d.]+)', log)
    actual = int(match[1])*3600 + int(match[2])*60 + float(match[3])
    assert abs(actual-role['durationSec']) < 0.1, (actual, role['durationSec'])
    print(role['roleId'], 'full decode OK;', actual, 'seconds;', mean, 'dB narration')
