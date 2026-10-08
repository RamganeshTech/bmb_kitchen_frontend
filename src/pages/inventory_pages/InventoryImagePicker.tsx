import { useEffect, useMemo, useRef } from 'react';
import { Camera, Package, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/toast/Toast';

const MAX_IMAGE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface InventoryImagePickerProps {
    imageUrl?: string | null;          // image already saved on the server
    file?: File | null;                // newly picked file (create mode preview)
    onSelect?: (file: File) => void;
    onRemove?: () => void;
    isBusy?: boolean;
    readOnly?: boolean;
}

export const InventoryImagePicker = ({ imageUrl, file, onSelect, onRemove, isBusy, readOnly }: InventoryImagePickerProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const src = previewUrl ?? imageUrl ?? null;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const picked = event.target.files?.[0];
        event.target.value = ''; // allows picking the same file again
        if (!picked) return;
        if (!ALLOWED_TYPES.includes(picked.type)) return void toast.error('Use a JPG, PNG or WebP image');
        if (picked.size > MAX_IMAGE_MB * 1024 * 1024) return void toast.error(`Image must be under ${MAX_IMAGE_MB} MB`);
        onSelect?.(picked);
    };

    return (
        <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface">
                {src ? (
                    <img src={src} alt="Inventory item" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                        <Package size={28} />
                    </div>
                )}
                {isBusy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                        Saving...
                    </div>
                )}
            </div>

            {!readOnly && (
                <div className="flex flex-col items-start gap-2">
                    <Button size="sm" variant="outline" leftIcon={<Camera size={14} />} disabled={isBusy} onClick={() => inputRef.current?.click()}>
                        {src ? 'Change image' : 'Upload image'}
                    </Button>
                    {src && (
                        <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} disabled={isBusy} onClick={onRemove}>
                            Remove
                        </Button>
                    )}
                    <p className="text-xs text-muted">JPG, PNG or WebP, up to {MAX_IMAGE_MB} MB</p>
                    <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(',')} className="hidden" onChange={handleChange} />
                </div>
            )}
        </div>
    );
};