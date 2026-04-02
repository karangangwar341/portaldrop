"use client";
import { useState, useCallback, DragEvent } from "react";

export interface DragAndDropState {
  isDragging: boolean;
  dragProps: {
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
}

export function useDragAndDrop(onFiles: (files: File[]) => void): DragAndDropState {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => {
      if (c === 0) setIsDragging(true);
      return c + 1;
    });
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => {
      const next = c - 1;
      if (next === 0) setIsDragging(false);
      return next;
    });
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [onFiles]
  );

  return {
    isDragging,
    dragProps: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
