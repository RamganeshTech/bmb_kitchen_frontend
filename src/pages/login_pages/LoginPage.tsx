// // pages/LoginPage.tsx
// import { useState, type FormEvent } from 'react';
// import { Building2, Mail, Lock } from 'lucide-react';
// import { toast } from '../../components/ui/toast/Toast';
// import { Input } from '../../components/ui/Input';
// import { Button } from '../../components/ui/Button';
// import { useLoginUser } from '../../api_service/auth_api/authApi';
// import { useNavigate } from 'react-router-dom';
// import { useDispatch } from 'react-redux';
// import { setAuthCredentials } from '../../features/slices/authSlice';


// export default function LoginPage() {
//   const navigate = useNavigate();
//   const dispatch = useDispatch(); // <-- Add this

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [rememberMe, setRememberMe] = useState(false);
//   const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

//   const { mutateAsync: loginUserAsync, isPending } = useLoginUser();

//   const validate = () => {
//     const next: typeof errors = {};
//     if (!email.trim()) next.email = 'Email is required';
//     else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address';
//     if (!password) next.password = 'Password is required';
//     setErrors(next);
//     return Object.keys(next).length === 0;
//   };

//  const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       // 1. Await the response from your hook
//       const response = await loginUserAsync({ email: email.trim(), password });
      
//       // 2. Extract token and user data (backend returns { ok: true, token, data: user })
//       // Notice we alias 'data' to 'user' for clarity
//       const {  data: user } = response as any; 

//       // 3. Dispatch to Redux store
//       dispatch(
//         setAuthCredentials({
//           _id: user._id,
//           userName: user.userName, // Adjust based on your exact DB field
//           organizationId: user.organizationId._id || null,
//           role: user.role,
//           profileImageUrl: user.profileImageUrl || null,
//           isPlatformAdmin: user.isPlatformAdmin || false,
          
//           // If your backend populates organization details, map them here. 
//           // Otherwise, default to null as per your slice.
//           organizationName: user.organizationId?.name ||  null,
//           organizationUrl: user.organizationId?.logo?.url || null,
//         })
//       );

//       toast.success('Signed in successfully');
//       navigate('/layout/projects'); // Navigate to dashboard
//     } catch (err: any) {
//       toast.error(err?.message || 'Invalid email or password');
//     }
//   };

//   return (
//     <div className="min-h-screen flex bg-page">
//       {/* Left panel — brand side, hidden on mobile */}
//       <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
//         {/* Blueprint grid pattern */}
//         <div
//           className="absolute inset-0 opacity-[0.07]"
//           style={{
//             backgroundImage:
//               'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
//             backgroundSize: '40px 40px',
//           }}
//         />

//         <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
//           <div className="flex items-center gap-2.5">
//             <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
//               <Building2 size={20} aria-hidden="true" />
//             </div>
//             <span className="text-lg font-semibold tracking-tight">Civil Mind Pro</span>
//           </div>

//           <div className="max-w-md">
//             <h1 className="text-3xl font-semibold leading-tight mb-4">
//               Run every construction project from one place.
//             </h1>
//             <p className="text-white/70 text-base leading-relaxed">
//               Track budgets, timelines, and site progress across all your projects —
//               built for civil engineers who need clarity, not clutter.
//             </p>
//           </div>

//           <p className="text-sm text-white/50">
//             © {new Date().getFullYear()} Civil Mind Pro. All rights reserved.
//           </p>
//         </div>
//       </div>

//       {/* Right panel — form */}
//       <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
//         <div className="w-full max-w-sm">
//           {/* Mobile-only logo */}
//           <div className="flex lg:hidden items-center gap-2.5 mb-10">
//             <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
//               <Building2 size={20} className="text-white" aria-hidden="true" />
//             </div>
//             <span className="text-lg font-semibold text-heading tracking-tight">
//               Civil Mind Pro
//             </span>
//           </div>

//           <h2 className="text-2xl font-semibold text-heading mb-1.5">Welcome back</h2>
//           <p className="text-sm text-muted mb-8">
//             Sign in to your account to continue
//           </p>

//           <form onSubmit={handleSubmit} noValidate className="space-y-5">
//             <Input
//               label="Email address"
//               type="email"
//               placeholder="you@company.com"
//               leftIcon={<Mail size={18} />}
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               error={errors.email}
//               autoComplete="email"
//               required
//             />

