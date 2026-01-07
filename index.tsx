import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- 1. CONFIGURATION & TYPES ---

// Schema-aligned Types
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
  lang: 'en' | 'hi';
  isPremium: boolean;
  profiles: UserProfile[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (details: any) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

// Language Dictionary
const STRINGS = {
  en: {
    app_name: "AstroVeda",
    tagline: "Precision Vedic Science",
    welcome: "Namaste",
    today_signal: "Today's Cosmic Signal",
    get_analysis: "Get Full Analysis",
    features: "Vedic Services",
    feat_love: "Love Match",
    feat_career: "Career",
    feat_num: "Numerology",
    feat_panchang: "Panchang",
    chat_ai: "Chat with AI Jyotish",
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
    // Auth Strings
    login_btn: "Login",
    signup_btn: "Signup",
    name: "Full Name",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    email: "Email Address",
    pass: "Password",
    dob: "Date of Birth",
    tob: "Time of Birth",
    pob: "Place of Birth (City)",
    save_profile: "Save Profile",
    processing: "Processing...",
    auth_fail: "Invalid Email (@) or Password (>4 chars)",
    fill_all: "Please fill all birth details"
  },
  hi: {
    app_name: "एस्ट्रोवेदा",
    tagline: "सटीक वैदिक विज्ञान",
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
    // Auth Strings
    login_btn: "लॉगिन",
    signup_btn: "साइन अप",
    name: "पूरा नाम",
    gender: "लिंग",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    email: "ईमेल पता",
    pass: "पासवर्ड",
    dob: "जन्म तिथि",
    tob: "जन्म समय",
    pob: "जन्म स्थान (शहर)",
    save_profile: "प्रोफाइल सुरक्षित करें",
    processing: "प्रक्रिया जारी है...",
    auth_fail: "अमान्य ईमेल (@) या पासवर्ड (>4 अंक)",
    fill_all: "कृपया सभी जन्म विवरण भरें"
  }
};

// --- 2. ENGINE ---

const RASHIS = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];
const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

class VedicEngine {
  static J2000 = 2451545.0;

  static toJulian(date: Date) {
    return (date.getTime() / 86400000) + 2440587.5;
  }

  static normalize(angle: number) {
    angle = angle % 360;
    if (angle < 0) angle += 360;
    return angle;
  }

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
        
        return {
            id: idx,
            name: pid,
            long: long,
            sign: RASHIS[signIndex],
            signIndex: signIndex,
            house: house,
            degree: (long % 30).toFixed(2)
        };
    });

    const day = date.getDate();
    const mulank = (day % 9 === 0) ? 9 : (day % 9);
    
    const dateString = dateStr.replace(/-/g, '');
    let sumDate = 0;
    for (let char of dateString) sumDate += parseInt(char);
    const bhagyank = (sumDate % 9 === 0) ? 9 : (sumDate % 9);

    return {
        lagnaIndex,
        lagnaSign: RASHIS[lagnaIndex],
        planets: positions,
        details: { date: dateStr, time: timeStr, place: pob },
        numerology: { mulank, bhagyank }
    };
  }

  static calculatePanchang(date: Date) {
    const jd = VedicEngine.toJulian(date);
    const sun = VedicEngine.getSiderealPos(jd, 'Sun');
    const moon = VedicEngine.getSiderealPos(jd, 'Moon');

    let diff = moon - sun;
    if (diff < 0) diff += 360;
    const tithiIndex = Math.floor(diff / 12) + 1;
    const nakIndex = Math.floor(moon / 13.333333);
    let sum = moon + sun;
    const yogIndex = Math.floor(sum / 13.333333) % 27;

    const tithis = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"];
    const yogas = ["Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    return {
        tithi: `${tithis[(tithiIndex - 1) % 15]}`,
        paksha: tithiIndex > 15 ? 'Krishna' : 'Shukla',
        nakshatra: NAKSHATRAS[nakIndex % 27],
        yog: yogas[yogIndex],
        day: days[date.getDay()]
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

// --- 3. AUTH PROVIDER ---

const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('astro_user_v2');
        if (stored) setUser(JSON.parse(stored));
        setLoading(false);
    }, []);

    const updateUser = (updates: Partial<User>) => {
        if(!user) return;
        const updated = { ...user, ...updates };
        setUser(updated);
        localStorage.setItem('astro_user_v2', JSON.stringify(updated));
    }

    const login = async (email: string, pass: string) => {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => {
                // Mock Logic: Email must have @ and pass > 4 chars
                if (email.includes('@') && pass.length > 4) {
                    const mockUser: User = { 
                        userId: 'u1', 
                        name: "Rahul Sharma", 
                        email, 
                        lang: 'en',
                        isPremium: false,
                        profiles: [{
                            profileId: 'p1',
                            relation: 'self',
                            name: "Rahul Sharma",
                            gender: 'male',
                            dob: "1995-08-15",
                            tob: "10:30",
                            pob: "Mumbai"
                        }] 
                    };
                    setUser(mockUser);
                    localStorage.setItem('astro_user_v2', JSON.stringify(mockUser));
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 800);
        });
    };

    const signup = async (details: any) => {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => {
                const newUser: User = {
                    userId: 'u' + Date.now(),
                    name: details.name,
                    email: details.email,
                    lang: details.lang || 'en',
                    isPremium: false,
                    profiles: [{
                        profileId: 'p1',
                        relation: 'self',
                        name: details.name,
                        gender: details.gender,
                        dob: details.dob,
                        tob: details.tob,
                        pob: details.pob
                    }]
                };
                setUser(newUser);
                localStorage.setItem('astro_user_v2', JSON.stringify(newUser));
                resolve(true);
            }, 800);
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('astro_user_v2');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, signup, logout, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// --- 4. VISUAL COMPONENTS ---

