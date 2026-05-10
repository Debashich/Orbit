import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Safe Icon wrapper (same pattern as other screens)
const SafeIcon = ({ set, name, size, color }: any) => {
  try {
    const IconComponent = (Icons as any)[set];
    if (!IconComponent) return <Text style={{ color, fontSize: size }}>•</Text>;
    return <IconComponent name={name} size={size} color={color} />;
  } catch (e) {
    return <Text style={{ color, fontSize: size }}>•</Text>;
  }
};

const AUTO_CAPTURE_DELAY = 3; // seconds

export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [countdown, setCountdown] = useState(AUTO_CAPTURE_DELAY);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasAutoCaptured, setHasAutoCaptured] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const handleCaptureRef = useRef<() => void>(() => {});
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top : 24;
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 10 : 24;

  const command = route.params?.command || 'Capture image';
  const analysisPrompt = route.params?.analysisPrompt || 'Describe what you see in this image.';

  // Auto-capture countdown
  useEffect(() => {
    if (!permission?.granted || hasAutoCaptured) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          // Trigger auto-capture via ref to get the latest function
          handleCaptureRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [permission?.granted, hasAutoCaptured]);

  const handleCapture = useCallback(async () => {
    if (isCapturing || !cameraRef.current) return;

    setIsCapturing(true);
    setHasAutoCaptured(true);
    if (countdownRef.current) clearInterval(countdownRef.current);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1, // Drastically lower quality to reduce file size and speed up processing
        base64: false,
        skipProcessing: true, // Crucial for preventing crashes on Android Emulators and some devices
      });

      if (photo?.uri) {
        // Trigger the callback from HomeScreen to pass the image back safely
        if (route.params?.onCapture) {
          route.params.onCapture(photo.uri, command, analysisPrompt);
        }
        // Safely pop the CameraScreen without touching HomeScreen's route state
        navigation.goBack();
      } else {
        setIsCapturing(false);
        setHasAutoCaptured(false);
        setCountdown(AUTO_CAPTURE_DELAY);
      }
    } catch (error) {
      console.error('[Camera] Capture error:', error);
      setIsCapturing(false);
      setHasAutoCaptured(false);
      setCountdown(AUTO_CAPTURE_DELAY);
    }
  }, [isCapturing, navigation, analysisPrompt, command]);

  // Keep ref updated so the interval can call the latest version
  useEffect(() => {
    handleCaptureRef.current = handleCapture;
  }, [handleCapture]);

  const handleClose = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    navigation.goBack();
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // Permission loading state
  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#d946ef" />
      </View>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.permissionCard}>
          <SafeIcon set="Ionicons" name="camera-outline" size={64} color="#d946ef" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionDesc}>
            Clara needs camera access to capture and analyze images for you.
          </Text>
          <TouchableOpacity activeOpacity={0.8} onPress={requestPermission}>
            <LinearGradient
              colors={['#a855f7', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.permissionButton}
            >
              <Text style={styles.permissionButtonText}>GRANT PERMISSION</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      />
      
      {/* Overlays rendered as siblings instead of children for expo-camera v14+ */}
      <View style={styles.overlayContainer}>
        {isCapturing ? (
          <View style={[styles.overlayContainer, styles.center, { backgroundColor: 'rgba(15, 17, 26, 0.8)' }]}>
            <ActivityIndicator size="large" color="#d946ef" />
            <Text style={styles.capturingText}>CAPTURING...</Text>
          </View>
        ) : (
          <>
            {/* Top overlay with command text */}
            <View style={[styles.topOverlay, { paddingTop: topPadding + 10 }]}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <SafeIcon set="Ionicons" name="close" size={28} color="white" />
              </TouchableOpacity>
              <View style={styles.commandBadge}>
                <SafeIcon set="Ionicons" name="mic" size={14} color="#d946ef" />
                <Text style={styles.commandText} numberOfLines={2}>
                  "{command}"
                </Text>
              </View>
              <TouchableOpacity onPress={toggleFacing} style={styles.flipButton}>
                <SafeIcon set="Ionicons" name="camera-reverse-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Center crosshair / focus indicator */}
            <View style={styles.centerOverlay}>
              <View style={styles.crosshair}>
                <View style={[styles.cornerBracket, styles.topLeft]} />
                <View style={[styles.cornerBracket, styles.topRight]} />
                <View style={[styles.cornerBracket, styles.bottomLeft]} />
                <View style={[styles.cornerBracket, styles.bottomRight]} />
              </View>
            </View>

            {/* Bottom overlay with countdown and capture button */}
            <View style={[styles.bottomOverlay, { paddingBottom: bottomPadding }]}>
              {/* Countdown display */}
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownLabel}>AUTO-CAPTURE IN</Text>
                <View style={styles.countdownCircle}>
                  <Text style={styles.countdownNumber}>{countdown}</Text>
                </View>
              </View>

              {/* Manual capture button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCapture}
                style={styles.captureButtonOuter}
              >
                <LinearGradient
                  colors={['#d946ef', '#9333ea']}
                  style={styles.captureButtonInner}
                >
                  <SafeIcon set="Ionicons" name="camera" size={32} color="white" />
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.captureHint}>or tap to capture now</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Top overlay
  topOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(15, 17, 26, 0.6)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commandBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 70, 239, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 12,
    gap: 6,
  },
  commandText: {
    color: '#f0abfc',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Center crosshair
  centerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshair: {
    width: width * 0.65,
    height: width * 0.65,
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#d946ef',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },

  // Bottom overlay
  bottomOverlay: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: 20,
    backgroundColor: 'rgba(15, 17, 26, 0.7)',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownLabel: {
    color: '#94a3b8',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 8,
  },
  countdownCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#d946ef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNumber: {
    color: '#d946ef',
    fontSize: 20,
    fontWeight: 'bold',
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(217, 70, 239, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  captureButtonInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d946ef',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  captureHint: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Permission UI
  permissionCard: {
    backgroundColor: '#1a1c29',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionDesc: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  permissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
  },

  // Capturing overlay
  capturingText: {
    color: '#d946ef',
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 20,
  },
});
