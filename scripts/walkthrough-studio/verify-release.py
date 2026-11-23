"""Read-only media verification; optionally record the release report with --write-report."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2]
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
release=json.loads((ROOT/'docs/walkthroughs/v6-roles/media-manifest.json').read_text())
results=[]
for role in release['roles']:
    for name,file in role['files'].items():
        b=(ROOT/name).read_bytes()
        assert len(b)==file['bytes'] and hashlib.sha256(b).hexdigest()==file['sha256'],name
    for variant,source in role['variants'].items():
        path=ROOT/('public'+source['videoSrc'])
        result=subprocess.run([FFMPEG,'-hide_banner','-i',str(path),'-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
        log=result.stderr
        assert re.search(r'Video: h264',log) and re.search(r'Audio: aac',log),str(path)
        expected=(720,1280) if variant=='phone' else (1280,720)
        assert f'{expected[0]}x{expected[1]}' in log and 'SAR 1:1' in log,str(path)
        m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',log);duration=int(m[1])*3600+int(m[2])*60+float(m[3])
        assert abs(duration-role['durationSec'])<0.1,str(path)
        mean=float(re.search(r'mean_volume: (-?[\d.]+) dB',log)[1]);peak=float(re.search(r'max_volume: (-?[\d.]+) dB',log)[1])
        assert -35<mean<-5 and peak<=0,(str(path),mean,peak)
        row={'roleId':role['roleId'],'variant':variant,'videoSrc':source['videoSrc'],'width':expected[0],'height':expected[1],'durationSec':duration,'videoCodec':'h264','audioCodec':'aac','sampleAspectRatio':'1:1','fullDecodeVerified':True,'meanVolumeDb':mean,'peakVolumeDb':peak,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        results.append(row);print(role['roleId'],variant,duration,'seconds',mean,'dB; full decode OK',flush=True)
report={'status':'verified','videos':results,'boundaries':'Fictional isolated demo screens; does not verify live accounts, native installation, reconnect sync, or physical printers.'}
if '--write-report' in sys.argv:(ROOT/'docs/walkthroughs/v6-roles/verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified all 14 screen tutorial MP4s and release media checksums.')
