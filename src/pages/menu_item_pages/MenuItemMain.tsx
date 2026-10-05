import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, ChevronRight, Clock, Filter, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, UtensilsCrossed, X } from 'lucide-react';

import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Toggle } from '../../components/ui/Toggle';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { cn } from '../../lib/cn';
import useDebounce from '../../hooks/useDebounce';
import { useAuthData } from '../../hooks/useAuthData';
// TODO: fix these two paths to match your project
import {
      useAddMenuItemImages, useCreateMenuItem, useGetActiveMenuItems, useGetInactiveMenuItems, useGetMenuItemById,
    useHardDeleteMenuItem, useRecoverMenuItem, useRemoveMenuItemImage, useSoftDeleteMenuItem, useUpdateMenuItem, type MenuItemQueryParams,
} from '../../api_service/menuItem_api/menuItemApi';
import { useGetMenuCategoryDropdown } from '../../api_service/menuCategory_api/menuCategoryApi';
import { useParams } from 'react-router-dom';
import { ImageGallery, type IFileUpload } from '../../components/shared/ImageGallery';
import { NO_IMAGE } from '../../constants/constants';

/* -------------------------------------------------------------------------- */
/*  Types, constants, helpers                                                 */
/* -------------------------------------------------------------------------- */

type FoodType = 'Veg' | 'Non-veg' | 'Egg';
interface Option { label: string; value: string }
interface MenuItemData {
    _id: string;
    name: string;
    categoryId: string | { _id: string; name?: string };
    basePrice: number;
    foodType?: FoodType;
    prepTime?: number;
    variants?: { name: string; priceDifference: number }[];
    addOns?: { name: string; price: number }[];
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    images?: IFileUpload[];

}
type DrawerState = { mode: 'create' } | { mode: 'view' | 'edit'; id: string } | null;

const FOOD_TYPES: FoodType[] = ['Veg', 'Non-veg', 'Egg'];
const FOOD_TYPE_OPTIONS: Option[] = FOOD_TYPES.map((t) => ({ label: t, value: t }));
const FOOD_TONE: Record<FoodType, string> = { Veg: 'border-success text-success', 'Non-veg': 'border-danger text-danger', Egg: 'border-warning text-warning' };
const FOOD_DOT: Record<FoodType, string> = { Veg: 'bg-success', 'Non-veg': 'bg-danger', Egg: 'bg-warning' };

const SORT_OPTIONS: (Option & { sortBy: NonNullable<MenuItemQueryParams['sortBy']>; sortOrder: 'asc' | 'desc' })[] = [
    { label: 'Newest first', value: 'newest', sortBy: 'createdAt', sortOrder: 'desc' },
    { label: 'Oldest first', value: 'oldest', sortBy: 'createdAt', sortOrder: 'asc' },
    { label: 'Name A to Z', value: 'name_asc', sortBy: 'name', sortOrder: 'asc' },
    { label: 'Name Z to A', value: 'name_desc', sortBy: 'name', sortOrder: 'desc' },
    { label: 'Price low to high', value: 'price_asc', sortBy: 'basePrice', sortOrder: 'asc' },
    { label: 'Price high to low', value: 'price_desc', sortBy: 'basePrice', sortOrder: 'desc' },
    { label: 'Quickest to prepare', value: 'prep_asc', sortBy: 'prepTime', sortOrder: 'asc' },
];

const DEFAULT_FILTERS = { search: '', categoryId: '', foodType: '', minPrice: '', maxPrice: '', maxPrepTime: '', hasVariants: false, hasAddOns: false, sort: 'newest' };
type Filters = typeof DEFAULT_FILTERS;

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatPrice = (n?: number) => (typeof n === 'number' ? currency.format(n) : '-');
const formatDate = (v?: string) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? dateFormatter.format(d) : '-';
};

// Endpoints return `any`, so accept a bare array or a wrapped one
const toArray = <T,>(data: unknown, keys: string[]): T[] => {
    if (Array.isArray(data)) return data as T[];
    const obj = (data ?? {}) as Record<string, unknown>;
    for (const k of keys) if (Array.isArray(obj[k])) return obj[k] as T[];
    return [];
};
const toItems = (data: unknown) => toArray<MenuItemData>(data, ['menuItems', 'items', 'data']);
const toOptions = (data: unknown): Option[] =>
    toArray<Record<string, any>>(data, ['categories', 'items', 'data'])
        .map((c) => ({ label: String(c.name ?? c.label ?? ''), value: String(c._id ?? c.value ?? c.id ?? '') }))
        .filter((o) => o.label && o.value);

const categoryIdOf = (i: MenuItemData) => (typeof i.categoryId === 'string' ? i.categoryId : i.categoryId?._id ?? '');
const categoryNameOf = (i: MenuItemData, names: Record<string, string>) =>
    (typeof i.categoryId === 'object' && i.categoryId?.name) || names[categoryIdOf(i)] || '-';

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

