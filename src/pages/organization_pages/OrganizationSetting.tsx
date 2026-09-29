import {
    memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent,
} from 'react';
import {
    AlertCircle, Building2, Check, Pencil, Copy, Loader2,
    RefreshCw, RotateCcw, Save,
} from 'lucide-react';

import { toast } from '../../components/ui/toast/Toast';
import { Card } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthData } from '../../hooks/useAuthData';
import { useGetSingleOrganization, useUpdateOrganization, type OrganizationData, type UpdateOrganizationParams } from '../../api_service/organization_api/organizationapi';
import { DOMAIN_NAME } from '../../constants/constants';
// TODO: fix these two paths to match your project

/* -------------------------------------------------------------------------- */
/*  Constants & helpers (module scope so they are created once)               */
/* -------------------------------------------------------------------------- */

const EDIT_ROLES = ['owner', 'admin', 'cto'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

type FormState = { name: string; contactEmail: string; phone: string };
type FormErrors = Partial<Record<keyof FormState, string>>;
type UpdatePayload = UpdateOrganizationParams['data'];

const EMPTY_FORM: FormState = { name: '', contactEmail: '', phone: '' };

const toFormState = (org: OrganizationData): FormState => ({
    name: org.name ?? '',
    contactEmail: org.contactEmail ?? '',
    phone: org.phone ?? '',
});

const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
};

// ownerId can be a plain id or a populated user object
const getOwnerLabel = (owner: OrganizationData['ownerId']): string => {
    if (!owner) return '-';
    if (typeof owner === 'string') return owner;
    const populated = owner as unknown as Record<string, unknown>;
    const label = populated.userName ?? populated.name ?? populated.email;
    return typeof label === 'string' && label ? label : '-';
};

const validate = (form: FormState): FormErrors => {
    const errors: FormErrors = {};
    const name = form.name.trim();
    const email = form.contactEmail.trim();
    const phone = form.phone.trim();

    if (name.length < 2) errors.name = 'Organization name must be at least 2 characters';
    if (!EMAIL_REGEX.test(email)) errors.contactEmail = 'Enter a valid contact email';
    if (phone && !PHONE_REGEX.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number';
    return errors;
};

/* -------------------------------------------------------------------------- */
/*  Presentational pieces (memoised so typing in the form does not re-render  */
/*  the details panel)                                                        */
/* -------------------------------------------------------------------------- */

const DetailRow = memo(function DetailRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="min-w-0 text-right text-sm font-medium text-heading">{children}</dd>
        </div>
    );
});

const StatusBadge = memo(function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-success' : 'bg-danger'}`} />
            {active ? 'Active' : 'Inactive'}
        </span>
    );
});

const OrganizationDetails = memo(function OrganizationDetails({
    organization,
}: {
    organization: OrganizationData;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(organization._id);
            setCopied(true);
            toast.success('Organization ID copied');
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    }, [organization._id]);

    return (
        <Card className="p-6">
            <h2 className="text-base font-semibold text-heading">Organization details</h2>
            <dl className="mt-2 divide-y divide-border">
                <DetailRow label="Status">
                    <StatusBadge active={organization.isActive} />
                </DetailRow>
                <DetailRow label="Owner">
                    <span className="block truncate">{getOwnerLabel(organization.ownerId)}</span>
                </DetailRow>
                <DetailRow label="Created">{formatDate(organization.createdAt)}</DetailRow>
                <DetailRow label="Last updated">{formatDate(organization.updatedAt)}</DetailRow>
                <DetailRow label="Organization ID">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex max-w-full items-center gap-2 text-muted transition-colors hover:text-heading"
                        aria-label="Copy organization ID"
                    >
                        <span className="truncate font-mono text-xs">{organization._id}</span>
                        {copied ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                        ) : (
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                        )}
                    </button>
                </DetailRow>
            </dl>
        </Card>
    );
});