const Icon = ({ name, size = 20, color = "currentColor" }: any) => {
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
        sparkle: <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{display:'block'}}>{icons[name]}</svg>;
};

// --- 5. SCREENS ---

// AUTH SCREEN (Wireframe 1 + 2 Concept)
const AuthScreen = ({ mode }: { mode: 'login' | 'signup' }) => {
    const { login, signup } = useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(mode === 'login');
    const [formData, setFormData] = useState({ name: '', email: '', pass: '', dob: '', tob: '', pob: '', gender: 'male', lang: 'en' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Dynamic Strings based on selection for Auth
    const s = formData.lang === 'hi' ? STRINGS.hi : STRINGS.en;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        let success = false;
        let failMsg = "";

        if (isLogin) {
            success = await login(formData.email, formData.pass);
            if (!success) {
                failMsg = s.auth_fail;
            }
        } else {
            if(!formData.dob || !formData.tob) { 
                setLoading(false); 
                setError(s.fill_all);
                return; 
            }
            success = await signup(formData);
        }
        
        if (!success) {
             setError(failMsg || "Authentication failed. Please check inputs.");
        }
        setLoading(false);
    };

    return (
        <div className="app-container" style={{justifyContent: 'center', padding: 24}}>
             <div className="animate-enter" style={{textAlign: 'center', marginBottom: 30}}>
                <h1 style={{fontSize: 32, color: 'var(--c-primary)', marginBottom: 8}}>{s.app_name}</h1>
                <p style={{letterSpacing: 2, fontSize: 12, textTransform: 'uppercase'}}>{s.tagline}</p>
             </div>

             {/* Language Toggle */}
             <div style={{display: 'flex', justifyContent: 'center', marginBottom: 20}}>
                 <div style={{display: 'flex', background: 'var(--c-surface-glass)', borderRadius: 20, padding: 4}}>
                     <button onClick={() => setFormData({...formData, lang: 'en'})} style={{background: formData.lang === 'en' ? 'var(--c-primary)' : 'transparent', color: formData.lang === 'en' ? 'black' : 'var(--c-text-muted)', border: 'none', borderRadius: 16, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer'}}>English</button>
                     <button onClick={() => setFormData({...formData, lang: 'hi'})} style={{background: formData.lang === 'hi' ? 'var(--c-primary)' : 'transparent', color: formData.lang === 'hi' ? 'black' : 'var(--c-text-muted)', border: 'none', borderRadius: 16, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer'}}>हिंदी</button>
                 </div>
             </div>

             <div className="glass-card animate-enter" style={{animationDelay: '0.1s'}}>
                 <div style={{display: 'flex', marginBottom: 24, borderBottom: '1px solid var(--c-border-glass)'}}>
                     <button onClick={() => { setIsLogin(true); setError(''); }} style={{flex: 1, padding: 12, background: 'none', border: 'none', color: isLogin ? 'var(--c-primary)' : 'var(--c-text-muted)', borderBottom: isLogin ? '2px solid var(--c-primary)' : 'none', fontWeight: 600, cursor: 'pointer'}}>{s.login_btn}</button>
                     <button onClick={() => { setIsLogin(false); setError(''); }} style={{flex: 1, padding: 12, background: 'none', border: 'none', color: !isLogin ? 'var(--c-primary)' : 'var(--c-text-muted)', borderBottom: !isLogin ? '2px solid var(--c-primary)' : 'none', fontWeight: 600, cursor: 'pointer'}}>{s.signup_btn}</button>
                 </div>

                 <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="input-wrapper">
                                <input className="pro-input" placeholder=" " value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                <span className="input-label">{s.name}</span>
                            </div>
                            <div style={{marginBottom: 20}}>
                                <span style={{fontSize: 12, color: 'var(--c-text-muted)', display: 'block', marginBottom: 8, marginLeft: 4}}>{s.gender}</span>
                                <div style={{display: 'flex', gap: 10}}>
                                    {['male', 'female'].map((g: any) => (
                                        <button key={g} type="button" onClick={() => setFormData({...formData, gender: g})} 
                                            style={{
                                                flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--c-border-glass)',
                                                background: formData.gender === g ? 'var(--c-primary-glow)' : 'rgba(255,255,255,0.03)',
                                                color: formData.gender === g ? 'var(--c-primary)' : 'var(--c-text-muted)',
                                                cursor: 'pointer', fontSize: 14
                                            }}>
                                            {g === 'male' ? s.male : s.female}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    <div className="input-wrapper">
                        <input className="pro-input" type="email" placeholder=" " value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                        <span className="input-label">{s.email}</span>
                    </div>
                    <div className="input-wrapper">
                        <input className="pro-input" type="password" placeholder=" " value={formData.pass} onChange={e => setFormData({...formData, pass: e.target.value})} required />
                        <span className="input-label">{s.pass}</span>
                    </div>
                    {!isLogin && (
                        <>
                            <div className="input-wrapper">
                                <input className="pro-input" type="date" placeholder=" " value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} required />
                                <span className="input-label" style={{top: -10, left: 12, fontSize: 12}}>{s.dob}</span>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                                <div className="input-wrapper">
                                    <input className="pro-input" type="time" placeholder=" " value={formData.tob} onChange={e => setFormData({...formData, tob: e.target.value})} required />
                                    <span className="input-label" style={{top: -10, left: 12, fontSize: 12}}>{s.tob}</span>
                                </div>
                                <div className="input-wrapper">
                                    <input className="pro-input" placeholder=" " value={formData.pob} onChange={e => setFormData({...formData, pob: e.target.value})} required />
                                    <span className="input-label">{s.pob}</span>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {error && <div style={{color: 'var(--c-danger)', textAlign: 'center', marginBottom: 16, fontSize: 13, background: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 8}}>{error}</div>}
                    
                    <button type="submit" className="btn-gold" disabled={loading}>
                        {loading ? s.processing : (isLogin ? s.login_btn : s.save_profile)}
                    </button>
                 </form>
             </div>
        </div>
    );
};

// FLASH PREDICTION (Wireframe 4)
const FlashPrediction = ({ user, kundli }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const [prediction, setPrediction] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Refresh prediction if language changes
        fetchPrediction();
    }, [user.lang]);

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
            console.error(e);
            setPrediction({ signal: "Planets are aligning.", advice: "Stay calm.", lucky: "1 | White" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card" style={{background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(0,0,0,0))', marginBottom: 20}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                 <span style={{color: 'var(--c-primary)', fontWeight: 600, fontSize: 14, display:'flex', alignItems:'center', gap: 6}}>
                     <Icon name="sparkle" size={16} /> {strings.today_signal}
                 </span>
                 <span style={{fontSize: 10, color: 'var(--c-text-muted)'}}>{new Date().toLocaleDateString()}</span>
            </div>
            
            {loading ? (
                <div style={{fontSize: 12, color: 'var(--c-text-muted)', fontStyle: 'italic'}}>{strings.loading_flash}</div>
            ) : prediction ? (
                <div>
                    <div style={{marginBottom: 12}}>
                        <div style={{fontSize: 10, textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: 2}}>{strings.signal_label}</div>
                        <div style={{fontSize: 15, fontWeight: 500}}>{prediction.signal}</div>
                    </div>
                    <div style={{display: 'flex', gap: 16}}>
                        <div style={{flex: 1}}>
                            <div style={{fontSize: 10, textTransform: 'uppercase', color: 'var(--c-text-muted)', marginBottom: 2}}>{strings.advice_label}</div>
                            <div style={{fontSize: 13}}>{prediction.advice}</div>
                        </div>
                        <div style={{borderLeft: '1px solid var(--c-border-glass)', paddingLeft: 16}}>
                             <div style={{fontSize: 10, textTransform: 'uppercase', color: 'var(--c-text-muted)', marginBottom: 2}}>{strings.lucky_label}</div>
                             <div style={{fontSize: 13, fontWeight: 600, color: 'var(--c-primary)'}}>{prediction.lucky}</div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

// HOME SCREEN (Wireframe 3)
const HomeScreen = ({ kundli, onNav, onToggleLang }: any) => {
    const { user } = useContext(AuthContext);
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;

    return (
        <div className="app-container" style={{paddingBottom: 80, overflowY: 'auto'}}>
            <div style={{padding: 24, paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                    <h2 style={{fontSize: 22, color: 'var(--c-primary)'}}>{strings.welcome}, {user.name.split(' ')[0]} 👋</h2>
                    <p style={{fontSize: 12, opacity: 0.8}}>{strings.tagline}</p>
                </div>
                {/* Language Toggle Button */}
                <button onClick={onToggleLang} style={{
                    background: 'var(--c-surface-glass)', 
                    border: '1px solid var(--c-border-glass)', 
                    color: 'var(--c-text-muted)', 
                    padding: '8px 16px', 
                    borderRadius: 20, 
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                }}>
                    <Icon name="settings" size={14} />
                    {user.lang === 'en' ? 'हिंदी' : 'English'}
                </button>
            </div>

            <div style={{padding: '0 20px'}}>
                <FlashPrediction user={user} kundli={kundli} />
            </div>

            <div style={{padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20}}>
                <button onClick={() => onNav('match')} className="glass-card" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                    <div style={{color: 'var(--c-danger)'}}><Icon name="heart" size={24} /></div>
                    <div style={{fontSize: 14, fontWeight: 600}}>{strings.feat_love}</div>
                </button>
                <button onClick={() => onNav('career')} className="glass-card" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                    <div style={{color: 'var(--c-success)'}}><Icon name="briefcase" size={24} /></div>
                    <div style={{fontSize: 14, fontWeight: 600}}>{strings.feat_career}</div>
                </button>
                <button onClick={() => onNav('numerology')} className="glass-card" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                    <div style={{color: 'var(--c-primary)'}}><Icon name="grid" size={24} /></div>
                    <div style={{fontSize: 14, fontWeight: 600}}>{strings.feat_num}</div>
                </button>
                <button onClick={() => onNav('panchang')} className="glass-card" style={{padding: 16, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                    <div style={{color: 'var(--c-accent)'}}><Icon name="moon" size={24} /></div>
                    <div style={{fontSize: 14, fontWeight: 600}}>{strings.feat_panchang}</div>
                </button>
            </div>

            <div style={{padding: '0 20px'}}>
                 <button onClick={() => onNav('chat')} className="glass-card" style={{width: '100%', padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(0,0,0,0))'}}>
                     <div style={{background: 'var(--c-accent)', padding: 10, borderRadius: '50%', color: 'white'}}><Icon name="chat" size={20} /></div>
                     <div style={{textAlign: 'left'}}>
                         <div style={{fontSize: 16, fontWeight: 600}}>{strings.chat_ai}</div>
                         <div style={{fontSize: 12, color: 'var(--c-text-muted)'}}>{strings.chat_placeholder}</div>
                     </div>
                 </button>
            </div>
        </div>
    );
};

// PREMIUM SCREEN (Wireframe 8)
const PremiumScreen = ({ user, onClose }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    
    return (
        <div className="animate-enter" style={{padding: 24, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
            <div style={{color: 'var(--c-primary)', marginBottom: 20, display:'flex', justifyContent:'center'}}><Icon name="crown" size={64} /></div>
            <h2 style={{fontSize: 28, marginBottom: 8}}>{strings.premium_title}</h2>
            <p style={{marginBottom: 40}}>{strings.premium_desc}</p>
            
            <div className="glass-card" style={{marginBottom: 20, textAlign: 'left', padding: 24}}>
                <div style={{marginBottom: 12}}>✔ Unlimited AI Chat</div>
                <div style={{marginBottom: 12}}>✔ Detailed Kundli Reports</div>
                <div style={{marginBottom: 12}}>✔ Advanced Matchmaking</div>
                <div>✔ Daily Remedies</div>
            </div>

            <div style={{fontSize: 32, fontWeight: 700, color: 'var(--c-primary)', marginBottom: 30}}>
                ₹199 <span style={{fontSize: 14, color: 'var(--c-text-muted)', fontWeight: 400}}>/ Month</span>
            </div>

            <button className="btn-gold" onClick={onClose}>{strings.subscribe}</button>
            <button onClick={onClose} style={{background:'none', border:'none', color: 'var(--c-text-muted)', marginTop: 20, cursor:'pointer'}}>Maybe Later</button>
        </div>
    );
}

// PROFILE SCREEN (Wireframe 9)
const ProfileScreen = ({ user, onLogout, onChangeLang }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    
    const MenuItem = ({ icon, label, onClick, sub }: any) => (
        <div onClick={onClick} style={{display: 'flex', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--c-border-glass)', cursor: 'pointer'}}>
            <div style={{color: 'var(--c-text-muted)', marginRight: 16}}><Icon name={icon} size={20} /></div>
            <div style={{flex: 1}}>
                <div style={{fontSize: 15}}>{label}</div>
                {sub && <div style={{fontSize: 12, color: 'var(--c-text-muted)'}}>{sub}</div>}
            </div>
            <div style={{opacity: 0.5}}>→</div>
        </div>
    );

    return (
        <div className="app-container" style={{padding: 24, overflowY: 'auto'}}>
            <h2 style={{marginBottom: 24}}>{strings.profile}</h2>
            
            <div className="glass-card" style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24}}>
                <div style={{width: 50, height: 50, borderRadius: '50%', background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'black'}}>
                    {user.name[0]}
                </div>
                <div>
                    <div style={{fontSize: 18, fontWeight: 600}}>{user.name}</div>
                    <div style={{fontSize: 12, color: 'var(--c-text-muted)'}}>{user.email}</div>
                </div>
            </div>

            <div className="glass-card" style={{padding: '0 20px'}}>
                <MenuItem icon="user" label={strings.my_profiles} sub={`${user.profiles.length} Profiles`} />
                <MenuItem icon="settings" label={strings.language} sub={user.lang === 'hi' ? 'हिंदी' : 'English'} onClick={onChangeLang} />
                <MenuItem icon="briefcase" label={strings.history} />
                <MenuItem icon="crown" label="Subscription" sub={user.isPremium ? 'Premium Active' : 'Free Plan'} />
                <MenuItem icon="chat" label={strings.help} />
            </div>

            <button onClick={onLogout} style={{width: '100%', padding: 16, marginTop: 24, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--c-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, cursor: 'pointer', fontWeight: 600}}>
                {strings.logout}
            </button>
        </div>
    );
};

const PanchangScreen = ({ user }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const [panchang, setPanchang] = useState<any>(VedicEngine.calculatePanchang(new Date()));

    return (
        <div className="app-container" style={{padding: 24, overflowY: 'auto'}}>
            <h2 style={{marginBottom: 20, color: 'var(--c-primary)'}}>{strings.feat_panchang}</h2>
             <div className="glass-card" style={{background: 'linear-gradient(135deg, rgba(5, 10, 20, 0.8), rgba(99, 102, 241, 0.1))'}}>
                <div style={{textAlign:'center', marginBottom: 20}}>
                     <div style={{fontSize: 14, color: 'var(--c-text-muted)'}}>{new Date().toDateString()}</div>
                     <div style={{fontSize: 18, fontWeight: 600}}>{panchang.day}</div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: 16}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--c-border-glass)'}}>
                        <span style={{color: 'var(--c-text-muted)'}}>{strings.tithi}</span>
                        <span style={{fontWeight: 600}}>{panchang.tithi} <span style={{fontSize: 10, opacity: 0.7}}>({panchang.paksha})</span></span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--c-border-glass)'}}>
                        <span style={{color: 'var(--c-text-muted)'}}>{strings.nakshatra}</span>
                        <span style={{fontWeight: 600}}>{panchang.nakshatra}</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0'}}>
                        <span style={{color: 'var(--c-text-muted)'}}>{strings.yog}</span>
                        <span style={{fontWeight: 600}}>{panchang.yog}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Career Chat Wrapper
const CareerChatScreen = ({ user, onBack }: any) => {
    const [messages, setMessages] = useState<any[]>([{role: 'model', text: "Namaste! I am your Vedic Career Guide. Ask me about job changes, business timing, or promotions."}]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if(!input.trim() || !process.env.API_KEY) return;
        const newMsgs = [...messages, {role: 'user', text: input}];
        setMessages(newMsgs);
        setInput('');
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Vedic Career Astrology. User: ${user.name}. Question: ${input}. Keep answer practical and astrology-based.`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setMessages([...newMsgs, {role: 'model', text: response.text || "Analyzing planetary periods..."}]);
        } catch(e) { setLoading(false); } finally { setLoading(false); }
    };

    return (
        <div className="app-container" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
             <div style={{padding: 16, borderBottom: '1px solid var(--c-border-glass)', display: 'flex', alignItems: 'center', gap: 12}}>
                 <button onClick={onBack} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>←</button>
                 <span style={{fontWeight: 600}}>Career Guidance</span>
             </div>
             <div style={{flex: 1, padding: 20, overflowY: 'auto'}}>
                {messages.map((m, i) => (
                    <div key={i} style={{marginBottom: 16, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', marginLeft: m.role === 'user' ? 40 : 0, marginRight: m.role === 'model' ? 40 : 0}}>
                        <div style={{background: m.role === 'user' ? 'var(--c-primary-glow)' : 'var(--c-surface-glass)', padding: 12, borderRadius: 12, fontSize: 14}}>{m.text}</div>
                    </div>
                ))}
             </div>
             <div style={{padding: 20, background: 'var(--c-bg-dark)', borderTop: '1px solid var(--c-border-glass)'}}>
                <div className="input-wrapper" style={{margin: 0, display: 'flex', gap: 10}}>
                    <input className="pro-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask..." style={{marginBottom: 0}} />
                    <button onClick={handleSend} className="btn-gold" style={{width: 60, borderRadius: 12}}><Icon name="send" /></button>
                </div>
            </div>
        </div>
    );
};

// Chat Screen (General)
const ChatScreen = ({ user }: any) => {
    const [messages, setMessages] = useState<any[]>([{role: 'model', text: "Ask me anything about your Kundli, Life, or Future."}]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

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
        <div className="app-container" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
             <div style={{flex: 1, padding: 20, overflowY: 'auto', paddingBottom: 100}}>
                {messages.map((m, i) => (
                    <div key={i} style={{marginBottom: 16, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', marginLeft: m.role === 'user' ? 40 : 0, marginRight: m.role === 'model' ? 40 : 0}}>
                        <div style={{background: m.role === 'user' ? 'var(--c-primary-glow)' : 'var(--c-surface-glass)', padding: 12, borderRadius: 12, fontSize: 14}}>{m.text}</div>
                    </div>
                ))}
             </div>
             <div style={{padding: 20, paddingBottom: 90, background: 'var(--c-bg-dark)', borderTop: '1px solid var(--c-border-glass)'}}>
                <div className="input-wrapper" style={{margin: 0, display: 'flex', gap: 10}}>
                    <input className="pro-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask..." style={{marginBottom: 0}} />
                    <button onClick={handleSend} className="btn-gold" style={{width: 60, borderRadius: 12}}><Icon name="send" /></button>
                </div>
            </div>
        </div>
    );
};

// Matchmaking Screen (Re-used)
const MatchmakingScreen = ({ user, userKundli }: any) => {
    const strings = STRINGS[user.lang || 'en'] || STRINGS.en;
    const [partner, setPartner] = useState({ name: '', dob: '', tob: '', pob: '' });
    const [result, setResult] = useState<any>(null);
    const [analysis, setAnalysis] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    const handleMatch = () => {
        if(!partner.dob || !partner.tob) return;
        const pKundli = VedicEngine.calculate(partner.dob, partner.tob, partner.pob || "Unknown");
        const matchRes = VedicEngine.calculateMatch(userKundli, pKundli);
        setResult({...matchRes, partnerKundli: pKundli});
    };

    const getAnalysis = async () => {
        if (!process.env.API_KEY || !result) return;
        setAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Vedic Horoscope Match: ${user.name} & ${partner.name}. Score: ${result.score}/36. Detailed compatibility report.`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setAnalysis(response.text || '');
        } catch (e) { setAnalysis("Error generating report."); } finally { setAnalyzing(false); }
    };

    return (
        <div className="app-container" style={{padding: 24, overflowY: 'auto', paddingBottom: 100}}>
            <h2 style={{color: 'var(--c-primary)', marginBottom: 20, textAlign: 'center'}}>{strings.match_title}</h2>
            
            {!result ? (
                <div className="glass-card animate-enter">
                    <div className="input-wrapper"><input className="pro-input" placeholder=" " value={partner.name} onChange={e => setPartner({...partner, name: e.target.value})} /><span className="input-label">Name</span></div>
                    <div className="input-wrapper"><input className="pro-input" type="date" placeholder=" " value={partner.dob} onChange={e => setPartner({...partner, dob: e.target.value})} /><span className="input-label" style={{top: -10, left: 12, fontSize: 12}}>DOB</span></div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                        <div className="input-wrapper"><input className="pro-input" type="time" placeholder=" " value={partner.tob} onChange={e => setPartner({...partner, tob: e.target.value})} /><span className="input-label" style={{top: -10, left: 12, fontSize: 12}}>Time</span></div>
                        <div className="input-wrapper"><input className="pro-input" placeholder=" " value={partner.pob} onChange={e => setPartner({...partner, pob: e.target.value})} /><span className="input-label">City</span></div>
                    </div>
                    <button onClick={handleMatch} className="btn-gold"><Icon name="heart" /> {strings.check_match}</button>
                </div>
            ) : (
                <div className="animate-enter">
                    <div className="glass-card" style={{textAlign: 'center', marginBottom: 20, padding: 30}}>
                        <div style={{fontSize: 14, color: 'var(--c-text-muted)', textTransform: 'uppercase'}}>{strings.score}</div>
                        <div style={{fontSize: 64, fontWeight: 700, color: result.score > 25 ? 'var(--c-success)' : 'var(--c-primary)', lineHeight: 1, margin: '16px 0'}}>{result.score}<span style={{fontSize: 24, opacity: 0.5}}>/36</span></div>
                        <div style={{fontSize: 20, fontWeight: 600}}>{result.verdict}</div>
                    </div>
                    {!analysis ? (
                        <button onClick={getAnalysis} className="btn-glass" style={{width: '100%', marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 8}}>{analyzing ? "Analyzing..." : <><Icon name="chat" /> Analyze with AI</>}</button>
                    ) : (
                        <div className="glass-card animate-enter"><h3 style={{fontSize: 16, color: 'var(--c-primary)', marginBottom: 12}}>Report</h3><div style={{fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap'}}>{analysis}</div></div>
                    )}
                    <button onClick={() => {setResult(null); setAnalysis('');}} style={{background: 'none', border: 'none', color: 'var(--c-text-muted)', width: '100%', padding: 16, cursor: 'pointer', marginTop: 10}}>Check Another</button>
                </div>
            )}
        </div>
    );
};

// Numerology Screen (Re-used)
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
        <div className="app-container" style={{padding: 24, overflowY: 'auto', paddingBottom: 100}}>
             <h2 style={{color: 'var(--c-primary)', marginBottom: 20, textAlign: 'center'}}>{strings.num_title}</h2>
             <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24}}>
                 <div className="glass-card" style={{textAlign:'center', background: 'rgba(99, 102, 241, 0.1)'}}><span style={{fontSize: 48, fontWeight: 700}}>{numerology.mulank}</span><div style={{fontSize: 12}}>{strings.mulank}</div></div>
                 <div className="glass-card" style={{textAlign:'center', background: 'rgba(212, 175, 55, 0.1)'}}><span style={{fontSize: 48, fontWeight: 700}}>{numerology.bhagyank}</span><div style={{fontSize: 12}}>{strings.bhagyank}</div></div>
             </div>
             <div className="glass-card">{loading ? "Calculating..." : <div style={{fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap'}}>{analysis}</div>}</div>
        </div>
    );
};

const App = () => {
    const { isAuthenticated, user, logout, updateUser } = useContext(AuthContext);
    const [screen, setScreen] = useState('home'); // home, chat, match, numerology, career, panchang, profile, premium
    const [kundli, setKundli] = useState<any>(null);

    useEffect(() => {
        if (user && user.profiles.length > 0) {
            // Default to first profile for now
            const p = user.profiles[0];
            const k = VedicEngine.calculate(p.dob, p.tob, p.pob);
            setKundli(k);
        }
    }, [user]);

    if (!isAuthenticated) return <AuthScreen mode="login" />;
    if (!kundli) return <div className="app-container" style={{justifyContent:'center', alignItems:'center'}}>Loading Cosmos...</div>;

    if (screen === 'premium') return <PremiumScreen user={user} onClose={() => setScreen('home')} />;

    return (
        <div style={{height: '100%', position: 'relative'}}>
            {screen === 'home' && <HomeScreen kundli={kundli} onNav={setScreen} onToggleLang={() => updateUser({lang: user.lang === 'en' ? 'hi' : 'en'})} />}
            {screen === 'chat' && <ChatScreen user={user} />}
            {screen === 'career' && <CareerChatScreen user={user} onBack={() => setScreen('home')} />}
            {screen === 'numerology' && <NumerologyScreen user={user} numerology={kundli.numerology} />}
            {screen === 'match' && <MatchmakingScreen user={user} userKundli={kundli} />}
            {screen === 'panchang' && <PanchangScreen user={user} />}
            {screen === 'profile' && <ProfileScreen user={user} onLogout={logout} onChangeLang={() => updateUser({lang: user.lang === 'en' ? 'hi' : 'en'})} />}
            
            {/* Bottom Navigation */}
            <div className="nav-bar">
                <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
                    <Icon name="star" />
                    <span>Home</span>
                </button>
                <button className={`nav-item ${screen === 'match' ? 'active' : ''}`} onClick={() => setScreen('match')}>
                    <Icon name="heart" />
                    <span>Match</span>
                </button>
                <button className={`nav-item ${screen === 'chat' ? 'active' : ''}`} onClick={() => setScreen('chat')}>
                    <Icon name="chat" />
                    <span>Chat</span>
                </button>
                <button className={`nav-item ${screen === 'profile' ? 'active' : ''}`} onClick={() => setScreen('profile')}>
                    <Icon name="user" />
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