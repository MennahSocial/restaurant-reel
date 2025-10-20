import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface TrimOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  fastMode?: boolean;
}

export interface VideoInfo {
  duration: number;
  format: string;
  codec: string;
}

export async function trimVideo(options: TrimOptions): Promise<void> {
  const { inputPath, outputPath, startTime, endTime, fastMode = true } = options;

  if (startTime < 0 || endTime <= startTime) {
    throw new Error('Invalid trim times');
  }

  const codecOption = fastMode ? '-c copy' : '-c:v libx264 -c:a aac -preset fast';
  const command = `ffmpeg -i "${inputPath}" -ss ${startTime} -to ${endTime} ${codecOption} -y "${outputPath}"`;

  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('FFmpeg output:', stdout);
    if (stderr) console.log('FFmpeg stderr:', stderr);
  } catch (error: any) {
    console.error('FFmpeg error:', error);
    throw new Error(`Video trimming failed: ${error.message}`);
  }
}

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  const command = `ffprobe -v error -show_entries format=duration,format_name -show_entries stream=codec_name -of json "${filePath}"`;

  try {
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);
    
    return {
      duration: parseFloat(data.format.duration),
      format: data.format.format_name,
      codec: data.streams[0]?.codec_name || 'unknown',
    };
  } catch (error: any) {
    console.error('FFprobe error:', error);
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

export async function checkFFmpegInstalled(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

export async function createTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'tmp', `video-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

export async function cleanupTempFiles(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
}

export function generateTrimmedFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext);
  return `trimmed-${timestamp}-${basename}${ext}`;
}
