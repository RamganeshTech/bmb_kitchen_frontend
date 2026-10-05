import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, CalendarDays, Camera, Mail, Pencil, Phone, RefreshCw, Save, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { useAuthData } from '../../hooks/useAuthData';
import {
    useGetSingleUser,
    useUpdateProfileImage,
    useUpdateUserData,
} from '../../api_service/auth_api/authApi';

// ── Types & helpers ──────────────────────────────────────────────────────────
interface ProfileUser {
    _id: string;
    userName: string;
    email?: string;
    phoneNo?: string;
    role?: string;
    profileImage?: { url: string; key: string; originalName?: string } | null;
    createdAt?: string;
    updatedAt?: string;
}

const MAX_PROFILE_IMAGE_SIZE_MB = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

const formatRole = (role?: string) => (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Team member');

// const formatMemberSince = (isoDate?: string) =>
//     isoDate ? new Date(isoDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—';

const formatMemberSince = (isoDate?: string) =>
    isoDate ? new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const getInitials = (fullName: string) =>
    fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'U';

// ── Summary card (photo + identity) ──────────────────────────────────────────
const ProfileSummaryCard = ({ user, }: { user: ProfileUser }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {organizationId} = useAuthData()
     const { mutateAsync: updateImageAsync, isPending: isUploadingImage } = useUpdateProfileImage();
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = ''; // allows choosing the same file again
        if (!selectedFile) return;

        if (!selectedFile.type.startsWith('image/')) {
            toast.error('Choose an image file');
            return;
        }
        if (selectedFile.size > MAX_PROFILE_IMAGE_SIZE_MB * 1024 * 1024) {
            toast.error(`Photo must be ${MAX_PROFILE_IMAGE_SIZE_MB} MB or smaller`);
            return;
        }

        const previewUrl = URL.createObjectURL(selectedFile);
        setLocalPreviewUrl(previewUrl);

        try {
            await updateImageAsync({ userId: user._id, file: selectedFile, organizationId:organizationId! });
            toast.success('Profile photo updated');
        } catch (uploadError) {
            toast.error(getErrorMessage(uploadError, 'Failed to update profile photo'));
        } finally {
            URL.revokeObjectURL(previewUrl);
            setLocalPreviewUrl(null);
        }
    };

    const displayedImageUrl = localPreviewUrl ?? user.profileImage?.url ?? null;

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {/* Banner */}
            <div className="relative h-28 overflow-hidden bg-primary sm:h-32">
                <span className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary-hover" />
                <span className="absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-primary-hover opacity-70" />
            </div>

            <div className="flex flex-col items-center px-5 pb-6 text-center">
                {/* Avatar overlapping the banner */}
                <div className="relative -mt-14">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-primary-soft text-3xl font-semibold text-primary shadow-md">
                        {displayedImageUrl ? (
                            <img src={displayedImageUrl} alt={user.userName} className="h-full w-full object-cover" />
                        ) : (
                            getInitials(user.userName)
                        )}
                        {isUploadingImage && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                <span className="h-7 w-7 animate-spin rounded-full border-4 border-white border-t-transparent" />
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        aria-label="Change profile photo"
                        title="Change profile photo"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute cursor-pointer bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                    >
                        <Camera size={18} />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                </div>

                <h2 className="mt-4 break-words text-xl font-semibold text-heading">{user.userName}</h2>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-medium text-white">
                    <ShieldCheck size={14} />
                    {formatRole(user.role)}
                </span>
                {/* <p className="mt-3 text-sm text-muted">
                    JPG, PNG or WebP, up to {MAX_PROFILE_IMAGE_SIZE_MB} MB
                </p> */}

                {/* Quick facts */}
                <ul className="mt-5 flex w-full flex-col gap-3 border-t border-border pt-5 text-left">
                    <li className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            <Mail size={16} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-muted">Email</p>
                            <p className="truncate text-base text-heading">{user.email || 'Not added'}</p>
                        </div>
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            <Phone size={16} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-muted">Phone</p>
                            <p className="truncate text-base text-heading">{user.phoneNo || 'Not added'}</p>
                        </div>
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            <CalendarDays size={16} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-muted">Member since</p>
                            <p className="truncate text-base text-heading">{formatMemberSince(user.createdAt)}</p>
                        </div>
                    </li>
                </ul>
            </div>
        </section>
    );
};

