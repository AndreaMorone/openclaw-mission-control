import { useMemo } from "react";
import Link from "next/link";

import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { MarketplaceSkillCardRead } from "@/api/generated/model";
import { DataTable, type DataTableEmptyState } from "@/components/tables/DataTable";
import { dateCell } from "@/components/tables/cell-formatters";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  SKILLS_TABLE_EMPTY_ICON,
  useTableSortingState,
} from "@/components/skills/table-helpers";
import { truncateText as truncate } from "@/lib/formatters";
import {
  packLabelFromUrl,
  packUrlFromSkillSourceUrl,
  packsHrefFromPackUrl,
} from "@/lib/skills-source";

type MarketplaceSkillsTableProps = {
  skills: MarketplaceSkillCardRead[];
  installedGatewayNamesBySkillId?: Record<string, string[]>;
  isLoading?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  stickyHeader?: boolean;
  disableSorting?: boolean;
  isMutating?: boolean;
  onSkillClick?: (skill: MarketplaceSkillCardRead) => void;
  onDelete?: (skill: MarketplaceSkillCardRead) => void;
  getEditHref?: (skill: MarketplaceSkillCardRead) => string;
  emptyState?: Omit<DataTableEmptyState, "icon"> & {
    icon?: DataTableEmptyState["icon"];
  };
};

export function MarketplaceSkillsTable({
  skills,
  installedGatewayNamesBySkillId,
  isLoading = false,
  sorting,
  onSortingChange,
  stickyHeader = false,
  disableSorting = false,
  isMutating = false,
  onSkillClick,
  onDelete,
  getEditHref,
  emptyState,
}: MarketplaceSkillsTableProps) {
  const { resolvedSorting, handleSortingChange } = useTableSortingState(
    sorting,
    onSortingChange,
    [{ id: "name", desc: false }],
  );

  const columns = useMemo<ColumnDef<MarketplaceSkillCardRead>[]>(() => {
    const baseColumns: ColumnDef<MarketplaceSkillCardRead>[] = [
      {
        accessorKey: "name",
        header: "Skill",
        cell: ({ row }) => (
          <div>
            {onSkillClick ? (
              <button
                type="button"
                onClick={() => onSkillClick(row.original)}
                className="text-sm font-medium text-blue-700 hover:text-blue-600 hover:underline"
              >
                {row.original.name}
              </button>
            ) : (
              <p className="text-sm font-medium text-slate-900">{row.original.name}</p>
            )}
            <p
              className="mt-1 line-clamp-2 text-xs text-slate-500"
              title={row.original.description || "No description provided."}
            >
              {row.original.description || "No description provided."}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "source_url",
        header: "Pack",
        cell: ({ row }) => {
          const packUrl = packUrlFromSkillSourceUrl(row.original.source_url);
          return (
            <Link
              href={packsHrefFromPackUrl(packUrl)}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-blue-600"
            >
              {truncate(packLabelFromUrl(packUrl), 40)}
            </Link>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">
            {row.original.category || "uncategorized"}
          </span>
        ),
      },
      {
        accessorKey: "risk",
        header: "Risk",
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">
            {row.original.risk || "unknown"}
          </span>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => {
          const sourceHref = row.original.source || row.original.source_url;
          return (
            <Link
              href={sourceHref}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-slate-700 hover:text-blue-600 hover:underline"
              title={sourceHref}
            >
              {truncate(sourceHref, 36)}
            </Link>
          );
        },
      },
      {
        id: "installed_on",
        header: "Installed On",
        enableSorting: false,
        cell: ({ row }) => {
          const installedOn = installedGatewayNamesBySkillId?.[row.original.id] ?? [];
          if (installedOn.length === 0) {
            return <span className="text-sm text-slate-500">-</span>;
          }
          const installedOnText = installedOn.join(", ");
          return (
            <span className="text-sm text-slate-700" title={installedOnText}>
              {installedOnText}
            </span>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => dateCell(row.original.updated_at),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {getEditHref ? (
              <Link
                href={getEditHref(row.original)}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Edit
              </Link>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDelete(row.original)}
                disabled={isMutating}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ),
      },
    ];

    return baseColumns;
  }, [
    getEditHref,
    installedGatewayNamesBySkillId,
    isMutating,
    onDelete,
    onSkillClick,
  ]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: skills,
    columns,
    enableSorting: !disableSorting,
    state: {
      ...(!disableSorting ? { sorting: resolvedSorting } : {}),
    },
    ...(disableSorting ? {} : { onSortingChange: handleSortingChange }),
    getCoreRowModel: getCoreRowModel(),
    ...(disableSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      stickyHeader={stickyHeader}
      rowClassName="transition hover:bg-slate-50"
      cellClassName="px-6 py-4 align-top"
      emptyState={
        emptyState
          ? {
              icon: emptyState.icon ?? SKILLS_TABLE_EMPTY_ICON,
              title: emptyState.title,
              description: emptyState.description,
              actionHref: emptyState.actionHref,
              actionLabel: emptyState.actionLabel,
            }
          : undefined
      }
    />
  );
}
