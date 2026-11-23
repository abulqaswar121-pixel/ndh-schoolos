"""Render the approval sample from real browser-captured frames, never drawn app screens.
Requires capture.mjs output and the selected voice assets. Intermediates remain ignored.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json, math, re, subprocess, textwrap, sys, os
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
ROOT = Path(__file__).resolve().parents[2]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
ROLE = os.environ.get('ROLE')
CACHE = ROOT/'.cache/walkthrough-recordings'
if ROLE: CACHE = CACHE/'roles'/ROLE
PREFIX = 'ndh-' + ROLE.replace('_','-') + '-screen' if ROLE else 'ndh-owner-screen'
OUT = ROOT/'public/videos'
DOCS = ROOT/('docs/walkthroughs/v6-roles/'+ROLE if ROLE else 'docs/walkthroughs/v6-owner')
source = json.loads((DOCS/'source.json').read_text())
font_file = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold_file = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def run(args):
    return subprocess.run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', *map(str,args)], check=True, capture_output=True)
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def clock(sec, srt=False):
    ms=round(sec*1000); h,ms=divmod(ms,3600000); m,ms=divmod(ms,60000); s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02}{"," if srt else "."}{ms:03}'
# Both versions share audio, duration and cuts, so resizing keeps the same lesson position.
time=0
for scene in source['scenes']:
    if hashlib.sha256(scene['narration'].encode()).hexdigest()!=scene['narrationSha256']:
        raise ValueError('Spoken text changed without preparing matching audio')
    captures=[json.loads((CACHE/v/scene['id']/'capture.json').read_text()) for v in ['phone','desktop']]
    scene['renderDurationSec']=math.ceil(max([scene['durationSec']]+[c['elapsedSec'] for c in captures])*24)/24
    scene['startSec']=round(time,6); time+=scene['renderDurationSec']
source['durationSec']=round(time,6)
# Phrase captions retain the actual spoken words; no claims of word-level alignment.
cues=[]
for scene in source['scenes']:
    lines=textwrap.wrap(scene['narration'],42,break_long_words=False,break_on_hyphens=False)
    blocks=['\n'.join(lines[i:i+2]) for i in range(0,len(lines),2)]
    weights=[max(1,len(b)) for b in blocks]; total=sum(weights)
    minimums=[max(1, len(b)/22) for b in blocks]
    extra=scene['audioDurationSec']-sum(minimums)
    if extra < 0: raise ValueError('Caption reading speed exceeds 22 characters/second')
    cur=scene['startSec']+1
    for block,weight,minimum in zip(blocks,weights,minimums):
        end=cur+minimum+extra*weight/total
        cues.append((cur,end,block));cur=end
vtt='WEBVTT\n\n'+'\n\n'.join(f'{i}\n{clock(start)} --> {clock(end)}\n{block}' for i,(start,end,block) in enumerate(cues,1))+'\n'
srt='\n\n'.join(f'{i}\n{clock(start,True)} --> {clock(end,True)}\n{block}' for i,(start,end,block) in enumerate(cues,1))+'\n'
(OUT/(PREFIX+'-v6.en.vtt')).write_text(vtt)
(OUT/(PREFIX+'-v6.en.srt')).write_text(srt)
(DOCS/'admin.en.vtt').write_text(vtt)
(DOCS/'admin.en.srt').write_text(srt)

def render_scene(job):
    variant,scene=job; phone=variant=='phone'; key=scene['id']
    w,h=(720,1280) if phone else (1280,720)
    top=48 if phone else 32; bottom=90 if phone else 48
    content_h=h-top-bottom
    raw_w,raw_h=(780,1300) if phone else (1280,640)
    scale=min(w/raw_w,content_h/raw_h); sw,sh=round(raw_w*scale),round(raw_h*scale)
    x=(w-sw)//2; y=top+(content_h-sh)//2
    overlay=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(overlay)
    d.rectangle((0,0,w,top), fill='#0a192f');d.rectangle((0,h-bottom,w,h),fill='#0a192f')
    f=ImageFont.truetype(bold_file,20 if phone else 16)
    d.text((18,top/2),('OWNER' if not ROLE else ROLE.replace('_',' ').upper())+'  /  '+variant.upper()+'  /  DEMO DATA',font=f,fill='#9ed9d6',anchor='lm')
    d.text((w-18,top/2),f"{int(key)} / {len(source['scenes'])}",font=f,fill='white',anchor='rm')
    f=ImageFont.truetype(bold_file,23 if phone else 21)
    lines=textwrap.wrap(scene['instruction'],47 if phone else 100)
    yy=h-bottom+14
    for line in lines: d.text((18,yy),line,font=f,fill='white'); yy+=29
    overlay_path=CACHE/variant/f'{key}-overlay.png';overlay.save(overlay_path)
    meta=json.loads((CACHE/variant/key/'capture.json').read_text())
    audio=CACHE/'audio'/f'{key}.wav'
    if digest(audio)!=scene['wavSha256']:raise ValueError('Audio checksum changed')
    output=CACHE/variant/f'{key}.mp4'
    run(['-framerate',meta['frames']/scene['renderDurationSec'],'-i',CACHE/variant/key/'%06d.jpg',
         '-i',audio,'-loop','1','-i',overlay_path,
         '-filter_complex',f'[0:v]scale={sw}:{sh}:flags=lanczos:in_range=pc:out_range=tv,setsar=1,pad={w}:{h}:{x}:{y}:color=0x0a192f[screen];[screen][2:v]overlay=0:0[v];[1:a]adelay=1000:all=1,apad[a]',
         '-map','[v]','-map','[a]','-t',scene['renderDurationSec'],'-r','24','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p',
         '-color_range','tv','-c:a','aac','-b:a','80k','-ar','48000','-movflags','+faststart','-threads','2',output])
    print(variant,key,'encoded',flush=True)
    # The poster is an actual frame from the opening homepage, with the same labels.
    if key=='01':
        run(['-ss','3','-i',output,'-frames:v','1','-update','1',OUT/f'poster-{PREFIX}-{variant}-v6.jpg'])
if '--metadata-only' not in sys.argv:
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(render_scene,[(v,s) for v in ['phone','desktop'] for s in source['scenes']]))
variants={}
for variant in ['phone','desktop']:
    listing=CACHE/variant/'concat.txt'
    listing.write_text(''.join(f"file '{CACHE/variant/(s['id']+'.mp4')}'\n" for s in source['scenes']))
    video=OUT/f'{PREFIX}-{variant}-v6.mp4'
    if '--metadata-only' not in sys.argv:
        run(['-f','concat','-safe','0','-i',listing,'-c','copy','-movflags','+faststart',video])
    run(['-i',video,'-f','null','-'])
    variants[variant]={'videoSrc':'/videos/'+video.name,'posterSrc':f'/videos/poster-{PREFIX}-{variant}-v6.jpg','aspectRatio':'9 / 16' if variant=='phone' else '16 / 9'}
metadata={'roleId':ROLE or 'admin','title':source['title'],'durationSec':source['durationSec'],
          'durationLabel':f'{math.ceil(time)//60}:{math.ceil(time)%60:02}',
          'oneLiner':'Real app screens with fictional demo records: registration → owner sign-in → settings & school link → staff → optional Quran module → A4 preview → app-install guidance.',
          'captionsSrc':'/videos/'+PREFIX+'-v6.en.vtt','variants':variants,
          'chapters':[{'label':s['label'],'startSec':s['startSec']} for s in source['scenes']]}
if ROLE:
    metadata['oneLiner']='Actual role screens with fictional demo data: '+' → '.join(s['label'] for s in source['scenes'])+'.'
    (DOCS/'player.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
else:
    (ROOT/'src/data/ownerScreenTutorialV6.ts').write_text('// Generated by scripts/walkthrough-studio/render.py. Do not hand-edit.\nexport const OWNER_SCREEN_TUTORIAL_V6 = '+json.dumps(metadata,ensure_ascii=False,indent=2)+' as const;\n')
manifest={'status':'screen-tutorial-release' if ROLE else 'owner-screen-release','format':source['format'],'durationSec':source['durationSec'],'fullDecodeVerified':True,'variants':variants,
          'chapters':metadata['chapters'],'files':{str(p.relative_to(ROOT)):{'bytes':p.stat().st_size,'sha256':digest(p)} for p in sorted(OUT.glob('*'+PREFIX+'*v6*'))},
          'sourceSha256':digest(DOCS/'source.json')}
(DOCS/'media-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(DOCS/'chapters.json').write_text(json.dumps(metadata['chapters'],ensure_ascii=False,indent=2)+'\n')
# Store the measured source only after all media have encoded/decoded successfully.
(DOCS/'timings.json').write_text(json.dumps({'durationSec':source['durationSec'],'scenes':[{'id':s['id'],'startSec':s['startSec'],'durationSec':s['renderDurationSec']} for s in source['scenes']]},indent=2)+'\n')
print('Complete:',source['durationSec'],'seconds, two independent screen recordings, shared captions and chapters.')