const FoodDot = ({ type, className }: { type?: FoodType; className?: string }) =>
    type ? (
        <span title={type} aria-label={type} className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2', FOOD_TONE[type], className)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', FOOD_DOT[type])} />
        </span>
    ) : (
        <span className={cn('inline-block h-4 w-4 shrink-0', className)} />
    );

const StatusPill = ({ active }: { active: boolean }) => (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', active ? 'border-success/20 bg-success/10 text-success' : 'border-danger/20 bg-danger/10 text-danger')}>
        <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-success' : 'bg-danger')} />
        {active ? 'Active' : 'Inactive'}
    </span>
);

const Message = ({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) => (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
        <div>
            <h3 className="text-sm font-semibold text-heading">{title}</h3>
            {text && <p className="mt-1 text-sm text-muted">{text}</p>}
        </div>
        {action}
    </div>
);

/* -------------------------------------------------------------------------- */
/*  Items table (shared by active + inactive)                                 */
/* -------------------------------------------------------------------------- */

interface TableProps {
    items: MenuItemData[];
    isLoading: boolean;
    errorMessage?: string;
    onRetry: () => void;
    selectedId?: string;
    onOpen: (id: string) => void;
    onClear: () => void;
    categoryNames: Record<string, string>;
    inactive?: boolean;
    hasFilters: boolean;
}

const ItemsTable = ({ items, isLoading, errorMessage, onRetry, selectedId, onOpen, onClear, categoryNames, inactive, hasFilters }: TableProps) => {
    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center p-12" aria-busy="true">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    if (errorMessage) {
        return (
            <Message
                icon={<AlertCircle className="h-5 w-5" />}
                title="Could not load menu items"
                text={errorMessage}
                action={<Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>Try again</Button>}
            />
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
                <TableContainer className="rounded-none border-none shadow-none" ariaLabel={inactive ? 'Inactive menu items' : 'Active menu items'} caption="List of menu items">
                    <THead className="sticky top-0 z-10">
                        <tr>
                            <Th>S.No</Th>
                            <Th>Image</Th>
                            <Th>Item</Th>
                            <Th className="hidden md:table-cell">Category</Th>
                            <Th className="text-right">Price</Th>
                            <Th className="hidden lg:table-cell">Prep time</Th>
                            <Th className="hidden xl:table-cell">Options</Th>
                            <Th className="w-10"><span className="sr-only">Open</span></Th>
                        </tr>
                    </THead>
                    <TBody>
                        {items.length === 0 ? (
                            <Tr>
                                <Td colSpan={6} className="py-12 text-center">
                                    <div className="flex flex-col items-center text-muted">
                                        <UtensilsCrossed className="mb-3 h-10 w-10 opacity-50" />
                                        <p className="text-base font-medium text-body">{hasFilters ? 'No items match your filters' : inactive ? 'No inactive items' : 'No menu items yet'}</p>
                                        {hasFilters && <Button variant="ghost" size="sm" className="mt-2" onClick={onClear}>Clear filters</Button>}
                                    </div>
                                </Td>
                            </Tr>
                        ) : (
                            items.map((item, idx) => (
                                <Tr key={item._id} onClick={() => onOpen(item._id)} ariaLabel={`View menu item: ${item.name}`} className={item._id === selectedId ? 'bg-primary/5' : ''}>
                                    <Td className="hidden md:table-cell">{idx + 1}</Td>

                                    <Td className="hidden md:table-cell">
                                        {item.images?.length ? (
                                            <img
                                                src={item.images[0].url}
                                                alt={item?.name}
                                                className="h-12 w-12 rounded-lg object-cover border border-border"
                                            />
                                        ) : (
                                            <img
                                                src={NO_IMAGE}
                                                alt={item?.name}
                                                className="h-12 w-12 rounded-lg object-cover border border-border"
                                            />
                                        )}
                                    </Td>

                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <FoodDot type={item.foodType} />
                                            <div className="min-w-0">
                                                <span className={cn('block max-w-[14rem] truncate font-medium sm:max-w-xs', inactive ? 'text-muted' : 'text-heading')} title={item.name}>{item.name}</span>
                                                <span className="block max-w-[14rem] truncate text-xs text-muted md:hidden">{categoryNameOf(item, categoryNames)}</span>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td className="hidden md:table-cell">{categoryNameOf(item, categoryNames)}</Td>
                                    <Td className="text-right font-medium tabular-nums text-heading">{formatPrice(item.basePrice)}</Td>
                                    <Td className="hidden text-muted lg:table-cell">{item.prepTime ? `${item.prepTime} min` : '-'}</Td>
                                    <Td className="hidden text-xs text-muted xl:table-cell">
                                        {item.variants?.length ? `${item.variants.length} variant${item.variants.length > 1 ? 's' : ''}` : ''}
                                        {item.variants?.length && item.addOns?.length ? ' · ' : ''}
                                        {item.addOns?.length ? `${item.addOns.length} add-on${item.addOns.length > 1 ? 's' : ''}` : ''}
                                        {!item.variants?.length && !item.addOns?.length && '-'}
                                    </Td>
                                    <Td className="text-muted"><ChevronRight className="h-4 w-4" /></Td>
                                </Tr>
                            ))
                        )}
                    </TBody>
                </TableContainer>
            </div>
            <div className="shrink-0 border-t border-border px-4 py-2 text-xs text-muted sm:px-6">
                {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
        </div>
    );
};

type ListProps = Omit<TableProps, 'items' | 'isLoading' | 'errorMessage' | 'onRetry' | 'inactive'> & { params: MenuItemQueryParams };

const ActiveItems = ({ params, ...rest }: ListProps) => {
    const { data, isLoading, error, refetch } = useGetActiveMenuItems(params);
    return <ItemsTable {...rest} items={toItems(data)} isLoading={isLoading} errorMessage={error?.message} onRetry={() => refetch()} />;
};

// Mounted only while "Show inactive" is on, so that request stays lazy
const InactiveItems = ({ params, ...rest }: ListProps) => {
    const { data, isLoading, error, refetch } = useGetInactiveMenuItems(params);
    return <ItemsTable {...rest} items={toItems(data)} isLoading={isLoading} errorMessage={error?.message} onRetry={() => refetch()} inactive />;
};

/* -------------------------------------------------------------------------- */
/*  Form (create + edit)                                                      */
/* -------------------------------------------------------------------------- */

interface Row { key: string; name: string; value: string }
const newRow = (name = '', value = ''): Row => ({ key: Math.random().toString(36).slice(2), name, value });

const RowsEditor = ({ title, hint, rows, onChange, valueLabel, error }: { title: string; hint: string; rows: Row[]; onChange: (rows: Row[]) => void; valueLabel: string; error?: string }) => (
    <div>
        <div className="mb-2 flex items-center justify-between">
            <div>
                <Label>{title}</Label>
                <p className="text-xs text-muted">{hint}</p>
            </div>
            <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => onChange([...rows, newRow()])}>Add</Button>
        </div>
        <div className="space-y-2">
            {rows.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                    <Input className="min-w-0 flex-1" placeholder="Name" aria-label={`${title} name`} value={row.name} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(rows.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)))} />
                    <Input className="w-28 shrink-0" type="number" inputMode="decimal" placeholder={valueLabel} aria-label={`${title} ${valueLabel}`} value={row.value} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(rows.map((r) => (r.key === row.key ? { ...r, value: e.target.value } : r)))} />
                    <button type="button" aria-label={`Remove ${title}`} onClick={() => onChange(rows.filter((r) => r.key !== row.key))} className="rounded-md p-2 text-muted transition-colors hover:bg-surface-hover hover:text-danger">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
);

