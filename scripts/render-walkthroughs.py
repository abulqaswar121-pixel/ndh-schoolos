#!/usr/bin/env python3
"""Render labelled, narrated workflow illustrations. Never impersonates a live school UI.
Install Pillow and imageio-ffmpeg, then run from any directory. Intermediates: .cache.
"""
import concurrent.futures
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
try:
    import imageio_ffmpeg
    FF = os.environ.get('FFMPEG_BINARY') or imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FF = os.environ.get('FFMPEG_BINARY', 'ffmpeg')
CACHE = ROOT / '.cache/walkthrough-v5'
CACHE.mkdir(parents=True, exist_ok=True)
PACK = json.loads((ROOT / 'docs/walkthroughs/v5/source.json').read_text())
NAVY = '#0a192f'
PANEL = '#112a43'
TEAL = '#9ed9d6'
WHITE = '#f5f8fb'
MUTED = '#b6c7d6'
INK = '#15354c'
FONT_DIR = Path(os.environ.get('WALKTHROUGH_FONT_DIR', '/usr/share/fonts/truetype/dejavu'))

def font(size=22, bold=False):
    return ImageFont.truetype(str(FONT_DIR / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)

def wrap(text, size, width, bold=False):
    f = font(size, bold)
    lines = ['']
    for word in text.split():
        trial = (lines[-1] + ' ' + word).strip()
        if f.getlength(trial) <= width:
            lines[-1] = trial
        else:
            lines.append(word)
    return lines

def label(d, text, x, y, size=22, colour=WHITE, width=500, bold=False, max_lines=6):
    lines = wrap(text, size, width, bold)
    if len(lines) > max_lines:
        raise ValueError('Text overflows illustration: ' + text)
    for i, line in enumerate(lines):
        d.text((x, y + i * (size + 9)), line, font=font(size, bold), fill=colour)
    return y + len(lines) * (size + 9)

def box(d, xy, fill=PANEL, outline=None, radius=18):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=2)

def chip(d, text, x, y, width=210, fill='#1a4357', colour=TEAL, size=17):
    box(d, (x, y, x + width, y + 36), fill=fill, radius=18)
    d.text((x + 15, y + 7), text, font=font(size, True), fill=colour)

def crest(d, x, y, radius=34):
    d.ellipse((x-radius, y-radius, x+radius, y+radius), fill='#c9edeb', outline='#2b777f', width=3)
    d.line((x-15, y-6, x, y+10, x+18, y-15), fill='#23566b', width=5)

def arrow(d, x1, y1, x2, y2):
    d.line((x1, y1, x2, y2), fill=TEAL, width=3)
    d.polygon([(x2, y2), (x2-9, y2-6), (x2-9, y2+6)], fill=TEAL)

def steps(d, names, y=205):
    width = 156
    for i, name in enumerate(names):
        x = 658 + i * 182
        box(d, (x, y, x+width, y+116), fill='#193d55', outline='#325d73')
        d.text((x+15, y+14), f'0{i+1}', font=font(17, True), fill=TEAL)
        label(d, name, x+15, y+47, 19, width=width-26, bold=True, max_lines=2)
        if i < len(names)-1:
            arrow(d, x+width+3, y+57, x+180, y+57)

