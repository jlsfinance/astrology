import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// --- 1. CONFIGURATION & BACKEND SERVICE ---

// !! DEVELOPER NOTE: Set this to false and fill in firebaseConfig to go live !!
const MOCK_MODE = true; 

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Backend Abstraction
class BackendService {
    static auth: any;
    static db: any;
    static provider: any;

    static init() {
        if (!MOCK_MODE) {
            try {
                const app = initializeApp(firebaseConfig);
                this.auth = getAuth(app);
                this.db = getFirestore(app);
                this.provider = new GoogleAuthProvider();
            } catch (e) {
                console.warn("Firebase Init Error (Expected if no keys):", e);
            }
        }
    }

    static async loginGoogle(): Promise<User | null> {
        if (MOCK_MODE) {
            // Simulate Network Delay
            await new Promise(r => setTimeout(r, 1200));
            // Return Mock Google User
            return {
                userId: 'mock_google_u1',
                name: 'Rahul Sharma',
                email: 'rahul.vedic@gmail.com',
                photoUrl: null,
                lang: 'en',
                isPremium: false,
                profiles: [] // Empty initially, triggers Onboarding
            };
        } else {
            try {
                const result = await signInWithPopup(this.auth, this.provider);
                const fbUser = result.user;
                // Check if user exists in Firestore
                const userDoc = await getDoc(doc(this.db, "users", fbUser.uid));
                
                if (userDoc.exists()) {
                    return userDoc.data() as User;
                } else {
                    // New User Structure
                    const newUser: User = {
                        userId: fbUser.uid,
                        name: fbUser.displayName || "User",
                        email: fbUser.email || "",
                        photoUrl: fbUser.photoURL,
                        lang: 'en',
                        isPremium: false,
                        profiles: []
                    };
                    await setDoc(doc(this.db, "users", fbUser.uid), newUser);
                    return newUser;
                }
            } catch (e) {
                console.error("Google Login Error", e);
                return null;
            }
        }
    }

    static async saveUser(user: User): Promise<void> {
        if (MOCK_MODE) {
            localStorage.setItem('astro_user_v3', JSON.stringify(user));
        } else {
            try {
                await setDoc(doc(this.db, "users", user.userId), user);
            } catch (e) {
                console.error("Save Error", e);
            }
        }
    }

    static async logout(): Promise<void> {
        if (MOCK_MODE) {
            localStorage.removeItem('astro_user_v3');
        } else {
            await signOut(this.auth);
        }
    }
}

// Initialize Backend
BackendService.init();


// --- 2. TYPES ---

interface UserProfile {
  profileId: string;
  relation: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  tob: string;
  pob: string;
}

interface User {
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  lang: 'en' | 'hi';
  isPremium: boolean;
  profiles: UserProfile[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loginGoogle: () => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  addProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

// Language Dictionary
const STRINGS = {
  en: {
    app_name: "AstroVeda",
    tagline: "Cosmic Intelligence",
    welcome: "Namaste",
    today_signal: "Cosmic Signal",
    get_analysis: "Get Full Analysis",
    features: "Vedic Services",
    feat_love: "Love Match",
    feat_career: "Career",
    feat_num: "Numerology",
    feat_panchang: "Panchang",
    chat_ai: "Ask AI Jyotish",
    chat_placeholder: "Ask about your future...",
    premium_title: "Go Premium",
    premium_desc: "Unlimited Chat & Detailed Reports",
    subscribe: "Subscribe Now",
    profile: "Profile",
    my_profiles: "My Profiles",
    history: "History",
    language: "Language",
    help: "Help & Support",
    logout: "Logout",
    signal_label: "Signal",
    advice_label: "Advice",
    lucky_label: "Lucky",
    loading_flash: "Consulting the stars...",
    view_report: "View Report",
    back: "Back",
    match_title: "Kundli Milan",
    check_match: "Check Compatibility",
    score: "Score",
    verdict: "Verdict",
    num_title: "Numerology",
    mulank: "Mulank",
    bhagyank: "Bhagyank",
    // Panchang
    loc_req_title: "Location Required",
    loc_req_desc: "Vedic calculations require precise coordinates for Tithi and Nakshatra timings.",
    grant_perm: "Grant Location Access",
    fetching_loc: "Locating you...",
    sunrise: "Sunrise",
    sunset: "Sunset",
    moonrise: "Moonrise",
    rahu_kal: "Rahu Kal",
    abhijit: "Abhijit",
    karan: "Karan",
    ritu: "Ritu",
    ayana: "Ayana",
    timings: "Timings",
    core_panchang: "Core Panchang",
    // Auth & Onboarding
    continue_google: "Continue with Google",
    signing_in: "Connecting to Cosmos...",
    setup_profile: "Complete Your Profile",
    setup_desc: "To generate your Kundli, we need your precise birth details.",
    save_profile: "Save & Continue",
    name: "Full Name",
    gender: "Gender",
    male: "Male",
    female: "Female",
    dob: "Date of Birth",
    tob: "Time of Birth",
    pob: "Place of Birth (City)",
    login_error: "Login failed. Please try again."
  },
  hi: {
    app_name: "एस्ट्रोवेदा",
    tagline: "ब्रह्मांडीय बुद्धि",
    welcome: "शुभ स्वागतम",
    today_signal: "आज का आकाशीय संकेत",
    get_analysis: "पूर्ण विश्लेषण प्राप्त करें",
    features: "वैदिक सेवाएं",
    feat_love: "गुण मिलान",
    feat_career: "करियर",
    feat_num: "अंक ज्योतिष",
    feat_panchang: "पंचांग",
    chat_ai: "AI ज्योतिषी से पूछें",
    chat_placeholder: "अपने भविष्य के बारे में पूछें...",
    premium_title: "प्रीमियम सदस्य बनें",
    premium_desc: "असीमित चैट और विस्तृत रिपोर्ट",
    subscribe: "अभी सब्सक्राइब करें",
    profile: "प्रोफाइल",
    my_profiles: "मेरी प्रोफाइल",
    history: "इतिहास",
    language: "भाषा",
    help: "सहायता",
    logout: "लॉग आउट",
    signal_label: "संकेत",
    advice_label: "सलाह",
    lucky_label: "शुभ रंग/अंक",
    loading_flash: "ग्रहों की गणना हो रही है...",
    view_report: "रिपोर्ट देखें",
    back: "पीछे",
    match_title: "कुंडली मिलान",
    check_match: "मिलान देखें",
    score: "गुण",
    verdict: "परिणाम",
    num_title: "अंक ज्योतिष",
    mulank: "मूलांक",
    bhagyank: "भाग्यांक",
    // Panchang
    loc_req_title: "स्थान आवश्यक है",
    loc_req_desc: "तिथि और नक्षत्र के सटीक समय के लिए आपके स्थान की आवश्यकता है।",
    grant_perm: "स्थान की अनुमति दें",
    fetching_loc: "स्थान खोजा जा रहा है...",
    sunrise: "सूर्योदय",
    sunset: "सूर्यास्त",
    moonrise: "चंद्रोदय",
    rahu_kal: "राहु काल",
    abhijit: "अभिजित",
    karan: "करण",
    ritu: "ऋतु",
    ayana: "अयन",
    timings: "महत्वपूर्ण समय",
    core_panchang: "मुख्य पंचांग",
    // Auth & Onboarding
    continue_google: "Google के साथ जारी रखें",
    signing_in: "ब्रह्मांड से जुड़ रहा है...",
    setup_profile: "अपनी प्रोफाइल पूरी करें",
    setup_desc: "आपकी कुंडली बनाने के लिए, हमें आपके सटीक जन्म विवरण की आवश्यकता है।",
    save_profile: "सहेजें और जारी रखें",
    name: "पूरा नाम",
    gender: "लिंग",
    male: "पुरुष",
    female: "महिला",
    dob: "जन्म तिथि",
    tob: "जन्म समय",
    pob: "जन्म स्थान (शहर)",
    login_error: "लॉगिन विफल रहा। कृपया पुनः प्रयास करें।"
  }
};

// --- 3. VEDIC ENGINE ---

const RASHIS = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];
const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];

