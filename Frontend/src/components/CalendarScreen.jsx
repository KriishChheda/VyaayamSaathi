import React, { useState, useEffect } from 'react';
import { Calendar } from './ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Bell, CalendarDays, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export function CalendarScreen() {
  const [dates, setDates] = useState(() => {
    try {
      const saved = localStorage.getItem('workout_dates');
      if (saved) {
        const parsed = JSON.parse(saved).map(d => new Date(d));
        const now = new Date();
        now.setHours(0,0,0,0);
        return parsed.filter(d => d >= now);
      }
    } catch(e) {}
    return [];
  });
  
  const [notes, setNotes] = useState(() => {
    try {
      const savedNotes = localStorage.getItem('workout_notes');
      if (savedNotes) return JSON.parse(savedNotes);
    } catch(e) {}
    return {};
  });
  
  const [notificationStatus, setNotificationStatus] = useState(() => {
    if ("Notification" in window) return Notification.permission;
    return 'default';
  });

  // Sync back to local storage and backend whenever dates change
  useEffect(() => {
    localStorage.setItem('workout_dates', JSON.stringify(dates));
    
    const syncDatesToBackend = async () => {
      try {
        const userProfile = JSON.parse(localStorage.getItem('user_profile'));
        if (userProfile && userProfile.email) {
          // ensure dates exist
          if (!dates) return;
          await fetch('http://localhost:8000/auth/update-profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userProfile.email,
                workout_dates: dates.map(d => d.toISOString())
              })
          });
        }
      } catch (e) { console.error("Failed to sync dates", e); }
    };
    if (dates && dates.length >= 0) syncDatesToBackend();
  }, [dates]);

  useEffect(() => {
    localStorage.setItem('workout_notes', JSON.stringify(notes));
    
    const syncNotesToBackend = async () => {
      try {
        const userProfile = JSON.parse(localStorage.getItem('user_profile'));
        if (userProfile && userProfile.email) {
          // ensure notes exist
          if (!notes) return;
          await fetch('http://localhost:8000/auth/update-profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userProfile.email,
                workout_notes: notes
              })
          });
        }
      } catch (e) { console.error("Failed to sync notes", e); }
    };
    if (notes) syncNotesToBackend();
  }, [notes]);

  const updateNote = (date, text) => {
    setNotes(prev => ({
      ...prev,
      [date.toDateString()]: text
    }));
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error('This browser does not support desktop notification');
      return;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === 'granted') {
        toast.success("Notifications enabled!", { description: "We will remind you on your workout days." });
      }
    }
  };

  const removeDate = (dateToRemove) => {
    setDates(dates.filter(d => d.getTime() !== dateToRemove.getTime()));
    setNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[dateToRemove.toDateString()];
      return newNotes;
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">Workout Schedule</h2>
        <p className="text-muted-foreground">Select days you plan to workout to get automated reminders.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Calendar Picker */}
        <Card className="border-border/40 shadow-sm h-fit">
          <CardHeader className="pb-4">
             <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays size={20} className="text-brand" />
                Select Dates
             </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center border-t border-border/40 pt-6">
             <Calendar
               mode="multiple"
               selected={dates}
               onSelect={(selectedDates) => {
                 setDates(selectedDates || []);
               }}
               className="rounded-xl bg-white shadow-sm p-4 w-full flex justify-center"
               disabled={(date) => {
                 const today = new Date();
                 today.setHours(0,0,0,0);
                 return date < today; // Don't let them select perfectly past dates
               }}
             />
          </CardContent>
        </Card>

        {/* Right Side: Setup & List */}
        <div className="flex flex-col gap-6">
          
          <Card className="border-border/40 shadow-sm bg-neutral-950 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell size={20} className={notificationStatus === 'granted' ? 'text-brand' : 'text-yellow-400'} />
                Reminders
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Receive notifications when it's time to work out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificationStatus === 'granted' ? (
                <div className="bg-brand/20 text-brand p-3 rounded-lg text-sm font-medium border border-brand/30 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  Notifications Active
                </div>
              ) : notificationStatus === 'denied' ? (
                <div className="text-sm text-red-400 flex items-center gap-2 bg-red-400/10 p-3 rounded-lg">
                  <ShieldAlert size={16} /> Notifications blocked. Check your browser settings.
                </div>
              ) : (
                <Button 
                  onClick={requestNotifications}
                  className="w-full bg-brand hover:brightness-90 text-white"
                >
                  Enable Permissions
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm flex-1">
            <CardHeader>
               <CardTitle className="text-lg">Upcoming Workouts</CardTitle>
               <CardDescription>
                 {dates.length === 0 ? 'No upcoming workouts scheduled.' : `You have ${dates.length} workout(s) planned.`}
               </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {dates
                  .sort((a, b) => a - b)
                  .map((date, i) => (
                    <div key={i} className="flex flex-col p-3 rounded-xl border border-border/40 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex flex-col items-center justify-center text-indigo-600">
                             <span className="text-[10px] uppercase font-bold tracking-tighter leading-none">{date.toLocaleString('default', { month: 'short' })}</span>
                             <span className="text-sm font-bold leading-none mt-0.5">{date.getDate()}</span>
                          </div>
                          <div>
                             <p className="font-semibold text-sm">Workout Session</p>
                             <p className="text-xs text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeDate(date)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                           <Trash2 size={16} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={notes[date.toDateString()] || ''}
                        onChange={(e) => updateNote(date, e.target.value)}
                        placeholder="Add a workout note..."
                        className="w-full bg-transparent border-b border-dashed border-neutral-300 focus:border-brand outline-none text-sm px-1 py-1.5 transition-colors placeholder:text-neutral-400 text-neutral-700 mt-1"
                        maxLength={100}
                      />
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