//             <Input
//               label="Password"
//               type="password"
//               placeholder="Enter your password"
//               leftIcon={<Lock size={18} />}
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               error={errors.password}
//               autoComplete="current-password"
//               required
//             />

//             <div className="flex items-center justify-between">
//               <label className="flex items-center gap-2 text-sm text-body cursor-pointer select-none">
//                 <input
//                   type="checkbox"
//                   checked={rememberMe}
//                   onChange={(e) => setRememberMe(e.target.checked)}
//                   className="w-4 h-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
//                 />
//                 Remember me
//               </label>

//               <a
//                 href="/forgot-password"
//                 className="text-sm text-primary hover:text-primary-hover font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
//               >
//                 Forgot password?
//               </a>
//             </div>

//             <Button type="submit" fullWidth isLoading={isPending} loadingText="Signing in...">
//               Sign in
//             </Button>
//           </form>

//           <p className="text-sm text-muted text-center mt-8">
//             Don't have an account?{' '}

//             <a href="/signup"
//               className="text-primary hover:text-primary-hover font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
//             >

//               Contact your administrator
//             </a>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }



// SECOND VERSION

// // pages/LoginPage.tsx
// import { useState, type FormEvent } from 'react';
// import { UtensilsCrossed, Mail, Lock } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { useDispatch } from 'react-redux';
// import { toast } from '../../components/ui/toast/Toast';
// import { Input } from '../../components/ui/Input';
// import { Button } from '../../components/ui/Button';
// import { useLoginUser } from '../../api_service/auth_api/authApi';
// import { setAuthCredentials } from '../../features/slices/authSlice';

// export default function LoginPage() {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [rememberMe, setRememberMe] = useState(false);
//   const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

//   const { mutateAsync: loginUserAsync, isPending } = useLoginUser();

//   const validate = () => {
//     const next: typeof errors = {};
//     if (!email.trim()) next.email = 'Email is required';
//     else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address';
//     if (!password) next.password = 'Password is required';
//     setErrors(next);
//     return Object.keys(next).length === 0;
//   };

//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       // Backend returns { ok: true, token, data: user }
//       const response = await loginUserAsync({ email: email.trim(), password });
//       const { data: user } = response as any;

//       dispatch(
//         setAuthCredentials({
//           _id: user._id,
//           userName: user.userName,
//           organizationId: user.organizationId?._id ?? null,
//           role: user.role,
//           profileImageUrl: user.profileImageUrl ?? null,
//           isPlatformAdmin: user.isPlatformAdmin ?? false,
//           organizationName: user.organizationId?.name ?? null,
//           organizationUrl: user.organizationId?.logo?.url ?? null,
//         })
//       );

//       toast.success('Signed in successfully');
//       navigate('/layout/dashboard');
//     } catch (err: any) {
//       toast.error(err?.message || 'Invalid email or password');
//     }
//   };

//   return (
//     <div className="relative min-h-screen flex items-center justify-center bg-page px-4 py-10 overflow-hidden">
//       {/* Quiet dot grid, fades out toward the edges */}
//       <div
//         aria-hidden="true"
//         className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
//         style={{
//           backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
//           backgroundSize: '22px 22px',
//         }}
//       />

//       <div className="relative w-full max-w-105">
//         {/* Order-slip card: solid body + scalloped bottom edge */}
//         <div className="drop-shadow-md">
//           <div className="bg-surface rounded-t-2xl border-t-4 border-primary px-7 pt-7 pb-8 sm:px-9">
//             {/* Brand row */}
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="w-11 h-11 rounded-xl bg-primary text-primary-text flex items-center justify-center">
//                   <UtensilsCrossed size={22} aria-hidden="true" />
//                 </div>
//                 <div className="leading-tight">
//                   <p className="font-display text-lg font-semibold text-heading tracking-tight">
//                     BMB Kitchen
//                   </p>
//                   <p className="text-xs text-muted">Restaurant management</p>
//                 </div>
//               </div>
//               <span className="rounded-full bg-primary-soft text-primary text-xs font-medium px-2.5 py-1">
//                 Staff sign in
//               </span>
//             </div>

