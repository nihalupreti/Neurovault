"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProgress, updateProgress } from "@/api/client";

const SAVE_INTERVAL_MS = 10_000;

export function useBookProgress(bookId: string | null) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(Date.now());

  const { data: progress } = useQuery({
    queryKey: ["progress", bookId],
    queryFn: () => getProgress(bookId!),
    enabled: !!bookId,
  });

  const mutation = useMutation({
    mutationFn: (update: Parameters<typeof updateProgress>[1]) =>
      updateProgress(bookId!, update),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["progress", bookId] }),
  });

  const saveProgress = useCallback(
    (update: Parameters<typeof updateProgress>[1]) => {
      if (!bookId) return;
      mutation.mutate(update);
    },
    [bookId, mutation]
  );

  const markChapterComplete = useCallback(
    (chapterNum: number) => {
      if (!progress) return;
      const completed = Array.from(
        new Set([...progress.chaptersCompleted, chapterNum])
      );
      saveProgress({ chaptersCompleted: completed });
    },
    [progress, saveProgress]
  );

  const updateScroll = useCallback(
    (chapterNum: number, position: number) => {
      saveProgress({ currentChapter: chapterNum, scrollPosition: position });
    },
    [saveProgress]
  );

  useEffect(() => {
    if (!bookId) return;
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 60_000);
      if (elapsed > 0 && progress?.currentChapter) {
        const key = String(progress.currentChapter);
        const current = progress.timeSpentMinutes[key] ?? 0;
        saveProgress({
          timeSpentMinutes: {
            ...progress.timeSpentMinutes,
            [key]: current + elapsed,
          },
        });
        startRef.current = Date.now();
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bookId, progress, saveProgress]);

  return { progress, saveProgress, markChapterComplete, updateScroll };
}
