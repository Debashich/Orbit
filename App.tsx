import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RNFS from 'react-native-fs';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DownloadScreen from './src/screens/DownloadScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { getUserProfile, initDatabase } from './database/db';

function BootScreen() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const checkState = async () => {
      try {
        await initDatabase();
        
        // 1. Check if user profile exists
        const profile = await getUserProfile();
        // Fallback safety check
        if (!profile || (profile as any).visionDescription === 'test') {
          navigation.replace('Onboarding');
          return;
        }

        // 2. Check if the model is downloaded
        const modelPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-q4km.gguf`;
        const mmprojPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-mmproj.gguf`;
        const exists = await RNFS.exists(modelPath);
        const mmprojExists = await RNFS.exists(mmprojPath);
        if (!exists || !mmprojExists) {
          navigation.replace('Download');
          return;
        }

        const stats = await RNFS.stat(modelPath);
        if (stats.size < 1400000000) { 
          // If the model is incomplete/corrupted
          navigation.replace('Download');
          return;
        }

        // 3. If both exist, go straight to Home
        navigation.replace('Home');
      } catch (error) {
        console.error('Boot error:', error);
        navigation.replace('Onboarding'); // Fallback route
      }
    };

    checkState();
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f111a', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#d946ef" />
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Boot',
  screens: {
    Boot: {
      screen: BootScreen,
      options: { headerShown: false },
    },
    Onboarding: {
      screen: OnboardingScreen,
      options: { headerShown: false, animation: 'fade' },
    },
    Download: {
      screen: DownloadScreen,
      options: { headerShown: false, animation: 'fade' },
    },
    Home: {
      screen: HomeScreen,
      options: { headerShown: false, animation: 'fade' },
    },
    Camera: {
      screen: CameraScreen,
      options: { headerShown: false, animation: 'slide_from_bottom' },
    },
    Settings: {
      screen: SettingsScreen,
      options: { headerShown: false, animation: 'slide_from_right' },
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}