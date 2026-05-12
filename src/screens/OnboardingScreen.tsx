import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons';
import { saveUserProfile, getUserProfile } from '../../database/db';
import { useTTS } from '../hooks/useTTS';
import { useSTT } from '../hooks/useSTT';
import { checkMicrophonePermission } from '../services/speech/stt';
import { refreshTTSLanguage } from '../services/speech/tts';

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

const QUESTIONS = [
    {
        title: "How would you describe your vision?",
        subtitle: "This helps Orbit understand your perspective.",
        placeholder: "e.g. Totally blind, low vision",
    },
    {
        title: "Which language do you prefer Orbit to speak in?",
        subtitle: "Select your primary language for interaction.",
        placeholder: "e.g. English, Hindi, Spanish",
    },
    {
        title: "Where do you spend most of your time?",
        subtitle: "Helps tailor navigation and environmental context.",
        placeholder: "e.g. At home, in the city, outdoors",
    },
    {
        title: "What tasks do you need the most help with?",
        subtitle: "Orbit will prioritize these assistances.",
        placeholder: "e.g. Reading, walking, finding objects",
    },
    {
        title: "How do you like Orbit to respond?",
        subtitle: "Choose the tone and detail of responses.",
        placeholder: "e.g. Concise, descriptive, friendly",
    },
];

const TOTAL_STEPS = QUESTIONS.length; // 5

