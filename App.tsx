import React, { useEffect } from 'react';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DownloadScreen from './src/screens/DownloadScreen';
import HomeScreen from './src/screens/HomeScreen';
import { getUserProfile, initDatabase, saveUserProfile } from './database/db';
//import { debugPrintAllData } from './database/db';
// call anywhere during development
//await debugPrintAllData();

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Onboarding',
  screens: {
    Onboarding: {
      screen: OnboardingScreen,
      options: { headerShown: false },
    },
    Download: {
      screen: DownloadScreen,
      options: { headerShown: false },
    },
    Home: {
      screen: HomeScreen,
      options: { headerShown: false },
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  useEffect(() => {
    const setup = async () => {
      console.log(' Starting DB init...');
      await initDatabase();
      console.log(' DB init done');

      // Test save directly
      const result = await saveUserProfile({
        height: 'test',
        weight: 'test',
        visionImpairment: 'test',
        guidanceType: 'test',
      });
      console.log(' Save result:', result);

      // Test read
      const profile = await getUserProfile();
      console.log(' Profile:', profile);
    };
    setup();
  }, []);

  return <Navigation />;
}