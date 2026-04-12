import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

export function SignupForm({ onBack, onSignup, onShowLogin }) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    height: '',
    weight: '',
    experience: '',
    goals: [],
    injuries: ''
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal) 
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      try {
        const payload = {
            ...formData,
            age: formData.age ? formData.age.toString() : null
        };
        const response = await fetch('http://localhost:8000/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Signup failed');
        }

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_profile', JSON.stringify(data.user));
        
        onSignup(data.user);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name && formData.email && formData.password;
      case 2:
        return formData.age && formData.height && formData.weight && formData.experience;
      case 3:
        return formData.goals.length > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1580983693000-5654250f64d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxmaXRuZXNzJTIwYXBwJTIwbW9iaWxlJTIwcGhvbmV8ZW58MXx8fHwxNzU1NzcyNjM1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="FormFit Signup"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-semibold mb-2">Create Account</h2>
              <p className="text-sm text-muted-foreground">Join thousands improving their fitness form</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <Separator />
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                  Or sign up with
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full">
                  <Chrome size={16} className="mr-2" />
                  Google
                </Button>
                <Button variant="outline" className="w-full">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                  Twitter
                </Button>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Tell Us About Yourself</h2>
              <p className="text-sm text-muted-foreground">This helps us personalize your experience</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  placeholder="5'10&quot;"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                placeholder="170 lbs"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fitness Experience</Label>
              <Select value={formData.experience} onValueChange={(value) => handleInputChange('experience', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner - New to fitness</SelectItem>
                  <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                  <SelectItem value="advanced">Advanced - Very experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="injuries">Any injuries or limitations? (Optional)</Label>
              <Input
                id="injuries"
                placeholder="e.g., Lower back, knee, shoulder..."
                value={formData.injuries}
                onChange={(e) => handleInputChange('injuries', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        const goalOptions = [
          'Weight Loss',
          'Muscle Building', 
          'Strength Training',
          'Endurance',
          'Flexibility',
          'Injury Prevention',
          'Sports Performance',
          'General Fitness'
        ];

        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">What Are Your Goals?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply to customize your workouts</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {goalOptions.map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleGoalToggle(goal)}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    formData.goals.includes(goal)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary hover:bg-accent'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>

            {formData.goals.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Selected goals:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.goals.map((goal) => (
                    <Badge key={goal} variant="secondary">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft size={20} />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">PF</span>
                </div>
                <span className="font-semibold">PerFORM</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {step}/{totalSteps}
            </div>
          </div>
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
          </div>
        </div>
      </div>

      <div className="px-4 py-8 max-w-md mx-auto">
        <Card>
          <CardContent className="p-6">
            {renderStep()}

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                disabled={!canProceed()}
                className="flex-1"
              >
                {step === totalSteps ? 'Complete Setup' : 'Continue'}
                {step < totalSteps && <ArrowRight size={16} className="ml-2" />}
              </Button>
            </div>

            {step === 1 && (
              <div className="text-center mt-4">
                <span className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="px-0 h-auto"
                    onClick={onShowLogin}
                  >
                    Sign in
                  </Button>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {step === 1 && (
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By creating an account, you agree to our{' '}
              <button className="text-primary hover:underline">Terms of Service</button>
              {' '}and{' '}
              <button className="text-primary hover:underline">Privacy Policy</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