class VedicEngine {
  static J2000 = 2451545.0;

  static toJulian(date: Date) { return (date.getTime() / 86400000) + 2440587.5; }
  static normalize(angle: number) { angle = angle % 360; return angle < 0 ? angle + 360 : angle; }

  static getSiderealPos(jd: number, planetId: string): number {
    const d = jd - VedicEngine.J2000;
    const ayanamsa = 23.85 + (d / 36525) * 0.01; 
    let L = 0;
    switch(planetId) {
        case 'Sun': L = 280.460 + 0.9856474 * d; break;
        case 'Moon': L = 218.316 + 13.176396 * d; break;
        case 'Mars': L = 355.433 + 0.524033 * d; break;
        case 'Mercury': L = 252.251 + 4.092334 * d; break;
        case 'Jupiter': L = 34.351 + 0.083085 * d; break;
        case 'Venus': L = 181.979 + 1.602130 * d; break;
        case 'Saturn': L = 50.077 + 0.033445 * d; break;
        case 'Rahu': L = 125.045 - 0.052954 * d; break;
        case 'Ketu': L = (125.045 - 0.052954 * d) + 180; break;
    }
    return VedicEngine.normalize(L - ayanamsa);
  }

  static calculate(dateStr: string, timeStr: string, pob: string) {
    const date = new Date(`${dateStr}T${timeStr}`);
    const jd = VedicEngine.toJulian(date);
    const sunPos = VedicEngine.getSiderealPos(jd, 'Sun');
    const hours = date.getHours() + date.getMinutes()/60;
    const offset = (hours - 6) * 15; 
    const lagnaLong = VedicEngine.normalize(sunPos + offset + 180); 
    const lagnaIndex = Math.floor(lagnaLong / 30);
    const positions = PLANETS.map((pid, idx) => {
        const long = VedicEngine.getSiderealPos(jd, pid);
        const signIndex = Math.floor(long / 30);
        let house = (signIndex - lagnaIndex + 1 + 12) % 12;
        if(house === 0) house = 12;
        return { id: idx, name: pid, long: long, sign: RASHIS[signIndex], signIndex: signIndex, house: house, degree: (long % 30).toFixed(2) };
    });
    const day = date.getDate();
    const mulank = (day % 9 === 0) ? 9 : (day % 9);
    const dateString = dateStr.replace(/-/g, '');
    let sumDate = 0;
    for (let char of dateString) sumDate += parseInt(char);
    const bhagyank = (sumDate % 9 === 0) ? 9 : (sumDate % 9);
    return { lagnaIndex, lagnaSign: RASHIS[lagnaIndex], planets: positions, details: { date: dateStr, time: timeStr, place: pob }, numerology: { mulank, bhagyank } };
  }

  static getRahuKalam(dayIndex: number) {
      const chart = ["16:30 - 18:00", "07:30 - 09:00", "15:00 - 16:30", "12:00 - 13:30", "13:30 - 15:00", "10:30 - 12:00", "09:00 - 10:30"];
      return chart[dayIndex];
  }

