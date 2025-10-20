import { NextResponse } from 'next/server';
import { checkFFmpegInstalled } from '@/lib/ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Check if FFmpeg is installed
    const isInstalled = await checkFFmpegInstalled();
    
    if (!isInstalled) {
      return NextResponse.json({
        status: 'error',
        message: 'FFmpeg is not installed',
        installed: false,
      }, { status: 500 });
    }

    // Get FFmpeg version
    const { stdout: ffmpegVersion } = await execAsync('ffmpeg -version');
    const { stdout: ffprobeVersion } = await execAsync('ffprobe -version');

    return NextResponse.json({
      status: 'ok',
      message: 'FFmpeg is installed and working',
      installed: true,
      versions: {
        ffmpeg: ffmpegVersion.split('\n')[0],
        ffprobe: ffprobeVersion.split('\n')[0],
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      installed: false,
    }, { status: 500 });
  }
}
