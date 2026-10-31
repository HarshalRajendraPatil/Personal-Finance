import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setEmailVerified } from '../store/authSlice';
import authService from '../services/authService';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail, Activity } from 'lucide-react';

const VerifyEmail = () => {
  const { token } = useParams();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      try {
        const data = await authService.verifyEmail(token);
        if (isMounted) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          dispatch(setEmailVerified());
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setMessage(
            err.response?.data?.message || err.message || 'This verification link is invalid or has expired.'
          );
        }
      }
    };

    if (token) {
      verify();
    }

    return () => {
      isMounted = false;
    };
  }, [token, dispatch]);

  const handleResend = async (e) => {
    e.preventDefault();
    const emailToUse = resendEmail || user?.email;
    if (!emailToUse) return;

    try {
      setIsResending(true);
      await authService.resendVerification(emailToUse);
      setResendSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resend verification link.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 text-center relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2 group">
            <span className="bg-gradient-to-tr from-indigo-600 to-blue-500 text-white p-2 rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900">Capise</span>
          </Link>
        </div>

        {status === 'loading' && (
          <div className="py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
            <p className="text-sm text-gray-500">Please hold on while we confirm your email ownership.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-2 space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {message || 'Your email address has been successfully verified. Your account is now fully active.'}
              </p>
            </div>

            <div>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all hover:shadow-lg active:scale-[0.99]"
                >
                  Continue to Dashboard
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all hover:shadow-lg active:scale-[0.99]"
                >
                  Sign in to your account
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600">
              <XCircle className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
              <p className="mt-2 text-sm text-red-600 leading-relaxed">{message}</p>
            </div>

            <div className="border-t border-gray-100 pt-5 text-left">
              <p className="text-xs font-semibold text-gray-700 mb-2">Need a new verification link?</p>
              {resendSuccess ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                  New verification link sent! Please check your inbox.
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="Enter your registered email"
                      value={resendEmail || user?.email || ''}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="block w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={isResending}
                    className="w-full py-2 px-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Sending...
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-medium text-gray-600 hover:text-gray-900">
                Back to Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