  static calculatePanchang(date: Date, lat: number = 0, lon: number = 0) {
    const jd = VedicEngine.toJulian(date);
    const sun = VedicEngine.getSiderealPos(jd, 'Sun');
    const moon = VedicEngine.getSiderealPos(jd, 'Moon');
    let diff = moon - sun;
    if (diff < 0) diff += 360;
    const tithiIndex = Math.floor(diff / 12) + 1;
    const nakIndex = Math.floor(moon / 13.333333);
    let sum = moon + sun;
    const yogIndex = Math.floor(sum / 13.333333) % 27;
    const karanIndex = Math.floor(diff / 6); 
    const tithis = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"];
    const yogas = ["Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
    const karanas = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna"];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const month = date.getMonth();
    let ritu = "Shishir";
    if (month >= 2 && month < 4) ritu = "Vasant (Spring)";
    else if (month >= 4 && month < 6) ritu = "Grishma (Summer)";
    else if (month >= 6 && month < 8) ritu = "Varsha (Monsoon)";
    else if (month >= 8 && month < 10) ritu = "Sharad (Autumn)";
    else if (month >= 10 && month < 12) ritu = "Hemant (Pre-Winter)";
    const ayana = (month >= 0 && month < 6) ? "Uttarayana" : "Dakshinayana";

    return {
        tithi: `${tithis[(tithiIndex - 1) % 15]}`,
        paksha: tithiIndex > 15 ? 'Krishna' : 'Shukla',
        nakshatra: NAKSHATRAS[nakIndex % 27],
        yog: yogas[yogIndex],
        karan: karanas[karanIndex % 7],
        day: days[date.getDay()],
        rahuKal: VedicEngine.getRahuKalam(date.getDay()),
        abhijit: "11:45 - 12:30",
        sunrise: "06:15 AM",
        sunset: "06:45 PM",
        moonrise: "08:20 PM",
        ritu: ritu,
        ayana: ayana,
        coordinates: { lat: lat.toFixed(2), lon: lon.toFixed(2) }
    };
  }

  static calculateMatch(k1: any, k2: any) {
    const moon1 = k1.planets.find((p:any) => p.name === 'Moon');
    const moon2 = k2.planets.find((p:any) => p.name === 'Moon');
    let score = 18; 
    if(moon1 && moon2) {
        const diff = Math.abs(moon1.long - moon2.long);
        const normalizedDiff = diff % 120;
        score = Math.floor((normalizedDiff / 120) * 31) + 5;
    }
    let verdict = "Average";
    if (score > 28) verdict = "Excellent";
    else if (score > 18) verdict = "Good";
    else if (score < 10) verdict = "Difficult";
    return { score, verdict };
  }
}

// --- 4. AUTH PROVIDER ---

const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Init Mock Check
        if (MOCK_MODE) {
            const stored = localStorage.getItem('astro_user_v3');
            if (stored) setUser(JSON.parse(stored));
            setLoading(false);
        } else {
            // Real Firebase Listener
            if (BackendService.auth) {
                 onAuthStateChanged(BackendService.auth, async (fbUser) => {
                     if (fbUser) {
                         const docRef = doc(BackendService.db, "users", fbUser.uid);
                         const snap = await getDoc(docRef);
                         if(snap.exists()) setUser(snap.data() as User);
                     } else {
                         setUser(null);
                     }
                     setLoading(false);
                 });
            } else {
                setLoading(false);
            }
        }
    }, []);

    const loginGoogle = async () => {
        const loggedInUser = await BackendService.loginGoogle();
        if (loggedInUser) {
            setUser(loggedInUser);
            if (MOCK_MODE) localStorage.setItem('astro_user_v3', JSON.stringify(loggedInUser));
        }
    };

    const logout = () => {
        BackendService.logout();
        setUser(null);
    };

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        const updated = { ...user, ...updates };
        setUser(updated);
        BackendService.saveUser(updated);
    };

    const addProfile = (profile: UserProfile) => {
        if (!user) return;
        const updatedProfiles = [...user.profiles, profile];
        updateUser({ profiles: updatedProfiles });
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, loginGoogle, logout, updateUser, addProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// --- 5. VISUAL COMPONENTS ---

const Icon = ({ name, size = 24, color = "currentColor" }: any) => {
    const icons: any = {
        star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
        chart: <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>,
        chat: <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>,
        user: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>,
        heart: <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>,
        lock: <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3 3.1-3 1.71 0 3.1 1.29 3.1 3v2z"/>,
        send: <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>,
        grid: <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z"/>,
        sun: <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.93c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L5.99 4.93zM19.41 18.34c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.41-1.41zM7.05 18.34l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0zM19.41 4.29l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0z"/>,
        moon: <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>,
        briefcase: <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>,
        crown: <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11h-14zm14 3c0 .66-.34 1.25-.86 1.6l-.24.15H6.1l-.24-.15C5.34 20.25 5 19.66 5 19v-1h14v1z"/>,
        settings: <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>,
        sparkle: <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />,
        loc: <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>,
        google: <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{display:'block'}}>{icons[name]}</svg>;
};

// --- 6. SCREENS ---

// AUTH SCREEN (Google Login)
const AuthScreen = () => {
    const { loginGoogle } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [lang, setLang] = useState<'en'|'hi'>('en');

    const s = lang === 'hi' ? STRINGS.hi : STRINGS.en;

    const handleLogin = async () => {
        setLoading(true);
        await loginGoogle();
    };

    return (
        <div className="screen-transition" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32, height: '100%'}}>
             <div className="animate-enter" style={{textAlign: 'center', marginBottom: 40}}>
                <div style={{fontSize: 64, marginBottom: 16}}>✨</div>
                <h1 className="text-display-large" style={{color: 'var(--md-sys-color-primary)', marginBottom: 8}}>{s.app_name}</h1>
                <p className="text-body-medium">{s.tagline}</p>
             </div>

             <div style={{display: 'flex', justifyContent: 'center', marginBottom: 48}}>
                 <div style={{display: 'flex', background: 'var(--md-sys-color-surface-container-high)', borderRadius: 24, padding: 4}}>
                     <button onClick={() => setLang('en')} style={{background: lang === 'en' ? 'var(--md-sys-color-primary-container)' : 'transparent', color: lang === 'en' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-background)', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'}}>English</button>
                     <button onClick={() => setLang('hi')} style={{background: lang === 'hi' ? 'var(--md-sys-color-primary-container)' : 'transparent', color: lang === 'hi' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-background)', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'}}>हिंदी</button>
                 </div>
             </div>

             <div className="animate-enter stagger-1">
                 <button onClick={handleLogin} disabled={loading} className="btn-google">
                     <Icon name="google" size={20} />
                     {loading ? s.signing_in : s.continue_google}
                 </button>
                 {MOCK_MODE && <div style={{fontSize: 10, color: 'var(--md-sys-color-primary)', textAlign: 'center', marginTop: 12, opacity: 0.7}}>* Dev Mode: Mock Login Active</div>}
             </div>
        </div>
    );
};

