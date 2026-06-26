import matter from 'gray-matter';
import * as fs from 'fs';
import * as path from 'path';
import { SingleVideo } from 'types';

export async function getAllVideos() {
  return Promise.all(getAllVideosSlugs().map(getSingleVideo));
}

export function getAllVideosSlugs() {
  const dir = getVideosDirectory();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter(f => f.endsWith('.mdx')).map(normalizeVideoName);
}

function normalizeVideoName(videoName: string) {
  return videoName.replace('.mdx', '');
}

export async function getSingleVideo(slug: string): Promise<SingleVideo> {
  const filePath = path.join(getVideosDirectory(), slug + '.mdx');
  const contents = fs.readFileSync(filePath, 'utf8');
  const { data: meta, content } = matter(contents);

  return { slug, content, meta: meta as SingleVideo['meta'] };
}

export function getVideosDirectory() {
  let basePath = process.cwd();
  return path.join(basePath, 'videos');
}