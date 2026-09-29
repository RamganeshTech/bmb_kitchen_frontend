// import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
// import { AlertCircle, ChevronRight, Pencil, Plus, RefreshCw, Search, Tags, Trash2, X } from 'lucide-react';

// import { toast } from '../../components/ui/toast/Toast';
// import { Card } from '../../components/ui/Card';
// import { Label } from '../../components/ui/Label';
// import { Input } from '../../components/ui/Input';
// import { Button } from '../../components/ui/Button';
// import { Toggle } from '../../components/ui/Toggle';
// import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
// // TODO: fix this path to where your menu category hooks live
// import {
//   useCreateMenuCategory, useGetActiveMenuCategories, useGetInactiveMenuCategories, useGetMenuCategoryById,
//   useHardDeleteMenuCategory, useRecoverMenuCategory, useSoftDeleteMenuCategory, useUpdateMenuCategory,
// } from '../../api_service/menuCategory_api/menuCategoryApi';

// /* -------------------------------------------------------------------------- */
// /*  Types & helpers                                                           */
// /* -------------------------------------------------------------------------- */

// interface MenuCategoryData {
//   _id: string;
//   name: string;
//   description?: string | null;
//   isActive?: boolean;
//   createdAt?: string;
//   updatedAt?: string;
// }

// type Tab = 'active' | 'inactive';
// type DrawerState = { mode: 'create' } | { mode: 'view' | 'edit'; id: string } | null;
// type Confirm = 'deactivate' | 'delete' | null;

// const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// const formatDate = (value?: string) => {
//   if (!value) return '-';
//   const d = new Date(value);
//   return Number.isNaN(d.getTime()) ? '-' : dateFormatter.format(d);
// };

// // List endpoints return `any`, so accept a bare array or a wrapped one
// const toArray = (data: unknown): MenuCategoryData[] => {
//   if (Array.isArray(data)) return data as MenuCategoryData[];
//   const w = data as { categories?: MenuCategoryData[]; items?: MenuCategoryData[]; data?: MenuCategoryData[] } | null;
//   return w?.categories ?? w?.items ?? w?.data ?? [];
// };

// const filterCategories = (list: MenuCategoryData[], query: string) => {
//   const q = query.trim().toLowerCase();
//   if (!q) return list;
//   return list.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
// };

// /* -------------------------------------------------------------------------- */
// /*  Presentational pieces                                                     */
// /* -------------------------------------------------------------------------- */

// const Initial = memo(function Initial({ name, active = true, large = false }: { name: string; active?: boolean; large?: boolean }) {
//   return (
//     <span
//       className={`flex shrink-0 items-center justify-center rounded-lg font-semibold uppercase ${
//         large ? 'h-14 w-14 text-xl' : 'h-9 w-9 text-sm'
//       } ${active ? 'bg-primary-soft text-primary' : 'bg-surface-hover text-muted'}`}
//     >
//       {name.trim().charAt(0) || '?'}
//     </span>
//   );
// });

// const PanelMessage = ({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) => (
//   <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
//     <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
//     <div>
//       <h3 className="text-sm font-semibold text-heading">{title}</h3>
//       {text && <p className="mt-1 text-sm text-muted">{text}</p>}
//     </div>
//     {action}
//   </div>
// );

// /* -------------------------------------------------------------------------- */
// /*  Table                                                                     */
// /* -------------------------------------------------------------------------- */

// interface TableProps {
//   categories: MenuCategoryData[];
//   total: number;
//   isLoading: boolean;
//   errorMessage?: string;
//   onRetry: () => void;
//   selectedId?: string;
//   onOpen: (id: string) => void;
//   emptyTitle: string;
//   emptyText: string;
//   emptyAction?: ReactNode;
//   inactive?: boolean;
// }

// const CategoryTable = memo(function CategoryTable(p: TableProps) {
//   if (p.isLoading) {
//     return (
//       <Card className="overflow-hidden p-0">
//         <div className="space-y-px" aria-busy="true">
//           {[0, 1, 2, 3, 4].map((i) => (
//             <div key={i} className="h-16 animate-pulse bg-surface-hover/60" />
//           ))}
//         </div>
//       </Card>
//     );
//   }
//   if (p.errorMessage) {
//     return (
//       <Card>
//         <PanelMessage
//           icon={<AlertCircle className="h-5 w-5" />}
//           title="Could not load categories"
//           text={p.errorMessage}
//           action={
//             <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={p.onRetry}>
//               Try again
//             </Button>
//           }
//         />
//       </Card>
//     );
//   }
//   if (!p.categories.length) {
//     return (
//       <Card>
//         <PanelMessage icon={<Tags className="h-5 w-5" />} title={p.emptyTitle} text={p.emptyText} action={p.emptyAction} />
//       </Card>
//     );
//   }

