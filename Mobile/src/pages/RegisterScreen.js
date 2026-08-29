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
import { register, clearError } from '../store/authSlice';
import authService from '../services/authService';
import { COLORS, SHADOWS } from '../styles/theme';
import { Activity, Camera, User as UserIcon, X } from 'lucide-react-native';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [picError, setPicError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

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
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Invalid email address';
    }
    if (!password || password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      let profilePicUrl = '';

      if (profileImage) {
        setIsUploading(true);
        profilePicUrl = await authService.uploadToCloudinary(profileImage);
        setIsUploading(false);
      }

      dispatch(
        register({
          name: name.trim(),
          email: email.trim(),
          password,
          profilePic: profilePicUrl,
        })
      );
    } catch (err) {
      setIsUploading(false);
      setPicError('Image upload failed. Please try again.');
    }
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
            {/* Logo / Header */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBadge}>
                <Activity size={28} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.appName}>Finora</Text>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Start tracking your finances today.</Text>
            </View>

            {/* Card Form */}
            <View style={styles.card}>
              {/* Profile Image Picker */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrapper}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage.uri }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <UserIcon size={36} color={COLORS.textLight} />
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

                {profileImage && (
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setProfileImage(null)}
                  >
                    <Text style={styles.removeImageText}>Remove photo</Text>
                  </TouchableOpacity>
                )}

                {picError ? <Text style={styles.errorText}>{picError}</Text> : null}
              </View>

              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={[styles.input, formErrors.name && styles.inputError]}
                  placeholder="John Doe"
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

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={[styles.input, formErrors.email && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: null }));
                  }}
                />
                {formErrors.email && (
                  <Text style={styles.errorText}>{formErrors.email}</Text>
                )}
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, formErrors.password && styles.inputError]}
                  placeholder="Min 6 characters"
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

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, (isLoading || isUploading) && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={isLoading || isUploading}
              >
                {isLoading || isUploading ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {isUploading ? 'Uploading...' : 'Registering...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>Register</Text>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.footerLinkRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Log in</Text>
                </TouchableOpacity>
              </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...SHADOWS.md,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  removeImageBtn: {
    marginTop: 6,
  },
  removeImageText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textMain,
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default RegisterScreen;
