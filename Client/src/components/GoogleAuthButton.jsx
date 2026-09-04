import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import { googleLogin } from '../store/authSlice';
import { AlertCircle, Info, Loader2 } from 'lucide-react';

const GoogleAuthButton = ({ text = 'signin_with' }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  const [googleError, setGoogleError] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = clientId && clientId.trim() !== '' && !clientId.includes('your_google_client_id');

  const handleSuccess = async (credentialResponse) => {
    try {
      setGoogleError('');
      if (credentialResponse.credential) {
        await dispatch(googleLogin(credentialResponse.credential)).unwrap();
      } else {
        setGoogleError('No credential received from Google.');
      }
    } catch (err) {
      setGoogleError(err || 'Failed to authenticate with Google.');
    }
  };

  const handleError = () => {
    setGoogleError('Google sign-in was cancelled or failed. Please try again.');
  };

  if (!isConfigured) {
    return (
      <div className="w-full rounded-xl bg-amber-50/80 border border-amber-200/80 p-3.5 text-xs text-amber-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">Google OAuth Setup Needed</p>
            <p className="text-amber-700 leading-relaxed">
              To enable 1-click Google Sign-In, add your <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">VITE_GOOGLE_CLIENT_ID</code> in <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">Client/.env</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-center w-full min-h-[44px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-2.5 px-4 w-full border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50">
            <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" />
            Connecting to Google...
          </div>
        ) : (
          <div className="w-full flex justify-center [&>div]:w-full">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              text={text}
              shape="rectangular"
              theme="outline"
              size="large"
              width="100%"
              logo_alignment="left"
            />
          </div>
        )}
      </div>

      {googleError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span>{googleError}</span>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;
