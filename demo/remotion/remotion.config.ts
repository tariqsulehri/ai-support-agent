import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setCodec('h264')
Config.setPixelFormat('yuv420p')
// The captioned composition reads ../output/final-demo.mp4 via staticFile().
Config.setPublicDir('../output')