// ONBOARDING SCREEN
const OnboardingScreen = ({ user }: { user: User }) => {
    const { addProfile } = useContext(AuthContext);
    const [formData, setFormData] = useState({ dob: '', tob: '', pob: '', gender: 'male' as const });
    
    const s = user.lang === 'hi' ? STRINGS.hi : STRINGS.en;

    const handleSave = () => {
        if(!formData.dob || !formData.tob || !formData.pob) return;
        const newProfile: UserProfile = {
            profileId: 'p'+Date.now(),
            relation: 'self',
            name: user.name,
            gender: formData.gender,
            dob: formData.dob,
            tob: formData.tob,
            pob: formData.pob
        };
        addProfile(newProfile);
    };

    return (
        <div className="screen-transition" style={{padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%'}}>
             <h2 className="text-display-large animate-enter" style={{fontSize: 28, marginBottom: 12, color: 'var(--md-sys-color-primary)'}}>{s.setup_profile}</h2>
             <p className="text-body-medium animate-enter" style={{marginBottom: 32}}>{s.setup_desc}</p>

             <div className="animate-enter stagger-1">
                <div style={{marginBottom: 20}}>
                    <span className="text-label-small" style={{display: 'block', marginBottom: 8, marginLeft: 4}}>{s.gender}</span>
                    <div style={{display: 'flex', gap: 10}}>
                        {['male', 'female'].map((g: any) => (
                            <button key={g} type="button" onClick={() => setFormData({...formData, gender: g})} 
                                style={{
                                    flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--c-glass-border)',
                                    background: formData.gender === g ? 'var(--md-sys-color-primary-container)' : 'transparent',
                                    color: formData.gender === g ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-background)',
                                    cursor: 'pointer', fontSize: 14, fontWeight: 500
                                }}>
                                {g === 'male' ? s.male : s.female}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="input-wrapper">
                    <input className="pro-input" type="date" placeholder=" " value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} required />
                    <span className="input-label" style={{top: 8, fontSize: 12}}>{s.dob}</span>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                    <div className="input-wrapper">
                        <input className="pro-input" type="time" placeholder=" " value={formData.tob} onChange={e => setFormData({...formData, tob: e.target.value})} required />
                        <span className="input-label" style={{top: 8, fontSize: 12}}>{s.tob}</span>
                    </div>
                    <div className="input-wrapper">
                        <input className="pro-input" placeholder=" " value={formData.pob} onChange={e => setFormData({...formData, pob: e.target.value})} required />
                        <span className="input-label">{s.pob}</span>
                    </div>
                </div>

                <button onClick={handleSave} className="btn-gold" style={{marginTop: 16}}>{s.save_profile}</button>
             </div>
        </div>
    );
};

const FlashPrediction = ({ user, kundli }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const [prediction, setPrediction] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchPrediction(); }, [user.lang]);

    const fetchPrediction = async () => {
        if(!process.env.API_KEY) return;
        setLoading(true);
        try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const lang = user.lang === 'hi' ? 'Hindi' : 'English';
             const prompt = `Astrology Flash Prediction for ${user.name} (Rashi: ${kundli.lagnaSign}). Date: ${new Date().toDateString()}. Language: ${lang}. 
             Return valid JSON ONLY with keys: signal, advice, lucky. 
             Example: {"signal": "A good day for money", "advice": "Avoid anger", "lucky": "5 | Red"}`;
             const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
             });
             setPrediction(JSON.parse(response.text || '{}'));
        } catch(e) {
            setPrediction({ signal: "Planets are aligning.", advice: "Stay calm.", lucky: "1 | White" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card animate-enter stagger-1" style={{background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(0,0,0,0))', marginBottom: 20}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                 <span style={{color: 'var(--md-sys-color-primary)', fontWeight: 600, fontSize: 14, display:'flex', alignItems:'center', gap: 8}}>
                     <Icon name="sparkle" size={18} /> {strings.today_signal}
                 </span>
                 <span style={{fontSize: 10, opacity: 0.7}}>{new Date().toLocaleDateString()}</span>
            </div>
            {loading ? (
                <div style={{fontSize: 12, opacity: 0.6, fontStyle: 'italic'}}>{strings.loading_flash}</div>
            ) : prediction ? (
                <div>
                    <div style={{marginBottom: 16}}>
                        <div className="text-label-small" style={{color: 'var(--md-sys-color-secondary)', marginBottom: 4}}>{strings.signal_label}</div>
                        <div style={{fontSize: 16, fontWeight: 500}}>{prediction.signal}</div>
                    </div>
                    <div style={{display: 'flex', gap: 16}}>
                        <div style={{flex: 1}}>
                            <div className="text-label-small" style={{opacity: 0.7, marginBottom: 4}}>{strings.advice_label}</div>
                            <div style={{fontSize: 14}}>{prediction.advice}</div>
                        </div>
                        <div style={{width: 1, background: 'var(--c-glass-border)'}}></div>
                        <div style={{paddingLeft: 8}}>
                             <div className="text-label-small" style={{opacity: 0.7, marginBottom: 4}}>{strings.lucky_label}</div>
                             <div style={{fontSize: 14, fontWeight: 600, color: 'var(--md-sys-color-primary)'}}>{prediction.lucky}</div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const HomeScreen = ({ kundli, onNav, onToggleLang }: any) => {
    const { user } = useContext(AuthContext);
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;

    return (
        <div className="screen-transition">
            <div style={{padding: 24, paddingBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                    <h2 className="text-display-large" style={{fontSize: 24, color: 'var(--md-sys-color-primary)', marginBottom: 4}}>{strings.welcome}, {user.name.split(' ')[0]}</h2>
                    <p className="text-body-medium">{strings.tagline}</p>
                </div>
                <button onClick={onToggleLang} style={{
                    background: 'var(--md-sys-color-surface-container-high)', 
                    border: '1px solid var(--c-glass-border)', 
                    color: 'var(--md-sys-color-on-background)', 
                    padding: '8px 16px', 
                    borderRadius: 24, 
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s'
                }}>
                    <Icon name="settings" size={14} />
                    {user.lang === 'en' ? 'हिंदी' : 'English'}
                </button>
            </div>

            <div style={{padding: '0 20px'}}>
                <FlashPrediction user={user} kundli={kundli} />
            </div>

            <div style={{padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20}}>
                <button onClick={() => onNav('match')} className="glass-card animate-enter stagger-2" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
                    <div style={{color: '#F2B8B5', background: 'rgba(242, 184, 181, 0.1)', padding: 12, borderRadius: 50}}><Icon name="heart" size={24} /></div>
                    <div className="text-title-medium">{strings.feat_love}</div>
                </button>
                <button onClick={() => onNav('career')} className="glass-card animate-enter stagger-3" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
                    <div style={{color: '#6CD4A6', background: 'rgba(108, 212, 166, 0.1)', padding: 12, borderRadius: 50}}><Icon name="briefcase" size={24} /></div>
                    <div className="text-title-medium">{strings.feat_career}</div>
                </button>
                <button onClick={() => onNav('numerology')} className="glass-card animate-enter stagger-4" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
                    <div style={{color: '#D4AF37', background: 'rgba(212, 175, 55, 0.1)', padding: 12, borderRadius: 50}}><Icon name="grid" size={24} /></div>
                    <div className="text-title-medium">{strings.feat_num}</div>
                </button>
                <button onClick={() => onNav('panchang')} className="glass-card animate-enter stagger-4" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
                    <div style={{color: '#AECBFA', background: 'rgba(174, 203, 250, 0.1)', padding: 12, borderRadius: 50}}><Icon name="moon" size={24} /></div>
                    <div className="text-title-medium">{strings.feat_panchang}</div>
                </button>
            </div>

            <div style={{padding: '0 20px'}}>
                 <button onClick={() => onNav('chat')} className="glass-card animate-enter stagger-4" style={{width: '100%', padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(90deg, rgba(79, 55, 139, 0.3), rgba(0,0,0,0))'}}>
                     <div style={{background: 'var(--md-sys-color-primary)', padding: 12, borderRadius: '50%', color: '#1a1a1a'}}><Icon name="chat" size={24} /></div>
                     <div style={{textAlign: 'left'}}>
                         <div className="text-title-medium" style={{fontSize: 18}}>{strings.chat_ai}</div>
                         <div className="text-body-medium">{strings.chat_placeholder}</div>
                     </div>
                 </button>
            </div>
        </div>
    );
};

const PremiumScreen = ({ user, onClose }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    return (
        <div className="screen-transition" style={{padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
            <div className="animate-enter" style={{color: 'var(--md-sys-color-primary)', marginBottom: 24, display:'flex', justifyContent:'center'}}><Icon name="crown" size={80} /></div>
            <h2 className="text-display-large animate-enter stagger-1" style={{fontSize: 32, marginBottom: 12}}>{strings.premium_title}</h2>
            <p className="text-body-medium animate-enter stagger-1" style={{marginBottom: 40}}>{strings.premium_desc}</p>
            <div className="glass-card animate-enter stagger-2" style={{marginBottom: 24, textAlign: 'left', padding: 24}}>
                <div style={{marginBottom: 16, display:'flex', gap: 10}}><span style={{color: 'var(--md-sys-color-primary)'}}>✓</span> Unlimited AI Chat</div>
                <div style={{marginBottom: 16, display:'flex', gap: 10}}><span style={{color: 'var(--md-sys-color-primary)'}}>✓</span> Detailed Kundli Reports</div>
                <div style={{marginBottom: 16, display:'flex', gap: 10}}><span style={{color: 'var(--md-sys-color-primary)'}}>✓</span> Advanced Matchmaking</div>
                <div style={{display:'flex', gap: 10}}><span style={{color: 'var(--md-sys-color-primary)'}}>✓</span> Daily Remedies</div>
            </div>
            <div className="animate-enter stagger-3" style={{fontSize: 36, fontWeight: 700, color: 'var(--md-sys-color-primary)', marginBottom: 32}}>
                ₹199 <span style={{fontSize: 16, color: '#8E8E93', fontWeight: 400}}>/ Month</span>
            </div>
            <button className="btn-gold animate-enter stagger-4" onClick={onClose}>{strings.subscribe}</button>
            <button className="animate-enter stagger-4" onClick={onClose} style={{background:'none', border:'none', color: '#8E8E93', marginTop: 24, cursor:'pointer', fontSize: 14}}>Maybe Later</button>
        </div>
    );
}

const ProfileScreen = ({ user, onLogout, onChangeLang }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const MenuItem = ({ icon, label, onClick, sub, delay }: any) => (
        <div className={`animate-enter ${delay}`} onClick={onClick} style={{display: 'flex', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid var(--c-glass-border)', cursor: 'pointer'}}>
            <div style={{color: 'var(--md-sys-color-secondary)', marginRight: 20}}><Icon name={icon} size={24} /></div>
            <div style={{flex: 1}}>
                <div style={{fontSize: 16, fontWeight: 500}}>{label}</div>
                {sub && <div style={{fontSize: 12, opacity: 0.7, marginTop: 4}}>{sub}</div>}
            </div>
            <div style={{opacity: 0.3}}>→</div>
        </div>
    );
    return (
        <div className="screen-transition" style={{padding: 24}}>
            <h2 className="text-display-large" style={{marginBottom: 24, fontSize: 28}}>{strings.profile}</h2>
            <div className="glass-card animate-enter" style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, padding: 24}}>
                <div style={{width: 60, height: 60, borderRadius: '50%', background: 'var(--md-sys-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'black'}}>
                    {user.name[0]}
                </div>
                <div>
                    <div style={{fontSize: 20, fontWeight: 600}}>{user.name}</div>
                    <div style={{fontSize: 14, opacity: 0.7}}>{user.email}</div>
                </div>
            </div>
            <div className="glass-card" style={{padding: '0 24px'}}>
                <MenuItem icon="user" label={strings.my_profiles} sub={`${user.profiles.length} Profiles`} delay="stagger-1" />
                <MenuItem icon="settings" label={strings.language} sub={user.lang === 'hi' ? 'हिंदी' : 'English'} onClick={onChangeLang} delay="stagger-2" />
                <MenuItem icon="briefcase" label={strings.history} delay="stagger-3" />
                <MenuItem icon="crown" label="Subscription" sub={user.isPremium ? 'Premium Active' : 'Free Plan'} delay="stagger-3" />
                <MenuItem icon="chat" label={strings.help} delay="stagger-4" />
            </div>
            <button onClick={onLogout} className="animate-enter stagger-4" style={{width: '100%', padding: 16, marginTop: 24, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--md-sys-color-error)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 16, cursor: 'pointer', fontWeight: 600, fontSize: 16}}>
                {strings.logout}
            </button>
        </div>
    );
};

const PanchangScreen = ({ user }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [panchang, setPanchang] = useState<any>(null);

    const handleGrantLocation = () => {
        setLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setPermissionGranted(true);
                    const { latitude, longitude } = position.coords;
                    setTimeout(() => {
                        setPanchang(VedicEngine.calculatePanchang(new Date(), latitude, longitude));
                        setLoading(false);
                    }, 1200);
                },
                (error) => {
                    console.error("Error getting location", error);
                    setLoading(false);
                    alert("Location access denied. Using default coordinates.");
                    setPanchang(VedicEngine.calculatePanchang(new Date(), 0, 0));
                    setPermissionGranted(true);
                }
            );
        } else {
            setLoading(false);
            alert("Geolocation is not supported by this browser.");
        }
    };

    if (!permissionGranted && !panchang) {
        return (
            <div className="screen-transition" style={{padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', height: '100%'}}>
                 <div className="animate-enter" style={{color: 'var(--md-sys-color-primary)', marginBottom: 24, display:'flex', justifyContent:'center'}}>
                     <div style={{background: 'rgba(212, 175, 55, 0.1)', padding: 24, borderRadius: '50%'}}>
                        <Icon name="loc" size={48} />
                     </div>
                 </div>
                 <h2 className="text-display-large animate-enter stagger-1" style={{fontSize: 28, marginBottom: 12}}>{strings.loc_req_title}</h2>
                 <p className="text-body-medium animate-enter stagger-1" style={{marginBottom: 40, lineHeight: 1.6}}>{strings.loc_req_desc}</p>
                 <button className="btn-gold animate-enter stagger-2" onClick={handleGrantLocation} disabled={loading}>
                     {loading ? strings.fetching_loc : strings.grant_perm}
                 </button>
            </div>
        );
    }

    if (!panchang) return <div className="screen-transition" style={{display:'flex', justifyContent:'center', alignItems:'center'}}>Loading...</div>;

    const DetailRow = ({ label, value, highlight = false }: any) => (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--c-glass-border)'}}>
            <span style={{opacity: 0.7, fontSize: 14}}>{label}</span>
            <span style={{fontWeight: 600, fontSize: 15, color: highlight ? 'var(--md-sys-color-primary)' : 'inherit'}}>{value}</span>
        </div>
    );

    return (
        <div className="screen-transition" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
                <h2 className="text-display-large" style={{fontSize: 28, color: 'var(--md-sys-color-primary)', margin: 0}}>{strings.feat_panchang}</h2>
                <div style={{fontSize: 10, background: 'var(--md-sys-color-surface-container-high)', padding: '4px 8px', borderRadius: 8}}>
                    Lat: {panchang.coordinates.lat}°
                </div>
            </div>

             <div className="glass-card animate-enter stagger-1" style={{background: 'linear-gradient(135deg, rgba(28, 28, 34, 0.9), rgba(79, 55, 139, 0.3))', marginBottom: 16}}>
                <div style={{textAlign:'center'}}>
                     <div style={{fontSize: 14, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1}}>{new Date().toDateString()}</div>
                     <div style={{fontSize: 28, fontWeight: 600, marginTop: 8, color: 'var(--md-sys-color-on-background)'}}>{panchang.day}</div>
                     <div style={{fontSize: 14, color: 'var(--md-sys-color-primary)', marginTop: 4}}>{panchang.ritu} • {panchang.ayana}</div>
                </div>
            </div>

            <div className="text-label-small animate-enter stagger-2" style={{marginBottom: 8, marginLeft: 4, opacity: 0.7}}>{strings.core_panchang}</div>
            <div className="glass-card animate-enter stagger-2" style={{marginBottom: 20, padding: '16px 24px'}}>
                <DetailRow label={strings.tithi} value={`${panchang.tithi} (${panchang.paksha})`} />
                <DetailRow label={strings.nakshatra} value={panchang.nakshatra} />
                <DetailRow label={strings.yog} value={panchang.yog} />
                <DetailRow label={strings.karan} value={panchang.karan} />
            </div>

            <div className="glass-card animate-enter stagger-3" style={{marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center', padding: 16}}>
                <div>
                    <div style={{color: '#FDB813', marginBottom: 4}}><Icon name="sun" size={24} /></div>
                    <div style={{fontSize: 11, opacity: 0.7}}>{strings.sunrise}</div>
                    <div style={{fontWeight: 600, fontSize: 13}}>{panchang.sunrise}</div>
                </div>
                <div style={{borderLeft: '1px solid var(--c-glass-border)', borderRight: '1px solid var(--c-glass-border)'}}>
                    <div style={{color: '#F8E287', marginBottom: 4}}><Icon name="sun" size={24} /></div>
                    <div style={{fontSize: 11, opacity: 0.7}}>{strings.sunset}</div>
                    <div style={{fontWeight: 600, fontSize: 13}}>{panchang.sunset}</div>
                </div>
                <div>
                    <div style={{color: '#AECBFA', marginBottom: 4}}><Icon name="moon" size={24} /></div>
                    <div style={{fontSize: 11, opacity: 0.7}}>{strings.moonrise}</div>
                    <div style={{fontWeight: 600, fontSize: 13}}>{panchang.moonrise}</div>
                </div>
            </div>

            <div className="text-label-small animate-enter stagger-4" style={{marginBottom: 8, marginLeft: 4, opacity: 0.7}}>{strings.timings}</div>
            <div className="glass-card animate-enter stagger-4">
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--c-glass-border)'}}>
                    <div style={{display:'flex', alignItems:'center', gap: 10}}>
                        <div style={{width: 8, height: 8, borderRadius: '50%', background: '#EF4444'}}></div>
                        <span style={{opacity: 0.8, fontSize: 14}}>{strings.rahu_kal}</span>
                    </div>
                    <span style={{fontWeight: 600, fontSize: 14}}>{panchang.rahuKal}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0'}}>
                    <div style={{display:'flex', alignItems:'center', gap: 10}}>
                        <div style={{width: 8, height: 8, borderRadius: '50%', background: '#10B981'}}></div>
                        <span style={{opacity: 0.8, fontSize: 14}}>{strings.abhijit}</span>
                    </div>
                    <span style={{fontWeight: 600, fontSize: 14}}>{panchang.abhijit}</span>
                </div>
            </div>
        </div>
    );
};

const ChatScreen = ({ user }: any) => {
    const [messages, setMessages] = useState<any[]>([{role: 'model', text: "Namaste! I am your Vedic Career Guide. Ask me about job changes, business timing, or promotions."}]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        if(!input.trim() || !process.env.API_KEY) return;
        const newMsgs = [...messages, {role: 'user', text: input}];
        setMessages(newMsgs);
        setInput('');
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Vedic Astrologer for ${user.name}. Question: ${input}. Concise answer.`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setMessages([...newMsgs, {role: 'model', text: response.text || "Consulting stars..."}]);
        } catch(e) { setLoading(false); } finally { setLoading(false); }
    };

    return (
        <div className="screen-transition" style={{display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 0}}>
             <div style={{flex: 1, padding: 20, paddingBottom: 100, overflowY: 'auto'}}>
                {messages.map((m, i) => (
                    <div key={i} className="animate-enter" style={{marginBottom: 20, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', marginLeft: m.role === 'user' ? 40 : 0, marginRight: m.role === 'model' ? 40 : 0}}>
                        <div style={{
                            background: m.role === 'user' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-high)', 
                            color: m.role === 'user' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-background)',
                            padding: '16px 20px', 
                            borderRadius: m.role === 'user' ? '24px 4px 24px 24px' : '4px 24px 24px 24px', 
                            fontSize: 15,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>{m.text}</div>
                    </div>
                ))}
                <div ref={scrollRef} />
             </div>
             <div style={{position: 'absolute', bottom: 80, width: '100%', padding: 20, background: 'linear-gradient(0deg, var(--md-sys-color-background) 0%, rgba(0,0,0,0) 100%)'}}>
                <div className="glass-card" style={{padding: 8, display: 'flex', gap: 10, borderRadius: 50, alignItems: 'center'}}>
                    <input className="pro-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask..." style={{padding: '12px 20px', marginBottom: 0}} />
                    <button onClick={handleSend} style={{width: 48, height: 48, borderRadius: '50%', background: 'var(--md-sys-color-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', cursor: 'pointer'}}><Icon name="send" size={20} /></button>
                </div>
            </div>
        </div>
    );
};

const MatchmakingScreen = ({ user, userKundli }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const [partner, setPartner] = useState({ name: '', dob: '', tob: '', pob: '' });
    const [result, setResult] = useState<any>(null);
    const [analysis, setAnalysis] = useState('');

    const handleMatch = () => {
        if(!partner.dob || !partner.tob) return;
        const pKundli = VedicEngine.calculate(partner.dob, partner.tob, partner.pob || "Unknown");
        const matchRes = VedicEngine.calculateMatch(userKundli, pKundli);
        setResult({...matchRes, partnerKundli: pKundli});
    };

    const getAnalysis = async () => {
        if (!process.env.API_KEY || !result) return;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Vedic Horoscope Match: ${user.name} & ${partner.name}. Score: ${result.score}/36. Detailed compatibility report.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        setAnalysis(response.text || '');
    };

    return (
        <div className="screen-transition" style={{padding: 24}}>
            <h2 className="text-display-large" style={{color: 'var(--md-sys-color-primary)', marginBottom: 24, textAlign: 'center'}}>{strings.match_title}</h2>
            {!result ? (
                <div className="glass-card animate-enter">
                    <div className="input-wrapper"><input className="pro-input" placeholder=" " value={partner.name} onChange={e => setPartner({...partner, name: e.target.value})} /><span className="input-label">Name</span></div>
                    <div className="input-wrapper"><input className="pro-input" type="date" placeholder=" " value={partner.dob} onChange={e => setPartner({...partner, dob: e.target.value})} /><span className="input-label" style={{top: 8, fontSize: 12}}>DOB</span></div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                        <div className="input-wrapper"><input className="pro-input" type="time" placeholder=" " value={partner.tob} onChange={e => setPartner({...partner, tob: e.target.value})} /><span className="input-label" style={{top: 8, fontSize: 12}}>Time</span></div>
                        <div className="input-wrapper"><input className="pro-input" placeholder=" " value={partner.pob} onChange={e => setPartner({...partner, pob: e.target.value})} /><span className="input-label">City</span></div>
                    </div>
                    <button onClick={handleMatch} className="btn-gold"><Icon name="heart" /> {strings.check_match}</button>
                </div>
            ) : (
                <div className="animate-enter">
                    <div className="glass-card" style={{textAlign: 'center', marginBottom: 20, padding: 30}}>
                        <div className="text-label-small">{strings.score}</div>
                        <div style={{fontSize: 72, fontWeight: 700, color: result.score > 25 ? '#10B981' : 'var(--md-sys-color-primary)', margin: '16px 0'}}>{result.score}<span style={{fontSize: 24, opacity: 0.5}}>/36</span></div>
                        <div style={{fontSize: 24, fontWeight: 600}}>{result.verdict}</div>
                    </div>
                    {!analysis ? (
                        <button onClick={getAnalysis} className="btn-glass" style={{width: '100%', marginBottom: 16, justifyContent: 'center'}}><Icon name="chat" /> Analyze with AI</button>
                    ) : (
                        <div className="glass-card animate-enter"><h3 className="text-title-medium" style={{color: 'var(--md-sys-color-primary)', marginBottom: 12}}>Report</h3><div style={{fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap'}}>{analysis}</div></div>
                    )}
                    <button onClick={() => {setResult(null); setAnalysis('');}} style={{background: 'none', border: 'none', color: 'var(--md-sys-color-on-background)', width: '100%', padding: 16, cursor: 'pointer', marginTop: 10}}>Check Another</button>
                </div>
            )}
        </div>
    );
};

const NumerologyScreen = ({ user, numerology }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const [analysis, setAnalysis] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAnalysis = async () => {
            if(!process.env.API_KEY) return;
            setLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Numerology for ${user.name}. Mulank ${numerology.mulank}, Bhagyank ${numerology.bhagyank}. Career, Love, Health.`;
                const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
                setAnalysis(response.text || '');
            } catch (err) { setAnalysis("Error connecting."); } finally { setLoading(false); }
        };
        fetchAnalysis();
    }, []);

    return (
        <div className="screen-transition" style={{padding: 24}}>
             <h2 className="text-display-large" style={{color: 'var(--md-sys-color-primary)', marginBottom: 24, textAlign: 'center'}}>{strings.num_title}</h2>
             <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24}}>
                 <div className="glass-card stagger-1 animate-enter" style={{textAlign:'center', background: 'rgba(99, 102, 241, 0.1)'}}><span style={{fontSize: 56, fontWeight: 700}}>{numerology.mulank}</span><div className="text-label-small">{strings.mulank}</div></div>
                 <div className="glass-card stagger-2 animate-enter" style={{textAlign:'center', background: 'rgba(212, 175, 55, 0.1)'}}><span style={{fontSize: 56, fontWeight: 700}}>{numerology.bhagyank}</span><div className="text-label-small">{strings.bhagyank}</div></div>
             </div>
             <div className="glass-card stagger-3 animate-enter">{loading ? "Calculating..." : <div style={{fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap'}}>{analysis}</div>}</div>
        </div>
    );
};

const App = () => {
    const { isAuthenticated, user, logout, updateUser } = useContext(AuthContext);
    const [screen, setScreen] = useState('home'); 
    const [kundli, setKundli] = useState<any>(null);

    useEffect(() => {
        if (user && user.profiles && user.profiles.length > 0) {
            const p = user.profiles[0];
            const k = VedicEngine.calculate(p.dob, p.tob, p.pob);
            setKundli(k);
        }
    }, [user]);

    if (!isAuthenticated) return <AuthScreen />;
    // Check if user has completed onboarding (has at least one profile)
    if (user && user.profiles.length === 0) return <OnboardingScreen user={user} />;
    
    if (!kundli) return <div className="app-container" style={{justifyContent:'center', alignItems:'center'}}>Loading Cosmos...</div>;
    if (screen === 'premium') return <PremiumScreen user={user} onClose={() => setScreen('home')} />;

    return (
        <div style={{height: '100%', position: 'relative'}}>
            <div key={screen} style={{height: '100%'}}>
                {screen === 'home' && <HomeScreen kundli={kundli} onNav={setScreen} onToggleLang={() => updateUser({lang: user.lang === 'en' ? 'hi' : 'en'})} />}
                {screen === 'chat' && <ChatScreen user={user} />}
                {screen === 'career' && <ChatScreen user={user} />} 
                {screen === 'numerology' && <NumerologyScreen user={user} numerology={kundli.numerology} />}
                {screen === 'match' && <MatchmakingScreen user={user} userKundli={kundli} />}
                {screen === 'panchang' && <PanchangScreen user={user} />}
                {screen === 'profile' && <ProfileScreen user={user} onLogout={logout} onChangeLang={() => updateUser({lang: user.lang === 'en' ? 'hi' : 'en'})} />}
            </div>
            <div className="nav-bar">
                <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
                    <div className="nav-icon-container"><Icon name="star" size={20} /></div>
                    <span>Home</span>
                </button>
                <button className={`nav-item ${screen === 'match' ? 'active' : ''}`} onClick={() => setScreen('match')}>
                    <div className="nav-icon-container"><Icon name="heart" size={20} /></div>
                    <span>Match</span>
                </button>
                <button className={`nav-item ${screen === 'chat' ? 'active' : ''}`} onClick={() => setScreen('chat')}>
                    <div className="nav-icon-container"><Icon name="chat" size={20} /></div>
                    <span>Chat</span>
                </button>
                <button className={`nav-item ${screen === 'profile' ? 'active' : ''}`} onClick={() => setScreen('profile')}>
                    <div className="nav-icon-container"><Icon name="user" size={20} /></div>
                    <span>Profile</span>
                </button>
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <AuthProvider>
        <App />
    </AuthProvider>
);