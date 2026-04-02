export interface BookSummary {
  _id: string;
  title: string;
  topic: string;
  totalChapters: number;
  chapters: BookChapterMeta[];
  createdAt: string;
}

export interface BookChapterMeta {
  number: number;
  title: string;
  sectionAnchors: string[];
}

export interface BookChapter {
  _id: string;
  bookId: string;
  number: number;
  title: string;
  htmlContent: string;
  sections: BookSection[];
}

export interface BookSection {
  anchor: string;
  title: string;
  level: number;
}

export interface BookAnnotation {
  _id: string;
  bookId: string;
  chapterNumber: number;
  sectionAnchor: string;
  type: AnnotationType;
  textRange: TextRange;
  highlightedText: string;
  color: string;
  noteContent?: string;
  linkedNoteId?: string;
  createdAt: string;
}

export type AnnotationType = "highlight" | "note" | "vault-link";

export interface TextRange {
  startOffset: number;
  endOffset: number;
}

export interface ReadingProgress {
  bookId: string;
  currentChapter: number;
  scrollPosition: number;
  chaptersCompleted: number[];
  timeSpentMinutes: Record<string, number>;
  lastReadAt: string;
}

export interface RelatedContent {
  sourceType: string;
  fileId: string;
  score: number;
  snippet: string;
  bookId?: string;
  bookTitle?: string;
  chapterNumber?: number;
  sectionAnchor?: string;
}
