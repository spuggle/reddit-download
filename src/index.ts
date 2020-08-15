import got from "got";
import * as fs from "fs";
import { join } from "path";
import * as stream from "stream";
import { exec } from "child_process";
import { promisify } from "util";

const rootDir = join(__dirname, `../`);
const tmpFolder = join(__dirname, `../tmp`);
const outFolder = join(__dirname, `../out`);
const requiredFolders = [ `tmp`, `out` ] as const;
const pipeline = promisify(stream.pipeline);

export async function downloadVideo(redditLink: string) {
  makeMissingFolders();

  const redditJSONLink = extractJSONLink(redditLink);
  const redditThreads = await fetchJSON(redditJSONLink);
  const outputFilename = extractFilename(redditThreads);
  const fallbackURL = extractFallbackURL(redditThreads);
  const audioURL = makeAudioURL(fallbackURL);

  const fileCode = await downloadAudioAndFallback(audioURL, fallbackURL);

  return mergeMedia(fileCode, sanitizeFilename(outputFilename));
}

export function makeMissingFolders(): void {
  const rootFiles = fs.readdirSync(rootDir);

  requiredFolders
    .filter(requiredFolder => !rootFiles.includes(requiredFolder))
    .map(requiredFolder => fs.mkdirSync(`${rootDir}/${requiredFolder}`));
}

export function extractJSONLink(redditLink: string): string {
  return redditLink
    .replace(/\/\?utm_medium=android_app&utm_source=share$/, `.json`);
}

export async function fetchJSON(redditJSONLink: string): Promise<RedditThread[]> {
  return await got(redditJSONLink).json();
}

export function extractFilename(redditThreads: RedditThread[]): string {
  return redditThreads[0].data.children[0].data.title;
}

export function extractFallbackURL(redditThreads: RedditThread[]): string {
  return redditThreads[0].data.children[0].data.secure_media.reddit_video.fallback_url;
}

export function makeAudioURL(fallbackURL: string): string {
  return fallbackURL.replace(/DASH_[^\.]+\.mp4.+/, `DASH_audio.mp4`);
}

async function downloadAudioAndFallback(audioURL: string, fallbackURL: string) {
  const fileCode = randomCode();

  await downloadMedia(`audio`, audioURL, fileCode);
  await downloadMedia(`fallback`, fallbackURL, fileCode);

	return fileCode;
}

async function downloadMedia(
	mediaType: "audio" | "fallback" | "video",
	mediaURL: string,
	fileCode: string
) {
  await pipeline(
    got.stream(mediaURL),
    fs.createWriteStream(mediaFilePath(fileCode, mediaType))
  );
}

async function mergeMedia(fileCode: string, outputFilename: string) {
  const audioFile = mediaFilePath(fileCode, `audio`);
	const fallbackFile = mediaFilePath(fileCode, `fallback`);
	const videoFile = mediaFilePath(
    `${outputFilename}_${fileCode}`,
    `video`,
    outFolder
  );

	const ffmpegArgs = `ffmpeg -i ${fallbackFile} -i ${audioFile} -c:v copy -c:a aac ${videoFile}`;

	return new Promise((res, rej) => {
		exec(ffmpegArgs, (err, stdout, stderr) => {
			if (err || stderr) return rej(err || stderr);
			else return res(stdout);
		});
	});
}

function randomCode(): string {
  return process.hrtime.bigint().toString(36);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_ ]/g, ``)
    .replace(/\s/g, `_`);
}

function mediaFilePath(fileCode: string, mediaType: string, folder = tmpFolder): fs.PathLike {
  return `${folder}/${fileCode}_${mediaType}.mp4`;
}

export interface RedditThread {
  data: {
    children: {
      data: {
        title: string,
        secure_media: {
          reddit_video: {
            fallback_url: string
          }
        }
      }
    }[]
  }
}
