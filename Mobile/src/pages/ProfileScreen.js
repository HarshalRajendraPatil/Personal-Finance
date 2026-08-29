import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, logout, clearError } from '../store/authSlice';
import authService from '../services/authService';
import { COLORS, SHADOWS } from '../styles/theme';
import { Camera, User as UserIcon, LogOut, CheckCircle } from 'lucide-react-native';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { user, isLoading, error } = useSelector((state) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [picError, setPicError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Permission to access gallery is required to choose a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
          setPicError('Profile picture must be less than 3MB');
          setProfileImage(null);
        } else {
          setPicError('');
          setProfileImage(asset);
        }
      }
    } catch (err) {
      setPicError('Failed to select image');
    }
  };

  const validate = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }
    if (password && password.length < 6) {
      errs.password = 'Password must be at least 6 characters if provided';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSuccessMsg('');
      let profilePicUrl = user?.profilePic || '';

      if (profileImage) {
        setIsUploading(true);
        profilePicUrl = await authService.uploadToCloudinary(profileImage);
        setIsUploading(false);
      }

      const updateData = {
        name: name.trim(),
        profilePic: profilePicUrl,
      };

      if (password) {
        updateData.password = password;
      }

      await dispatch(updateProfile(updateData)).unwrap();
      setSuccessMsg('Profile updated successfully!');
      setPassword('');
      setProfileImage(null);
    } catch (err) {
      setIsUploading(false);
      setPicError(typeof err === 'string' ? err : 'Profile update failed.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Your Profile</Text>

              {/* Avatar and Info Header */}
              <View style={styles.avatarRow}>
                <View style={styles.avatarWrapper}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage.uri }} style={styles.avatarImg} />
                  ) : user?.profilePic ? (
                    <Image source={{ uri: user.profilePic }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <UserIcon size={40} color={COLORS.textLight} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.cameraBadge}
                    onPress={handlePickImage}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Camera size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.avatarInfo}>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                </View>
              </View>

              {picError ? (
                <Text style={[styles.errorText, { marginBottom: 12 }]}>{picError}</Text>
              ) : null}

              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={[styles.input, formErrors.name && styles.inputError]}
                  placeholder="Your Name"
                  placeholderTextColor={COLORS.textLight}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
                  }}
                />
                {formErrors.name && (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                )}
              </View>

              {/* Email (Read-only) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email (Cannot be changed)</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  editable={false}
                  value={user?.email || ''}
                />
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  New Password (Leave blank to keep current)
                </Text>
                <TextInput
                  style={[styles.input, formErrors.password && styles.inputError]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: null }));
                  }}
                />
                {formErrors.password && (
                  <Text style={styles.errorText}>{formErrors.password}</Text>
                )}
              </View>

              {/* Server Error Banner */}
              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              {/* Success Banner */}
              {successMsg ? (
                <View style={styles.successBanner}>
                  <CheckCircle size={16} color={COLORS.successText} />
                  <Text style={styles.successBannerText}>{successMsg}</Text>
                </View>
              ) : null}

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.submitBtn, (isLoading || isUploading) && styles.btnDisabled]}
                onPress={handleSave}
                disabled={isLoading || isUploading}
              >
                {isLoading || isUploading ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {isUploading ? 'Uploading...' : 'Saving...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Logout Card */}
            <View style={[styles.card, styles.logoutCard]}>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
              >
                <LogOut size={20} color={COLORS.danger} />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 18,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    ...SHADOWS.sm,
  },
  avatarInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textMain,
  },
  inputDisabled: {
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.textMuted,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.dangerText,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.successBg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 13,
    color: COLORS.successText,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...SHADOWS.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutCard: {
    padding: 6,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
  },
});

export default ProfileScreen;