//             <div className="my-6 border-t border-dashed border-border-strong" />

//             <h1 className="font-display text-2xl font-semibold text-heading mb-1">
//               Welcome back
//             </h1>
//             <p className="text-sm text-muted mb-6">
//               Sign in to manage orders, kitchen and stock.
//             </p>

//             <form onSubmit={handleSubmit} noValidate className="space-y-5">
//               <Input
//                 label="Email address"
//                 type="email"
//                 placeholder="you@restaurant.com"
//                 leftIcon={<Mail size={18} />}
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 error={errors.email}
//                 autoComplete="email"
//                 required
//               />

//               <Input
//                 label="Password"
//                 type="password"
//                 placeholder="Enter your password"
//                 leftIcon={<Lock size={18} />}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 error={errors.password}
//                 autoComplete="current-password"
//                 required
//               />

//               <div className="flex items-center justify-between">
//                 <label className="flex items-center gap-2 text-sm text-body cursor-pointer select-none">
//                   <input
//                     type="checkbox"
//                     checked={rememberMe}
//                     onChange={(e) => setRememberMe(e.target.checked)}
//                     className="w-4 h-4 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-ring/30"
//                   />
//                   Remember me
//                 </label>

//                 <a
//                   href="/forgot-password"
//                   className="text-sm text-primary hover:text-primary-hover font-medium transition-colors rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
//                 >
//                   Forgot password?
//                 </a>
//               </div>

//               <Button type="submit" size="lg" fullWidth isLoading={isPending} loadingText="Signing in...">
//                 Sign in
//               </Button>
//             </form>

//             <div className="mt-6 border-t border-dashed border-border-strong pt-5">
//               <p className="text-sm text-muted text-center">
//                 Need access? Ask your restaurant administrator to add you.
//               </p>
//             </div>
//           </div>

//           {/* Scalloped tear-off edge, same colour as the card */}
//           <div
//             aria-hidden="true"
//             className="h-2.5 w-full"
//             style={{
//               backgroundImage:
//                 'radial-gradient(circle at 50% 100%, transparent 6px, var(--color-surface) 6.5px)',
//               backgroundSize: '18px 10px',
//               backgroundRepeat: 'repeat-x',
//             }}
//           />
//         </div>

//         <p className="mt-6 text-center text-xs text-muted">
//           © {new Date().getFullYear()} Build My Business. All rights reserved.
//         </p>
//       </div>
//     </div>
//   );
// }


//  THIRD VERSION   // okay for the third version 

// // pages/LoginPage.tsx   
// import { useState, type FormEvent } from 'react';
// import { UtensilsCrossed, Mail, Lock, Receipt, ChefHat, Boxes } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { useDispatch } from 'react-redux';
// import { toast } from '../../components/ui/toast/Toast';
// import { Input } from '../../components/ui/Input';
// import { Button } from '../../components/ui/Button';
// import { useLoginUser } from '../../api_service/auth_api/authApi';
// import { setAuthCredentials } from '../../features/slices/authSlice';

// /* Restaurant illustration: serving cloche with steam + order ticket.
//    Colours come only from theme tokens (fill-*, stroke-*), so it re-themes automatically. */
// function KitchenIllustration() {
//   return (
//     <svg
//       viewBox="0 0 320 210"
//       className="w-full h-auto"
//       role="img"
//       aria-label="A served dish next to an order ticket"
//     >
//       {/* Decorative dots */}
//       <circle cx="30" cy="52" r="5" className="fill-warning" />
//       <circle cx="292" cy="26" r="4" className="fill-success" />
//       <circle cx="176" cy="30" r="3" className="fill-primary" />
//       <circle cx="58" cy="18" r="3" className="fill-info" />

//       {/* Table surface */}
//       <rect x="14" y="176" width="292" height="8" rx="4" className="fill-primary/25" />

//       {/* Steam */}
//       <g className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55">
//         <path d="M88 76 q-9 -10 0 -20 t0 -20" />
//         <path d="M112 70 q-9 -10 0 -20 t0 -20" />
//         <path d="M136 76 q-9 -10 0 -20 t0 -20" />
//       </g>

//       {/* Plate */}
//       <ellipse cx="112" cy="172" rx="82" ry="9" className="fill-surface stroke-border-strong" strokeWidth="2" />

//       {/* Cloche dome */}
//       <path d="M52 166 a60 60 0 0 1 120 0 Z" className="fill-primary" />
//       <path
//         d="M66 150 a46 46 0 0 1 30 -34"
//         className="stroke-primary-soft"
//         strokeWidth="4"
//         strokeLinecap="round"
//         fill="none"
//         opacity="0.7"
//       />
//       <rect x="44" y="164" width="136" height="9" rx="4.5" className="fill-heading" />
//       <circle cx="112" cy="100" r="7" className="fill-heading" />

//       {/* Order ticket */}
//       <g transform="rotate(5 250 118)">
//         <rect x="204" y="56" width="92" height="120" rx="7" className="fill-surface stroke-border-strong" strokeWidth="2" />
//         <rect x="204" y="56" width="92" height="18" rx="7" className="fill-primary" />
//         <rect x="204" y="66" width="92" height="8" className="fill-primary" />
//         <rect x="216" y="86" width="52" height="5" rx="2.5" className="fill-border-strong" />
//         <rect x="274" y="86" width="10" height="5" rx="2.5" className="fill-border-strong" />
//         <rect x="216" y="100" width="40" height="5" rx="2.5" className="fill-border-strong" />
//         <rect x="274" y="100" width="10" height="5" rx="2.5" className="fill-border-strong" />
//         <rect x="216" y="114" width="58" height="5" rx="2.5" className="fill-border-strong" />
//         <rect x="274" y="114" width="10" height="5" rx="2.5" className="fill-border-strong" />
//         <line x1="216" y1="130" x2="284" y2="130" className="stroke-border-strong" strokeWidth="2" strokeDasharray="4 4" />
//         <rect x="216" y="142" width="26" height="6" rx="3" className="fill-heading" />
//         <rect x="256" y="142" width="28" height="6" rx="3" className="fill-primary" />
//         <circle cx="284" cy="160" r="6" className="fill-success" />
//         <path d="M281 160 l2.2 2.4 l4 -4.6" className="stroke-primary-text" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
//       </g>
//     </svg>
//   );
// }

// const highlights = [
//   { icon: Receipt, text: 'Quick billing and POS' },
//   { icon: ChefHat, text: 'Live orders in the kitchen' },
//   { icon: Boxes, text: 'Stock and purchases in control' },
// ];

// export default function LoginPage() {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [rememberMe, setRememberMe] = useState(false);
//   const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

//   const { mutateAsync: loginUserAsync, isPending } = useLoginUser();

//   const validate = () => {
//     const next: typeof errors = {};
//     if (!email.trim()) next.email = 'Email is required';
//     else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address';
//     if (!password) next.password = 'Password is required';
//     setErrors(next);
//     return Object.keys(next).length === 0;
//   };

//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       // Backend returns { ok: true, token, data: user }
//       const response = await loginUserAsync({ email: email.trim(), password });
//       const { data: user } = response as any;

//       dispatch(
//         setAuthCredentials({
//           _id: user._id,
//           userName: user.userName,
//           organizationId: user.organizationId?._id ?? null,
//           role: user.role,
//           profileImageUrl: user.profileImageUrl ?? null,
//           isPlatformAdmin: user.isPlatformAdmin ?? false,
//           organizationName: user.organizationId?.name ?? null,
//           organizationUrl: user.organizationId?.logo?.url ?? null,
//         })
//       );

//       toast.success('Signed in successfully');
//       navigate('/layout/dashboard');
//     } catch (err: any) {
//       toast.error(err?.message || 'Invalid email or password');
//     }
//   };

//   return (
//     <div className="relative min-h-screen flex items-center justify-center bg-page px-4 py-10 overflow-hidden">
//       {/* Quiet dot grid, fades out toward the edges */}
//       <div
//         aria-hidden="true"
//         className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
//         style={{
//           backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
//           backgroundSize: '22px 22px',
//         }}
//       />

//       <div className="relative w-full max-w-4xl">
//         <div className="relative grid md:grid-cols-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
//           {/* Ticket perforation notches (desktop only) */}
//           <span
//             aria-hidden="true"
//             className="hidden md:block absolute left-[40%] -top-3 -translate-x-1/2 w-6 h-6 rounded-full bg-page z-10"
//           />
//           <span
//             aria-hidden="true"
//             className="hidden md:block absolute left-[40%] -bottom-3 -translate-x-1/2 w-6 h-6 rounded-full bg-page z-10"
//           />

//           {/* Left panel: brand, phrase, illustration */}
//           <div className="hidden md:flex md:col-span-2 flex-col justify-between gap-6 bg-primary-soft p-8">
//             <div className="flex items-center gap-2.5">
//               <div className="w-10 h-10 rounded-xl bg-primary text-primary-text flex items-center justify-center">
//                 <UtensilsCrossed size={20} aria-hidden="true" />
//               </div>
//               <span className="font-display text-lg font-semibold text-heading tracking-tight">
//                 BMB Kitchen
//               </span>
//             </div>

//             <div>
//               <h2 className="font-display text-2xl font-semibold text-heading leading-snug mb-2">
//                 From the first order to the last bill.
//               </h2>
//               <p className="text-sm text-body leading-relaxed">
//                 Billing, kitchen and stock, together in one calm workspace for your restaurant.
//               </p>
//             </div>

//             <KitchenIllustration />

//             <ul className="space-y-2.5">
//               {highlights.map(({ icon: Icon, text }) => (
//                 <li key={text} className="flex items-center gap-2.5 text-sm text-body">
//                   <span className="w-7 h-7 rounded-lg bg-surface text-primary flex items-center justify-center shrink-0">
//                     <Icon size={15} aria-hidden="true" />
//                   </span>
//                   {text}
//                 </li>
//               ))}
//             </ul>
//           </div>

//           {/* Right panel: form */}
//           <div className="md:col-span-3 md:border-l md:border-dashed md:border-border-strong px-6 py-10 sm:px-12 flex flex-col justify-center">
//             <div className="w-full max-w-sm mx-auto">
//               {/* Mobile-only brand */}
//               <div className="flex md:hidden items-center gap-2.5 mb-8">
//                 <div className="w-10 h-10 rounded-xl bg-primary text-primary-text flex items-center justify-center">
//                   <UtensilsCrossed size={20} aria-hidden="true" />
//                 </div>
//                 <span className="font-display text-lg font-semibold text-heading tracking-tight">
//                   BMB Kitchen
//                 </span>
//               </div>

//               <h1 className="font-display text-2xl font-semibold text-heading mb-1">
//                 Welcome back
//               </h1>
//               <p className="text-sm text-muted mb-7">
//                 Sign in to manage orders, kitchen and stock.
//               </p>

//               <form onSubmit={handleSubmit} noValidate className="space-y-5">
//                 <Input
//                   label="Email address"
//                   type="email"
//                   placeholder="you@restaurant.com"
//                   leftIcon={<Mail size={18} />}
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   error={errors.email}
//                   autoComplete="email"
//                   required
//                 />

//                 <Input
//                   label="Password"
//                   type="password"
//                   placeholder="Enter your password"
//                   leftIcon={<Lock size={18} />}
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   error={errors.password}
//                   autoComplete="current-password"
//                   required
//                 />

//                 <div className="flex items-center justify-between">
//                   <label className="flex items-center gap-2 text-sm text-body cursor-pointer select-none">
//                     <input
//                       type="checkbox"
//                       checked={rememberMe}
//                       onChange={(e) => setRememberMe(e.target.checked)}
//                       className="w-4 h-4 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-ring/30"
//                     />
//                     Remember me
//                   </label>

//                   <a
//                     href="/forgot-password"
//                     className="text-sm text-primary hover:text-primary-hover font-medium transition-colors rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
//                   >
//                     Forgot password?
//                   </a>
//                 </div>

//                 <Button type="submit" size="lg" fullWidth isLoading={isPending} loadingText="Signing in...">
//                   Sign in
//                 </Button>
//               </form>

//               <p className="text-sm text-muted text-center mt-7">
//                 Need access? Ask your restaurant administrator to add you.
//               </p>
//             </div>
//           </div>
//         </div>

//         <p className="mt-6 text-center text-xs text-muted">
//           © {new Date().getFullYear()} Build My Business. All rights reserved.
//         </p>
//       </div>
//     </div>
//   );
// }




