import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminCategoriesQuery, useStoreMutations } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';
import {
  functionalUpdate,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react';

import { DataTableCard } from '@/components/admin/data-table-card';
import { TablePagination } from '@/components/admin/table-pagination';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  buildAdminTableSearch,
  normalizeAdminTableSearch,
  type AdminTableSearch,
} from '@/lib/admin-table-search';
import type { Category } from '@/types/store';

const DEFAULT_CATEGORY_LIMIT = 12;

type CategoryRouteSearch = AdminTableSearch;

export const Route = createFileRoute('/_authenticated/_admin/admin/categories')({
  validateSearch: (search): CategoryRouteSearch =>
    normalizeAdminTableSearch(search, DEFAULT_CATEGORY_LIMIT),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const tableSearch = Route.useSearch() as CategoryRouteSearch;
  const search = tableSearch.search ?? '';
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: tableSearch.page - 1,
      pageSize: tableSearch.limit,
    }),
    [tableSearch.limit, tableSearch.page],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    nameSi: '',
  });

  const updateTableSearch = useCallback(
    (patch: Partial<CategoryRouteSearch>, replace = false) => {
      void navigate({
        search: buildAdminTableSearch({
          search,
          page: tableSearch.page,
          limit: tableSearch.limit,
          ...patch,
        }),
        replace,
      });
    },
    [navigate, search, tableSearch.limit, tableSearch.page],
  );

  const categoriesQuery = useAdminCategoriesQuery();
  const { createCategory, updateCategory, deleteCategory } = useStoreMutations();

  const categories = categoriesQuery.data?.data?.categories ?? [];
  const filteredCategories = useMemo(
    () =>
      categories.filter((category) => {
        const query = search.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return (
          category.name.toLowerCase().includes(query) ||
          (category.nameSi || '').toLowerCase().includes(query)
        );
      }),
    [categories, search],
  );

  const handleCategoryFormChange =
    (field: keyof typeof categoryForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setCategoryForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const resetCategoryForm = useCallback(() => {
    setSelectedCategory(null);
    setCategoryForm({ name: '', nameSi: '' });
  }, []);

  const openCreateCategoryDialog = () => {
    resetCategoryForm();
    setCategoryDialogOpen(true);
  };

  const loadCategoryIntoForm = useCallback((category: Category) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      nameSi: category.nameSi || '',
    });
    setCategoryDialogOpen(true);
  }, []);

  const submitCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: categoryForm.name,
      nameSi: categoryForm.nameSi || undefined,
    };

    const onSuccess = () => {
      resetCategoryForm();
      setCategoryDialogOpen(false);
    };

    if (selectedCategory) {
      updateCategory.mutate({ categoryId: selectedCategory.id, payload }, { onSuccess });
      return;
    }

    createCategory.mutate(payload, { onSuccess });
  };

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Category',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.name}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.nameSi || 'No Sinhala label'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'productCount',
        header: 'Products',
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Edit ${row.original.name}`}
              onClick={() => loadCategoryIntoForm(row.original)}
            >
              <Pencil />
            </Button>
            <Button
              variant="destructive"
              size="icon-sm"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => {
                if (!window.confirm(`Delete ${row.original.name}?`)) {
                  return;
                }

                deleteCategory.mutate(row.original.id);
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [deleteCategory, loadCategoryIntoForm],
  );

  const table = useReactTable({
    data: filteredCategories,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination);

      updateTableSearch({
        page: next.pageIndex + 1,
        limit: next.pageSize,
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const categoryPageCount = table.getPageCount() || 1;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (!params.has('page') || !params.has('limit')) {
      updateTableSearch({}, true);
    }
  }, [updateTableSearch]);

  useEffect(() => {
    if (tableSearch.page > categoryPageCount) {
      updateTableSearch({ page: categoryPageCount }, true);
    }
  }, [categoryPageCount, tableSearch.page, updateTableSearch]);

  const mutationError =
    (categoriesQuery.error as Error)?.message ||
    (createCategory.error as Error)?.message ||
    (updateCategory.error as Error)?.message ||
    (deleteCategory.error as Error)?.message;

  return (
    <PageContainer className="flex min-h-0 flex-col" noMaxHeight>
      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);

          if (!open) {
            resetCategoryForm();
          }
        }}
      >
        <DialogContent>
          <form onSubmit={submitCategory} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <DialogTitle>{selectedCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
                <DialogDescription>Category names and Sinhala labels.</DialogDescription>
              </div>
              <DialogClose
                render={
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Close dialog">
                    <X />
                  </Button>
                }
              />
            </DialogHeader>

            <FieldGroup className="px-5 py-4">
              <Field>
                <FieldLabel htmlFor="category-name">Category name</FieldLabel>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={handleCategoryFormChange('name')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="category-name-si">Category name (Sinhala)</FieldLabel>
                <Input
                  id="category-name-si"
                  value={categoryForm.nameSi}
                  onChange={handleCategoryFormChange('nameSi')}
                />
              </Field>

              {mutationError && (
                <Alert variant="destructive">
                  <AlertTitle>Category action failed</AlertTitle>
                  <AlertDescription>{mutationError}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                <Tags data-icon="inline-start" />
                {selectedCategory ? 'Save Category' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="h-full min-h-0">
        {mutationError && !categoryDialogOpen && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Category action failed</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <DataTableCard
          title="Category Management"
          description="Edit labels and review product counts."
          table={table}
          tableClassName="min-w-[760px]"
          isLoading={categoriesQuery.isLoading}
          emptyMessage="No categories match the current search."
          toolbar={
            <div className="flex flex-wrap items-center gap-3">
              <InputGroup className="w-full sm:w-72">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={search}
                  onChange={(event) =>
                    updateTableSearch({
                      search: event.target.value || undefined,
                      page: 1,
                    })
                  }
                  placeholder="Search categories"
                />
              </InputGroup>
              <Button onClick={openCreateCategoryDialog}>
                <Plus data-icon="inline-start" />
                Add Category
              </Button>
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {filteredCategories.length} categories
              </div>
              <TablePagination table={table} totalPages={categoryPageCount} />
            </div>
          }
        />
      </div>
    </PageContainer>
  );
}
