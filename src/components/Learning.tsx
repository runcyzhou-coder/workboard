import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, ArrowLeft, Clock, BookOpen, CheckCircle2, Circle,
  Lightbulb, MessageSquare, Volume2, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import type { Course, Lesson, LessonProgress, VocabItem } from '@/lib/supabase';

export function Learning() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<(Lesson & { progress?: LessonProgress })[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<(Lesson & { progress?: LessonProgress }) | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
    setCourses((data as Course[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const loadLessons = useCallback(async (course: Course) => {
    const [lessonRes, progRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('course_id', course.id).order('lesson_order', { ascending: true }),
      supabase.from('lesson_progress').select('*').eq('course_id', course.id),
    ]);
    const pMap: Record<string, LessonProgress> = {};
    ((progRes.data as LessonProgress[]) || []).forEach(p => { pMap[p.lesson_id] = p; });
    setProgressMap(pMap);
    setLessons(((lessonRes.data as Lesson[]) || []).map(l => ({ ...l, progress: pMap[l.id] })));
  }, []);

  function selectCourse(course: Course) {
    setSelectedCourse(course);
    loadLessons(course);
  }

  async function markComplete(lesson: Lesson) {
    const existing = progressMap[lesson.id];
    if (existing) {
      await supabase.from('lesson_progress').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('lesson_progress').insert({ lesson_id: lesson.id, course_id: lesson.course_id, status: 'completed', completed_at: new Date().toISOString() });
    }
    if (selectedCourse) loadLessons(selectedCourse);
    setSelectedLesson(null);
  }

  // Course list view
  if (!selectedCourse) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#F3EFE6]">外贸英语学习</h1>
          <p className="text-[#8879A0] mt-1">用真实业务场景练会外贸英语</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#78716C]">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>加载中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => selectCourse(course)}
                className="group text-left bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${course.cover_color}, ${course.cover_color}dd)` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 text-[#D8B4FE]" />
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="inline-block px-2 py-0.5 bg-[#1B142C]/90 backdrop-blur text-white text-xs rounded">{course.level}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-[#F3EFE6] group-hover:text-[#06B6D4] transition-colors">{course.title}</h3>
                  <p className="text-sm text-[#8879A0] mt-1 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-[#78716C]">
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{course.total_lessons} 课时</span>
                    <span className="flex items-center gap-1 text-[#06B6D4] font-medium">开始学习<ChevronRight className="w-3.5 h-3.5" /></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Lesson list view
  if (selectedCourse && !selectedLesson) {
    const completedCount = lessons.filter(l => l.progress?.status === 'completed').length;
    const progressPct = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-2 text-sm text-[#8879A0] hover:text-[#F3EFE6] mb-3">
            <ArrowLeft className="w-4 h-4" />返回课程列表
          </button>
          <h1 className="text-2xl font-bold text-[#F3EFE6]">{selectedCourse.title}</h1>
          <p className="text-[#8879A0] mt-1">{selectedCourse.description}</p>
        </div>

        {/* Progress bar */}
        <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#F3EFE6]">学习进度</span>
            <span className="text-sm text-[#8879A0]">{completedCount} / {lessons.length} 课</span>
          </div>
          <div className="w-full h-2 bg-[#221A3A]/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {lessons.map(lesson => {
            const isComplete = lesson.progress?.status === 'completed';
            return (
              <button
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="w-full flex items-center gap-4 p-4 bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] hover:shadow-md hover:border-b border-[#3A2D54]/50 transition-all text-left group"
              >
                <div className={classNames(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isComplete ? 'bg-[#221A3A]/70 text-[#A855F7]' : 'bg-[#221A3A]/50 text-[#78716C]'
                )}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={classNames('font-medium truncate', isComplete ? 'text-[#8879A0]' : 'text-[#F3EFE6]')}>{lesson.title}</p>
                  {lesson.scenario && <p className="text-xs text-[#78716C] truncate mt-0.5">{lesson.scenario}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-[#78716C]"><Clock className="w-3.5 h-3.5" />{lesson.duration_minutes}分钟</span>
                  <ChevronRight className="w-4 h-4 text-[#B8AEC8] group-hover:text-[#06B6D4] group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Lesson detail view
  if (selectedLesson) {
    const vocab = (selectedLesson.vocabulary || []) as VocabItem[];
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <button onClick={() => setSelectedLesson(null)} className="flex items-center gap-2 text-sm text-[#8879A0] hover:text-[#F3EFE6]">
          <ArrowLeft className="w-4 h-4" />返回课程
        </button>

        <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-6">
          <div className="flex items-center gap-2 text-xs text-[#78716C] mb-2">
            <Clock className="w-3.5 h-3.5" />{selectedLesson.duration_minutes}分钟
            <span className="text-[#B8AEC8]">·</span>
            <BookOpen className="w-3.5 h-3.5" />{selectedLesson.key_phrases?.length || 0} 个短语
            <span className="text-[#B8AEC8]">·</span>
            {vocab.length} 个词汇
          </div>
          <h1 className="text-xl font-bold text-[#F3EFE6] mb-3">{selectedLesson.title}</h1>
          <p className="text-[#B8AEC8] leading-relaxed">{selectedLesson.content}</p>
        </div>

        {selectedLesson.scenario && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-b border-[#3A2D54]/50lue-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-[#06B6D4]" />
              <h3 className="text-sm font-semibold text-blue-900">业务场景</h3>
            </div>
            <p className="text-sm text-[#06B6D4]">{selectedLesson.scenario}</p>
          </div>
        )}

        {selectedLesson.key_phrases && selectedLesson.key_phrases.length > 0 && (
          <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-[#B8AEC8]" />
              <h3 className="text-sm font-semibold text-[#F3EFE6]">关键短语</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedLesson.key_phrases.map((phrase, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-[#221A3A]/50 text-[#F3EFE6] rounded-lg text-sm font-medium">
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        )}

        {vocab.length > 0 && (
          <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-5">
            <h3 className="text-sm font-semibold text-[#F3EFE6] mb-3">核心词汇</h3>
            <div className="space-y-3">
              {vocab.map((v, idx) => (
                <div key={idx} className="p-3 bg-[#161228]/60 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2
                      className="w-4 h-4 text-[#06B6D4] cursor-pointer hover:text-[#06B6D4]"
                      onClick={() => {
                        if ('speechSynthesis' in window) {
                          const u = new SpeechSynthesisUtterance(v.term);
                          u.lang = 'en-US';
                          window.speechSynthesis.speak(u);
                        }
                      }}
                    />
                    <span className="font-semibold text-[#F3EFE6]">{v.term}</span>
                  </div>
                  <p className="text-sm text-[#B8AEC8] ml-6">{v.meaning}</p>
                  <p className="text-sm text-[#8879A0] italic ml-6 mt-1">例：{v.example}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => markComplete(selectedLesson)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#A855F7] to-[#6B21A8] text-[#F3EFE6] rounded-lg hover:bg-[#6B21A8] font-medium text-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            {selectedLesson.progress?.status === 'completed' ? '已完成' : '标记为已完成'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