def diagram(d, role, scene):
    sid = scene['id']
    features = scene['features']
    box(d, (625, 124, 1228, 526), fill=PANEL, outline='#284960', radius=25)
    if 'a4_reports' in features:
        # The illustrated sheet itself uses the ISO A4 aspect ratio.
        x,y,w,h = 815,149,220,311
        box(d, (x,y,x+w,y+h), fill=WHITE, outline='#c4d3df', radius=3)
        d.rectangle((x+16,y+16,x+w-16,y+h-16), outline='#5e8596', width=1)
        crest(d,x+110,y+52,20)
        label(d,'School report',x+40,y+85,17,INK,width=180,bold=True,max_lines=1)
        d.text((x+65,y+112),'A4 · 210 × 297 mm',font=font(10),fill=INK)
        for k in range(6):
            d.line((x+31,y+148+k*19,x+w-31,y+148+k*19),fill='#c4d3df',width=2)
        label(d,'Full margins',x+50,y+270,15,INK,width=150,max_lines=1)
        label(d,'Phone  •  Tablet  •  Computer',708,482,19,TEAL,width=500,bold=True,max_lines=1)
    elif 'payroll_categories' in features:
        for x,title in [(650,'Teaching'),(930,'Non-teaching')]:
            box(d,(x,157,x+269,483),fill='#193d55')
            label(d,title,x+18,180,24,TEAL,width=230,bold=True,max_lines=1)
        label(d,'Class teachers\nSubject teachers'.replace('\n',' • '),670,238,21,width=220,max_lines=3)
        label(d,'Assigned teaching duties',670,355,18,MUTED,width=215,max_lines=3)
        for i,name in enumerate(['Nannies','Security guards','Cleaners','Drivers','Cooks']):
            label(d,'• '+name,949,233+i*37,20,width=229,max_lines=1)
        label(d,'Salary sheet, not teacher login',945,441,14,TEAL,width=243,max_lines=2)
    elif sid in ['login','owner-login']:
        for x,title in [(650,'School owner'),(930,'Staff / parents')]:
            box(d,(x,166,x+269,465),fill='#193d55')
            label(d,title,x+18,190,22,TEAL,width=240,bold=True,max_lines=1)
        label(d,'Email',672,257,25,width=210,bold=True,max_lines=1)
        label(d,'+ password',672,303,25,width=210,bold=True,max_lines=1)
        label(d,'Phone number',949,253,23,width=237,bold=True,max_lines=1)
        label(d,'+ 4-digit PIN',949,298,23,width=237,bold=True,max_lines=1)
        label(d,'● ● ● ●',972,350,29,TEAL,width=200,max_lines=1)
        label(d,'Only authorised school accounts',720,485,18,MUTED,width=490,max_lines=1)
    elif 'school_app' in features and sid == 'install':
        box(d,(803,144,1048,477),fill='#071424',outline='#87b4c1',radius=31)
        d.rounded_rectangle((817,161,1034,456),radius=20,fill='#eaf2f5')
        box(d,(877,220,975,318),fill='#fff',outline='#b5d9d9',radius=22)
        crest(d,926,268,31)
        label(d,'Your school',852,337,21,INK,width=200,bold=True,max_lines=1)
        label(d,'Name + crest',864,373,16,INK,width=180,max_lines=1)
        label(d,'Android: Install   •   iPhone: Share → Add',682,490,16,TEAL,width=520,max_lines=1)
    elif 'dual_role' in features and sid in ['dual-role','accounts','groups']:
        chip(d,'One teacher login',804,164,247)
        d.line((924,202,924,247),fill=TEAL,width=3)
        d.line((793,247,1063,247),fill=TEAL,width=3)
        for x,title,sub in [(650,'My Class','Home class / Halqah'),(930,'My Subjects','Assigned subjects')]:
            d.line((x+134,247,x+134,281),fill=TEAL,width=3)
            box(d,(x,282,x+269,437),fill='#193d55',outline='#325d73')
            label(d,title,x+19,310,25,TEAL,width=238,bold=True,max_lines=1)
            label(d,sub,x+19,367,19,width=231,max_lines=2)
        label(d,'Same identity. Assigned access only.',714,480,19,MUTED,width=490,max_lines=1)
    elif 'quran_tracker' in features and sid in ['programmes','tahfeez','tahfeez-optional']:
        for x,title in [(650,'Conventional'),(930,'Optional Tahfeez')]:
            box(d,(x,157,x+269,480),fill='#193d55')
            label(d,title,x+16,184,21,TEAL,width=242,bold=True,max_lines=1)
        label(d,'Academic terms',670,253,23,width=228,bold=True,max_lines=2)
        label(d,'No forced Qur’an labels',670,359,19,MUTED,width=220,max_lines=3)
        for i,text in enumerate(['Halqah','Daily Surah / Ayah','Mumtaz · Jayyid']):
            label(d,text,949,251+i*59,19,width=238,bold=True,max_lines=1)
        label(d,'Enable for your programme',949,443,15,TEAL,width=237,max_lines=1)
    elif 'offline_sync' in features and sid not in ['finish','school-work']:
        steps(d,['Online setup','Offline draft','Reconnect & sync'],y=175)
        for i,text in enumerate(['Daily attendance','CA and exam scores','Memorization, if enabled']):
            label(d,'✓  '+text,703,335+i*39,20,WHITE,width=480,max_lines=1)
        label(d,'Confirm sync • Review any conflicts',696,477,19,TEAL,width=510,max_lines=1)
    elif sid in ['papers']:
        steps(d,['Missing papers','Review','Return / approve'])
        chip(d,'PDF export',733,384,180)
        chip(d,'Word export',944,384,180)
        label(d,'Keep marking and publication permissions',671,478,17,MUTED,width=540,max_lines=1)
    elif sid in ['fees','receipts','reconcile'] or (role['roleId']=='bursar' and sid=='finish'):
        steps(d,['Invoice','Verify payment','Official receipt'])
        label(d,'Correct school • Correct term • Confirmed amount',665,382,18,TEAL,width=535,max_lines=2)
        label(d,'Online payments and messages need internet',672,478,17,MUTED,width=540,max_lines=1)
    elif sid in ['children','admissions']:
        chip(d,'Authorised family',804,166,245)
        steps(d,['Linked children','Attendance','Published results'],y=266)
        label(d,'No access to another family’s records',709,465,18,TEAL,width=500,max_lines=1)
    else:
        # A schematic, explicitly labelled example, not an app screenshot.
        box(d,(654,159,1200,472),fill=WHITE,radius=17)
        d.rounded_rectangle((668,172,1186,210),radius=10,fill='#e4edf2')
        label(d,'ndhschoolos.app/s/markaz  ·  example',684,181,16,INK,width=480,max_lines=1)
        crest(d,742,294,37)
        label(d,'YOUR SCHOOL',807,255,27,INK,width=355,bold=True,max_lines=1)
        label(d,'Your crest. Your motto.',807,307,20,INK,width=355,max_lines=1)
        for i,c in enumerate([NAVY,'#1a4a6e','#9ed9d6']):
            d.ellipse((811+i*43,351,835+i*43,375),fill=c)
        label(d,'Branding is public; records require sign-in.',682,423,17,INK,width=480,max_lines=1)

