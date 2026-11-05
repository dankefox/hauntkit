from pathlib import Path
import math,wave,array,random
ASSETS=Path(__file__).resolve().parent/"original-audio"
(ASSETS/"sfx").mkdir(parents=True,exist_ok=True)
DURATION=92
RATE=48000
def write_wave(path,samples):
    peak=max(abs(x) for x in samples) or 1
    scale=min(1,0.92/peak)
    pcm=array.array('h',(int(max(-1,min(1,x*scale))*32767) for x in samples))
    with wave.open(str(path),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
music=array.array('f',[0.0])*int(DURATION*RATE)
def note(at,midi,length,amplitude=0.055):
    frequency=440*2**((midi-69)/12);start=int(at*RATE);count=min(int(length*RATE),len(music)-start)
    for j in range(max(0,count)):
        t=j/RATE;env=(1-math.exp(-t*40))*math.exp(-t/1.4)*min(1,(length-t)/0.3)
        wavelet=math.sin(2*math.pi*frequency*t)+0.28*math.sin(2*math.pi*frequency*2*t)
        music[start+j]+=amplitude*env*wavelet
# A quiet D-minor / F-major paper-and-lantern score. Sparse, deliberately no bass drum.
beat=60/78;chords=[(62,65,69),(58,62,65),(60,64,67),(57,60,65)]
for bar in range(29):
    at=bar*4*beat
    chord=chords[bar%4]
    if at>=40:chord=[(65,69,72),(62,65,69),(58,62,65),(60,64,67)][bar%4]
    for k,midi in enumerate(chord):note(at+k*0.1,midi,2.6,0.035)
    for k in range(2):note(at+(1.5+k)*beat,chord[(bar+k)%3]+12,1.25,0.025)
note(87,65,4.8,0.055);note(87.1,69,4.5,0.04);note(87.2,72,4.3,0.04)
for j in range(len(music)):
    t=j/RATE;music[j]*=min(1,t/1.2,(DURATION-t)/2.2)
write_wave(ASSETS/'music.wav',music)
rng=random.Random(27654)
for kind,length in [('tick',0.14),('paper',0.30),('confirm',0.70)]:
    samples=array.array('f')
    for j in range(int(length*RATE)):
        t=j/RATE
        if kind=='paper':v=0.10*(rng.random()*2-1)*math.exp(-t*15)
        elif kind=='tick':v=0.18*math.sin(2*math.pi*1250*t)*math.exp(-t*45)
        else:v=0.14*math.sin(2*math.pi*(660 if t<0.25 else 880)*t)*math.exp(-(t if t<0.25 else t-0.25)*9)
        samples.append(v*min(1,t*2000))
    write_wave(ASSETS/'sfx'/f'{kind}.wav',samples)

print("Original music and three effects written to original-audio/")
