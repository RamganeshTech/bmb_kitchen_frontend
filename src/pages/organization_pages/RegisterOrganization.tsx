import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChefHat,
  Eye,
  EyeOff,
  Loader2,
  Receipt,
  UserRound,
  Warehouse,
} from 'lucide-react';

import { useRegisterOrganization, type RegisterOrganizationParams } from '../../api_service/organization_api/organizationapi';
import { toast } from '../../components/ui/toast/Toast';
import { Card } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DOMAIN_NAME } from '../../constants/constants';


type Errors = Partial<Record<keyof RegisterOrganizationParams | 'confirmPassword', string>>;

const initialData: RegisterOrganizationParams = {
  // Step 1 - organization
  organizationName: '',
  phone: '',
  // Step 2 - owner user
  userName: '',
  email: '',
  password: '',
};

const STEPS = [
  { title: 'Restaurant details', hint: 'Your business name and phone', icon: Building2 },
  { title: 'Owner account', hint: 'How you will sign in', icon: UserRound },
];

const HIGHLIGHTS = [
  { icon: Receipt, text: 'Billing, KOT and tables in one place' },
  { icon: Warehouse, text: 'Stock, vendors and food cost that stay in sync' },
  { icon: ChefHat, text: 'Every outlet, one owner login' },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/;

const RegisterOrganization = () => {
  const navigate = useNavigate();
  const { mutateAsync: registerOrgAsync, isPending } = useRegisterOrganization();

  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<RegisterOrganizationParams>(initialData);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const setField = (key: keyof RegisterOrganizationParams, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep1 = () => {
    const e: Errors = {};
    if (!formData.organizationName.trim()) e.organizationName = 'Enter your restaurant or company name';
    // phone is optional, but must be valid if entered
    if (formData.phone && !phoneRegex.test(formData.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Errors = {};
    if (!formData.userName.trim()) e.userName = 'Enter your full name';
    if (!emailRegex.test(formData.email)) e.email = 'Enter a valid email address';
    if (formData.password.length < 8) e.password = 'Use at least 8 characters';
    if (confirmPassword !== formData.password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    try {
      // send phone only when filled, since it is optional
      await registerOrgAsync({ ...formData, phone: formData.phone || undefined });
      toast.success('Organization created successfully! Please log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register organization');
    }
  };

  const fieldError = (key: keyof Errors) =>
    errors[key] ? <p className="mt-1.5 text-xs text-danger">{errors[key]}</p> : null;

  const inputState = (key: keyof Errors) => (errors[key] ? 'border-danger' : '');

  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <style>{`
        @keyframes stepIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
        .step-in { animation: stepIn .35s ease-out; }
        @media (prefers-reduced-motion: reduce) { .step-in { animation: none; } }
      `}</style>

      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full border-[36px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-4 -right-4 h-44 w-44 rounded-full border-[22px] border-white/10" />

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">{DOMAIN_NAME}</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Set up your restaurant in two minutes.
          </h1>
          <p className="mt-4 text-base text-white/80">
            Name your business, create your owner login, and start taking orders.
          </p>

          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/70">Build My Business</p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-lg">
          {/* Mobile brand */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <ChefHat className="h-4 w-4" />
            </span>
            <span className="font-semibold text-heading">{DOMAIN_NAME}</span>
          </div>

          {/* Stepper */}
          <ol className="mb-6 flex items-center gap-3">
            {STEPS.map((s, i) => {
              const number = i + 1;
              const done = step > number;
              const active = step === number;
              return (
                <li key={s.title} className="flex flex-1 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                      done || active
                        ? 'bg-primary text-white'
                        : 'border border-border bg-surface text-muted'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : number}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${active || done ? 'text-heading' : 'text-muted'}`}>
                      {s.title}
                    </span>
                    <span className="hidden truncate text-xs text-muted sm:block">{s.hint}</span>
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="h-px flex-1 bg-border">
                      <span
                        className="block h-px bg-primary transition-all duration-500"
                        style={{ width: done ? '100%' : '0%' }}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} noValidate>
              {step === 1 ? (
                <div key="step-1" className="step-in space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-heading">Tell us about your restaurant</h2>
                    <p className="mt-1 text-sm text-muted">You can add more details later in settings.</p>
                  </div>

                  <div>
                    <Label htmlFor="organizationName">Restaurant / company name</Label>
                    <Input
                      id="organizationName"
                      value={formData.organizationName}
                      onChange={(e) => setField('organizationName', e.target.value)}
                      placeholder="Tandoor Junction"
                      className={inputState('organizationName')}
                      autoFocus
                    />
                    {fieldError('organizationName')}
                  </div>

                  <div>
                    <Label htmlFor="phone">Business phone (optional)</Label>
                    <Input
                      id="phone"
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.phone ?? ''}
                      onChange={(e) => setField('phone', e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className={inputState('phone')}
                    />
                    {fieldError('phone')}
                  </div>

                  <Button type="button" onClick={handleNext} className="w-full">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div key="step-2" className="step-in space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-heading">Create your owner account</h2>
                    <p className="mt-1 text-sm text-muted">
                      You will have full access to {formData.organizationName || 'your restaurant'}.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="userName">Full name</Label>
                    <Input
                      id="userName"
                      value={formData.userName}
                      onChange={(e) => setField('userName', e.target.value)}
                      className={inputState('userName')}
                      autoFocus
                    />
                    {fieldError('userName')}
                  </div>

                  <div>
                    <Label htmlFor="email">Login email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setField('email', e.target.value)}
                      className={inputState('email')}
                    />
                    {fieldError('email')}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setField('password', e.target.value)}
                          className={`pr-10 ${inputState('password')}`}
                          placeholder="At least 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-heading"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldError('password')}
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }}
                        className={inputState('confirmPassword')}
                      />
                      {fieldError('confirmPassword')}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      disabled={isPending}
                      className="sm:w-32"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" disabled={isPending} className="flex-1">
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating your account
                        </>
                      ) : (
                        'Create organization'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Card>

          <p className="mt-6 text-center text-sm text-muted">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegisterOrganization;