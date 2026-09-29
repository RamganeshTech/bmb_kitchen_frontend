import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { useForgotPassword } from '../../api_service/auth_api/authApi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  
  const { mutateAsync: requestReset, isPending } = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.warning('Please enter your email address.', 3000);
      return;
    }

    try {
      const response = await requestReset({ email });
      toast.success(
        response.message || 'If an account exists, a reset link has been sent.', 
        5000
      );
      setEmail(''); 
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link.', 5000);
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-semibold tracking-tight text-heading">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-muted">
          We'll send a recovery link to your email address.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Using a Card-like section container styling mapping to your CSS variables */}
        <section className="bg-surface py-8 px-4 shadow-sm border border-border sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              id="email"
              type="email"
              label="Email address"
              placeholder="name@company.com"
              required
              disabled={isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail />}
              fullWidth
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isPending}
              loadingText="Sending..."
            >
              Send recovery link
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-muted">Or</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm transition-colors"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Return to log in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}