// ── Details form ─────────────────────────────────────────────────────────────
const ProfileDetailsForm = ({ user }: { user: ProfileUser }) => {
    const { mutateAsync: updateUserAsync, isPending: isSaving } = useUpdateUserData();
    const [isEditing, setIsEditing] = useState(false);

    const savedValues = {
        userName: user.userName ?? '',
        email: user.email ?? '',
        phoneNo: user.phoneNo ?? '',
    };

    const [userName, setUserName] = useState(savedValues.userName);
    const [email, setEmail] = useState(savedValues.email);
    const [phoneNo, setPhoneNo] = useState(savedValues.phoneNo);
    const [fieldErrors, setFieldErrors] = useState<{ userName?: string; email?: string; phoneNo?: string }>({});

    const isDraftChanged =
        userName.trim() !== savedValues.userName ||
        email.trim() !== savedValues.email ||
        phoneNo.trim() !== savedValues.phoneNo;

    const validate = () => {
        const errors: typeof fieldErrors = {};
        if (!userName.trim()) errors.userName = 'Enter your name';
        if (email.trim() && !EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address';
        if (phoneNo && phoneNo.length !== 10) errors.phoneNo = 'Phone number must be 10 digits';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCancelEdit = () => {
        setUserName(savedValues.userName);
        setEmail(savedValues.email);
        setPhoneNo(savedValues.phoneNo);
        setFieldErrors({});
        setIsEditing(false);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!validate()) return;

        try {
            await updateUserAsync({ userName: userName.trim(), email: email.trim(), phoneNo: phoneNo.trim() });
            toast.success('Profile updated successfully');
            setIsEditing(false);
        } catch (updateError) {
            toast.error(getErrorMessage(updateError, 'Failed to update profile'));
        }
    };

    return (
        <section className="rounded-2xl border border-border bg-surface shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <UserRound size={18} />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-heading">Personal details</h2>
                        <p className="text-sm text-muted">
                            {isEditing ? 'Update your details and save' : 'Your contact details'}
                        </p>
                    </div>
                </div>

                {!isEditing && (
                    <Button variant="outline" leftIcon={<Pencil size={16} />} onClick={() => setIsEditing(true)}>
                        Edit
                    </Button>
                )}
            </header>

            {isEditing ? (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 p-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <Label htmlFor="profile-name">Full name</Label>
                            <Input
                                id="profile-name"
                                value={userName}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                    setUserName(event.target.value);
                                    if (fieldErrors.userName) setFieldErrors((prev) => ({ ...prev, userName: undefined }));
                                }}
                                placeholder="Your full name"
                                autoComplete="name"
                                className={fieldErrors.userName ? 'border-danger' : ''}
                                autoFocus
                            />
                            {fieldErrors.userName && <p className="text-sm text-danger">{fieldErrors.userName}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="profile-email">Email</Label>
                            <Input
                                id="profile-email"
                                type="email"
                                inputMode="email"
                                value={email}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                    setEmail(event.target.value);
                                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                }}
                                placeholder="you@example.com"
                                autoComplete="email"
                                className={fieldErrors.email ? 'border-danger' : ''}
                            />
                            {fieldErrors.email && <p className="text-sm text-danger">{fieldErrors.email}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="profile-phone">Phone number</Label>
                            <Input
                                id="profile-phone"
                                type="tel"
                                inputMode="numeric"
                                value={phoneNo}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                    setPhoneNo(event.target.value.replace(/\D/g, '').slice(0, 10));
                                    if (fieldErrors.phoneNo) setFieldErrors((prev) => ({ ...prev, phoneNo: undefined }));
                                }}
                                placeholder="10-digit mobile number"
                                autoComplete="tel"
                                className={fieldErrors.phoneNo ? 'border-danger' : ''}
                            />
                            {fieldErrors.phoneNo && <p className="text-sm text-danger">{fieldErrors.phoneNo}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            fullWidth
                            className="sm:w-auto"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            fullWidth
                            className="sm:w-auto"
                            leftIcon={<Save size={16} />}
                            isLoading={isSaving}
                            loadingText="Saving..."
                            disabled={!isDraftChanged}
                        >
                            Save changes
                        </Button>
                    </div>
                </form>
            ) : (
                <dl className="grid gap-5 p-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <dt className="text-sm text-muted">Full name</dt>
                        <dd className="mt-1 break-words text-base font-medium text-heading">{user.userName}</dd>
                    </div>
                    <div className="min-w-0">
                        <dt className="text-sm text-muted">Email</dt>
                        <dd className="mt-1 break-words text-base font-medium text-heading">{user.email || 'Not added'}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-muted">Phone number</dt>
                        <dd className="mt-1 text-base font-medium text-heading">{user.phoneNo || 'Not added'}</dd>
                    </div>
                </dl>
            )}
        </section>
    );
};


const ProfileSkeleton = () => (
    <div className="grid w-full gap-5 lg:grid-cols-3" aria-busy="true">
        <div className="h-96 animate-pulse rounded-2xl bg-surface-hover lg:col-span-1" />
        <div className="h-96 animate-pulse rounded-2xl bg-surface-hover lg:col-span-2" />
    </div>
);

// ── Page ─────────────────────────────────────────────────────────────────────
const UserProfile = () => {
    const { userId } = useAuthData();
    const { data, isLoading, error, refetch, isFetching } = useGetSingleUser(userId!);
    const user = data as ProfileUser | undefined;

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <UserRound size={20} />
                </span>
                <div>
                    <h1 className="text-2xl font-semibold text-heading">My profile</h1>
                    <p className="text-sm text-muted">Your photo and personal details</p>
                </div>
            </div>

            {isLoading ? (
                <ProfileSkeleton />
            ) : error || !user ? (
                <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-4 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger">
                        <AlertCircle size={20} />
                    </span>
                    <p className="text-base font-medium text-heading">Could not load your profile</p>
                    {error?.message && <p className="text-sm text-muted">{error.message}</p>}
                    <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching} onClick={() => refetch()}>
                        Try again
                    </Button>
                </div>
            ) : (
                <div className="grid w-full items-start gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                        <ProfileSummaryCard user={user} />
                    </div>
                    <div className="lg:col-span-2">
                        {/* key re-initialises the form with fresh values after each successful save */}
                        <ProfileDetailsForm key={user.updatedAt} user={user} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;