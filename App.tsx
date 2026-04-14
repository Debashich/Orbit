import React from 'react';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DownloadScreen from './src/screens/DownloadScreen';
import HomeScreen from './src/screens/HomeScreen';

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
  return <Navigation />;
}
