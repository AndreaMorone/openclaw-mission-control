"use client";

import { useState } from "react";

import {
  type OnChangeFn,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";

export const SKILLS_TABLE_EMPTY_ICON = (
  <svg
    className="h-16 w-16 text-slate-300"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
    <path d="M8 7v10" />
    <path d="M16 7v10" />
  </svg>
);

export const useTableSortingState = (
  sorting: SortingState | undefined,
  onSortingChange: OnChangeFn<SortingState> | undefined,
  defaultSorting: SortingState,
): {
  resolvedSorting: SortingState;
  handleSortingChange: OnChangeFn<SortingState>;
} => {
  const [internalSorting, setInternalSorting] = useState<SortingState>(defaultSorting);
  const resolvedSorting = sorting ?? internalSorting;
  const handleSortingChange: OnChangeFn<SortingState> =
    onSortingChange ??
    ((updater: Updater<SortingState>) => {
      setInternalSorting(updater);
    });

  return {
    resolvedSorting,
    handleSortingChange,
  };
};
