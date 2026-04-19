import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons';
import { saveUserProfile } from '../../database/db';
import { useTTS } from '../hooks/useTTS';
import { useSTT } from '../hooks/useSTT';
import { checkMicrophonePermission } from '../services/speech/stt';

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
        title: "What is your height?",
        subtitle: "This helps customize your visual feedback.",
        placeholder: "e.g. 5'10 or 178cm",
    },
    {
        title: "What is your weight?",
        subtitle: "Required for accurate health and movement tracking.",
        placeholder: "e.g. 70kg or 154lbs",
    },
    {
        title: "How long have you had vision impairment?",
        subtitle: "Helps us tailor the complexity of our audio guidance.",
        placeholder: "e.g. 5 years",
    },
    {
        title: "How would you like your guidance?",
        subtitle: "Choose between detailed or concise audio descriptions.",
        placeholder: "e.g. Detailed",
    },
];

const TOTAL_STEPS = QUESTIONS.length; // 4

export default function OnboardingScreen() {
    const navigation = useNavigation<any>();
    const { speak, stop } = useTTS();
    const { transcript, isListening, startListening, stopListening } = useSTT();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState(['', '', '', '']);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const init = async () => {
            console.log('[Screen] 🚀 OnboardingScreen mounted, requesting permissions...');
            const granted = await checkMicrophonePermission();
            console.log('[Screen] 🔐 Permission granted:', granted);
        };
        init();
    }, []);

    useEffect(() => {
        console.log('[Screen] 🎤 Speaking welcome message...');
        const welcomeMsg = 'Welcome to Clara';
        console.log('[Screen] 📢 Calling speak with:', welcomeMsg);
        speak(welcomeMsg);
        return () => {
            console.log('[Screen] 🧹 Cleanup: stopping speech');
            stop();
        };
    }, [speak, stop]);

    useEffect(() => {
        if (currentStep > 0) {
            const question = QUESTIONS[currentStep];
            speak(`${question.title}. ${question.subtitle}`);
        }
    }, [currentStep]);

    useEffect(() => {
        if (transcript.trim()) {
            updateAnswer(transcript);
        }
    }, [transcript]);

    const handleMicPress = async () => {
        if (isListening) {
            await stopListening();
            return;
        }

        await stop();
        
        setTimeout(() => {
            speak('Go ahead, speak now', () => {
                console.log('[Screen] Starting to listen after TTS');
                startListening();
            });
        }, 100);
    };

    const handleNext = async () => {
        // Validate: don't allow empty answers
        if (!answers[currentStep].trim()) {
            Alert.alert('Required', 'Please enter an answer before continuing.', [{ text: 'OK' }]);
            return;
        }

        if (currentStep < TOTAL_STEPS - 1) {
            // Not last step — just go to next question
            setCurrentStep(prev => prev + 1);
        } else {
            // Last step — save and navigate
            setIsSaving(true);
            try {
                const success = await saveUserProfile({
                    height: answers[0],
                    weight: answers[1],
                    visionImpairment: answers[2],
                    guidanceType: answers[3],
                });

                if (success) {
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

    const updateAnswer = (text: string) => {
        const newAnswers = [...answers];
        newAnswers[currentStep] = text;
        setAnswers(newAnswers);
    };

    const isLastStep = currentStep === TOTAL_STEPS - 1;

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <SafeIcon set="Ionicons" name="eye" size={28} color="#d946ef" />
                        <Text style={styles.logoText}>
                            <Text style={{ color: '#fff' }}>Vision</Text>
                            <Text style={{ color: '#d946ef' }}>Voice</Text>
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
                    style={styles.content}
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
                        />

                        <View style={styles.micSection}>
                            <View style={styles.waveformContainer}>
                                {[12, 18, 10, 24, 14, 20, 10, 16].map((h, i) => (
                                    <View key={i} style={[styles.waveBar, { height: h }]} />
                                ))}
                            </View>
                            <Text style={styles.tapToSpeak}>TAP TO SPEAK</Text>
                            {!!transcript && (
                                <Text style={[styles.tapToSpeak, { marginTop: 10, color: '#d946ef' }]}>{transcript}</Text>
                            )}
                        </View>
                    </View>

                    {/* MIC BUTTON */}
                    <View style={styles.micButtonContainer}>
                        <TouchableOpacity activeOpacity={0.8} onPress={handleMicPress}>
                            <View style={[styles.micButton, { backgroundColor: isListening ? '#dc2626' : '#9333ea' }]}> 
                                <SafeIcon set="Ionicons" name={isListening ? 'stop' : 'mic'} size={36} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                {/* BOTTOM NAVIGATION */}
                <View style={styles.footer}>
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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
        marginBottom: 50,
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        color: '#aaa',
        fontSize: 18,
        textAlign: 'center',
        marginTop: 15,
        paddingHorizontal: 30,
        lineHeight: 26,
    },
    inputCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 35,
        paddingVertical: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    input: {
        color: '#fff',
        fontSize: 34,
        textAlign: 'center',
        width: '100%',
        fontWeight: '600',
    },
    micSection: {
        marginTop: 40,
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
        marginTop: 60,
    },
    micButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 40,
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