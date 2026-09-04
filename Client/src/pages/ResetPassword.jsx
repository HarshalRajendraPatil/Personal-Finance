import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import authService from '../services/authService';
import { KeyRound, Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight, Activity } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError('');
      await authService.resetPassword(token, data.password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3500);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'The reset link is invalid or has expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <span className="bg-gradient-to-tr from-indigo-600 to-blue-500 text-white p-2 rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900">Capise</span>
          </Link>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Create new password
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Please choose a strong password with at least 6 characters.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6 text-center">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-emerald-900">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-bold text-base text-emerald-950 mb-1">Password reset successfully!</h3>
              <p className="text-xs text-emerald-700">
                Your new password is now active. Redirecting you to the sign-in page...
              </p>
            </div>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In Now
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="relative mt-1">
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <div className="relative mt-1">
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    placeholder="••••••••"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
                <div className="pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-blue-600 hover:text-blue-700 font-semibold underline"
                  >
                    Request a new password reset link
                  </Link>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer hover:shadow-lg active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