//   return (
//     <>
//       <TableContainer
//         ariaLabel={p.inactive ? 'Inactive menu categories' : 'Active menu categories'}
//         caption={p.inactive ? 'List of inactive menu categories' : 'List of active menu categories'}
//       >
//         <THead>
//           <tr>
//             <Th>Category</Th>
//             <Th className="hidden md:table-cell">Description</Th>
//             <Th className="hidden lg:table-cell">Created</Th>
//             <Th className="w-12">
//               <span className="sr-only">Open</span>
//             </Th>
//           </tr>
//         </THead>
//         <TBody>
//           {p.categories.map((c) => (
//             <Tr
//               key={c._id}
//               onClick={() => p.onOpen(c._id)}
//               ariaLabel={`View category: ${c.name}`}
//               className={c._id === p.selectedId ? 'bg-primary-soft' : ''}
//             >
//               <Td>
//                 <div className="flex items-center gap-3">
//                   <Initial name={c.name} active={!p.inactive} />
//                   <div className="min-w-0">
//                     <span className="block max-w-[16rem] truncate font-medium text-heading" title={c.name}>
//                       {c.name}
//                     </span>
//                     <span className="block max-w-[16rem] truncate text-xs text-muted md:hidden">{c.description || 'No description'}</span>
//                   </div>
//                 </div>
//               </Td>
//               <Td className="hidden md:table-cell">
//                 <span className="block max-w-md truncate">{c.description || <span className="text-muted">No description</span>}</span>
//               </Td>
//               <Td className="hidden text-muted lg:table-cell">{formatDate(c.createdAt)}</Td>
//               <Td className="text-muted">
//                 <ChevronRight className="h-4 w-4" />
//               </Td>
//             </Tr>
//           ))}
//         </TBody>
//       </TableContainer>
//       <p className="mt-3 text-xs text-muted">
//         Showing {p.categories.length} of {p.total} {p.total === 1 ? 'category' : 'categories'}
//       </p>
//     </>
//   );
// });

// type SharedTableProps = Pick<TableProps, 'selectedId' | 'onOpen' | 'emptyAction'>;

// const ActiveTable = ({ query, ...rest }: { query: string } & SharedTableProps) => {
//   const { data, isLoading, error, refetch } = useGetActiveMenuCategories();
//   const all = useMemo(() => toArray(data), [data]);
//   const shown = useMemo(() => filterCategories(all, query), [all, query]);
//   return (
//     <CategoryTable
//       {...rest}
//       categories={shown}
//       total={all.length}
//       isLoading={isLoading}
//       errorMessage={error?.message}
//       onRetry={() => refetch()}
//       emptyTitle={query ? 'No matching categories' : 'No categories yet'}
//       emptyText={query ? 'Try a different search.' : 'Create your first category to start organising the menu.'}
//       emptyAction={query ? undefined : rest.emptyAction}
//     />
//   );
// };

// // Mounted only while its tab is open, so the request is lazy
// const InactiveTable = ({ query, ...rest }: { query: string } & SharedTableProps) => {
//   const { data, isLoading, error, refetch } = useGetInactiveMenuCategories();
//   const all = useMemo(() => toArray(data), [data]);
//   const shown = useMemo(() => filterCategories(all, query), [all, query]);
//   return (
//     <CategoryTable
//       {...rest}
//       categories={shown}
//       total={all.length}
//       isLoading={isLoading}
//       errorMessage={error?.message}
//       onRetry={() => refetch()}
//       emptyTitle={query ? 'No matching categories' : 'No inactive categories'}
//       emptyText={query ? 'Try a different search.' : 'Categories you deactivate will appear here.'}
//       inactive
//     />
//   );
// };

// /* -------------------------------------------------------------------------- */
// /*  Form                                                                      */
// /* -------------------------------------------------------------------------- */

// const CategoryForm = memo(function CategoryForm({
//   category,
//   isPending,
//   onSubmit,
//   onCancel,
// }: {
//   category?: MenuCategoryData;
//   isPending: boolean;
//   onSubmit: (values: { name: string; description: string }) => Promise<void>;
//   onCancel: () => void;
// }) {
//   const isEdit = !!category;
//   const [name, setName] = useState(category?.name ?? '');
//   const [description, setDescription] = useState(category?.description ?? '');
//   const [nameError, setNameError] = useState('');

//   const isDirty = name.trim() !== (category?.name ?? '') || description.trim() !== (category?.description ?? '');

//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     if (!name.trim()) {
//       setNameError('Enter the category name');
//       return;
//     }
//     await onSubmit({ name: name.trim(), description: description.trim() });
//   };

