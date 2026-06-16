'use client';

import React, { useState } from 'react';
import { useBatch } from '@/store/BatchContext';
import { useAuth } from '@/store/AuthContext';
import { Resource } from '@/types';
import { 
  Search, 
  FileText, 
  Video, 
  Folder, 
  Sparkles,
  Link2,
  BookOpen,
  Copy,
  ExternalLink,
  Eye,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function ResourcesPage() {
  const { resources, resourcesLoading } = useBatch();
  const { userData } = useAuth();
  
  const enrolledSubjects = userData?.subjects || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('All');
  
  // Preview modal states
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const courses = ['All', ...enrolledSubjects];

  const getFileIcon = (type: Resource['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5.5 h-5.5 text-rose-400" />;
      case 'ppt': return <BookOpen className="w-5.5 h-5.5 text-amber-400" />;
      case 'doc': return <FileText className="w-5.5 h-5.5 text-blue-400" />;
      case 'video': return <Video className="w-5.5 h-5.5 text-purple-400" />;
      default: return <Link2 className="w-5.5 h-5.5 text-sky-400" />;
    }
  };

  const getBadgeColor = (type: Resource['type']) => {
    switch (type) {
      case 'pdf': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'ppt': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'doc': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'video': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default: return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    }
  };

  const handleCopyLink = (link: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success("Resource link copied to clipboard!");
    }
  };

  // Filter resources by:
  // - subject ∈ user.subjects (case-insensitive)
  // - search query matches title or description
  // - selected course folder filter
  const filteredResources = resources.filter(res => {
    const matchesSearch = 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      res.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCourse = 
      selectedCourse === 'All' || 
      res.subject.trim().toLowerCase() === selectedCourse.trim().toLowerCase();
    
    const normalizedResSubject = res.subject.trim().toLowerCase();
    const matchesEnrolled = enrolledSubjects.some(
      sub => sub.trim().toLowerCase() === normalizedResSubject
    );

    return matchesSearch && matchesCourse && matchesEnrolled;
  });

  if (enrolledSubjects.length === 0) {
    return (
      <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 animate-fadeIn">
        <Folder className="w-10 h-10 text-slate-800 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-400">No Subjects Assigned</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No subjects assigned yet. Contact your CR.
        </p>
      </div>
    );
  }

  if (resourcesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="w-10 h-10 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading study repository...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search coursework, case studies, materials..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-250 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Course Filter Horizontal Tabs */}
      <div className="flex items-center overflow-x-auto gap-2 py-1 scrollbar-none">
        {courses.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCourse(c)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCourse === c
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-250 border border-slate-850 bg-slate-900/30'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grouped by Course / Subject Layout */}
      <div className="space-y-8">
        {enrolledSubjects
          .filter(sub => selectedCourse === 'All' || sub.trim().toLowerCase() === selectedCourse.trim().toLowerCase())
          .map(subject => {
            const subjectResources = filteredResources.filter(
              res => res.subject.trim().toLowerCase() === subject.trim().toLowerCase()
            );

            // Hide course section if searching and no matches are found inside it
            if (subjectResources.length === 0 && searchQuery !== '') {
              return null;
            }

            return (
              <div key={subject} className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider">{subject}</h3>
                  <span className="text-[10px] text-slate-500 font-bold">({subjectResources.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjectResources.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 rounded-2xl bg-slate-900/50 border border-slate-850 hover:border-slate-800 transition-all flex flex-col gap-4 group justify-between"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Type Icon container */}
                        <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-500/20 group-hover:bg-indigo-950/15 transition-all">
                          {getFileIcon(res.type)}
                        </div>
                        
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getBadgeColor(res.type)}`}>
                              {res.type === 'ppt' ? 'PPT / Slide' : res.type === 'doc' ? 'DOC / Document' : res.type.toUpperCase()}
                            </span>
                            <span className="text-[9px] text-slate-500 font-semibold">
                              Uploaded by: {res.uploadedBy}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-indigo-300 transition-colors leading-tight">
                            {res.title}
                          </span>
                          {res.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                              {res.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-850/60 w-full justify-end">
                        <button
                          onClick={() => handleCopyLink(res.driveLink)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Copy Document Link"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy Link
                        </button>
                        
                        <button
                          onClick={() => {
                            setPreviewTitle(res.title);
                            setPreviewLink(res.driveLink);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-250 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Preview document in-app"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>

                        <a
                          href={res.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-505 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow shadow-indigo-600/10 cursor-pointer"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open Link
                        </a>
                      </div>
                    </div>
                  ))}

                  {subjectResources.length === 0 && (
                    <div className="md:col-span-2 text-center py-12 border border-dashed border-slate-850 rounded-2xl bg-slate-900/10">
                      <p className="text-xs text-slate-500">No resources available for this course yet.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        
        {filteredResources.length === 0 && searchQuery !== '' && (
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 animate-fadeIn">
            <Folder className="w-10 h-10 text-slate-800 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-400">No resources found</h4>
            <p className="text-xs text-slate-500 mt-1">
              No files matched your search queries. Try a different term.
            </p>
          </div>
        )}
      </div>

      {/* Document Preview Lightbox Modal */}
      {previewLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fadeIn" onClick={() => setPreviewLink(null)} />
          
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-zoomIn flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-4 pr-10">
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider truncate flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Preview: {previewTitle}
              </h3>
              <button
                onClick={() => setPreviewLink(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 w-full overflow-hidden bg-slate-950 rounded-2xl border border-slate-850">
              <iframe
                src={previewLink}
                className="w-full h-[65vh] border-0"
                allow="autoplay"
                title={`Google Drive Preview - ${previewTitle}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
