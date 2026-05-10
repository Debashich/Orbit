// ─────────────────────────────────────────
// DATABASE API — available functions:
// initDatabase()        → call once on app start
// saveUserProfile()     → save onboarding data
// getUserProfile()      → read profile anywhere
// debugPrintAllData()   → dev only, dumps all storage
// ─────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
    height: string;
    weight: string;
    visionImpairment: string;
    guidanceType: string;
    language?: string;
}

const USER_PROFILE_KEY = 'user_profile';

export async function initDatabase(): Promise<void> {
    // No setup needed for AsyncStorage
    console.log('Storage ready');
}

export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
    try {
        console.log('Saving profile...');
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
        console.log('User profile saved:', profile);
        return true;
    } catch (error) {
        console.error('Error saving user profile:', error);
        return false;
    }
}

export async function getUserProfile(): Promise<UserProfile | null> {
    try {
        const data = await AsyncStorage.getItem(USER_PROFILE_KEY);
        if (!data) return null;
        return JSON.parse(data) as UserProfile;
    } catch (error) {
        console.error('Error reading user profile:', error);
        return null;
    }
}

export async function debugPrintAllData(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const stores = await AsyncStorage.multiGet(keys);
        console.log('--- AsyncStorage Dump ---');
        stores.forEach(([key, value]) => {
            console.log(`KEY: ${key} →`, value ? JSON.parse(value) : null);
        });
        console.log('--- End of Dump ---');
    } catch (error) {
        console.error('Error during debug dump:', error);
    }
}