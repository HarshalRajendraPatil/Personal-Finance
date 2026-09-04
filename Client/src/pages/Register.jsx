import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerUser, clearError } from '../store/authSlice';
import {
  Activity,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Camera,
  X,
  TrendingUp,
  Sparkles,
  PieChart,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import authHeroImg from '../assets/auth-hero.jpg';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const Register = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [picError, setPicError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    return () => {
      dispatch(clearError());
    };
  }, [isAuthenticated, navigate, dispatch]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setPicError('Profile picture must be less than 3MB');
        setProfilePic(null);
        setPreviewUrl('');
        e.target.value = null;
      } else {
        setPicError('');
        setProfilePic(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemovePhoto = () => {
    setProfilePic(null);
    setPreviewUrl('');
    setPicError('');
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await res.json();
    return data.secure_url;
  };

  const onSubmit = async (data) => {
    try {
      let profilePicUrl = '';

      if (profilePic) {
        setIsUploading(true);
        profilePicUrl = await uploadToCloudinary(profilePic);
        setIsUploading(false);
      }

      dispatch(
        registerUser({
          ...data,
          profilePic: profilePicUrl,
        })
      );
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setPicError('Image upload failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 antialiased selection:bg-indigo-500 selection:text-white">
      {/* ── Left Side: Hero & Graphic Showcase (Desktop Only) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-slate-950 text-white flex-col justify-between p-10 xl:p-14">
        {/* Background Ambient Glows & Mesh Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />
        <div className="absolute top-1/4 -right-10 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

        {/* Top Header / Brand Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="bg-gradient-to-tr from-indigo-600 to-blue-500 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6" />
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-white font-sans">Capise</span>
              <span className="text-[10px] uppercase font-semibold tracking-widest text-indigo-300/80 -mt-1">
                Intelligence Engine
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-indigo-200">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Join 10,000+ Wealth Builders
          </div>
        </div>

        {/* Center: Financial Illustration & Feature Badges */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center py-6">
          {/* Main Visual Image Card */}
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-900/60 backdrop-blur-xl group">
            <img
              src={authHeroImg}
              alt="Capise Automated Wealth Insights"
              className="w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

            {/* Bottom Tagline on Image */}
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs text-white/90">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold tracking-wide">Automate Budgets, SIPs & Cashflow</span>
              </div>
              <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
                Zero Fees
              </span>
            </div>
          </div>

          {/* Floating Feature Highlights */}
          <div className="w-full max-w-lg mt-6 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/10 shadow-lg">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Smart Categorization</p>
                <p className="text-sm font-bold text-white tracking-tight">Auto Tagging <span className="text-[10px] text-indigo-300 font-normal">99.4% Acc.</span></p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/10 shadow-lg">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium">Salary Distributor</p>
                <p className="text-sm font-bold text-white tracking-tight">50/30/20 Rule <span className="text-[10px] text-emerald-400 font-normal">Automated</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Capise Inc. Enterprise Data Confidentiality.</p>
          <div className="flex gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-white transition-colors cursor-pointer">Security Standards</span>
          </div>
        </div>
      </div>

      {/* ── Right Side: Interactive Registration Form ── */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-center items-center px-4 sm:px-8 md:px-12 xl:px-16 py-8 sm:py-12 bg-white relative overflow-y-auto">
        {/* Subtle Background Glow for mobile/tablet */}
        <div className="lg:hidden absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none" />

        <div className="w-full max-w-md space-y-5 sm:space-y-6 relative z-10 my-auto">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center text-center mb-1">
            <div className="inline-flex items-center gap-2.5 mb-2.5">
              <span className="bg-gradient-to-tr from-indigo-600 to-blue-500 text-white p-2 rounded-xl shadow-md">
                <Activity className="w-5 h-5" />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-gray-900 font-sans">Capise</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Personal Wealth Intelligence
            </p>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Start building wealth with proactive intelligence and real-time tracking.
            </p>
          </div>

          {/* Google OAuth Button */}
          <div className="w-full">
            <GoogleAuthButton text="signup_with" />
          </div>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-medium tracking-wider">
                Or register with email
              </span>
            </div>
          </div>

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  {...register('name')}
                  type="text"
                  placeholder="Harshal Patil"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-gray-50/50 hover:bg-white"
                />
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-300 rounded-xl shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-gray-50/50 hover:bg-white"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-xl shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-gray-50/50 hover:bg-white"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Profile Picture Upload (Optional with Live Preview) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Avatar Photo <span className="font-normal text-gray-400 lowercase">(optional)</span>
              </label>

              {previewUrl ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 bg-gray-50/60">
                  <img
                    src={previewUrl}
                    alt="Selected avatar preview"
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {profilePic?.name || 'Avatar selected'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {(profilePic?.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/30 cursor-pointer transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-gray-200/80 group-hover:bg-indigo-100 flex items-center justify-center text-gray-500 group-hover:text-indigo-600 transition-colors shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-indigo-600 group-hover:text-indigo-700">
                      Upload profile picture
                    </span>
                    <p className="text-[11px] text-gray-400">PNG, JPG or WebP (max. 3MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}

              {picError && <p className="mt-1.5 text-xs text-red-600 font-medium">{picError}</p>}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-700 leading-relaxed">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isUploading}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all hover:shadow-lg active:scale-[0.99] cursor-pointer"
              >
                {isLoading || isUploading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading avatar...' : 'Creating your account...'}
                  </>
                ) : (
                  <>
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </button>
            </div>

            {/* Switch to Login */}
            <div className="text-center pt-2 text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