//   return (
//     <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
//       <div className="flex-1 space-y-5 overflow-y-auto p-6">
//         <div>
//           <Label htmlFor="category-name">Category name</Label>
//           <Input
//             id="category-name"
//             value={name}
//             onChange={(e: ChangeEvent<HTMLInputElement>) => {
//               setName(e.target.value);
//               if (nameError) setNameError('');
//             }}
//             placeholder="Starters, Biryani, Beverages"
//             className={nameError ? 'border-danger' : ''}
//             autoFocus
//           />
//           {nameError && <p className="mt-1.5 text-xs text-danger">{nameError}</p>}
//         </div>
//         <div>
//           <Label htmlFor="category-description">Description (optional)</Label>
//           <textarea
//             id="category-description"
//             rows={4}
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             placeholder="A short note that helps your team recognise this category"
//             className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
//           />
//         </div>
//       </div>
//       <div className="flex gap-3 border-t border-border p-4">
//         <Button variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">
//           Cancel
//         </Button>
//         <Button type="submit" isLoading={isPending} loadingText="Saving" disabled={isEdit && !isDirty} className="flex-1">
//           {isEdit ? 'Save changes' : 'Create category'}
//         </Button>
//       </div>
//     </form>
//   );
// });

// /* -------------------------------------------------------------------------- */
// /*  Drawer (details, create, edit)                                            */
// /* -------------------------------------------------------------------------- */

// interface DrawerProps {
//   state: NonNullable<DrawerState>;
//   onChange: (next: DrawerState) => void;
//   onTab: (tab: Tab) => void;
// }

// const CategoryDrawer = ({ state, onChange, onTab }: DrawerProps) => {
//   const id = state.mode === 'create' ? undefined : state.id;
//   const { data, isLoading, error, refetch, isFetching } = useGetMenuCategoryById(id);
//   const category = data as MenuCategoryData | undefined;

//   const { mutateAsync: createAsync, isPending: isCreating } = useCreateMenuCategory();
//   const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateMenuCategory();
//   const { mutateAsync: deactivateAsync, isPending: isDeactivating } = useSoftDeleteMenuCategory();
//   const { mutateAsync: recoverAsync, isPending: isRecovering } = useRecoverMenuCategory();
//   const { mutateAsync: deleteAsync, isPending: isDeleting } = useHardDeleteMenuCategory();

//   const [confirm, setConfirm] = useState<Confirm>(null);
//   const busy = isCreating || isUpdating || isDeactivating || isRecovering || isDeleting;

//   const close = useCallback(() => onChange(null), [onChange]);

//   useEffect(() => setConfirm(null), [id]);

//   // Close on Escape and lock page scroll while the drawer is open
//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === 'Escape' && !busy) close();
//     };
//     document.addEventListener('keydown', onKey);
//     const previous = document.body.style.overflow;
//     document.body.style.overflow = 'hidden';
//     return () => {
//       document.removeEventListener('keydown', onKey);
//       document.body.style.overflow = previous;
//     };
//   }, [busy, close]);

//   const handleCreate = async (values: { name: string; description: string }) => {
//     try {
//       const res = await createAsync(values);
//       toast.success('Category created successfully');
//       const createdId = res?.data?._id as string | undefined;
//       onTab('active');
//       onChange(createdId ? { mode: 'view', id: createdId } : null);
//     } catch (err: any) {
//       toast.error(err?.message || 'Failed to create category');
//     }
//   };

//   const handleUpdate = async (values: { name: string; description: string }) => {
//     if (!id) return;
//     try {
//       // PUT replaces the record, so always send the full editable set
//       await updateAsync({ id, ...values });
//       toast.success('Category updated successfully');
//       onChange({ mode: 'view', id });
//     } catch (err: any) {
//       toast.error(err?.message || 'Failed to update category');
//     }
//   };

//   const handleDeactivate = async () => {
//     if (!id) return;
//     try {
//       await deactivateAsync(id);
//       toast.success('Category deactivated');
//       setConfirm(null);
//       onTab('inactive');
//     } catch (err: any) {
//       toast.error(err?.message || 'Failed to deactivate category');
//     }
//   };

//   const handleRecover = async () => {
//     if (!id) return;
//     try {
//       await recoverAsync(id);
//       toast.success('Category restored');
//       onTab('active');
//     } catch (err: any) {
//       toast.error(err?.message || 'Failed to restore category');
//     }
//   };

//   const handleDelete = async () => {
//     if (!id) return;
//     try {
//       await deleteAsync(id);
//       toast.success('Category deleted permanently');
//       close();
//     } catch (err: any) {
//       toast.error(err?.message || 'Failed to delete category');
//       setConfirm(null);
//     }
//   };

