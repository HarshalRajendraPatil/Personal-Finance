import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, clearError } from '../store/authSlice';
import { Loader2, User, Camera, Palette, Smartphone, Check } from 'lucide-react';
import ThemeToggle from '../components/ui/ThemeToggle';
import PwaInstallButton from '../components/ui/PwaInstallButton';
import { usePwaInstall } from '../hooks/usePwaInstall';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password must be at least 6 characters if provided",
  }),
});

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const Profile = () => {
  const { user, isLoading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const [profilePic, setProfilePic] = useState(null);
  const [picError, setPicError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setPicError('Profile picture must be less than 3MB');
        setProfilePic(null);
        e.target.value = null;
      } else {
        setPicError('');
        setProfilePic(file);
      }
    }
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
      setSuccessMsg('');
      let profilePicUrl = user?.profilePic || '';
      
      if (profilePic) {
        setIsUploading(true);
        profilePicUrl = await uploadToCloudinary(profilePic);
        setIsUploading(false);
      }

      const updateData = {
        name: data.name,
        profilePic: profilePicUrl,
      };

      if (data.password) {
        updateData.password = data.password;
      }

      await dispatch(updateProfile(updateData)).unwrap();
      setSuccessMsg('Profile updated successfully!');
      setProfilePic(null);
    } catch (err) {
      setIsUploading(false);
      setPicError(typeof err === 'string' ? err : 'Profile update failed.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ── Profile Information Card ── */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 transition-colors">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">Your Profile</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="shrink-0 relative group">
              {user?.profilePic || profilePic ? (
                <img 
                  className="h-24 w-24 object-cover rounded-full border-2 border-gray-200 dark:border-slate-700" 
                  src={profilePic ? URL.createObjectURL(profilePic) : user.profilePic} 
                  alt="Profile avatar" 
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-100 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400 dark:text-slate-500" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 rounded-full p-1.5 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition-colors">
                <Camera className="h-4 w-4 text-gray-600 dark:text-slate-300" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          
          {picError && <p className="text-sm text-rose-600 dark:text-rose-400">{picError}</p>}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
              <input
                {...register('name')}
                type="text"
                className="mt-1 block w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              {errors.name && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email (Cannot be changed)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="mt-1 block w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-lg shadow-xs text-gray-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">New Password (Leave blank to keep current)</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="mt-1 block w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              {errors.password && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.password.message}</p>}
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 p-4 rounded-r-lg">
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 p-4 rounded-r-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMsg}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading || isUploading}
              className="flex items-center justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {(isLoading || isUploading) ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Appearance & Theme Preferences Card ── */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Appearance & Theme</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md">
                Customize your visual interface. Switch between vibrant light mode, futuristic dark mode, or follow your operating system settings.
              </p>
            </div>
          </div>
          <div className="pt-2 sm:pt-0 shrink-0">
            <ThemeToggle variant="segmented" />
          </div>
        </div>
      </div>

      {/* ── Progressive Web App (PWA) Card ── */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Progressive Web App</h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">
                  Offline Ready
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md">
                Install Capise directly to your device desktop or home screen for faster navigation, instant access, and full offline resilience.
              </p>
            </div>
          </div>
          <div className="pt-2 sm:pt-0 shrink-0 sm:min-w-[180px]">
            <PwaInstallButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
