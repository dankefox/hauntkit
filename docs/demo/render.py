"""Render the 92-second edited walkthrough. Requires Python 3 and FFmpeg.
The checked-in frames are public crops of actual Chrome application renders.
"""
from pathlib import Path
import json, subprocess
ROOT=Path(__file__).resolve().parent
plan=json.loads((ROOT/'plan.json').read_text())
out=ROOT/'output';out.mkdir(exist_ok=True)
frames=sorted((ROOT/'frames').glob('*.png'))
assert len(frames)==len(plan['shots'])==9
for i,(frame,shot) in enumerate(zip(frames,plan['shots'])):
    duration=shot['end']-shot['start']
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(frame),'-vf',f"zoompan=z='1+0.000025*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,fade=t=in:st=0:d=0.15,fade=t=out:st={duration-0.15}:d=0.15",'-t',str(duration),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',str(out/f'{i:02d}.mp4')],check=True)
(out/'clips.txt').write_text(''.join(f"file '{i:02d}.mp4'\n" for i in range(9)))
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(out/'clips.txt'),'-i',str(ROOT/'master.flac'),'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',str(out/'hauntkit-demo.mp4')],check=True)
print(out/'hauntkit-demo.mp4')