//   const title = state.mode === 'create' ? 'New category' : state.mode === 'edit' ? 'Edit category' : 'Category details';
//   const isActive = category?.isActive !== false;

//   let body: ReactNode;
//   if (state.mode === 'create') {
//     body = <CategoryForm isPending={isCreating} onSubmit={handleCreate} onCancel={close} />;
//   } else if (isLoading) {
//     body = (
//       <div className="space-y-4 p-6" aria-busy="true">
//         <div className="h-14 w-2/3 animate-pulse rounded-lg bg-surface-hover" />
//         <div className="h-32 animate-pulse rounded-lg bg-surface-hover" />
//       </div>
//     );
//   } else if (error || !category) {
//     body = (
//       <PanelMessage
//         icon={<AlertCircle className="h-5 w-5" />}
//         title="Could not load category"
//         text={error?.message}
//         action={
//           <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={isFetching} onClick={() => refetch()}>
//             Try again
//           </Button>
//         }
//       />
//     );
//   } else if (state.mode === 'edit') {
//     body = <CategoryForm key={category._id} category={category} isPending={isUpdating} onSubmit={handleUpdate} onCancel={() => onChange({ mode: 'view', id: category._id })} />;
//   } else {
//     body = (
//       <div className="flex-1 overflow-y-auto">
//         <div className="flex items-center gap-4 p-6">
//           <Initial name={category.name} active={isActive} large />
//           <div className="min-w-0">
//             <h3 className="break-words text-lg font-semibold text-heading">{category.name}</h3>
//             <span
//               className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
//                 isActive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
//               }`}
//             >
//               <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-danger'}`} />
//               {isActive ? 'Active' : 'Inactive'}
//             </span>
//           </div>
//         </div>

//         <div className="space-y-4 border-y border-border px-6 py-4">
//           <Toggle
//             checked={isActive}
//             onChange={(next: boolean) => {
//               if (next) handleRecover();
//               else setConfirm('deactivate');
//             }}
//             label="Active"
//             description="Inactive categories are hidden from menu pickers."
//             disabled={busy}
//           />
//           <div className="flex flex-wrap gap-2">
//             {isActive && (
//               <Button leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onChange({ mode: 'edit', id: category._id })} disabled={busy}>
//                 Edit
//               </Button>
//             )}
//             <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')} disabled={busy} className="ml-auto text-danger">
//               Delete
//             </Button>
//           </div>
//         </div>

//         {confirm && (
//           <div role="alertdialog" className="mx-6 mt-5 rounded-lg border border-danger bg-danger-soft p-4">
//             <p className="text-sm font-medium text-heading">
//               {confirm === 'delete' ? `Delete ${category.name} permanently?` : `Deactivate ${category.name}?`}
//             </p>
//             <p className="mt-1 text-sm text-body">
//               {confirm === 'delete'
//                 ? 'This cannot be undone. Consider deactivating instead if you may need it again.'
//                 : 'It will be hidden from menu pickers. You can restore it any time.'}
//             </p>
//             <div className="mt-3 flex gap-2">
//               <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
//                 Keep category
//               </Button>
//               <Button
//                 onClick={confirm === 'delete' ? handleDelete : handleDeactivate}
//                 isLoading={confirm === 'delete' ? isDeleting : isDeactivating}
//                 loadingText={confirm === 'delete' ? 'Deleting' : 'Deactivating'}
//               >
//                 {confirm === 'delete' ? 'Delete category' : 'Deactivate'}
//               </Button>
//             </div>
//           </div>
//         )}

//         <dl className="space-y-5 p-6">
//           <div>
//             <dt className="text-xs text-muted">Description</dt>
//             <dd className="mt-1 whitespace-pre-line break-words text-sm text-heading">{category.description || 'No description added'}</dd>
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <dt className="text-xs text-muted">Created</dt>
//               <dd className="mt-1 text-sm font-medium text-heading">{formatDate(category.createdAt)}</dd>
//             </div>
//             <div>
//               <dt className="text-xs text-muted">Last updated</dt>
//               <dd className="mt-1 text-sm font-medium text-heading">{formatDate(category.updatedAt)}</dd>
//             </div>
//           </div>
//         </dl>
//       </div>
//     );
//   }

