import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons';

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

export default function OnboardingScreen() {
    const navigation = useNavigation<any>();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState(['', '', '', '']);

    const handleNext = () => {
        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            navigation.navigate('Download');
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const updateAnswer = (text: string) => {
        const newAnswers = [...answers];
        newAnswers[currentStep] = text;
        setAnswers(newAnswers);
    };

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

                {/* PROGRESS BAR */}
                <View style={styles.progressContainer}>
                    {[0, 1, 2, 3, 4].map((index) => (
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
                        </View>
                    </View>

                    {/* MIC BUTTON */}
                    <View style={styles.micButtonContainer}>
                        <TouchableOpacity activeOpacity={0.8}>
                            <View style={[styles.micButton, { backgroundColor: '#9333ea' }]}>
                                <SafeIcon set="Ionicons" name="mic" size={36} color="white" />
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
                        <SafeIcon set="Ionicons" name="arrow-back" size={24} color={currentStep === 0 ? "#333" : "#fff"} />
                        <Text style={[styles.navText, currentStep === 0 && { color: '#333' }]}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={handleNext}
                    >
                        <Text style={styles.navText}>Next</Text>
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
