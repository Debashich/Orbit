import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
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

const WAVE_HEIGHTS = [15, 25, 45, 60, 45, 65, 45, 55, 35, 20, 15];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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
            <View style={styles.avatarPlaceholder}>
              <SafeIcon set="Ionicons" name="person" size={18} color="#e5e7eb" />
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* USER BUBBLE 1 */}
          <View style={styles.userBubble}>
            <Text style={styles.userText}>Should I go out with an umbrella?</Text>
          </View>

          {/* AI BUBBLE 1 */}
          <View style={styles.aiBubbleWrapper}>
            <View style={styles.aiGlow} />
            <View style={styles.aiBubble}>
              <Text style={styles.aiText}>Weather is clear, no need.</Text>
              <Text style={styles.aiFooter}>VISION INSIGHT</Text>
            </View>
          </View>

          {/* USER BUBBLE 2 */}
          <View style={styles.userBubble}>
            <Text style={styles.userText}>Is the traffic light green?</Text>
          </View>

          {/* AI BUBBLE 2 */}
          <View style={styles.aiBubbleWrapper}>
            <View style={styles.aiGlow} />
            <View style={styles.aiBubble}>
              <Text style={styles.aiText}>No, wait for 10 seconds.</Text>
              <Text style={styles.aiFooter}>REAL-TIME VISION</Text>
            </View>
          </View>

          {/* Add bottom padding to allow scrolling past the fixed UI */}
          <View style={{ height: 200 }} />
        </ScrollView>
      </SafeAreaView>

      {/* LISTENING UI & BOTTOM BAR (Overlay) */}
      <View style={styles.fixedBottomContainer}>
        {/* WAVEFORM */}
        <View style={styles.listeningContainer}>
          <View style={styles.waveform}>
            {WAVE_HEIGHTS.map((h, i) => (
              <LinearGradient
                key={i}
                colors={['#c084fc', '#db2777']}
                style={[styles.waveBar, { height: h }]}
              />
            ))}
          </View>
          <Text style={styles.listeningText}>LISTENING FOR VOICE</Text>
        </View>

        {/* TAB BAR */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity style={styles.tabIcon}>
            <SafeIcon set="MaterialCommunityIcons" name="history" size={28} color="#94a3b8" />
          </TouchableOpacity>

          {/* GLOWING MIC BUTTON */}
          <View style={styles.tabMicWrapper}>
            <View style={styles.micGlow} />
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient
                colors={['#a855f7', '#db2777']}
                style={styles.tabMicButton}
              >
                <SafeIcon set="Ionicons" name="mic" size={32} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.tabIcon}>
            <SafeIcon set="Ionicons" name="settings-sharp" size={26} color="#94a3b8" />
          </TouchableOpacity>
        </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1e2d',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1c1e2d',
    padding: 24,
    borderRadius: 35,
    borderBottomRightRadius: 10,
    marginBottom: 24,
    width: '90%',
  },
  userText: {
    color: '#e2e8f0',
    fontSize: 20,
    lineHeight: 30,
  },
  aiBubbleWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 35,
    width: '90%',
    position: 'relative',
  },
  aiGlow: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
    backgroundColor: '#d946ef',
    opacity: 0.15,
    borderRadius: 35,
    shadowColor: '#d946ef',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 5,
  },
  aiBubble: {
    backgroundColor: '#1a1625',
    padding: 28,
    borderRadius: 35,
    borderBottomLeftRadius: 10,
    borderColor: 'rgba(217, 70, 239, 0.1)',
    borderWidth: 1,
  },
  aiText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '400',
  },
  aiFooter: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 15,
    letterSpacing: 2,
    fontWeight: '600',
  },
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f111a',
    paddingTop: 10,
  },
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    gap: 6,
    marginBottom: 15,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  listeningText: {
    color: '#94a3b8',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end', /* aligns settings and history correctly relative to mic */
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  tabIcon: {
    padding: 10,
    marginBottom: 10,
  },
  tabMicWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#db2777',
    opacity: 0.15,
  },
  tabMicButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
});