//   return (
//     <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
//       <style>{`
//         @keyframes drawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
//         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
//         .drawer-in { animation: drawerIn .25s ease-out; }
//         .backdrop-in { animation: fadeIn .2s ease-out; }
//         @media (prefers-reduced-motion: reduce) { .drawer-in, .backdrop-in { animation: none; } }
//       `}</style>
//       <button type="button" aria-label="Close panel" onClick={() => !busy && close()} className="backdrop-in absolute inset-0 cursor-default bg-heading/40" />
//       <aside className="drawer-in absolute right-0 top-0 flex h-full w-full flex-col bg-surface shadow-xl sm:w-[28rem]">
//         <header className="flex items-center justify-between border-b border-border px-6 py-4">
//           <h2 className="text-base font-semibold text-heading">{title}</h2>
//           <button type="button" onClick={close} disabled={busy} aria-label="Close" className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-heading">
//             <X className="h-5 w-5" />
//           </button>
//         </header>
//         {body}
//       </aside>
//     </div>
//   );
// };

// /* -------------------------------------------------------------------------- */
// /*  Page                                                                      */
// /* -------------------------------------------------------------------------- */

// const MenuCategory = () => {
//   const [tab, setTab] = useState<Tab>('active');
//   const [query, setQuery] = useState('');
//   const [drawer, setDrawer] = useState<DrawerState>(null);

//   const handleOpen = useCallback((id: string) => setDrawer({ mode: 'view', id }), []);
//   const handleNew = useCallback(() => setDrawer({ mode: 'create' }), []);

//   const selectedId = drawer && drawer.mode !== 'create' ? drawer.id : undefined;

//   const newButton = (
//     <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleNew}>
//       New category
//     </Button>
//   );

//   return (
//     <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
//       <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div className="min-w-0">
//           <h1 className="text-2xl font-semibold tracking-tight text-heading">Menu categories</h1>
//           <p className="text-sm text-muted">Group your dishes so they are easy to find while billing.</p>
//         </div>
//         {newButton}
//       </header>

//       <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div className="grid grid-cols-2 rounded-lg bg-surface-hover p-1 text-sm font-medium sm:w-64" role="tablist">
//           {(['active', 'inactive'] as Tab[]).map((t) => (
//             <button
//               key={t}
//               type="button"
//               role="tab"
//               aria-selected={tab === t}
//               onClick={() => setTab(t)}
//               className={`rounded-md py-1.5 capitalize transition-colors ${tab === t ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-heading'}`}
//             >
//               {t}
//             </button>
//           ))}
//         </div>
//         <div className="relative w-full sm:w-72">
//           <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
//           <Input value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} placeholder="Search categories" className="pl-9" aria-label="Search categories" />
//         </div>
//       </div>

//       {tab === 'active' ? (
//         <ActiveTable query={query} selectedId={selectedId} onOpen={handleOpen} emptyAction={newButton} />
//       ) : (
//         <InactiveTable query={query} selectedId={selectedId} onOpen={handleOpen} />
//       )}

//       {drawer && <CategoryDrawer state={drawer} onChange={setDrawer} onTab={setTab} />}
//     </div>
//   );
// };

// export default MenuCategory;



import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, ChevronRight, Pencil, Plus, RefreshCw, Search, Tags, Trash2, X } from 'lucide-react';

import { toast } from '../../components/ui/toast/Toast';
import { Card } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
// TODO: fix this path to where your menu category hooks live
import {
  useCreateMenuCategory, useGetActiveMenuCategories, useGetInactiveMenuCategories, useGetMenuCategoryById,
  useHardDeleteMenuCategory, useRecoverMenuCategory, useSoftDeleteMenuCategory, useUpdateMenuCategory,
} from '../../api_service/menuCategory_api/menuCategoryApi';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

/* -------------------------------------------------------------------------- */
/*  Types & helpers                                                           */
/* -------------------------------------------------------------------------- */

interface MenuCategoryData {
  _id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type Tab = 'active' | 'inactive';
type DrawerState = { mode: 'create' } | { mode: 'view' | 'edit'; id: string } | null;
type Confirm = 'deactivate' | 'delete' | null;

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : dateFormatter.format(d);
};

// List endpoints return `any`, so accept a bare array or a wrapped one
const toArray = (data: unknown): MenuCategoryData[] => {
  if (Array.isArray(data)) return data as MenuCategoryData[];
  const w = data as { categories?: MenuCategoryData[]; items?: MenuCategoryData[]; data?: MenuCategoryData[] } | null;
  return w?.categories ?? w?.items ?? w?.data ?? [];
};