interface FormValues {
    name: string; categoryId: string; basePrice: number; foodType?: FoodType; prepTime?: number;
    images: File[];
    variants: { name: string; priceDifference: number }[]; addOns: { name: string; price: number }[]
}

// const ItemForm = ({ item, categoryOptions, isPending, onSubmit, onCancel }: { item?: MenuItemData; categoryOptions: Option[]; isPending: boolean; onSubmit: (v: FormValues) => Promise<void>; onCancel: () => void }) => {
const ItemForm = ({
    item,
    categoryOptions,
    isPending,
    onSubmit,
    onCancel,
    onAddImages,
    onRemoveImage,
}: {
    item?: MenuItemData;
    categoryOptions: Option[];
    isPending: boolean;
    onSubmit: (v: FormValues) => Promise<void>;
    onCancel: () => void;
    onAddImages?: (files: File[]) => Promise<void>;
    onRemoveImage?: (image: IFileUpload) => Promise<void>;
}) => {
    const [name, setName] = useState(item?.name ?? '');
    const [categoryId, setCategoryId] = useState(item ? categoryIdOf(item) : '');
    const [basePrice, setBasePrice] = useState(item ? String(item.basePrice) : '');
    const [foodType, setFoodType] = useState<FoodType | ''>(item?.foodType ?? '');
    const [prepTime, setPrepTime] = useState(item?.prepTime ? String(item.prepTime) : '');
    const [variants, setVariants] = useState<Row[]>((item?.variants ?? []).map((v) => newRow(v.name, String(v.priceDifference))));
    const [addOns, setAddOns] = useState<Row[]>((item?.addOns ?? []).map((a) => newRow(a.name, String(a.price))));
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [images, setImages] = useState<File[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);

    const existingImageCount = item?.images?.length ?? 0;
    const remainingImageSlots = Math.max(
        0,
        5 - existingImageCount - newImages.length
    );

    const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);

        if (!files.length) return;

        const remainingSlots = 5 - existingImageCount - newImages.length;

        if (remainingSlots <= 0) {
            toast.error('You can store a maximum of 5 images');
            e.target.value = '';
            return;
        }

        if (files.length > remainingSlots) {
            toast.error(
                `You can add only ${remainingSlots} more image${remainingSlots > 1 ? 's' : ''}`
            );

            setNewImages((prev) => [
                ...prev,
                ...files.slice(0, remainingSlots),
            ]);
        } else {
            setNewImages((prev) => [...prev, ...files]);
        }

        e.target.value = '';
    };

    const handleRemoveNewImage = (index: number) => {
        setNewImages((prev) => prev.filter((_, i) => i !== index));
    };
    const clear = (key: string) => errors[key] && setErrors((p) => ({ ...p, [key]: '' }));
    const validRows = (rows: Row[]) => rows.every((r) => r.name.trim() && r.value.trim() !== '' && Number.isFinite(Number(r.value)));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: Record<string, string> = {};
        if (!name.trim()) next.name = 'Enter the item name';
        if (!categoryId) next.categoryId = 'Choose a category';
        if (basePrice.trim() === '' || !(Number(basePrice) >= 0)) next.basePrice = 'Enter a valid price';
        if (prepTime && !(Number.isInteger(Number(prepTime)) && Number(prepTime) >= 0)) next.prepTime = 'Enter whole minutes';
        if (!validRows(variants)) next.variants = 'Each variant needs a name and a price difference';
        if (!validRows(addOns) || addOns.some((a) => Number(a.value) < 0)) next.addOns = 'Each add-on needs a name and a price of 0 or more';
        setErrors(next);
        if (Object.keys(next).length) return;


        // if (item && newImages.length > 0) {
        //     await onAddImages?.(newImages);
        // }

        await onSubmit({
            name: name.trim(),
            categoryId,
            basePrice: Number(basePrice),
            foodType: foodType || undefined,
            prepTime: prepTime ? Number(prepTime) : undefined,
            variants: variants.map((v) => ({
                name: v.name.trim(),
                priceDifference: Number(v.value),
            })),
            addOns: addOns.map((a) => ({
                name: a.name.trim(),
                price: Number(a.value),
            })),
            images,
        });

        if (item && newImages.length > 0) {
            await onAddImages?.(newImages);
        }
    };

    const err = (k: string) => (errors[k] ? <p className="mt-1.5 text-xs text-danger">{errors[k]}</p> : null);

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
                <div>
                    <Label htmlFor="item-name">Item name</Label>
                    <Input id="item-name" value={name} placeholder="Chicken biryani" className={errors.name ? 'border-danger' : ''} autoFocus onChange={(e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value); clear('name'); }} />
                    {err('name')}
                </div>
                <div>
                    <SearchSelect label="Category" options={categoryOptions} value={categoryId} placeholder="Select a category" onChange={(o) => { setCategoryId(String(o.value)); clear('categoryId'); }} onClear={() => setCategoryId('')} />
                    {err('categoryId')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="item-price">Base price (₹)</Label>
                        <Input id="item-price" type="number" inputMode="decimal" min={0} value={basePrice} placeholder="0" className={errors.basePrice ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setBasePrice(e.target.value); clear('basePrice'); }} />
                        {err('basePrice')}
                    </div>
                    <div>
                        <Label htmlFor="item-prep">Prep time (min)</Label>
                        <Input id="item-prep" type="number" inputMode="numeric" min={0} value={prepTime} placeholder="Optional" className={errors.prepTime ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setPrepTime(e.target.value); clear('prepTime'); }} />
                        {err('prepTime')}
                    </div>
                </div>
                <div>
                    <Label>Food type</Label>
                    <div className="mt-1 grid grid-cols-3 gap-2" role="group" aria-label="Food type">
                        {FOOD_TYPES.map((t) => (
                            <button key={t} type="button" aria-pressed={foodType === t} onClick={() => setFoodType(foodType === t ? '' : t)} className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', foodType === t ? 'border-primary bg-primary/5 text-heading' : 'border-border text-body hover:bg-surface-hover')}>
                                <FoodDot type={t} /> {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Label>Images</Label>

                    {/* Existing images */}
                    {item?.images && item.images.length > 0 && (
                        <div className="mt-2">
                            <p className="mb-2 text-xs font-medium text-muted">
                                Existing images ({item.images.length}/5)
                            </p>

                            <ImageGallery
                                images={item.images}
                                handleDelete={onRemoveImage}
                                heightClass="h-24"
                                widthClass="w-24"
                            />
                        </div>
                    )}

                    {/* Create item - select images */}
                    {!item && (
                        <div className="mt-3">
                            <Input
                                id="item-images"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    const files = Array.from(e.target.files ?? []);

                                    if (files.length > 5) {
                                        toast.error('You can select a maximum of 5 images');
                                        setImages(files.slice(0, 5));
                                    } else {
                                        setImages(files);
                                    }

                                    e.target.value = '';
                                }}
                            />

                            {images.length > 0 && (
                                <p className="mt-1.5 text-xs text-muted">
                                    {images.length}/5 images selected
                                </p>
                            )}
                        </div>
                    )}

                    {/* Edit item - add new images */}
                    {item && remainingImageSlots > 0 && (
                        <div className="mt-3">
                            <p className="mb-2 text-xs font-medium text-muted">
                                Add new images ({remainingImageSlots} remaining)
                            </p>

                            <Input
                                id="item-add-images"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                            />
                        </div>
                    )}

                    {/* Maximum reached */}
                    {item && remainingImageSlots === 0 && (
                        <p className="mt-2 text-xs text-muted">
                            Maximum of 5 images reached. Remove an existing image to add another.
                        </p>
                    )}

                    {/* Newly selected images */}
                    {item && newImages.length > 0 && (
                        <div className="mt-4">
                            <p className="mb-2 text-xs font-medium text-muted">
                                New images ({newImages.length})
                            </p>

                            <div className="flex flex-wrap gap-3">
                                {newImages.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="relative h-24 w-24 overflow-hidden rounded-lg border border-border"
                                    >
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={file.name}
                                            className="h-full w-full object-cover"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveNewImage(index)}
                                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-2 text-xs text-muted">
                                {existingImageCount + newImages.length}/5 images selected
                            </p>
                        </div>
                    )}
                </div>

                <RowsEditor title="Variants" hint="Sizes or portions, e.g. Half (-40) or Full (0)" valueLabel="± price" rows={variants} onChange={(r) => { setVariants(r); clear('variants'); }} error={errors.variants} />
                <RowsEditor title="Add-ons" hint="Extras guests can add, e.g. Extra cheese (30)" valueLabel="Price" rows={addOns} onChange={(r) => { setAddOns(r); clear('addOns'); }} error={errors.addOns} />
            </div>
            <div className="flex shrink-0 gap-3 border-t border-border p-4">
                <Button variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">Cancel</Button>
                <Button type="submit" isLoading={isPending} loadingText="Saving" className="flex-1">{item ? 'Save changes' : 'Create item'}</Button>
            </div>
        </form>
    );
};

