export enum UrlType {
  Article = "article",
  Bookmark = "bookmark",
}

const BOOKMARK_PATTERNS: RegExp[] = [
  /^(www\.)?youtube\.com\/watch/,
  /^youtu\.be\//,
  /^(www\.)?youtube\.com\/shorts/,
  /^(www\.)?twitter\.com/,
  /^(www\.)?x\.com/,
  /^(www\.)?reddit\.com/,
];

export function classifyUrl(url: string): UrlType {
  let hostname: string;
  let pathname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname;
  } catch {
    return UrlType.Article;
  }

  const hostAndPath = hostname + pathname;

  for (const pattern of BOOKMARK_PATTERNS) {
    if (pattern.test(hostAndPath)) {
      return UrlType.Bookmark;
    }
  }

  return UrlType.Article;
}