def frame(role, scene, index):
    img=Image.new('RGB',(1280,720),NAVY)
    d=ImageDraw.Draw(img)
    d.rectangle((0,0,1280,7),fill=TEAL)
    logo=Image.open(ROOT/'public/images/ndh-logo-gateway-cropped.png').convert('RGBA')
    logo.thumbnail((54,48))
    box(d,(48,29,121,87),fill='white',radius=9)
    img.paste(logo,(58,34),logo)
    label(d,'NDH SchoolOS',145,37,27,WHITE,width=400,bold=True,max_lines=1)
    label(d,'ILLUSTRATED WORKFLOW GUIDE',843,48,16,TEAL,width=400,bold=True,max_lines=1)
    label(d,role['title'].upper(),51,120,17,TEAL,width=530,bold=True,max_lines=2)
    # Fit long editorial titles without ever clipping their allocated region.
    size=38
    while len(wrap(scene['title'],size,520,True))>3:
        size-=1
    y=label(d,scene['title'],49,174,size,WHITE,width=525,bold=True,max_lines=3)
    label(d,scene['onScreen'],52,max(340,y+30),22,TEAL,width=507,max_lines=5)
    diagram(d,role,scene)
    label(d,'Workflow illustrations — not a recording of a private school account.',52,538,15,MUTED,width=1160,max_lines=1)
    d.line((50,572,1228,572),fill='#29465e',width=1)
    label(d,f'SCENE {index+1:02d} / {len(role["scenes"]):02d}',52,587,16,TEAL,width=400,bold=True,max_lines=1)
    label(d,'NDH SchoolOS • Role-scoped guide',804,587,15,MUTED,width=410,max_lines=1)
    # Bottom 90px intentionally clear for browser-native English closed captions.
    d.rectangle((50,638,1230,642),fill='#1c344e')
    fraction=(index+1)/len(role['scenes'])
    d.rectangle((50,638,50+1180*fraction,642),fill=TEAL)
    return img

