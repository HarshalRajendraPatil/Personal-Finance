import api from './api';
import { CLOUDINARY_CONFIG } from '../config';

const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch {
      return { message: 'Logged out' };
    }
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },
  uploadToCloudinary: async (imageAsset) => {
    const formData = new FormData();

    if (typeof imageAsset === 'string') {
      const filename = imageAsset.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', {
        uri: imageAsset,
        name: filename,
        type: type,
      });
    } else if (imageAsset && imageAsset.uri) {
      const filename = imageAsset.fileName || imageAsset.uri.split('/').pop() || 'profile.jpg';
      const type = imageAsset.mimeType || imageAsset.type || 'image/jpeg';
      formData.append('file', {
        uri: imageAsset.uri,
        name: filename,
        type: type,
      });
    } else {
      formData.append('file', imageAsset);
    }

    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to upload image to Cloudinary');
    }

    const data = await res.json();
    return data.secure_url;
  },
};

export default authService;
