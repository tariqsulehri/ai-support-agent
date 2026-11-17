#!/usr/bin/env bash
# Generates an original, royalty-free energetic track for the social cut:
# 124 BPM, Am - F - C - G, four-on-the-floor kick, claps, hats, offbeat bass,
# side-chain-style pumping chords and a pluck arpeggio. Output: demo/assets/music-energetic.mp3
set -euo pipefail
cd "$(dirname "$0")"
LEN=${1:-100}
B=0.483871            # one beat at 124 BPM
BAR=1.935484          # four beats
C="mod(floor(t/$BAR),4)"   # chord index 0..3

# pick VALUE0 VALUE1 VALUE2 VALUE3 by chord index
pick() { echo "if(eq($C,0),$1,if(eq($C,1),$2,if(eq($C,2),$3,$4)))"; }
saw() { echo "(sin(2*PI*($1)*t)+0.5*sin(4*PI*($1)*t)+0.33*sin(6*PI*($1)*t))"; }

KICK="0.95*sin(2*PI*(45*mod(t,$B)+5*(1-exp(-22*mod(t,$B)))))*exp(-7*mod(t,$B))"
CLAP="(2*random(0)-1)*exp(-24*mod(t-$B,2*$B))*0.7"
HATS="(2*random(1)-1)*(0.5*exp(-60*mod(t-$B/2,$B))+0.15*exp(-140*mod(t,$B/4)))"
ROOT=$(pick 55 43.65 65.41 49)
BASS="(sin(2*PI*$ROOT*t)+0.6*sin(4*PI*$ROOT*t)+0.3*sin(6*PI*$ROOT*t))*(1-exp(-60*mod(t-$B/2,$B)))*exp(-4*mod(t-$B/2,$B))*0.5"
N1=$(pick 220 174.61 196 196); N2=$(pick 261.63 220 261.63 246.94); N3=$(pick 329.63 261.63 329.63 293.66)
PUMP="(0.15+0.85*pow(min(1,mod(t,$B)/0.22),0.8))"
CHORDS="($(saw "$N1")+$(saw "$N2")+$(saw "$N3"))*$PUMP*0.16"
ARPN="if(eq(mod(floor(t/($B/2)),3),0),2*$N1,if(eq(mod(floor(t/($B/2)),3),1),2*$N2,2*$N3))"
ARP="(sin(2*PI*$ARPN*t)+0.3*sin(4*PI*$ARPN*t))*exp(-9*mod(t,$B/2))*0.22*gte(t,4*$BAR)"

src() { echo "aevalsrc='$1':s=48000:d=$LEN"; }
ffmpeg -y -loglevel error \
  -f lavfi -i "$(src "$KICK")" \
  -f lavfi -i "$(src "$CLAP")" \
  -f lavfi -i "$(src "$HATS")" \
  -f lavfi -i "$(src "$BASS")" \
  -f lavfi -i "$(src "$CHORDS")" \
  -f lavfi -i "$(src "$ARP")" \
  -filter_complex "\
[0]lowpass=f=180[k];\
[1]highpass=f=900,lowpass=f=7000,aecho=0.6:0.4:25:0.3[c];\
[2]highpass=f=7000[h];\
[3]lowpass=f=420[b];\
[4]lowpass=f=2600,aecho=0.7:0.5:90|180:0.25|0.15[p];\
[5]lowpass=f=5000,aecho=0.7:0.5:242:0.3[a];\
[k][c][h][b][p][a]amix=inputs=6:normalize=0:weights=1 0.55 0.5 0.9 0.8 0.6,\
afade=t=in:d=0.3,afade=t=out:st=$(echo "$LEN-2.5" | bc):d=2.5,\
acompressor=threshold=0.25:ratio=3:attack=10:release=150,loudnorm=I=-14:TP=-1.5,aformat=channel_layouts=stereo[out]" \
  -map "[out]" -c:a libmp3lame -q:a 2 assets/music-energetic.mp3
echo "wrote demo/assets/music-energetic.mp3 (${LEN}s)"