//  FOURTH VERSION  // okay 
// pages/LoginPage.tsx
import { useState, type FormEvent } from 'react';
import { UtensilsCrossed, Mail, Lock, Receipt, ChefHat, Boxes } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from '../../components/ui/toast/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useLoginUser } from '../../api_service/auth_api/authApi';
import { setAuthCredentials } from '../../features/slices/authSlice';

/* Restaurant illustration: served cloche with steam + order ticket.
   Colours come only from theme tokens (fill-*, stroke-*), so it re-themes automatically. */
function KitchenIllustration() {
  return (
    <svg
      viewBox="0 0 400 250"
      className="w-full h-auto"
      role="img"
      aria-label="A served dish next to an order ticket"
    >
      {/* Soft backdrop */}
      <circle cx="205" cy="130" r="112" className="fill-surface" opacity="0.65" />
      <circle cx="205" cy="130" r="82" className="fill-surface" opacity="0.7" />

      {/* Decorative dots */}
      <circle cx="34" cy="60" r="6" className="fill-warning" />
      <circle cx="372" cy="34" r="5" className="fill-success" />
      <circle cx="214" cy="26" r="4" className="fill-primary" />
      <circle cx="66" cy="22" r="4" className="fill-info" />
      <circle cx="380" cy="150" r="4" className="fill-purple" />

      {/* Table surface */}
      <rect x="14" y="216" width="372" height="10" rx="5" className="fill-primary/25" />

      {/* Steam */}
      <g className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.5">
        <path d="M104 92 q-10 -12 0 -24 t0 -24" />
        <path d="M134 84 q-10 -12 0 -24 t0 -24" />
        <path d="M164 92 q-10 -12 0 -24 t0 -24" />
      </g>

      {/* Plate */}
      <ellipse cx="134" cy="211" rx="98" ry="10" className="fill-surface stroke-border-strong" strokeWidth="2" />

      {/* Cloche dome */}
      <path d="M64 206 a70 70 0 0 1 140 0 Z" className="fill-primary" />
      <path
        d="M80 186 a54 54 0 0 1 36 -40"
        className="stroke-primary-soft"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <rect x="54" y="204" width="160" height="11" rx="5.5" className="fill-heading" />
      <circle cx="134" cy="128" r="8" className="fill-heading" />

      {/* Order ticket */}
      <g transform="rotate(5 300 140)">
        <rect x="246" y="62" width="116" height="152" rx="8" className="fill-surface stroke-border-strong" strokeWidth="2" />
        <rect x="246" y="62" width="116" height="22" rx="8" className="fill-primary" />
        <rect x="246" y="74" width="116" height="10" className="fill-primary" />
        <rect x="260" y="70" width="34" height="6" rx="3" className="fill-primary-text" opacity="0.85" />

        <rect x="260" y="98" width="62" height="6" rx="3" className="fill-border-strong" />
        <rect x="332" y="98" width="16" height="6" rx="3" className="fill-border-strong" />
        <rect x="260" y="114" width="48" height="6" rx="3" className="fill-border-strong" />
        <rect x="332" y="114" width="16" height="6" rx="3" className="fill-border-strong" />
        <rect x="260" y="130" width="70" height="6" rx="3" className="fill-border-strong" />
        <rect x="332" y="130" width="16" height="6" rx="3" className="fill-border-strong" />

        <line x1="260" y1="150" x2="348" y2="150" className="stroke-border-strong" strokeWidth="2" strokeDasharray="5 5" />
        <rect x="260" y="164" width="32" height="7" rx="3.5" className="fill-heading" />
        <rect x="308" y="164" width="40" height="7" rx="3.5" className="fill-primary" />

        <circle cx="342" cy="194" r="8" className="fill-success" />
        <path
          d="M338 194 l2.8 3 l5 -5.8"
          className="stroke-primary-text"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

const highlights = [
  { icon: Receipt, text: 'Billing and POS' },
  { icon: ChefHat, text: 'Kitchen display' },
  { icon: Boxes, text: 'Stock control' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { mutateAsync: loginUserAsync, isPending } = useLoginUser();

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Backend returns { ok: true, token, data: user }
      const response = await loginUserAsync({ email: email.trim(), password });
      const { data: user } = response as any;

      dispatch(
        setAuthCredentials({
          _id: user._id,
          userName: user.userName,
          organizationId: user.organizationId?._id ?? null,
          role: user.role,
          profileImageUrl: user.profileImageUrl ?? null,
          isPlatformAdmin: user.isPlatformAdmin ?? false,
          organizationName: user.organizationId?.name ?? null,
          organizationUrl: user.organizationId?.logo?.url ?? null,
        })
      );

      toast.success('Signed in successfully');
      navigate('/layout/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid email or password');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-page px-4 py-10 overflow-hidden">
      {/* Quiet dot grid, fades out toward the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        style={{
          backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative w-full max-w-5xl">
        <div className="relative grid md:grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:min-h-155">
          {/* Ticket perforation notches at the centre split (desktop only) */}
          <span
            aria-hidden="true"
            className="hidden md:block absolute left-1/2 -top-3 -translate-x-1/2 w-6 h-6 rounded-full bg-page z-10"
          />
          <span
            aria-hidden="true"
            className="hidden md:block absolute left-1/2 -bottom-3 -translate-x-1/2 w-6 h-6 rounded-full bg-page z-10"
          />

          {/* Left half: brand, phrase, illustration */}
          <div className="relative hidden md:flex flex-col justify-between gap-6 bg-primary-soft p-10 overflow-hidden">
            {/* Subtle grid texture */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
              style={{
                backgroundImage:
                  'linear-gradient(var(--color-primary-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary-border) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />

            <div className="relative flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-text flex items-center justify-center">
                <UtensilsCrossed size={20} aria-hidden="true" />
              </div>
              <span className="font-display text-lg font-semibold text-heading tracking-tight">
                BMB Kitchen
              </span>
            </div>

            <div className="relative">
              <h2 className="font-display text-3xl font-semibold text-heading leading-tight mb-3">
                From the first order to the last bill.
              </h2>
              <p className="text-sm text-body leading-relaxed max-w-sm">
                Billing, kitchen and stock, together in one calm workspace for your restaurant.
              </p>
            </div>

            {/* Illustration with two floating status chips */}
            <div className="relative max-w-md w-full mx-auto">
              <KitchenIllustration />

              <div className="absolute top-0 left-0 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 shadow-card">
                <span className="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
                <span className="text-xs font-medium text-heading">Table 4: order ready</span>
              </div>

              <div className="absolute top-12 right-0 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 shadow-card">
                <ChefHat size={14} className="text-primary" aria-hidden="true" />
                <span className="text-xs font-medium text-heading">KOT sent to kitchen</span>
              </div>
            </div>

            <ul className="relative grid grid-cols-3 gap-3">
              {highlights.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex flex-col items-center gap-2 rounded-xl bg-surface/70 border border-primary-border/60 px-2 py-3 text-center"
                >
                  <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium text-body">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right half: form */}
          <div className="md:border-l md:border-dashed md:border-border-strong px-6 py-10 sm:px-12 flex flex-col justify-center">
            <div className="w-full max-w-sm mx-auto">
              {/* Mobile-only brand */}
              <div className="flex md:hidden items-center gap-2.5 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-text flex items-center justify-center">
                  <UtensilsCrossed size={20} aria-hidden="true" />
                </div>
                <span className="font-display text-lg font-semibold text-heading tracking-tight">
                  BMB Kitchen
                </span>
              </div>

              <h1 className="font-display text-3xl font-semibold text-heading mb-1.5">
                Welcome back
              </h1>
              <p className="text-sm text-muted mb-8">
                Sign in to manage orders, kitchen and stock.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@restaurant.com"
                  leftIcon={<Mail size={18} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  leftIcon={<Lock size={18} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  autoComplete="current-password"
                  required
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-body cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                    Remember me
                  </label>

                  <a
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary-hover font-medium transition-colors rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    Forgot password?
                  </a>
                </div>

                <Button type="submit" size="lg" fullWidth isLoading={isPending} loadingText="Signing in...">
                  Sign in
                </Button>
              </form>

              <div className="mt-8 border-t border-dashed border-border-strong pt-5">
                <p className="text-sm text-muted text-center">
                  Need access? Ask your restaurant administrator to add you.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} Build My Business. All rights reserved.
        </p>
      </div>
    </div>
  );
}