export default function OnboardingScreen({ navigation: propNavigation }: any) {
    const hookNavigation = useNavigation<any>();
    const navigation = propNavigation || hookNavigation;
    const { speak, stop, getIsSpeaking } = useTTS();
    const { transcript, isListening, startListening, stopListening, startWakeWordDetection, getFailCount, resetFailCount } = useSTT();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState(['', '', '', '', '']);
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [wakeWordTrigger, setWakeWordTrigger] = useState(0);
    const isWakeWordActive = useRef(false);
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;

    useEffect(() => {
        const init = async () => {
            console.log('[Screen] 🚀 OnboardingScreen mounted, requesting permissions...');
            const granted = await checkMicrophonePermission();
            console.log('[Screen] 🔐 Permission granted:', granted);
            setIsInitialized(true);
        };
        init();

        return () => {
            stop();
            stopListening();
        };
    }, []);

    // Wake word detection loop — waits for TTS to finish
    useEffect(() => {
        let isMounted = true;
        let timeout: ReturnType<typeof setTimeout>;
        
        const runWakeWord = async () => {
            if (!isMounted || !isInitialized || isListening || isSaving || isWakeWordActive.current) return;
            
            // Don't start while TTS is speaking
            if (getIsSpeaking()) {
                if (isMounted) timeout = setTimeout(runWakeWord, 500);
                return;
            }

            const fails = getFailCount();
            if (fails >= 3) {
                if (isMounted) {
                    timeout = setTimeout(() => {
                        resetFailCount();
                        if (isMounted) setWakeWordTrigger(prev => prev + 1);
                    }, 10000);
                }
                return;
            }

            isWakeWordActive.current = true;
            await startWakeWordDetection(
                () => {
                    isWakeWordActive.current = false;
                    if (isMounted) {
                        speak("I'm listening", () => {
                            setTimeout(() => startListening(), 150);
                        });
                    }
                },
                () => {
                    isWakeWordActive.current = false;
                    if (isMounted) setWakeWordTrigger(prev => prev + 1);
                }
            );
        };

        if (isInitialized && !isListening && !isSaving) {
            const delay = getFailCount() > 0 ? 3000 : 1000;
            timeout = setTimeout(runWakeWord, delay);
        } else {
            isWakeWordActive.current = false;
        }

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [isListening, isInitialized, isSaving, wakeWordTrigger]);

    useEffect(() => {
        if (!isInitialized) return;
        console.log('[Screen] 🎤 Speaking welcome message...');
        const welcomeMsg = 'Welcome to Orbit. I will ask you a few questions to get started. You can say, Hey Orbit, go next, at any time to move forward after answering.';
        speak(welcomeMsg);
        return () => {
            stop();
        };
    }, [isInitialized]);

    useEffect(() => {
        if (!isInitialized) return;
        if (currentStep >= 0) {
            const question = QUESTIONS[currentStep];
            speak(`${question.title}. ${question.subtitle}`);
        }
    }, [currentStep, isInitialized]);

    useEffect(() => {
        if (transcript.trim()) {
            const lower = transcript.toLowerCase();
            // Improved voice command detection: check for keywords
            if (lower.includes('go next') || lower.includes('continue') || lower.includes('next question')) {
                console.log('[Onboarding] 🚀 Voice command detected: next');
                // Stop listener immediately to prevent transcript from leaking into next question
                stopListening();
                // Short delay to ensure state updates
                setTimeout(() => {
                    handleNext();
                }, 100);
            } else {
                updateAnswer(transcript);
            }
        }
    }, [transcript]);

    const handleMicPress = async () => {
        if (isListening) {
            await stopListening();
            return;
        }

        // Fast path: Stop current speech and start listening with a very short instruction
        await stop();
        
        // Start listening almost immediately for a faster feel
        speak('Listening', () => {
            setTimeout(() => {
                startListening();
            }, 50);
        });
    };

    const handleNext = async () => {
        // Validate: don't allow empty answers
        if (!answers[currentStep].trim()) {
            const errorMsg = "Please provide an answer before moving to the next question.";
            speak(errorMsg);
            Alert.alert('Required', errorMsg, [{ text: 'OK' }]);
            return;
        }

        if (currentStep < TOTAL_STEPS - 1) {
            // Not last step — just go to next question
            setCurrentStep(prev => prev + 1);
        } else {
            // Last step — save and navigate
            setIsSaving(true);
            try {
                const profileData = {
                    visionDescription: answers[0],
                    language: answers[1] || 'English',
                    locationContext: answers[2],
                    helpNeeded: answers[3],
                    responseStyle: answers[4],
                };
                const success = await saveUserProfile(profileData);

                if (success) {
                    // One final sync before moving on
                    await refreshTTSLanguage(profileData.language);
                    navigation.navigate('Download');
                } else {
                    Alert.alert('Oops!', 'Could not save your profile. Please try again.', [{ text: 'OK' }]);
                }
            } catch (error) {
                console.error('❌ handleNext error:', error);
                Alert.alert('Error', 'Something went wrong. Please try again.', [{ text: 'OK' }]);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const updateAnswer = async (text: string) => {
        const newAnswers = [...answers];
        newAnswers[currentStep] = text;
        setAnswers(newAnswers);

        // SYNC LANGUAGE: If this is the language question (Step 2, Index 1), sync immediately
        if (currentStep === 1 && text.trim().length > 2) {
            console.log(`[Onboarding] 🌐 Syncing language to: ${text}`);
            await refreshTTSLanguage(text);
        }
    };

    const isLastStep = currentStep === TOTAL_STEPS - 1;

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image source={require('../../assets/logo.png')} style={{ width: 36, height: 36, borderRadius: 8 }} />
                        <Text style={styles.logoText}>
                            <Text style={{ color: '#fff' }}>Orbit</Text>
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Download')}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* PROGRESS BAR — fixed to match exactly 4 steps */}
                <View style={styles.progressContainer}>
                    {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.progressBar,
                                index < currentStep && styles.progressActive,
                                index === currentStep && styles.progressCurrent,
                                index > currentStep && styles.progressInactive,
                            ]}
                        />
                    ))}
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView 
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* STEP COUNTER */}
                        <Text style={styles.stepCounter}>
                            {currentStep + 1} / {TOTAL_STEPS}
                        </Text>

                        {/* QUESTION TEXT */}
                        <View style={styles.textWrap}>
                            <Text style={styles.title}>{QUESTIONS[currentStep].title}</Text>
                            <Text style={styles.subtitle}>{QUESTIONS[currentStep].subtitle}</Text>
                        </View>

                        {/* INPUT SECTION */}
                        <View style={styles.inputCard}>
                            <TextInput
                                style={styles.input}
                                placeholder={QUESTIONS[currentStep].placeholder}
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                value={answers[currentStep]}
                                onChangeText={updateAnswer}
                                autoFocus={true}
                                multiline={true}
                            />

                            <View style={styles.micSection}>
                                <View style={styles.waveformContainer}>
                                    {[12, 18, 10, 24, 14, 20, 10, 16].map((h, i) => (
                                        <View key={i} style={[styles.waveBar, { height: h }]} />
                                    ))}
                                </View>
                                <Text style={styles.tapToSpeak}>TAP TO SPEAK</Text>
                            </View>

                            {/* MIC BUTTON IN CARD FOR BETTER RESPONSIVENESS */}
                            <View style={styles.micButtonContainer}>
                                <TouchableOpacity activeOpacity={0.8} onPress={handleMicPress}>
                                    <View style={[styles.micButton, { backgroundColor: isListening ? '#dc2626' : '#9333ea' }]}> 
                                        <SafeIcon set="Ionicons" name={isListening ? 'stop' : 'mic'} size={36} color="white" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* BOTTOM NAVIGATION */}
                <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={handleBack}
                        disabled={currentStep === 0}
                    >
                        <SafeIcon
                            set="Ionicons"
                            name="arrow-back"
                            size={24}
                            color={currentStep === 0 ? '#333' : '#fff'}
                        />
                        <Text style={[styles.navText, currentStep === 0 && { color: '#333' }]}>
                            Back
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navButton, isSaving && { opacity: 0.5 }]}
                        onPress={handleNext}
                        disabled={isSaving}
                    >
                        <Text style={styles.navText}>
                            {isSaving ? 'Saving...' : isLastStep ? 'Finish' : 'Next'}
                        </Text>
                        <SafeIcon set="Ionicons" name="arrow-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0b2b',
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 25,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        marginBottom: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    skipText: {
        color: '#aaa',
        fontSize: 18,
        fontWeight: '500',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 20,
        paddingHorizontal: 20,
    },
    progressBar: {
        height: 5,
        borderRadius: 3,
        flex: 1,
    },
    progressActive: {
        backgroundColor: '#9333ea',
    },
    progressCurrent: {
        backgroundColor: '#ec4899',
        flex: 1.5,
    },
    progressInactive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    stepCounter: {
        color: '#777',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 20,
    },
    textWrap: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        color: '#aaa',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    inputCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 28,
        paddingTop: 30,
        paddingBottom: 25,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    input: {
        color: '#fff',
        fontSize: 22,
        textAlign: 'center',
        width: '100%',
        fontWeight: '600',
        minHeight: 30,
        maxHeight: 120,
    },
    micSection: {
        marginTop: 25,
        alignItems: 'center',
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 15,
    },
    waveBar: {
        width: 3.5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    tapToSpeak: {
        color: '#777',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
    },
    micButtonContainer: {
        marginTop: 25,
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 20,
        marginTop: 'auto',
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    navText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
    },
});
