import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Edit2, Pencil } from "lucide-react";

/* ── Dot accent used in section headers ─────────────────────────────────── */
function SectionLabel({ color, children }) {
  const dots = { purple: "#7F77DD", teal: "#1D9E75", amber: "#BA7517" };
  return (
    <div className="flex items-center gap-2 px-5 pt-5 pb-0">
      <span
        style={{ background: dots[color] }}
        className="w-1.5 h-1.5 rounded-full shrink-0"
      />
      <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

/* ── Individual stat tile ────────────────────────────────────────────────── */
function StatTile({ value, label, scheme }) {
  const schemes = {
    purple: { bg: "bg-[#EEEDFE]", text: "text-[#534AB7]" },
    teal: { bg: "bg-[#E1F5EE]", text: "text-[#0F6E56]" },
    amber: { bg: "bg-[#FAEEDA]", text: "text-[#854F0B]" },
    coral: { bg: "bg-[#FAECE7]", text: "text-[#993C1D]" },
  };
  const s = schemes[scheme];
  return (
    <div className={`${s.bg} rounded-lg p-3 text-center`}>
      <p className={`text-xl font-semibold ${s.text}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

/* ── Info field (view mode) ──────────────────────────────────────────────── */
function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Kriish Chheda",
    age: "20",
    height: "5'10\"",
    weight: "170 lbs",
    experience: "intermediate",
    goals: ["Muscle Building", "Strength"],
    joinDate: "January 2024",
  });

  const update = (key) => (e) => setProfile({ ...profile, [key]: e.target.value });

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

        {/* Page heading */}
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-6">
          My Profile
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">

          {/* ── LEFT ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Hero card */}
            <Card className="border-border/40 shadow-none overflow-hidden">
              {/* Coloured band */}
              <div className="h-16 bg-[#EEEDFE]" />
              <CardContent className="p-0">
                <div className="px-5 pb-5">
                  {/* Avatar sits over the band */}
                  <Avatar className="w-14 h-14 -mt-7 ring-[3px] ring-background mb-3">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback className="bg-[#7F77DD] text-[#EEEDFE] text-base font-semibold">
                      KC
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-base font-semibold">{profile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Member since {profile.joinDate}
                  </p>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#534AB7] bg-[#EEEDFE] rounded-full px-3 py-1.5 border-0 cursor-pointer hover:bg-[#AFA9EC]/40 transition-colors"
                  >
                    <Edit2 size={11} />
                    {isEditing ? "Cancel" : "Edit profile"}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Fitness goals */}
            <Card className="border-border/40 shadow-none">
              <SectionLabel color="teal">Fitness goals</SectionLabel>
              <CardContent className="px-5 pt-3 pb-5">
                <div className="flex flex-wrap gap-2">
                  {profile.goals.map((g, i) => (
                    <span
                      key={i}
                      className={`text-xs font-medium px-3 py-1 rounded-full ${i === 0
                          ? "bg-[#EEEDFE] text-[#534AB7]"
                          : "bg-[#E1F5EE] text-[#0F6E56]"
                        }`}
                    >
                      {g}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <button className="mt-3 text-xs font-medium text-[#0F6E56] bg-[#E1F5EE] rounded-full px-3 py-1.5 border-0 cursor-pointer hover:bg-[#9FE1CB]/50 transition-colors w-full">
                    Edit goals
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Experience */}
            <Card className="border-border/40 shadow-none">
              <SectionLabel color="amber">Experience level</SectionLabel>
              <CardContent className="px-5 pt-3 pb-5 space-y-3">
                <Select
                  value={profile.experience}
                  onValueChange={(v) => setProfile({ ...profile, experience: v })}
                >
                  <SelectTrigger className="text-sm border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner – New to fitness</SelectItem>
                    <SelectItem value="intermediate">Intermediate – Some experience</SelectItem>
                    <SelectItem value="advanced">Advanced – Very experienced</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Helps PerFORM customise your workout difficulty and form guidance.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Personal info */}
            <Card className="border-border/40 shadow-none">
              <SectionLabel color="purple">Personal information</SectionLabel>
              <CardContent className="px-5 pt-4 pb-5">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full name</Label>
                      <Input value={profile.name} onChange={update("name")} className="text-sm border-border/40" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Age</Label>
                        <Input value={profile.age} onChange={update("age")} className="text-sm border-border/40" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Height</Label>
                        <Input value={profile.height} onChange={update("height")} className="text-sm border-border/40" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Weight</Label>
                      <Input value={profile.weight} onChange={update("weight")} className="text-sm border-border/40" />
                    </div>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="w-full text-sm font-medium bg-[#7F77DD] hover:bg-[#534AB7] text-white rounded-lg py-2 border-0 cursor-pointer transition-colors"
                    >
                      Save changes
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
                    <InfoField label="Age" value={`${profile.age} years`} />
                    <InfoField label="Height" value={profile.height} />
                    <InfoField label="Weight" value={profile.weight} />
                    <InfoField label="Experience" value={
                      profile.experience.charAt(0).toUpperCase() + profile.experience.slice(1)
                    } />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="border-border/40 shadow-none">
              <SectionLabel color="amber">Statistics</SectionLabel>
              <CardContent className="px-5 pt-3 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatTile value="24" label="Total workouts" scheme="purple" />
                  <StatTile value="89%" label="Avg form score" scheme="teal" />
                  <StatTile value="12" label="Streak days" scheme="amber" />
                  <StatTile value="3.2k" label="Calories burned" scheme="coral" />
                </div>

                {/* Streak banner */}
                <div className="mt-4 bg-[#EEEDFE] rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#AFA9EC] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" fill="#534AB7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#3C3489]">
                      You're on a 12-day streak
                    </p>
                    <p className="text-[11px] text-[#7F77DD] mt-0.5">
                      Consistency is everything — keep going
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}