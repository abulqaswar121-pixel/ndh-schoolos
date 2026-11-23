"""Conform real selected-voice paragraph clips to detected silence boundaries."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2]
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
roles=sys.argv[1:] or ['exam_officer','class_teacher','subject_teacher','bursar','secretary','parent']
for role in roles:
 path=ROOT/f'docs/walkthroughs/v6-roles/{role}/source.json';pack=json.loads(path.read_text());audio=ROOT/f'public/videos/narration-v6-roles/{role}.mp3'
 p=subprocess.run([FFMPEG,'-hide_banner','-i',str(audio),'-af','silencedetect=noise=-35dB:d=0.28','-f','null','-'],capture_output=True,text=True,check=True)
 m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',p.stderr);duration=int(m[1])*3600+int(m[2])*60+float(m[3])
 gaps=[tuple(map(float,g)) for g in re.findall(r'silence_start: ([\d.]+)\s*\n.*?silence_end: ([\d.]+) \| silence_duration: ([\d.]+)',p.stderr)]
 gaps=[g for g in gaps if g[0]>1 and g[1]<duration-0.4]
 # Long paragraph gaps are preferred. A global monotonic search also checks expected spoken length,
 # avoiding accidental cuts at long pauses within a sentence.
 texts=[s['narration'] for s in pack['scenes']];lengths=[len(t) for t in texts];total=sum(lengths)
 expected=[];cur=0
 for n in lengths[:-1]:cur+=n;expected.append(duration*cur/total)
 # Dynamic programme: best sequence of distinct silence gaps, in order.
 states={-1:(0,[])}
 for target in expected:
  nxt={}
  for j,g in enumerate(gaps):
   mid=(g[0]+g[1])/2
   if abs(mid-target)>7:continue
   candidates=[(score+(mid-target)**2/8-min(g[2],1.5)*3,chosen+[j]) for prev,(score,chosen) in states.items() if prev<j]
   if candidates:nxt[j]=min(candidates,key=lambda x:x[0])
  if not nxt:raise ValueError('No defensible paragraph cut; review manually: '+role)
  states=nxt
 chosen=min(states.values(),key=lambda x:x[0])[1]
 selected=[gaps[j] for j in chosen]
 cuts=[0]+[round((g[0]+g[1])/2,6) for g in selected]+[duration]
 print(role,'duration',duration,'cuts',[(round((g[0]+g[1])/2,3),round(g[2],3)) for g in selected],flush=True)
 out=ROOT/f'.cache/walkthrough-recordings/roles/{role}/audio';out.mkdir(parents=True,exist_ok=True)
 for i,s in enumerate(pack['scenes']):
  wav=out/(s['id']+'.wav');seconds=round(cuts[i+1]-cuts[i],6)
  subprocess.run([FFMPEG,'-y','-v','error','-ss',str(cuts[i]),'-t',str(seconds),'-i',str(audio),'-ar','24000',str(wav)],check=True)
  s.update(audioDurationSec=seconds,durationSec=round(seconds+2,6),audioStartSec=cuts[i],audioEndSec=cuts[i+1],narrationSha256=hashlib.sha256(s['narration'].encode()).hexdigest(),wavSha256=hashlib.sha256(wav.read_bytes()).hexdigest())
 pack['audioSource']='/videos/narration-v6-roles/'+role+'.mp3';pack['audioSha256']=hashlib.sha256(audio.read_bytes()).hexdigest()
 pack['narrationSha256']=hashlib.sha256('\n\n'.join(texts).encode()).hexdigest();pack['timingBasis']='Detected paragraph-pause cuts, reviewed against expected text length; captions phrase-timed within each recorded scene.'
 path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