const SettingsSkeleton = () => (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading organization">
        <div className="h-80 animate-pulse rounded-xl bg-surface-hover lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-surface-hover" />
    </div>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const OrganizationSettings = () => {
    const { organizationId, currentRole } = useAuthData();
    const canEdit = EDIT_ROLES.includes(currentRole!);

    const {
        data: organization,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useGetSingleOrganization(organizationId!);
    const { mutateAsync: updateOrgAsync, isPending } = useUpdateOrganization();

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isEditing, setIsEditing] = useState(false);

    // Keep the form in sync with the server copy (first load + after a save)
    useEffect(() => {
        // if (organization) setForm(toFormState(organization));
        if (organization) {
            setForm(toFormState(organization));
            setIsEditing(false);
        }
    }, [organization]);


    // Send only the fields that actually changed
    const changes = useMemo<UpdatePayload>(() => {
        if (!organization) return {};
        const next: UpdatePayload = {};
        const name = form.name.trim();
        const contactEmail = form.contactEmail.trim();
        const phone = form.phone.trim();

        if (name !== organization.name) next.name = name;
        if (contactEmail !== organization.contactEmail) next.contactEmail = contactEmail;
        if (phone !== (organization.phone ?? '')) next.phone = phone;
        return next;
    }, [form, organization]);

    const isDirty = Object.keys(changes).length > 0;

    // Warn before closing the tab with unsaved edits
    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const handleChange = useCallback((key: keyof FormState) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
            const value = key === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value;
            setForm((prev) => ({ ...prev, [key]: value }));
            setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
        };
    }, []);

    const handleReset = useCallback(() => {
        if (organization) setForm(toFormState(organization));
        setErrors({});
    }, [organization]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!organization || !canEdit || !isDirty || isPending) return;

        const validationErrors = validate(form);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please fix the highlighted fields');
            return;
        }

        try {
            await updateOrgAsync({ id: organization._id, data: changes });
            toast.success('Organization updated successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update organization');
        }
    };

    const fieldError = (key: keyof FormState) =>
        errors[key] ? (
            <p id={`${key}-error`} className="mt-1.5 text-xs text-danger">
                {errors[key]}
            </p>
        ) : null;

    const inputClass = (key: keyof FormState) => (errors[key] ? 'border-danger' : '');

    return (
        <div className="mx-auto w-full p-2">
            <header className="mb-6 flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Building2 className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-heading">
                        {organization?.name || 'Organization settings'}
                    </h1>
                    <p className="text-sm text-muted">Manage how your business appears across {DOMAIN_NAME}.</p>
                </div>
            </header>

            {isLoading && <SettingsSkeleton />}

            {isError && !isLoading && (
                <Card className="flex flex-col items-center gap-3 p-10 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
                        <AlertCircle className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-heading">Could not load organization</h2>
                        <p className="mt-1 text-sm text-muted">{error?.message || 'Something went wrong.'}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Try again
                    </Button>
                </Card>
            )}

            {organization && (
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="p-6 lg:col-span-2">
                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold text-heading">
                                        General information
                                    </h2>

                                    <p className="mt-1 text-sm text-muted">
                                        {canEdit
                                            ? isEditing
                                                ? 'Update your organization name and contact details.'
                                                : 'Click edit to change your organization details.'
                                            : 'Only owners and admins can edit these details.'}
                                    </p>
                                </div>

                                {canEdit && !isEditing && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsEditing(true)}
                                        leftIcon={<Pencil className="h-4 w-4" />}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>

                            {/* <div>
                                <Label htmlFor="name">Organization name</Label>
                                <Input
                                    id="name"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    disabled={!canEdit || isPending || !isEditing}
                                    className={inputClass('name')}
                                    aria-invalid={!!errors.name}
                                    aria-describedby={errors.name ? 'name-error' : undefined}
                                />
                                {fieldError('name')}
                            </div> */}

                            <div>
                                <Label htmlFor="name">Organization name</Label>

                                {isEditing ? (
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={handleChange('name')}
                                        disabled={isPending}
                                        className={inputClass('name')}
                                        aria-invalid={!!errors.name}
                                        aria-describedby={errors.name ? 'name-error' : undefined}
                                    />
                                ) : (
                                    <div className="mt-2 px-1 py-1 text-sm font-medium text-heading">
                                        {form.name || '-'}
                                    </div>
                                )}

                                {fieldError('name')}
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                {/* <div>
                                    <Label htmlFor="contactEmail">Contact email</Label>
                                    <Input
                                        id="contactEmail"
                                        type="email"
                                        value={form.contactEmail}
                                        onChange={handleChange('contactEmail')}
                                        disabled={!canEdit || isPending || !isEditing}
                                        className={inputClass('contactEmail')}
                                        aria-invalid={!!errors.contactEmail}
                                        aria-describedby={errors.contactEmail ? 'contactEmail-error' : undefined}
                                    />
                                    {fieldError('contactEmail')}
                                </div>
                                <div>
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        inputMode="numeric"
                                        maxLength={10}
                                        value={form.phone}
                                        onChange={handleChange('phone')}
                                        disabled={!canEdit || isPending || !isEditing}
                                        placeholder="9876543210"
                                        className={inputClass('phone')}
                                        aria-invalid={!!errors.phone}
                                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                                    />
                                    {fieldError('phone')}
                                </div> */}

                                <div>
                                    <Label htmlFor="contactEmail">Contact email</Label>

                                    {isEditing ? (
                                        <Input
                                            id="contactEmail"
                                            type="email"
                                            value={form.contactEmail}
                                            onChange={handleChange('contactEmail')}
                                            disabled={isPending}
                                            className={inputClass('contactEmail')}
                                            aria-invalid={!!errors.contactEmail}
                                            aria-describedby={errors.contactEmail ? 'contactEmail-error' : undefined}
                                        />
                                    ) : (
                                        <div className="mt-2 px-1 py-1 text-sm font-medium text-heading">
                                            {form.contactEmail || '-'}
                                        </div>
                                    )}

                                    {fieldError('contactEmail')}
                                </div>



                                <div>
                                    <Label htmlFor="phone">Phone</Label>

                                    {isEditing ? (
                                        <Input
                                            id="phone"
                                            inputMode="numeric"
                                            maxLength={10}
                                            value={form.phone}
                                            onChange={handleChange('phone')}
                                            disabled={isPending}
                                            placeholder="9876543210"
                                            className={inputClass('phone')}
                                            aria-invalid={!!errors.phone}
                                            aria-describedby={errors.phone ? 'phone-error' : undefined}
                                        />
                                    ) : (
                                        <div className="mt-2 px-1 py-1 text-sm font-medium text-heading">
                                            {form.phone || '-'}
                                        </div>
                                    )}

                                    {fieldError('phone')}
                                </div>

                            </div>

                            {canEdit && isEditing && (
                                <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-muted" aria-live="polite">
                                        {isDirty ? 'You have unsaved changes' : 'All changes saved'}
                                    </p>
                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            // onClick={handleReset}
                                            onClick={() => {
                                                handleReset();
                                                setIsEditing(false);
                                            }}
                                            disabled={!isDirty || isPending}
                                            leftIcon={<RotateCcw className="h-4 w-4" />}
                                        >
                                            Reset
                                        </Button>
                                        <Button type="submit" disabled={!isDirty || isPending}
                                            leftIcon={
                                                isPending
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <Save className="h-4 w-4" />
                                            }
                                            isLoading={isPending}
                                        >
                                            Save changes
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </Card>

                    <OrganizationDetails organization={organization} />
                </div>
            )}
        </div>
    );
};

export default OrganizationSettings;