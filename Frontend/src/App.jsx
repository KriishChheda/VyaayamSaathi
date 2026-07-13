import React, { useState } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeScreen } from './components/HomeScreen';
import { ExerciseScreen } from './components/ExerciseScreen';
import { WorkoutScreen } from './components/WorkoutScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { LandingPage } from './components/LandingPage';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import CalibrationScreen from './components/CalibrationScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Settings, HelpCircle, Shield, Bell } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const THEME_COLORS = [
  { name: 'Teal', value: '#1D9E75' },
  { name: 'Purple', value: '#534AB7' },
  { name: 'Crimson', value: '#d4183d' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' }
];

function SettingsScreen() {
  const [notificationTime, setNotificationTime] = React.useState(() => {
    return localStorage.getItem('notification_time') || "09:00";
  });
  
  const [activeTheme, setActiveTheme] = React.useState(() => {
    return localStorage.getItem('theme_color') || '#1D9E75';
  });

  const [workoutReminders, setWorkoutReminders] = React.useState(true);
  const [formFeedbackAudio, setFormFeedbackAudio] = React.useState(false);

  const handleTimeChange = async (e) => {
    const newTime = e.target.value;
    setNotificationTime(newTime);
    localStorage.setItem('notification_time', newTime);
    // Remove the last notified date so it can trigger again today if the time is changed
    localStorage.removeItem('last_notified_date');
    
    try {
      const userProfile = JSON.parse(localStorage.getItem('user_profile'));
      if (userProfile && userProfile.email) {
        await fetch('http://localhost:8000/auth/update-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userProfile.email,
              notification_time: newTime
            })
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${enabled ? 'bg-brand' : 'bg-neutral-300'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 shadow-sm ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}></div>
    </button>
  );

  return (
    <div className="w-full lg:w-3/4 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Page Heading */}
      <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-2">
        Preferences
      </p>
      <h2 className="text-xl font-semibold mb-6">Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Notifications */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                <Bell size={16} className="text-brand" />
              </div>
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Workout reminders</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get notified when it's time to train</p>
              </div>
              <ToggleSwitch enabled={workoutReminders} onToggle={() => setWorkoutReminders(!workoutReminders)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reminder Time</p>
                <p className="text-xs text-muted-foreground mt-0.5">Daily notification schedule</p>
              </div>
              <input 
                type="time" 
                value={notificationTime} 
                onChange={handleTimeChange}
                className="px-3 py-1.5 bg-neutral-50 rounded-lg border border-border/40 outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm font-medium"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Form feedback audio</p>
                <p className="text-xs text-muted-foreground mt-0.5">Voice cues during exercises</p>
              </div>
              <ToggleSwitch enabled={formFeedbackAudio} onToggle={() => setFormFeedbackAudio(!formFeedbackAudio)} />
            </div>
          </CardContent>
        </Card>

        {/* Theme Personalization */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                <Settings size={16} className="text-brand" />
              </div>
              Theme Personalization
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">Accent Color</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {THEME_COLORS.map(color => (
                    <button
                      key={color.name}
                      title={color.name}
                      onClick={() => {
                        setActiveTheme(color.value);
                        localStorage.setItem('theme_color', color.value);
                        document.documentElement.style.setProperty('--theme-color', color.value);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${activeTheme === color.value ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100' : ''}`}
                      style={{ backgroundColor: color.value }}
                    >
                      {activeTheme === color.value && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </button>
                  ))}
                  
                  {/* Custom Color Wheel Picker */}
                  <label 
                    title="Custom Color"
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer overflow-hidden relative ${!THEME_COLORS.some(c => c.value.toLowerCase() === activeTheme.toLowerCase()) ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100' : ''}`}
                    style={{ 
                      background: 'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ff8a00 45deg, #ffd600 90deg, #14ff00 135deg, #00fff0 180deg, #001aff 225deg, #ff00c8 270deg, #ff0000 360deg)'
                    }}
                  >
                    {!THEME_COLORS.some(c => c.value.toLowerCase() === activeTheme.toLowerCase()) && (
                      <div className="w-4 h-4 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center pointer-events-none shadow-sm">
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                      </div>
                    )}
                    <input 
                      type="color" 
                      value={THEME_COLORS.some(c => c.value.toLowerCase() === activeTheme.toLowerCase()) ? "#000000" : activeTheme}
                      onChange={(e) => {
                        const colorValue = e.target.value;
                        setActiveTheme(colorValue);
                        localStorage.setItem('theme_color', colorValue);
                        document.documentElement.style.setProperty('--theme-color', colorValue);
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer p-0 m-0"
                    />
                  </label>
                </div>
              </div>

              {/* Live preview swatch */}
              <div className="bg-brand/10 rounded-xl p-4 flex items-center gap-4 mt-2">
                <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white font-bold text-xs">VS</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: activeTheme }}>Active Theme Preview</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {THEME_COLORS.find(c => c.value.toLowerCase() === activeTheme.toLowerCase())?.name || 'Custom'} · {activeTheme.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="border-border/40 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                <HelpCircle size={16} className="text-neutral-600" />
              </div>
              App & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button variant="outline" className="justify-start h-auto py-3 px-4 border-border/40">
                <HelpCircle size={16} className="mr-2 text-muted-foreground shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium">Help & Support</p>
                  <p className="text-[11px] text-muted-foreground">Get assistance</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3 px-4 border-border/40">
                <Shield size={16} className="mr-2 text-muted-foreground shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium">Privacy Policy</p>
                  <p className="text-[11px] text-muted-foreground">Your data rights</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [authState, setAuthState] = useState(() => {
    return localStorage.getItem('token') ? 'authenticated' : 'landing';
  });
  const [exerciseType, setExerciseType] = useState('bicep');

  const QUOTES = [
    "The only bad workout is the one that didn't happen. Let's get to work!",
    "Push yourself, because no one else is going to do it for you.",
    "Success starts with self-discipline. Time to crush today's goals!",
    "What seems impossible today will one day become your warm-up.",
    "Don't stop when you're tired. Stop when you're done."
  ];

  React.useEffect(() => {
    const theme = localStorage.getItem('theme_color');
    if (theme) {
      document.documentElement.style.setProperty('--theme-color', theme);
    }
  }, []);

  // Check for workout reminders via interval
  React.useEffect(() => {
    if (authState !== 'authenticated') return;

    const checkAndNotify = () => {
      try {
        const savedDates = localStorage.getItem('workout_dates');
        const notifTime = localStorage.getItem('notification_time') || "09:00";
        const lastNotified = localStorage.getItem('last_notified_date');
        
        if (!savedDates) return;
        
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMin = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMin}`;
        
        const todayStr = now.toDateString();
        const parsedDates = JSON.parse(savedDates).map(d => new Date(d).toDateString());
        
        if (parsedDates.includes(todayStr) && currentTime === notifTime && lastNotified !== todayStr) {
          // Time to notify!
          const notesRaw = localStorage.getItem('workout_notes');
          let description = "Head over to the exercises tab when you're ready.";
          if (notesRaw) {
            const notes = JSON.parse(notesRaw);
            if (notes[todayStr]) {
              description = `Today's Plan: ${notes[todayStr]}`;
            }
          }
          
          const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("VyayamSaathi: Time to train!", {
              body: `${quote}\n${description}`,
            });
          }
          
          const playNotificationSound = () => {
            try {
              const AudioContext = window.AudioContext || window.webkitAudioContext;
              if (!AudioContext) return;
              const ctx = new AudioContext();
              const playChime = (freq, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
              };
              const now = ctx.currentTime;
              playChime(880.00, now, 0.5);       // A5
              playChime(1108.73, now + 0.15, 0.8); // C#6
            } catch(e) {}
          };

          playNotificationSound();

          toast.custom((t) => (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl flex gap-4 items-start w-[340px] text-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand" />
              <div className="bg-brand/20 text-brand p-2.5 rounded-full shrink-0 flex items-center justify-center mt-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-sm text-neutral-100 mb-1 leading-tight tracking-tight">Time to Train!</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed italic mb-3 pr-2">"{quote}"</p>
                <div className="bg-neutral-800/50 rounded-md p-2.5 border border-neutral-800/80">
                   <p className="text-[9px] font-bold text-brand uppercase tracking-widest mb-0.5">Today's Schedule</p>
                   <p className="text-xs text-neutral-200 font-medium line-clamp-2">{description}</p>
                </div>
              </div>
            </div>
          ), { duration: 12000 });

          localStorage.setItem('last_notified_date', todayStr);
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Check immediately and then every minute
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 60000);
    return () => clearInterval(interval);
  }, [authState]);

  const handleLogin = (userData) => {
    setAuthState('authenticated');
    setActiveTab('home');
  };

  const handleSignup = (userData) => {
    setAuthState('authenticated');
    setActiveTab('home');
  };

  const renderAuthScreens = () => {
    switch (authState) {
      case 'landing':
        return (
          <LandingPage
            onShowLogin={() => setAuthState('login')}
            onShowSignup={() => setAuthState('signup')}
          />
        );
      case 'login':
        return (
          <LoginForm
            onBack={() => setAuthState('landing')}
            onLogin={handleLogin}
            onShowSignup={() => setAuthState('signup')}
          />
        );
      case 'signup':
        return (
          <SignupForm
            onBack={() => setAuthState('landing')}
            onSignup={handleSignup}
            onShowLogin={() => setAuthState('login')}
          />
        );
      default:
        return null;
    }
  };

  const renderMainApp = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'exercises':
        return (
          <ExerciseScreen
            onStartWorkout={(type) => {
              setExerciseType(type);
              setActiveTab('workout');
            }}
            onConfigure={(type) => {
              setExerciseType(type);
              setActiveTab('calibration');
            }}
          />
        );
      case 'calibration':
        return (
          <CalibrationScreen
            exerciseType={exerciseType}
            onComplete={(thresholds) => {
              console.log('Calibration complete:', thresholds);
              setActiveTab('exercises');
            }}
            onBack={() => setActiveTab('exercises')}
          />
        );
      case 'workout':
        return <WorkoutScreen exerciseType={exerciseType} />;
      case 'profile':
        return <ProfileScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'calendar':
        return <CalendarScreen />;
      default:
        return <HomeScreen />;
    }
  };

  if (authState !== 'authenticated') {
    return (
      <div className="min-h-screen bg-background">
        <Toaster />
        {renderAuthScreens()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">
        {renderMainApp()}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