/* -------------------------------------------------------------------------- */
/*  Drawer (details, create, edit)                                            */
/* -------------------------------------------------------------------------- */

interface DrawerProps { state: NonNullable<DrawerState>; onChange: (s: DrawerState) => void; onShowInactive: (v: boolean) => void; canWrite: boolean; categoryOptions: Option[]; categoryNames: Record<string, string> }

const ItemDrawer = ({ state, onChange, onShowInactive, canWrite, categoryOptions, categoryNames }: DrawerProps) => {
    const id = state.mode === 'create' ? undefined : state.id;
    const { data, isLoading, error, refetch, isFetching } = useGetMenuItemById(id);
    const item = data as MenuItemData | undefined;

    const { mutateAsync: createAsync, isPending: isCreating } = useCreateMenuItem();
    const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateMenuItem();
    const { mutateAsync: deactivateAsync, isPending: isDeactivating } = useSoftDeleteMenuItem();
    const { mutateAsync: recoverAsync, isPending: isRecovering } = useRecoverMenuItem();
    const { mutateAsync: deleteAsync, isPending: isDeleting } = useHardDeleteMenuItem();

    const { mutateAsync: addImagesAsync, isPending: isAddingImages } = useAddMenuItemImages();

    const { mutateAsync: removeImageAsync, isPending: isRemovingImage } = useRemoveMenuItemImage();

    const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);
    // const busy = isCreating || isUpdating || isDeactivating || isRecovering || isDeleting;
    const busy =
        isCreating ||
        isUpdating ||
        isDeactivating ||
        isRecovering ||
        isDeleting ||
        isAddingImages ||
        isRemovingImage;
    const close = () => !busy && onChange(null);

    const handleCreate = async (values: FormValues) => {
        try {
            const res = await createAsync(values);
            toast.success('Menu item created successfully');
            onShowInactive(false);
            const createdId = res?.data?._id as string | undefined;
            onChange(createdId ? { mode: 'view', id: createdId } : null);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to create menu item');
        }
    };

    const handleUpdate = async (values: FormValues) => {
        if (!id) return;
        try {
            await updateAsync({ id, ...values }); // PUT replaces the record, so send the full set
            toast.success('Menu item updated successfully');
            onChange({ mode: 'view', id });
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update menu item');
        }
    };

    const handleAddImages = async (files: File[]) => {
        if (!id || files.length === 0) return;

        try {
            await addImagesAsync({
                menuItemId: id,
                files,
            });

            toast.success('Images added successfully');
            refetch();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add images');
        }
    };

    const handleRemoveImage = async (image: IFileUpload) => {
        if (!id || !image.key) return;

        try {
            await removeImageAsync({
                menuItemId: id,
                imageId: (image as any)._id,
            });

            toast.success('Image removed successfully');
            refetch();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove image');
        }
    };

    const run = async (action: () => Promise<unknown>, ok: string, fail: string, after?: () => void) => {
        try {
            await action();
            toast.success(ok);
            setConfirm(null);
            after?.();
        } catch (err: any) {
            toast.error(err?.message || fail);
            setConfirm(null);
        }
    };

    const title = state.mode === 'create' ? 'New menu item' : state.mode === 'edit' ? 'Edit menu item' : 'Item details';
    const isActive = item?.isActive !== false;

    let body: ReactNode;
    if (state.mode === 'create') {
        body = <ItemForm categoryOptions={categoryOptions} isPending={isCreating} onSubmit={handleCreate} onCancel={close} />;
    } else if (isLoading) {
        body = <div className="flex flex-1 items-center justify-center p-12" aria-busy="true"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
    } else if (error || !item) {
        body = <Message icon={<AlertCircle className="h-5 w-5" />} title="Could not load menu item" text={error?.message} action={<Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={isFetching} onClick={() => refetch()}>Try again</Button>} />;
    } else if (state.mode === 'edit') {
        // body = <ItemForm key={item._id} item={item} categoryOptions={categoryOptions} isPending={isUpdating} onSubmit={handleUpdate} onCancel={() => onChange({ mode: 'view', id: item._id })} />;
        body = (
            <ItemForm
                item={item}
                categoryOptions={categoryOptions}
                isPending={isUpdating || isAddingImages || isRemovingImage}
                onSubmit={handleUpdate}
                onCancel={close}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
            />
        );
    } else {
        body = (
            <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <FoodDot type={item.foodType} className="mt-1.5" />
                        <div className="min-w-0 flex-1">
                            <h3 className="break-words text-lg font-semibold text-heading">{item.name}</h3>
                            <p className="text-sm text-muted">{categoryNameOf(item, categoryNames)}</p>
                        </div>
                        <StatusPill active={isActive} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border bg-surface-muted p-3">
                            <p className="text-xs text-muted">Base price</p>
                            <p className="mt-0.5 text-lg font-semibold tabular-nums text-heading">{formatPrice(item.basePrice)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-surface-muted p-3">
                            <p className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> Prep time</p>
                            <p className="mt-0.5 text-lg font-semibold text-heading">{item.prepTime ? `${item.prepTime} min` : '-'}</p>
                        </div>
                    </div>
                </div>


                <div className="p-4">
                    <Label>Images</Label>

                    {/* Existing images */}
                    {item?.images && item.images.length > 0 && (
                        <div className="mt-2">
                            <p className="mb-2 text-xs font-medium text-muted">
                                Existing images ({item.images.length}/5)
                            </p>

                            <ImageGallery
                                images={item.images}
                                handleDelete={handleRemoveImage}
                                heightClass="h-24"
                                widthClass="w-24"
                            />
                        </div>
                    )}
                </div>

                {canWrite && (
                    <div className="space-y-4 border-y border-border px-4 py-4 sm:px-5">
                        <Toggle checked={isActive} disabled={busy} label="Available on menu" description="Inactive items are hidden from billing." onChange={(next: boolean) => (next ? run(() => recoverAsync(item._id), 'Menu item restored', 'Failed to restore menu item', () => onShowInactive(false)) : setConfirm('deactivate'))} />
                        <div className="flex flex-wrap gap-2">
                            {isActive && <Button leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onChange({ mode: 'edit', id: item._id })} disabled={busy}>Edit</Button>}
                            <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')} disabled={busy} className="ml-auto text-danger">Delete</Button>
                        </div>
                    </div>
                )}

                {confirm && (
                    <div role="alertdialog" className="mx-4 mt-4 rounded-lg border border-danger/30 bg-danger/5 p-4 sm:mx-5">
                        <p className="text-sm font-medium text-heading">{confirm === 'delete' ? `Delete ${item.name} permanently?` : `Deactivate ${item.name}?`}</p>
                        <p className="mt-1 text-sm text-body">{confirm === 'delete' ? 'This cannot be undone. Deactivate it instead if you may need it again.' : 'It will be hidden from billing. You can restore it any time.'}</p>
                        <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setConfirm(null)} disabled={busy}>Keep item</Button>
                            {confirm === 'delete' ? (
                                <Button size="sm" isLoading={isDeleting} loadingText="Deleting" onClick={() => run(() => deleteAsync(item._id), 'Menu item deleted permanently', 'Failed to delete menu item', () => onChange(null))}>Delete item</Button>
                            ) : (
                                <Button size="sm" isLoading={isDeactivating} loadingText="Deactivating" onClick={() => run(() => deactivateAsync(item._id), 'Menu item deactivated', 'Failed to deactivate menu item', () => onShowInactive(true))}>Deactivate</Button>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-5 p-4 sm:p-5">
                    <section>
                        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Variants</h4>
                        {item.variants?.length ? (
                            <ul className="divide-y divide-border rounded-lg border border-border">
                                {item.variants.map((v, i) => (
                                    <li key={`${v.name}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <span className="text-heading">{v.name}</span>
                                        <span className="tabular-nums text-body">{v.priceDifference >= 0 ? '+' : '-'}{formatPrice(Math.abs(v.priceDifference))}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted">No variants</p>}
                    </section>
                    <section>
                        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Add-ons</h4>
                        {item.addOns?.length ? (
                            <ul className="divide-y divide-border rounded-lg border border-border">
                                {item.addOns.map((a, i) => (
                                    <li key={`${a.name}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <span className="text-heading">{a.name}</span>
                                        <span className="tabular-nums text-body">{formatPrice(a.price)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted">No add-ons</p>}
                    </section>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-muted">Created</p><p className="font-medium text-heading">{formatDate(item.createdAt)}</p></div>
                        <div><p className="text-xs text-muted">Last updated</p><p className="font-medium text-heading">{formatDate(item.updatedAt)}</p></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && close()}>
            <style>{`
        @keyframes drawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .drawer-in { animation: drawerIn .25s ease-out; } .backdrop-in { animation: fadeIn .2s ease-out; }
        @media (prefers-reduced-motion: reduce) { .drawer-in, .backdrop-in { animation: none; } }
      `}</style>
            <button type="button" aria-label="Close panel" onClick={close} className="backdrop-in absolute inset-0 cursor-default bg-heading/40 backdrop-blur-sm" />
            <aside className="drawer-in absolute right-0 top-0 flex h-full w-full flex-col bg-surface shadow-2xl sm:w-[30rem] xl:w-[34rem]">
                <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
                    <h2 className="text-base font-semibold text-heading">{title}</h2>
                    <button type="button" onClick={close} disabled={busy} aria-label="Close" className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-heading"><X className="h-5 w-5" /></button>
                </header>
                {body}
            </aside>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const MenuItemMain = () => {
    const { currentRole } = useAuthData();
    const { menuCategoryId } = useParams() as { menuCategoryId: string }
    //   const canWrite = MENU_ITEM_WRITE_ROLES.includes(currentRole!);
    const canWrite = true

    const [filters, setFilters] = useState<Filters>({
        ...DEFAULT_FILTERS,
        categoryId: menuCategoryId ?? '',
    });


    // Keep the filter in sync if the route param changes while this component stays mounted
    // (e.g. going from /menu-item/abc to /menu-item/xyz, or back to the direct page)
    useEffect(() => {
        setFilters((prev) => ({ ...prev, categoryId: menuCategoryId ?? '' }));
    }, [menuCategoryId]);

    const [showInactive, setShowInactive] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [drawer, setDrawer] = useState<DrawerState>(null);

    // Debounce fast-changing inputs so typing does not fire a request per keystroke
    const debouncedSearch = useDebounce(filters.search, 500);
    const debouncedMin = useDebounce(filters.minPrice, 500);
    const debouncedMax = useDebounce(filters.maxPrice, 500);
    const debouncedPrep = useDebounce(filters.maxPrepTime, 500);

    const { data: categoryData } = useGetMenuCategoryDropdown();
    const categoryOptions = toOptions(categoryData);
    const categoryNames = Object.fromEntries(categoryOptions.map((o) => [o.value, o.label]));

    const sort = SORT_OPTIONS.find((s) => s.value === filters.sort) ?? SORT_OPTIONS[0];
    const params: MenuItemQueryParams = {
        search: debouncedSearch || undefined,
        categoryId: filters.categoryId || undefined,
        foodType: (filters.foodType as FoodType) || undefined,
        minPrice: debouncedMin ? Number(debouncedMin) : undefined,
        maxPrice: debouncedMax ? Number(debouncedMax) : undefined,
        maxPrepTime: debouncedPrep ? Number(debouncedPrep) : undefined,
        hasVariants: filters.hasVariants || undefined,
        hasAddOns: filters.hasAddOns || undefined,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
    };

    const activeFilterCount = [filters.search, filters.categoryId, filters.foodType, filters.minPrice, filters.maxPrice, filters.maxPrepTime, filters.hasVariants, filters.hasAddOns].filter(Boolean).length;
    const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
    const clearFilters = () => setFilters(DEFAULT_FILTERS);

    const listProps = {
        params,
        selectedId: drawer && drawer.mode !== 'create' ? drawer.id : undefined,
        onOpen: (id: string) => setDrawer({ mode: 'view', id }),
        onClear: clearFilters,
        categoryNames,
        hasFilters: activeFilterCount > 0,
    };

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-page">
            {/* Header */}
            <header className="mb-3 flex shrink-0 flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                    <UtensilsCrossed className="h-6 w-6 shrink-0 text-primary" />
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-heading sm:text-2xl">Menu items</h1>
                        <p className="text-sm text-muted">Dishes, prices, variants and add-ons your team can bill.</p>
                    </div>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-auto">
                    <Button variant="secondary" className="inline-flex flex-1 items-center justify-center whitespace-nowrap lg:hidden sm:flex-none" leftIcon={<Filter className="h-4 w-4" />} onClick={() => setIsMobileFilterOpen(true)}>
                        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                    </Button>
                    {canWrite && (
                        <Button className="inline-flex flex-1 items-center justify-center whitespace-nowrap sm:flex-none" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawer({ mode: 'create' })}>
                            Add item
                        </Button>
                    )}
                </div>
            </header>

            {/* 30 / 70 layout */}
            <div className="relative flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
                {isMobileFilterOpen && <div className="fixed inset-0 z-40 bg-heading/40 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileFilterOpen(false)} />}

                {/* Filters */}
                <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-2xl transition-transform duration-300 ease-in-out', 'lg:static lg:w-[280px] lg:shrink-0 lg:translate-x-0 lg:shadow-sm xl:w-[320px]', isMobileFilterOpen ? 'translate-x-0' : '-translate-x-full')} aria-label="Filters">
                    <div className="flex shrink-0 items-center justify-between border-b border-border pb-3">
                        <h3 className="flex items-center gap-2 font-semibold text-heading"><Filter size={16} className="text-muted" /> Filters</h3>
                        <button className="text-muted hover:text-heading lg:hidden" onClick={() => setIsMobileFilterOpen(false)} aria-label="Close filters"><X size={20} /></button>
                    </div>

                    <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-1">
                        <div>
                            <Label htmlFor="menu-search">Search</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                                <Input id="menu-search" className="pl-9" placeholder="Item name..." value={filters.search} onChange={(e: ChangeEvent<HTMLInputElement>) => setFilter('search', e.target.value)} />
                            </div>
                        </div>

                        <SearchSelect label="Category" options={categoryOptions} value={filters.categoryId} onChange={(o) => setFilter('categoryId', String(o.value))} onClear={() => setFilter('categoryId', '')} placeholder="All categories" />
                        <SearchSelect label="Food type" options={FOOD_TYPE_OPTIONS} value={filters.foodType} onChange={(o) => setFilter('foodType', String(o.value))} onClear={() => setFilter('foodType', '')} placeholder="All types" />

                        <div>
                            <Label>Price range (₹)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input type="number" inputMode="decimal" min={0} placeholder="Min" aria-label="Minimum price" value={filters.minPrice} onChange={(e: ChangeEvent<HTMLInputElement>) => setFilter('minPrice', e.target.value)} />
                                <Input type="number" inputMode="decimal" min={0} placeholder="Max" aria-label="Maximum price" value={filters.maxPrice} onChange={(e: ChangeEvent<HTMLInputElement>) => setFilter('maxPrice', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="menu-prep">Max prep time (min)</Label>
                            <Input id="menu-prep" type="number" inputMode="numeric" min={0} placeholder="Any" value={filters.maxPrepTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setFilter('maxPrepTime', e.target.value)} />
                        </div>

                        <SearchSelect label="Sort by" options={SORT_OPTIONS} value={filters.sort} onChange={(o) => setFilter('sort', String(o.value))} onClear={() => setFilter('sort', 'newest')} placeholder="Newest first" />

                        <div className="space-y-3 rounded-lg border border-border p-3">
                            <Toggle size="sm" checked={filters.hasVariants} onChange={(v: boolean) => setFilter('hasVariants', v)} label="Has variants" />
                            <Toggle size="sm" checked={filters.hasAddOns} onChange={(v: boolean) => setFilter('hasAddOns', v)} label="Has add-ons" />
                        </div>

                        <div className="rounded-lg border border-border p-3">
                            <Toggle size="sm" checked={showInactive} onChange={(v: boolean) => setShowInactive(v)} label="Show inactive items" description="Deactivated items you can restore." />
                        </div>
                    </div>

                    <div className="mt-auto shrink-0 border-t border-border pt-3">
                        <Button variant="outline" className="mb-2 w-full" onClick={clearFilters} disabled={activeFilterCount === 0}>Clear filters</Button>
                        <Button className="w-full lg:hidden" onClick={() => setIsMobileFilterOpen(false)}>Show results</Button>
                    </div>
                </aside>

                {/* Table */}
                <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm" aria-live="polite">
                    {showInactive ? <InactiveItems {...listProps} /> : <ActiveItems {...listProps} />}
                </section>
            </div>

            {drawer && <ItemDrawer state={drawer} onChange={setDrawer} onShowInactive={setShowInactive} canWrite={canWrite} categoryOptions={categoryOptions} categoryNames={categoryNames} />}
        </div>
    );
};

export default MenuItemMain;