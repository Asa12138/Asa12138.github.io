# Personal introduction video

Original: Asa_Open_World_v4_79.7s_1080p60.mp4 (user-provided, kept outside this website).
Web copy: asa-introduction.mp4, 79.7 seconds, 1920×1080, 60 fps, H.264/AAC.
Poster: an unaltered frame at 78.4 seconds, scaled to 1280×720.

Encoding command (FFmpeg is a maintenance tool only):

```sh
ffmpeg -i INPUT.mp4 -map 0:v:0 -map 0:a:0 -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart -map_metadata -1 asa-introduction.mp4
```

The page uses native controls, playsinline, a poster, and preload=none. Playback starts only after a visitor chooses to play.
