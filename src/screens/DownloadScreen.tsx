import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function DownloadScreen() {
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
            <Text style={styles.title}>Downloading AI model...</Text>
            <Text style={styles.subtitle}>Your intelligence is initializing.</Text>
          </View>

          {/* MAIN CARD */}
          <View style={styles.mainCard}>
            <View style={styles.iconBox}>
              <SafeIcon set="MaterialCommunityIcons" name="cpu-64-bit" size={32} color="#f0abfc" />
            </View>

            <Text style={styles.cardTitle}>Gemma 4 Model (2GB)</Text>
            <Text style={styles.cardSubtitle}>
              Enhanced natural language processing & vision-to-speech engine.
            </Text>

            {/* PROGRESS BAR */}
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>45%</Text>
              <Text style={styles.progressSize}>890 MB / 2 GB</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={['#c084fc', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: '45%' }]}
              />
            </View>

            {/* INFO TEXT */}
            <View style={styles.infoRow}>
              <SafeIcon set="Ionicons" name="checkmark-circle" size={16} color="#a5b4fc" />
              <Text style={styles.infoText}>Download once. Works offline forever.</Text>
            </View>

            {/* BUTTON */}
            <TouchableOpacity activeOpacity={0.8} style={styles.buttonWrapper}>
              <LinearGradient
                colors={['#a855f7', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pauseButton}
              >
                <SafeIcon set="Ionicons" name="pause-circle" size={20} color="white" />
                <Text style={styles.pauseButtonText}>PAUSE DOWNLOAD</Text>
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
        <TouchableOpacity style={styles.tabIcon}>
          <SafeIcon set="MaterialCommunityIcons" name="history" size={28} color="#94a3b8" />
        </TouchableOpacity>

        {/* GLOWING MIC BUTTON */}
        <View style={styles.tabMicWrapper}>
          <View style={styles.micGlow} />
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={['#d946ef', '#9333ea']}
              style={styles.tabMicButton}
            >
              <SafeIcon set="Ionicons" name="mic" size={36} color="white" />
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
