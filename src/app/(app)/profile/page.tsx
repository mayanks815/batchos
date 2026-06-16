'use client';

import React, { useState } from 'react';
import { useBatch } from '@/store/BatchContext';
import { useAuth } from '@/store/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { SUBJECT_OPTIONS } from '@/lib/subjectOptions';
import { 
  User, 
  Shield, 
  GraduationCap, 
  Settings, 
  Mail, 
  RefreshCw, 
  CheckCircle, 
  Smartphone, 
  LogOut,
  BookOpen,
  Trash2,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function ProfilePage() {
  const { profile, updateProfile } = useBatch();
  const { user, userData, logout, updateUserSubjects } = useAuth();
  
  // Navigation State Tab
  const [activeTab, setActiveTab] = useState<'credentials' | 'subjects'>('credentials');

  // Local form states for credentials
  const [name, setName] = useState(userData?.name || user?.displayName || profile.name);
  const [specialization, setSpecialization] = useState(profile.specialization);
  const [gpa, setGpa] = useState(profile.gpa);
  const [email, setEmail] = useState(userData?.email || user?.email || profile.email);
  const [saved, setSaved] = useState(false);

  // My Subjects states
  const enrolledSubjects = userData?.subjects || [];

  // Sync state if user resolves late
  React.useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setEmail(userData.email || '');
    } else if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user, userData]);

  // Pref States
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, specialization, gpa, email });
    
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { name });
      } catch (err) {
        console.error('Failed to sync name to Firestore:', err);
      }
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetData = () => {
    if (confirm("Resetting will clear all task modifications, attendance edits, resources shared, and custom profiles back to default settings. Are you sure?")) {
      localStorage.clear();
      window.location.reload();
    }
  };



  return (
    <div className="space-y-6">
      
      {/* Visual profile details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card Summary */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 backdrop-blur-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500" />
          
          {/* Avatar container */}
          <div className="w-20 h-20 rounded-2xl bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/15 mb-4 mt-2">
            <User className="w-10 h-10 text-indigo-400" />
          </div>

          <h3 className="text-base font-extrabold text-slate-100 leading-snug">{userData?.name || profile.name}</h3>
          <div className="flex flex-col items-center gap-1 mt-1">
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">{userData?.rollNumber || profile.rollNo}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
              {userData?.role || 'student'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 w-full border-t border-slate-850 pt-5 mt-5">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-[9px] text-slate-500 font-bold block uppercase leading-none mb-1">Section</span>
              <span className="text-xs font-bold text-slate-200">{userData?.section || profile.section}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-[9px] text-slate-500 font-bold block uppercase leading-none mb-1">CGPA</span>
              <span className="text-xs font-bold text-slate-200">{profile.gpa.split('/')[0]} / 4.0</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl w-full flex items-center gap-2">
            <GraduationCap className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-400 leading-tight text-left">
              Specialized in <strong className="text-slate-350">{profile.specialization}</strong>
            </span>
          </div>

          {/* Enrolled Subjects badges list */}
          <div className="w-full mt-4 pt-4 border-t border-slate-850 text-left">
            <span className="text-[9px] text-slate-500 font-bold block uppercase leading-none mb-2 select-none">Enrolled Subjects</span>
            <div className="flex flex-wrap gap-1.5">
              {enrolledSubjects.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic leading-none py-1">No subjects assigned</span>
              ) : (
                enrolledSubjects.map((sub, idx) => (
                  <span 
                    key={idx} 
                    className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 leading-relaxed"
                  >
                    {sub}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Log Out Button */}
          <button
            onClick={logout}
            className="w-full mt-4 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-450 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>

        {/* Profile Editor Details with Toggleable Tabs */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/50 border border-slate-800 p-5 backdrop-blur-sm">
          {/* Tab Selection */}
          <div className="flex items-center gap-2 border-b border-slate-850 pb-4 mb-5">
            <button
              onClick={() => setActiveTab('credentials')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
            >
              Credentials
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
            >
              My Subjects
            </button>
          </div>

          {activeTab === 'credentials' ? (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 select-none">
                <Settings className="w-4 h-4 text-indigo-400" /> Update Academic Credentials
              </h3>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Student Name */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Student Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Academic Email</label>
                    <input
                      type="email"
                      value={userData?.email || email}
                      disabled
                      className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Roll Number */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Roll Number</label>
                    <input
                      type="text"
                      value={userData?.rollNumber || profile.rollNo}
                      disabled
                      className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Section */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Section</label>
                    <input
                      type="text"
                      value={userData?.section || profile.section}
                      disabled
                      className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">System Role</label>
                    <input
                      type="text"
                      value={userData?.role || 'student'}
                      disabled
                      className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed select-none capitalize"
                    />
                  </div>

                  {/* Specialization */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Specialization</label>
                    <input
                      type="text"
                      value={profile.specialization}
                      disabled
                      className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-4 pt-2 border-t border-slate-850">
                  {saved && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Name Updated!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Tab My Subjects content */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 select-none">
                  <BookOpen className="w-4 h-4 text-indigo-400" /> Enrolled Subjects
                </h3>
              </div>

              {/* Info Notification Banner */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/10 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-350">Managed by Administrator</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Your enrolled subjects are managed by your administrator. Please contact them to make any changes or to assign new subjects.
                  </p>
                </div>
              </div>

              {/* Subject lists */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {enrolledSubjects.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-955">
                    <p className="text-xs text-slate-500">No subjects currently assigned to your profile.</p>
                  </div>
                ) : (
                  enrolledSubjects.map((sub, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-850 rounded-xl hover:border-slate-800 transition-all group/item"
                    >
                      <span className="text-xs font-bold text-slate-200">{sub}</span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900">
                        Enrolled
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Preferences & Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Notification Settings */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 backdrop-blur-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400" /> Notifications Settings Mocks
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-350 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Reports</span>
                <p className="text-[10px] text-slate-505 leading-none">Weekly attendance & notice wraps</p>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={e => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-355 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Push Alerts</span>
                <p className="text-[10px] text-slate-505 leading-none">Urgent notice and timetable changes</p>
              </div>
              <input
                type="checkbox"
                checked={notifyPush}
                onChange={e => setNotifyPush(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Database Clear & Clear logs controls */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 select-none">
              <Shield className="w-4 h-4 text-indigo-400" /> PWA System Diagnostics
            </h3>
            <p className="text-xs text-slate-505 leading-normal">
              BatchOS stores all parameters (deliverables checklist status, attendance sheets, notifications read logs) in your local web storage sandbox.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-850 flex flex-wrap gap-3">
            <button
              onClick={handleResetData}
              className="py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/25 text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all w-full sm:w-auto cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset Database
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
