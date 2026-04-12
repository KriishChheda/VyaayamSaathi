import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { TrendingUp, Calendar, Target, Zap, Activity } from 'lucide-react';

export function HomeScreen() {
  const [userName, setUserName] = React.useState('Athlete');
  const [greeting, setGreeting] = React.useState('Welcome back');
  const [todaysNote, setTodaysNote] = React.useState("Ready for today's workout? Let's get moving!");

  React.useEffect(() => {
    try {
      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.name) {
           setUserName(profile.name.split(' ')[0]);
        }
      }
    } catch(e) {}

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else if (hour < 22) setGreeting('Good evening');
    else setGreeting('Late night grind');

    try {
      const notesStr = localStorage.getItem('workout_notes');
      const todayStr = new Date().toDateString();
      if (notesStr) {
        const notes = JSON.parse(notesStr);
        if (notes[todayStr]) {
          setTodaysNote(`Today's Calendar Plan: ${notes[todayStr]}`);
        }
      }
    } catch(e) {}
  }, []);

  return (
    <div className="w-full lg:w-3/4 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Page Heading */}
      <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-6">
        Dashboard
      </p>

      {/* Welcome Section */}
      <div className="bg-brand text-white rounded-[20px] p-6 lg:p-8 mb-6 shadow-md relative overflow-hidden transition-colors duration-500">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-32 h-32 rounded-full bg-black/20 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-2xl lg:text-3xl font-bold mb-2 tracking-tight">{greeting}, {userName}{greeting.includes('grind') ? '?' : '!'}</h2>
          <p className="text-white/80 mb-6 text-sm lg:text-base">{todaysNote}</p>
          <Button className="bg-white text-brand hover:bg-neutral-100 px-6 rounded-full font-semibold border-0 transition-colors">
            Start Workout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ── LEFT COLUMN ───────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/40 shadow-sm border-0 bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#534AB7]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 leading-none mb-1">24</p>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Workouts</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm border-0 bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-[#0F6E56]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 leading-none mb-1">89%</p>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Form Score</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Progress */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Today's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium">Daily Goal</span>
                  <span className="text-xs font-semibold text-muted-foreground">3 / 5 exercises</span>
                </div>
                <Progress value={60} className="h-2 bg-neutral-100" />
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium">Calories Burned</span>
                  <span className="text-xs font-semibold text-muted-foreground">247 / 400 kcal</span>
                </div>
                <Progress value={62} className="h-2 bg-neutral-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Recent Activity */}
          <Card className="border-border/40 shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[#0F6E56]" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-neutral-900">Bicep Curls</p>
                      <p className="text-[11px] sm:text-xs text-emerald-600 font-medium">95% form accuracy</p>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap">2h ago</span>
                </div>

                <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#EEEDFE] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[#534AB7]" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-neutral-900">Shoulder Press</p>
                      <p className="text-[11px] sm:text-xs text-[#534AB7] font-medium">87% form accuracy</p>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap">1d ago</span>
                </div>
              </div>

              <div className="p-4 text-center border-t border-border/40 bg-neutral-50/50 rounded-b-xl">
                <button className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors">
                  View Full History
                </button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
