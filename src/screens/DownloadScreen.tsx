import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');

// Safe Icon wrapper
const SafeIcon = ({ set, name, size, color }: any) => {
  try {
    const IconComponent = (Icons as any)[set];
    if (!IconComponent) return <Text style={{ color, fontSize: size }}>•</Text>;
    return <IconComponent name={name} size={size} color={color} />;
  } catch (e) {
    return <Text style={{ color, fontSize: size }}>•</Text>;
  }
};

export default function DownloadScreen({ navigation: propNavigation }: any) {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [totalMB, setTotalMB] = useState(1600); // Updated to ~1.6GB for Gemma 4 E2B Q4_K_M
  const [downloadPhase, setDownloadPhase] = useState<'model' | 'mmproj'>('model');

  useEffect(() => {
    // Check if already downloaded (both model and mmproj)
    const checkFile = async () => {
      try {
        const modelPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-q4km.gguf`;
        const mmprojPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-mmproj.gguf`;
        const modelExists = await RNFS.exists(modelPath);
        const mmprojExists = await RNFS.exists(mmprojPath);

        if (modelExists && mmprojExists) {
          const modelStat = await RNFS.stat(modelPath);
          // Only mark as completed if model is over 1.4GB and mmproj exists
          if (modelStat.size > 1400000000) {
            setDownloadState('completed');
            setProgress(100);
            setDownloadedMB(modelStat.size / 1024 / 1024);
            setTotalMB(modelStat.size / 1024 / 1024);
          } else {
            setDownloadState('idle');
            setProgress((modelStat.size / (1.6 * 1024 * 1024 * 1024)) * 100);
            setDownloadedMB(modelStat.size / 1024 / 1024);
          }
        } else if (modelExists) {
          const modelStat = await RNFS.stat(modelPath);
          if (modelStat.size > 1400000000) {
            // Model downloaded but mmproj missing — need to download mmproj
            setDownloadState('idle');
            setDownloadPhase('mmproj');
            setProgress(80);
            setDownloadedMB(modelStat.size / 1024 / 1024);
          } else {
            setDownloadState('idle');
            setProgress((modelStat.size / (1.6 * 1024 * 1024 * 1024)) * 100);
            setDownloadedMB(modelStat.size / 1024 / 1024);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkFile();
  }, []);

  const downloadFile = async (
    url: string,
    destPath: string,
    onProgress: (percent: number, downloadedMB: number, totalMB: number) => void,
  ): Promise<boolean> => {
    try {
      const exists = await RNFS.exists(destPath);
      if (exists) {
        await RNFS.unlink(destPath);
      }

      const result = RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        background: true,
        discretionary: true,
        begin: (res) => {
          setTotalMB(res.contentLength / 1024 / 1024);
        },
        progress: (res) => {
          const percent = (res.bytesWritten / res.contentLength) * 100;
          onProgress(percent, res.bytesWritten / 1024 / 1024, res.contentLength / 1024 / 1024);
        },
        progressDivider: 1,
      });

      const finalRes = await result.promise;
      return finalRes.statusCode === 200;
    } catch (err: any) {
      console.error('Download error:', err);
      throw err;
    }
  };

  const startDownload = async () => {
    // Gemma 4 E2B model + multimodal projector for vision
    const modelUrl = 'https://huggingface.co/bartowski/google_gemma-4-E2B-it-GGUF/resolve/main/google_gemma-4-E2B-it-Q4_K_M.gguf';
    const mmprojUrl = 'https://huggingface.co/bartowski/google_gemma-4-E2B-it-GGUF/resolve/main/mmproj-google_gemma-4-E2B-it-f16.gguf';
    const modelPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-q4km.gguf`;
    const mmprojPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-mmproj.gguf`;

    setDownloadState('downloading');
    setProgress(0);

    try {
      // Phase 1: Download main model (skip if already complete)
      const modelExists = await RNFS.exists(modelPath);
      let modelComplete = false;
      if (modelExists) {
        const modelStat = await RNFS.stat(modelPath);
        modelComplete = modelStat.size > 1400000000;
      }

      if (!modelComplete) {
        setDownloadPhase('model');
        const modelSuccess = await downloadFile(modelUrl, modelPath, (percent, dlMB, tMB) => {
          // Model is ~85% of total work
          setProgress(percent * 0.85);
          setDownloadedMB(dlMB);
          setTotalMB(tMB);
        });

        if (!modelSuccess) {
          setDownloadState('error');
          Alert.alert('Download Failed', 'Failed to download the AI model.');
          return;
        }

        const modelStats = await RNFS.stat(modelPath);
        if (modelStats.size <= 1400000000) {
          setDownloadState('error');
          Alert.alert('Download Failed', 'Incomplete model download.');
          return;
        }
      }

      // Phase 2: Download mmproj (vision projector)
      const mmprojExists = await RNFS.exists(mmprojPath);
      if (!mmprojExists) {
        setDownloadPhase('mmproj');
        setProgress(85);
        const mmprojSuccess = await downloadFile(mmprojUrl, mmprojPath, (percent, dlMB, tMB) => {
          // mmproj is the remaining ~15%
          setProgress(85 + (percent * 0.15));
          setDownloadedMB(dlMB);
          setTotalMB(tMB);
        });

        if (!mmprojSuccess) {
          setDownloadState('error');
          Alert.alert('Download Failed', 'Failed to download the vision projector.');
          return;
        }
      }

      setDownloadState('completed');
      setProgress(100);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadState('error');
      Alert.alert('Download Error', err.message || 'An error occurred during download.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <SafeIcon set="Ionicons" name="eye" size={24} color="#d946ef" />
              <Text style={styles.logoText}>
                <Text style={{ color: '#fff' }}>Vision</Text>
                <Text style={{ color: '#d946ef' }}>Voice</Text>
              </Text>
            </View>
            <View style={styles.avatarContainer}>
              {/* Fallback avatar shape if we don't have an image source */}
              <View style={styles.avatarPlaceholder}>
                <SafeIcon set="Ionicons" name="person" size={16} color="#0b0b2b" />
              </View>
            </View>
          </View>

          {/* TITLE SECTION */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {downloadState === 'completed' ? 'Model Ready!' : 
               downloadState === 'downloading' ? 'Downloading AI model...' : 
               downloadState === 'error' ? 'Download Failed' : 
               'Get AI Model'}
            </Text>
            <Text style={styles.subtitle}>
              {downloadState === 'completed' ? 'Your local intelligence is ready.' : 
               'Your intelligence is initializing.'}
            </Text>
          </View>

          {/* MAIN CARD */}
          <View style={styles.mainCard}>
            <View style={styles.iconBox}>
              <SafeIcon set="MaterialCommunityIcons" name="cpu-64-bit" size={32} color="#f0abfc" />
            </View>

            <Text style={styles.cardTitle}>Gemma 4 E2B (~1.8GB)</Text>
            <Text style={styles.cardSubtitle}>
              Multimodal AI with vision & language — {downloadPhase === 'mmproj' ? 'downloading vision module...' : 'powers image analysis & conversation'}.
            </Text>

            {/* PROGRESS BAR */}
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
              <Text style={styles.progressSize}>
                {downloadedMB.toFixed(1)} MB / {totalMB.toFixed(1)} MB
              </Text>
            </View>

            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={['#c084fc', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>

            {/* INFO TEXT */}
            <View style={styles.infoRow}>
              <SafeIcon set="Ionicons" name="checkmark-circle" size={16} color="#a5b4fc" />
              <Text style={styles.infoText}>Download once. Works offline forever.</Text>
            </View>

            {/* BUTTON */}
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={styles.buttonWrapper}
              disabled={downloadState === 'downloading'}
              onPress={() => {
                if (downloadState === 'completed') {
                  navigation.navigate('Home');
                } else {
                  startDownload();
                }
              }}
            >
              <LinearGradient
                colors={downloadState === 'completed' ? ['#10b981', '#059669'] : ['#a855f7', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.pauseButton, downloadState === 'downloading' && { opacity: 0.7 }]}
              >
                <SafeIcon 
                  set="Ionicons" 
                  name={downloadState === 'completed' ? "checkmark-circle" : downloadState === 'downloading' ? "cloud-download" : "cloud-download-outline"} 
                  size={20} 
                  color="white" 
                />
                <Text style={styles.pauseButtonText}>
                  {downloadState === 'completed' ? 'CONTINUE TO APP' : 
                   downloadState === 'downloading' ? 'DOWNLOADING...' : 
                   downloadState === 'error' ? 'RETRY DOWNLOAD' : 
                   'START DOWNLOAD'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* PRIVACY CARD */}
          <View style={styles.featureCard}>
            <SafeIcon set="Ionicons" name="shield-half" size={20} color="#f0abfc" />
            <Text style={styles.featureTitle}>On-Device Privacy</Text>
            <Text style={styles.featureDesc}>
              Your voice and vision data never leaves this device. Processing is 100% local.
            </Text>
          </View>

          {/* RESPONSE CARD */}
          <View style={styles.featureCard}>
            <SafeIcon set="Ionicons" name="flash" size={20} color="#f472b6" />
            <Text style={styles.featureTitle}>Instant Response</Text>
            <Text style={styles.featureDesc}>
              Zero-latency interactions powered by the latest hardware-optimized weights.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* BOTTOM TAB BAR (Overlay) */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity 
          style={styles.tabIcon}
          onPress={() => navigation.navigate('Chat')}
        >
          <SafeIcon set="MaterialCommunityIcons" name="history" size={28} color="#94a3b8" />
        </TouchableOpacity>

        {/* GLOWING CHAT BUTTON */}
        <View style={styles.tabMicWrapper}>
          <View style={styles.micGlow} />
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Chat')}
          >
            <LinearGradient
              colors={['#d946ef', '#9333ea']}
              style={styles.tabMicButton}
            >
              <SafeIcon set="Ionicons" name="chatbubble-ellipses" size={32} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.tabIcon}>
          <SafeIcon set="Ionicons" name="settings-sharp" size={26} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111a',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120, // space for tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 2,
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  mainCard: {
    backgroundColor: '#1a1c29',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#2a2c3d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  progressPercent: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  progressSize: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#0b0c14',
    borderRadius: 4,
    marginBottom: 25,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonWrapper: {
    width: '100%',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    gap: 10,
  },
  pauseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  featureCard: {
    backgroundColor: '#161824',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  featureDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: '#0f111a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  tabIcon: {
    padding: 10,
  },
  tabMicWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
  },
  micGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#db2777',
    opacity: 0.15,
  },
  tabMicButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
});
