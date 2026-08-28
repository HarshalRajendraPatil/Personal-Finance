import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, clearError } from '../store/authSlice';
import { Loader2, User, Camera } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="shrink-0 relative group">
              {user?.profilePic || profilePic ? (
                <img 
                  className="h-24 w-24 object-cover rounded-full border-2 border-gray-200" 
                  src={profilePic ? URL.createObjectURL(profilePic) : user.profilePic} 
                  alt="Profile avatar" 
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow cursor-pointer hover:bg-gray-50 border border-gray-200">
                <Camera className="h-4 w-4 text-gray-600" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{user?.name}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          
          {picError && <p className="text-sm text-red-600">{picError}</p>}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                {...register('name')}
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email (Cannot be changed)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-500 cursor-not-allowed focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">New Password (Leave blank to keep current)</label>
              <input
                {...register('password')}
                type="password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="text-sm text-green-700">{successMsg}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || isUploading}
              className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {(isLoading || isUploading) ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
