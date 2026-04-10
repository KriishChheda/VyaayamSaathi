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
import { CalendarScreen } from './components/CalendarScreen';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Settings, HelpCircle, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';

function SettingsScreen() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-20 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-2">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell size={20} />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Workout reminders</span>
            <button className="w-12 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>Form feedback audio</span>
            <button className="w-12 h-6 bg-gray-300 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            App Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="ghost" className="w-full justify-start">
            <HelpCircle size={16} className="mr-2" />
            Help & Support
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Shield size={16} className="mr-2" />
            Privacy Policy
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [authState, setAuthState] = useState('landing');
  const [exerciseType, setExerciseType] = useState('bicep');

  // Check for workout reminders on load/auth
  React.useEffect(() => {
    if (authState === 'authenticated') {
      try {
        const saved = localStorage.getItem('workout_dates');
        const lastNotified = localStorage.getItem('last_notified_date');
        
        if (saved) {
          const parsed = JSON.parse(saved).map(d => new Date(d));
          const today = new Date();
          const todayStr = today.toDateString();
          
          const hasWorkoutToday = parsed.some(d => d.toDateString() === todayStr);
          
          if (hasWorkoutToday && lastNotified !== todayStr) {
            // Found a workout today and haven't notified yet!
            
            // 1. Send system trigger if permission exists
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("VyayamSaathi AI", {
                body: "It's time to hit your scheduled workout today! Let's go!",
              });
            }
            
            // 2. Also show an in-app toast
            setTimeout(() => {
              toast.success('Scheduled Workout Today!', {
                 description: "You have a workout scheduled. Head over to the exercises tab when you're ready.",
                 duration: 6000,
              });
            }, 1000);

            // Mark as notified today
            localStorage.setItem('last_notified_date', todayStr);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [authState]);

  const handleLogin = () => {
    setAuthState('authenticated');
    setActiveTab('home');
  };

  const handleSignup = () => {
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
        {renderAuthScreens()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">
        {renderMainApp()}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
