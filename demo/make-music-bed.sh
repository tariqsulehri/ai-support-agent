#!/usr/bin/env bash
# Generates an original, royalty-free ambient pad (C - Am - F - G, 6 s per chord, 24 s loop)
# used as the default background music bed: demo/assets/music-bed.mp3.
set -euo pipefail
cd "$(dirname "$0")"
chord() { # $1..$4 = frequencies in Hz
  local f="" ; for n in "$@"; do f+="0.22*sin(2*PI*$n*t)+0.12*sin(2*PI*$n*1.003*t)+0.05*sin(2*PI*$n*2*t)+"; done
  echo "(${f}0)*min(1,t/1.5)*min(1,(6-t)/1.5)"
}
ffmpeg -y -loglevel error \
  -f lavfi -i "aevalsrc='$(chord 130.81 164.81 196.00 261.63)':s=48000:d=6" \
  -f lavfi -i "aevalsrc='$(chord 110.00 130.81 164.81 220.00)':s=48000:d=6" \
  -f lavfi -i "aevalsrc='$(chord 87.31 110.00 130.81 174.61)':s=48000:d=6" \
  -f lavfi -i "aevalsrc='$(chord 98.00 123.47 146.83 196.00)':s=48000:d=6" \
  -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1,lowpass=f=1400,aecho=0.8:0.7:60|120:0.35|0.25,volume=0.5,aformat=channel_layouts=stereo[a]" \
  -map "[a]" -c:a libmp3lame -q:a 4 assets/music-bed.mp3
echo "wrote demo/assets/music-bed.mp3"
