import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowUp, ArrowRight, RotateCcw, Zap, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import bicep from '../assets/bicep.png';
import squats from '../assets/squats.png';
import shoulderPress from '../assets/shoulder-press.png';
import lunges from '../assets/lunges.png';

export function ExerciseScreen({ onStartWorkout }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (index) => {
    setExpandedId(expandedId === index ? null : index);
  };

  const exercises = [
    {
      name: 'Bicep Curls',
      category: 'Arms',
      difficulty: 'Beginner',
      duration: '3-5 min',
      icon: bicep,
      color: 'bg-blue-500',
      exerciseType: 'bicep',
      available: true,
      details: {
        history: 'Originating in the late 19th century, the bicep curl became a staple in physical culture and bodybuilding, popularized by icons like Larry Scott.',
        advantages: ['Builds isolated arm strength', 'Improves grip strength', 'Highly accessible and easy to learn'],
        disadvantages: ['Can cause elbow strain if overtrained', 'Does not significantly boost overall systemic strength'],
        dos: ['Keep elbows pinned to your torso', 'Squeeze the muscle at the top of the movement', 'Control the lowering phase'],
        donts: ['Use momentum or swing your lower back', 'Drop the weight quickly', 'Flare elbows outward']
      }
    },
    {
      name: 'Squats',
      category: 'Legs',
      difficulty: 'Beginner',
      duration: '4-6 min',
      icon: squats,
      color: 'bg-orange-500',
      exerciseType: 'squat',
      available: true,
      details: {
        history: 'The squat is a fundamental movement pattern tracing back to early human history, formalized into strength training during the early 20th century.',
        advantages: ['Builds massive lower body strength', 'Improves core stability', 'Enhances flexibility and mobility'],
        disadvantages: ['Risk of lower back or knee injury with poor form', 'Demands high central nervous system recovery'],
        dos: ['Keep your chest up and back straight', 'Drive through your heels', 'Break parallel if mobility allows'],
        donts: ['Let your knees cave inward', 'Round your lower back (butt wink)', 'Lift your heels off the ground']
      }
    },
    {
      name: 'Shoulder Press',
      category: 'Shoulders',
      difficulty: 'Intermediate',
      duration: '4-6 min',
      icon: shoulderPress,
      color: 'bg-orange-500',
      exerciseType: 'shoulder_press',
      available: true,
      details: {
        history: 'Originally contested as the "clean and press" in Olympic weightlifting until 1972, it remains the ultimate test of upper body pushing strength.',
        advantages: ['Develops robust shoulder caps', 'Strengthens triceps and upper chest', 'Improves vertical pressing power'],
        disadvantages: ['Can impinge shoulder joints without proper mobility', 'Easy to cheat with excessive back arching'],
        dos: ['Brace your core before lifting', 'Press the weight directly overhead', 'Keep wrists relatively straight'],
        donts: ['Arch your lower back excessively', 'Use momentum from your legs (unless push pressing)', 'Press out in front of your body']
      }
    },
    {
      name: 'Lunges',
      category: 'Legs',
      difficulty: 'Intermediate',
      duration: '4-6 min',
      icon: lunges,
      color: 'bg-indigo-500',
      exerciseType: 'lunge',
      available: true,
      details: {
        history: 'A classic unilateral movement utilized by athletes across centuries for balance and strength, originating from fencing and martial arts stances.',
        advantages: ['Corrects strength imbalances between legs', 'Improves balance and coordination', 'Recruits glutes and hamstrings effectively'],
        disadvantages: ['Can be harsh on the knees for some individuals', 'Requires significant balance'],
        dos: ['Keep your torso upright', 'Lower your back knee close to the ground', 'Step far enough to maintain 90-degree angles'],
        donts: ['Let your front knee cave inward', 'Slam your back knee into the floor', 'Take steps that are too narrow width-wise']
      }
    },
    {
      name: 'Hammer Curls',
      category: 'Arms',
      difficulty: 'Intermediate',
      duration: '3-5 min',
      icon: RotateCcw,
      color: 'bg-red-500',
      exerciseType: 'hammer',
      available: true,
      details: {
        history: 'Named for the grip that mimics holding a hammer, it targets the brachialis muscle to push the bicep up, enhancing overall arm size.',
        advantages: ['Targets the brachioradialis effectively', 'Improves wrist stability', 'Less stressful on the wrist than supinated curls'],
        disadvantages: ['Limited range of motion compared to traditional curls', 'Easy to use excessive weight and cheat'],
        dos: ['Maintain a neutral grip throughout the movement', 'Keep elbows stationary at your sides', 'Control the eccentric phase'],
        donts: ['Turn your wrists during the curl', 'Use body momentum to swing the weight', 'Shrug your shoulders upwards']
      }
    },
    {
      name: 'Front Raises',
      category: 'Shoulders',
      difficulty: 'Beginner',
      duration: '2-4 min',
      icon: Zap,
      color: 'bg-cyan-500',
      exerciseType: 'front_raise',
      available: true,
      details: {
        history: 'An isolation exercise popularized by bodybuilders looking to carve out detail and separation in the anterior deltoid.',
        advantages: ['Directly isolates the anterior (front) deltoid', 'Easy to learn and execute', 'Requires minimal equipment'],
        disadvantages: ['Front delts are often already overworked from pressing', 'Can cause impingement if lifted too high'],
        dos: ['Lift with a slight bend in the elbow', 'Raise the weight to shoulder level', 'Keep your core braced'],
        donts: ['Swing the weight up using momentum', 'Lean back excessively', 'Lift significantly above shoulder level']
      }
    },
  ];

  const categories = ['All', 'Arms', 'Shoulders', 'Chest', 'Back', 'Legs'];

  const filtered =
    activeCategory === 'All'
      ? exercises
      : exercises.filter(e => e.category === activeCategory);

  return (
    <div className="w-full lg:w-3/4 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">Choose Exercise</h2>
        <p className="text-muted-foreground">Select an exercise to start your AI-guided workout</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={category === activeCategory ? 'default' : 'secondary'}
            className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Exercise List */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        {filtered.map((exercise, index) => {
          const Icon = exercise.icon;
          const isExpanded = expandedId === index;

          return (
            <Card
              key={index}
              className={`transition-all duration-200 border-border/40 shadow-sm ${exercise.available ? 'hover:shadow-md' : 'opacity-60'} overflow-hidden`}
            >
              <CardContent className="p-0">
                <div 
                  className={`p-4 sm:p-5 flex items-center gap-3 sm:gap-4 ${exercise.available ? 'cursor-pointer' : ''}`}
                  onClick={() => exercise.available && toggleExpand(index)}
                >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 ${exercise.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner`}>
                    {typeof exercise.icon === 'string' ? (
                      <img src={exercise.icon} alt={exercise.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-sm" />
                    ) : (
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-semibold text-base sm:text-lg tracking-tight">{exercise.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{exercise.category} • {exercise.duration}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {exercise.difficulty}
                      </Badge>
                      {!exercise.available && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs flex items-center gap-1 bg-neutral-100">
                          <Lock size={10} /> Coming Soon
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-4 ml-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (exercise.available) onStartWorkout(exercise.exerciseType);
                      }}
                      disabled={!exercise.available}
                      size="sm"
                      className={exercise.available ? 'bg-[#030213] hover:bg-neutral-800 text-white rounded-full px-4' : 'rounded-full px-4'}
                    >
                      {exercise.available ? 'Start' : 'Soon'}
                    </Button>
                    
                    {exercise.available && (
                      <button 
                        className="p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 rounded-full transition-colors flex-shrink-0"
                        aria-label="Toggle Details"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && exercise.available && (
                  <div className="px-5 pb-6 pt-4 border-t border-border/40 bg-neutral-50/30">
                    <div className="text-sm text-muted-foreground mb-6 leading-relaxed bg-white p-4 rounded-xl border border-border/40 shadow-sm">
                      <strong className="text-neutral-900">History & Origin: </strong>
                      {exercise.details.history}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-2">
                      {/* Left Column: Pros & Cons */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#0F6E56] mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" /> Advantages
                          </h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5 marker:text-[#1D9E75]/40">
                            {exercise.details.advantages.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#993C1D] mb-3 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#D4183D]" /> Disadvantages
                          </h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5 marker:text-[#D4183D]/40">
                            {exercise.details.disadvantages.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      </div>

                       {/* Right Column: Dos & Donts */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#534AB7] mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#7F77DD]" /> Do's
                          </h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5 marker:text-[#7F77DD]/40">
                            {exercise.details.dos.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#854F0B] mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#BA7517]" /> Dont's
                          </h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5 marker:text-[#BA7517]/40">
                            {exercise.details.donts.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