def render(role):
    rid=role['roleId']
    work=CACHE/rid
    work.mkdir(exist_ok=True)
    spoken='\n\n'.join(s['narration'] for s in role['scenes'])
    assert hashlib.sha256(spoken.encode()).hexdigest()==role['narrationSha256'], 'Re-record changed narration first'
    audio=ROOT/'public'/role['audioSource'].lstrip('/')
    assert hashlib.sha256(audio.read_bytes()).hexdigest()==role['audioSha256']
    lines=[]
    for i,scene in enumerate(role['scenes']):
        target=work/f'{i:02d}.png'
        frame(role,scene,i).save(target)
        lines.extend([f"file '{target}'",f"duration {scene['durationSec']}"])
    lines.append(f"file '{target}'")
    (work/'frames.txt').write_text('\n'.join(lines)+'\n')
    media=f'ndh-walkthrough-{rid.replace("_","-")}-v5'
    output=ROOT/'public/videos'/(media+'.mp4')
    poster=ROOT/'public/videos'/('poster-'+media+'.jpg')
    Image.open(work/'00.png').save(poster,quality=88,optimize=True)
    duration=round(sum(s['durationSec'] for s in role['scenes']),3)
    args=[FF,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(work/'frames.txt'),'-i',str(audio),'-map','0:v:0','-map','1:a:0','-vf','fps=24,format=yuv420p','-af','apad=pad_dur=0.8','-t',str(duration),'-c:v','libx264','-preset','veryfast','-tune','stillimage','-crf','25','-c:a','aac','-b:a','64k','-ar','24000','-ac','1','-movflags','+faststart','-threads','2',str(output)]
    subprocess.run(args,check=True)
    # Full decode is required, not just a valid file name/header.
    subprocess.run([FF,'-v','error','-xerror','-i',str(output),'-f','null','-'],check=True)
    probe=subprocess.run([FF,'-hide_banner','-i',str(output)],capture_output=True,text=True).stderr
    assert 'Video: h264' in probe and 'Audio: aac' in probe and '1280x720' in probe, probe
    assert output.read_bytes().find(b'moov') < output.read_bytes().find(b'mdat'), 'MP4 must be fast-start'
    files={}
    for target in [output,poster,audio,ROOT/'public/videos'/(media+'.en.vtt'),ROOT/'public/videos'/(media+'.en.srt')]:
        files['/'+target.relative_to(ROOT/'public').as_posix()]={'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    print(rid, duration, 'seconds', output.stat().st_size, 'bytes',flush=True)
    return {'roleId':rid,'durationSec':duration,'width':1280,'height':720,'fps':24,'videoCodec':'h264','audioCodec':'aac','fullDecodeVerified':True,'files':files}

if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        roles=list(pool.map(render,PACK['roles']))
    manifest={'version':5,'visualFormat':PACK['visualFormat'],'voiceDescription':PACK['voiceDescription'],'roles':roles}
    (ROOT/'docs/walkthroughs/v5/media-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
