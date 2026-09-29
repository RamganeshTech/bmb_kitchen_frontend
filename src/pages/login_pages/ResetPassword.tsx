import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { useResetPassword } from '../../api_service/auth_api/authApi';
import { toast } from '../../components/ui/toast/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ResetPassword() {
  const { id, token } = useParams<{ id: string; token: string }>();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { mutateAsync: resetPassword, isPending } = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Client-side validation
    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    if (!id || !token) {
      toast.error('Invalid or missing reset token.');
      return;
    }

    try {
      const response = await resetPassword({ 
        id, 
        token, 
        newPassword, 
        confirmPassword 
      });
      
      toast.success(response.message || 'Password has been successfully reset.', 5000);
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password. The link may have expired.', 5000);
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-semibold tracking-tight text-heading">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-muted">
          Your new password must be different from previous used passwords.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <section className="bg-surface py-8 px-4 shadow-sm border border-border sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* The custom Input automatically handles the show/hide toggle because type="password" */}
            <Input
              id="newPassword"
              type="password"
              label="New Password"
              placeholder="Enter new password"
              required
              disabled={isPending}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (validationError) setValidationError('');
              }}
              leftIcon={<Lock size={18} />}
              helperText="Must be at least 8 characters."
              fullWidth
            />

            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Confirm new password"
              required
              disabled={isPending}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (validationError) setValidationError('');
              }}
              leftIcon={<Lock size={18} />}
              error={validationError} // Shows inline error if passwords don't match
              fullWidth
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isPending}
              loadingText="Resetting password..."
            >
              Reset Password
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to log in
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}