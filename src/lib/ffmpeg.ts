import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

// NEW INTERFACES for complex processing
export interface TextOverlayOptions {
  content: string;
  color: string;
  font: string; // FFmpeg font handling is complex, this is primarily for future integration
  position: "top" | "center" | "bottom";
}

export interface TrimOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  fastMode?: boolean;
  audioInputPath?: string; // Path to background music
  textOverlay?: TextOverlayOptions; // Text configuration
}

export interface VideoInfo {
  duration: number;
  format: string;
  codec: string;
}

/**
 * Trim, mix audio, and add text to a video file using FFmpeg.
 */
export async function trimVideo(options: TrimOptions): Promise<void> {
  const { inputPath, outputPath, startTime, endTime, audioInputPath, textOverlay } = options;

  if (startTime < 0 || endTime <= startTime) {
    throw new Error("Invalid trim times");
  }

  // --- 1. Base command and Input files ---
  const commandArgs = [
    // Use -ss before -i for input trimming (speed), as we are re-encoding due to filters.
    "-ss",
    String(startTime),
    "-to",
    String(endTime),
    "-i",
    `"${inputPath}"`,
  ];

  let videoFilterStreamName = "0:v"; // Default input video stream
  let audioFilterStreamName = "0:a"; // Default input audio stream
  let filterComplex = "";
  let mapOptions = "";

  // --- 2. Input Audio (Index 1) ---
  if (audioInputPath) {
    commandArgs.push("-i", `"${audioInputPath}"`); // Input Index 1: Background Audio
  }

  // --- 3. Build Filter Complex ---

  // A. Audio Filtering (Mix BG Music and Original Audio)
  if (audioInputPath) {
    // Label and attenuate background audio, ensure main audio is present, then mix.
    filterComplex +=
      `[1:a]volume=0.3[audio_bg];` + // Attenuate BG music (30% volume)
      `[0:a]volume=1.0[audio_main];` + // Original video audio stream
      `[audio_main][audio_bg]amix=inputs=2:duration=first[audio_out];`; // Mix them

    // Set the output stream name for mapping
    audioFilterStreamName = "[audio_out]";
  } else {
    // If no external audio, just map the original audio stream
    audioFilterStreamName = "0:a";
  }

  // B. Video Filtering (Text Overlay)
  if (textOverlay && textOverlay.content) {
    const padding = 50; // Pixels from the edge

    const x_pos = "(w-text_w)/2"; // Center horizontally
    let y_pos: string;

    switch (textOverlay.position) {
      case "top":
        y_pos = `${padding}`;
        break;
      case "center":
        y_pos = "(h-text_h)/2";
        break;
      case "bottom":
      default:
        y_pos = `h-text_h-${padding}`;
        break;
    }

    // Escape single quotes for the FFmpeg text command
    const escapedText = textOverlay.content.replace(/'/g, "'\\''");

    const textFilter =
      `drawtext=` +
      `text='${escapedText}':` +
      `fontcolor=${textOverlay.color}:` +
      `fontsize=60:` +
      `x=${x_pos}:y=${y_pos}:` +
      `box=1:boxcolor=black@0.4:boxborderw=10`; // Adds a semi-transparent box background

    // Apply the text filter to the primary video stream (0:v) and label the output stream
    filterComplex = filterComplex.includes(";")
      ? `[0:v]${textFilter}[v_out];` + filterComplex
      : `[0:v]${textFilter}[v_out]`;
    videoFilterStreamName = "[v_out]";
  } else {
    // If no video filtering, just map the original video stream
    videoFilterStreamName = "0:v";
  }

  // --- 4. Encoding and Output Options ---

  // Configure the maps to output streams
  mapOptions += `-map ${videoFilterStreamName} -map ${audioFilterStreamName} `;

  // Standard encoding options for web video compatibility (H.264/AAC)
  const outputOptions = [
    "-c:v",
    "libx264", // Video codec
    "-preset",
    "fast", // Encoding speed
    "-crf",
    "23", // Quality setting
    "-pix_fmt",
    "yuv420p", // Pixel format for compatibility
    "-c:a",
    "aac", // Audio codec
    "-b:a",
    "128k", // Audio bitrate
    "-y",
    `"${outputPath}"`, // Overwrite output file
  ];

  // Combine all arguments
  if (filterComplex) {
    commandArgs.push("-filter_complex", `"${filterComplex.replace(/"/g, '\\"')}"`);
  }

  const fullCommand = `ffmpeg ${commandArgs.join(" ")} ${mapOptions} ${outputOptions.join(" ")}`;

  // Dev-only debug output (allowed by ESLint because we only use warn/error or guard logs)
  if (process.env.NODE_ENV !== "production") {
     
    console.warn("FFmpeg Command:", fullCommand);
  }

  try {
    const { stdout, stderr } = await execAsync(fullCommand);
    if (process.env.NODE_ENV !== "production") {
      if (stdout) {
         
        console.warn("FFmpeg output:", stdout);
      }
      if (stderr) {
         
        console.warn("FFmpeg stderr:", stderr);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("FFmpeg error:", err);
      throw new Error(`Video processing failed: ${err.message}`);
    }
    console.error("FFmpeg error (unknown):", err);
    throw new Error("Video processing failed with an unknown error");
  }
}

// Existing utility functions remain below

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  const command =
    `ffprobe -v error -show_entries format=duration,format_name -show_entries stream=codec_name -of json "${filePath}"`;

  try {
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout) as {
      format: { duration: string; format_name: string };
      streams: Array<{ codec_name?: string }>;
    };

    return {
      duration: parseFloat(data.format.duration),
      format: data.format.format_name,
      codec: data.streams[0]?.codec_name ?? "unknown",
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("FFprobe error:", err);
      throw new Error(`Failed to get video info: ${err.message}`);
    }
    console.error("FFprobe error (unknown):", err);
    throw new Error("Failed to get video info (unknown error)");
  }
}

export async function checkFFmpegInstalled(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

export async function createTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), "tmp", `video-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

export async function cleanupTempFiles(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err: unknown) {
    // keep diagnostics visible but within allowed console methods
    console.error("Failed to cleanup temp files:", err);
  }
}

export function generateTrimmedFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext);
  // Changed prefix to reflect multi-feature processing
  return `processed-${timestamp}-${basename}${ext}`;
}