const filterCategories = (list: MenuCategoryData[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
};

/* -------------------------------------------------------------------------- */
/*  Presentational pieces                                                     */
/* -------------------------------------------------------------------------- */

const Initial = memo(function Initial({ name, active = true, large = false }: { name: string; active?: boolean; large?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold uppercase ${
        large ? 'h-14 w-14 text-xl' : 'h-9 w-9 text-sm'
      } ${active ? 'bg-primary-soft text-primary' : 'bg-surface-hover text-muted'}`}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  );
});

const PanelMessage = ({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
    <div>
      <h3 className="text-sm font-semibold text-heading">{title}</h3>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
    </div>
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

interface TableProps {
  categories: MenuCategoryData[];
  onNavigate: (id:string) => any
  total: number;
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  selectedId?: string;
  onOpen: (id: string) => void;
  emptyTitle: string;
  emptyText: string;
  emptyAction?: ReactNode;
  inactive?: boolean;
}

const CategoryTable = memo(function CategoryTable(p: TableProps) {
  if (p.isLoading) {
    return (
      <Card className="overflow-hidden p-0">
        <div className="space-y-px" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-surface-hover/60" />
          ))}
        </div>
      </Card>
    );
  }
  if (p.errorMessage) {
    return (
      <Card>
        <PanelMessage
          icon={<AlertCircle className="h-5 w-5" />}
          title="Could not load categories"
          text={p.errorMessage}
          action={
            <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={p.onRetry}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  }
  if (!p.categories.length) {
    return (
      <Card>
        <PanelMessage icon={<Tags className="h-5 w-5" />} title={p.emptyTitle} text={p.emptyText} action={p.emptyAction} />
      </Card>
    );
  }

  return (
    <>
      <TableContainer
        ariaLabel={p.inactive ? 'Inactive menu categories' : 'Active menu categories'}
        caption={p.inactive ? 'List of inactive menu categories' : 'List of active menu categories'}
      >
        <THead>
          <tr>
            <Th>Category</Th>
            <Th className="hidden md:table-cell">Description</Th>
            <Th className="hidden lg:table-cell">Created</Th>
            <Th className="w-12">
              <span className="sr-only">Open</span>
            </Th>
          </tr>
        </THead>
        <TBody>
          {p.categories.map((c) => (
            <Tr
              key={c._id}
              onClick={() => p.onOpen(c._id)}
              ariaLabel={`View category: ${c.name}`}
              className={c._id === p.selectedId ? 'bg-primary-soft' : ''}
            >
              <Td>
                <div className="flex items-center gap-3">
                  <Initial name={c.name} active={!p.inactive} />
                  <div className="min-w-0">
                    <span className="block max-w-[16rem] truncate font-medium text-heading" title={c.name}>
                      {c.name}
                    </span>
                    <span className="block max-w-[16rem] truncate text-xs text-muted md:hidden">{c.description || 'No description'}</span>
                  </div>
                </div>
              </Td>
              <Td className="hidden md:table-cell">
                <span className="block max-w-md truncate">{c.description || <span className="text-muted">No description</span>}</span>
              </Td>
              <Td className="hidden text-muted lg:table-cell">{formatDate(c.createdAt)}</Td>
              <Td onClick={()=> p.onNavigate(c._id)} className="text-muted">
                <ChevronRight className="h-4 w-4" />
              </Td>
            </Tr>
          ))}
        </TBody>
      </TableContainer>
      <p className="mt-3 text-xs text-muted">
        Showing {p.categories.length} of {p.total} {p.total === 1 ? 'category' : 'categories'}
      </p>
    </>
  );
});

type SharedTableProps = Pick<TableProps, 'selectedId' | 'onOpen' | 'emptyAction'> & {onNavigate: (id:string)=> any};

const ActiveTable = ({ query, ...rest }: { query: string } & SharedTableProps) => {
  const { data, isLoading, error, refetch } = useGetActiveMenuCategories();
  const all = useMemo(() => toArray(data), [data]);
  const shown = useMemo(() => filterCategories(all, query), [all, query]);
  return (
    <CategoryTable
      {...rest}
      categories={shown}
      total={all.length}
      isLoading={isLoading}
      errorMessage={error?.message}
      onRetry={() => refetch()}
      emptyTitle={query ? 'No matching categories' : 'No categories yet'}
      emptyText={query ? 'Try a different search.' : 'Create your first category to start organising the menu.'}
      emptyAction={query ? undefined : rest.emptyAction}
    />
  );
};

// Mounted only while its tab is open, so the request is lazy
const InactiveTable = ({ query, ...rest }: { query: string } & SharedTableProps) => {
  const { data, isLoading, error, refetch } = useGetInactiveMenuCategories();
  const all = useMemo(() => toArray(data), [data]);
  const shown = useMemo(() => filterCategories(all, query), [all, query]);
  return (
    <CategoryTable
      {...rest}
      categories={shown}
      total={all.length}
      isLoading={isLoading}
      errorMessage={error?.message}
      onRetry={() => refetch()}
      emptyTitle={query ? 'No matching categories' : 'No inactive categories'}
      emptyText={query ? 'Try a different search.' : 'Categories you deactivate will appear here.'}
      inactive
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Form                                                                      */
/* -------------------------------------------------------------------------- */

const CategoryForm = memo(function CategoryForm({
  category,
  isPending,
  onSubmit,
  onCancel,
}: {
  category?: MenuCategoryData;
  isPending: boolean;
  onSubmit: (values: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [nameError, setNameError] = useState('');

  const isDirty = name.trim() !== (category?.name ?? '') || description.trim() !== (category?.description ?? '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Enter the category name');
      return;
    }
    await onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <div>
          <Label htmlFor="category-name">Category name</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder="Starters, Biryani, Beverages"
            className={nameError ? 'border-danger' : ''}
            autoFocus
          />
          {nameError && <p className="mt-1.5 text-xs text-danger">{nameError}</p>}
        </div>
        <div>
          <Label htmlFor="category-description">Description (optional)</Label>
          <textarea
            id="category-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short note that helps your team recognise this category"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div className="flex gap-3 border-t border-border p-4">
        <Button variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving" disabled={isEdit && !isDirty} className="flex-1">
          {isEdit ? 'Save changes' : 'Create category'}
        </Button>
      </div>
    </form>
  );
});

/* -------------------------------------------------------------------------- */
/*  Drawer (details, create, edit)                                            */
/* -------------------------------------------------------------------------- */

interface DrawerProps {
  state: NonNullable<DrawerState>;
  onChange: (next: DrawerState) => void;
  onTab: (tab: Tab) => void;
}

const CategoryDrawer = ({ state, onChange, onTab }: DrawerProps) => {
  const id = state.mode === 'create' ? undefined : state.id;
  const { data, isLoading, error, refetch, isFetching } = useGetMenuCategoryById(id);
  const category = data as MenuCategoryData | undefined;

  const { mutateAsync: createAsync, isPending: isCreating } = useCreateMenuCategory();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateMenuCategory();
  const { mutateAsync: deactivateAsync, isPending: isDeactivating } = useSoftDeleteMenuCategory();
  const { mutateAsync: recoverAsync, isPending: isRecovering } = useRecoverMenuCategory();
  const { mutateAsync: deleteAsync, isPending: isDeleting } = useHardDeleteMenuCategory();

  const [confirm, setConfirm] = useState<Confirm>(null);
  const busy = isCreating || isUpdating || isDeactivating || isRecovering || isDeleting;

  const close = useCallback(() => onChange(null), [onChange]);

  useEffect(() => setConfirm(null), [id]);

  // Close on Escape and lock page scroll while the drawer is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) close();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [busy, close]);

  const handleCreate = async (values: { name: string; description: string }) => {
    try {
      const res = await createAsync(values);
      toast.success('Category created successfully');
      const createdId = res?.data?._id as string | undefined;
      onTab('active');
      onChange(createdId ? { mode: 'view', id: createdId } : null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create category');
    }
  };

  const handleUpdate = async (values: { name: string; description: string }) => {
    if (!id) return;
    try {
      // PUT replaces the record, so always send the full editable set
      await updateAsync({ id, ...values });
      toast.success('Category updated successfully');
      onChange({ mode: 'view', id });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update category');
    }
  };

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      await deactivateAsync(id);
      toast.success('Category deactivated');
      setConfirm(null);
      onTab('inactive');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deactivate category');
    }
  };

  const handleRecover = async () => {
    if (!id) return;
    try {
      await recoverAsync(id);
      toast.success('Category restored');
      onTab('active');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to restore category');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteAsync(id);
      toast.success('Category deleted permanently');
      close();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete category');
      setConfirm(null);
    }
  };

  const title = state.mode === 'create' ? 'New category' : state.mode === 'edit' ? 'Edit category' : 'Category details';
  const isActive = category?.isActive !== false;

  let body: ReactNode;
  if (state.mode === 'create') {
    body = <CategoryForm isPending={isCreating} onSubmit={handleCreate} onCancel={close} />;
  } else if (isLoading) {
    body = (
      <div className="space-y-4 p-6" aria-busy="true">
        <div className="h-14 w-2/3 animate-pulse rounded-lg bg-surface-hover" />
        <div className="h-32 animate-pulse rounded-lg bg-surface-hover" />
      </div>
    );
  } else if (error || !category) {
    body = (
      <PanelMessage
        icon={<AlertCircle className="h-5 w-5" />}
        title="Could not load category"
        text={error?.message}
        action={
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  } else if (state.mode === 'edit') {
    body = <CategoryForm key={category._id} category={category} isPending={isUpdating} onSubmit={handleUpdate} onCancel={() => onChange({ mode: 'view', id: category._id })} />;
  } else {
    body = (
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-4 p-6">
          <Initial name={category.name} active={isActive} large />
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold text-heading">{category.name}</h3>
            <span
              className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isActive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-danger'}`} />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="space-y-4 border-y border-border px-6 py-4">
          <Toggle
            checked={isActive}
            onChange={(next: boolean) => {
              if (next) handleRecover();
              else setConfirm('deactivate');
            }}
            label="Active"
            description="Inactive categories are hidden from menu pickers."
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            {isActive && (
              <Button leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onChange({ mode: 'edit', id: category._id })} disabled={busy}>
                Edit
              </Button>
            )}
            <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')} disabled={busy} className="ml-auto text-danger">
              Delete
            </Button>
          </div>
        </div>

        {confirm && (
          <div role="alertdialog" className="mx-6 mt-5 rounded-lg border border-danger bg-danger-soft p-4">
            <p className="text-sm font-medium text-heading">
              {confirm === 'delete' ? `Delete ${category.name} permanently?` : `Deactivate ${category.name}?`}
            </p>
            <p className="mt-1 text-sm text-body">
              {confirm === 'delete'
                ? 'This cannot be undone. Consider deactivating instead if you may need it again.'
                : 'It will be hidden from menu pickers. You can restore it any time.'}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
                Keep category
              </Button>
              <Button
                onClick={confirm === 'delete' ? handleDelete : handleDeactivate}
                isLoading={confirm === 'delete' ? isDeleting : isDeactivating}
                loadingText={confirm === 'delete' ? 'Deleting' : 'Deactivating'}
              >
                {confirm === 'delete' ? 'Delete category' : 'Deactivate'}
              </Button>
            </div>
          </div>
        )}

        <dl className="space-y-5 p-6">
          <div>
            <dt className="text-xs text-muted">Description</dt>
            <dd className="mt-1 whitespace-pre-line break-words text-sm text-heading">{category.description || 'No description added'}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-muted">Created</dt>
              <dd className="mt-1 text-sm font-medium text-heading">{formatDate(category.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Last updated</dt>
              <dd className="mt-1 text-sm font-medium text-heading">{formatDate(category.updatedAt)}</dd>
            </div>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <style>{`
        @keyframes drawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .drawer-in { animation: drawerIn .25s ease-out; }
        .backdrop-in { animation: fadeIn .2s ease-out; }
        @media (prefers-reduced-motion: reduce) { .drawer-in, .backdrop-in { animation: none; } }
      `}</style>
      <button type="button" aria-label="Close panel" onClick={() => !busy && close()} className="backdrop-in absolute inset-0 cursor-default bg-heading/40" />
      <aside className="drawer-in absolute right-0 top-0 flex h-full w-full flex-col bg-surface shadow-xl sm:w-[28rem]">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-heading">{title}</h2>
          <button type="button" onClick={close} disabled={busy} aria-label="Close" className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-heading">
            <X className="h-5 w-5" />
          </button>
        </header>
        {body}
      </aside>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const MenuCategory = () => {
     const navigate = useNavigate();
    const location = useLocation();
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);

  const handleOpen = useCallback((id: string) => setDrawer({ mode: 'view', id }), []);
  const handleNew = useCallback(() => setDrawer({ mode: 'create' }), []);

  const selectedId = drawer && drawer.mode !== 'create' ? drawer.id : undefined;

  const newButton = (
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleNew}>
      New category
    </Button>
  );


  
   const handleView = (id: string) => {
        navigate(`menu-item/${id}`); // Adjust this route based on your router config
    };



    const isChild = location.pathname.includes("single")


  if(isChild){
    return <Outlet />
  }
  return (
    <div className="w-full px-3 py-3 sm:px-4 sm:py-4">
      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <Tags className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-heading sm:text-2xl">Menu categories</h1>
            <p className="text-sm text-muted">Group your dishes so they are easy to find while billing.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Search categories"
              className="pl-9"
              aria-label="Search categories"
            />
          </div>
          <Toggle
            checked={tab === 'inactive'}
            onChange={(checked: boolean) => setTab(checked ? 'inactive' : 'active')}
            label="Show inactive"
            size="sm"
          />
          {newButton}
        </div>
      </header>

      {tab === 'active' ? (
        <ActiveTable query={query} onNavigate={handleView} selectedId={selectedId} onOpen={handleOpen} emptyAction={newButton} />
      ) : (
        <InactiveTable query={query}  onNavigate={handleView} selectedId={selectedId} onOpen={handleOpen} />
      )}

      {drawer && <CategoryDrawer state={drawer} onChange={setDrawer} onTab={setTab} />}
    </div>
  );
};

export default MenuCategory;