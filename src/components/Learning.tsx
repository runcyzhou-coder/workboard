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
          <h1 className="text-2xl font-bold text-slate-900">外贸英语学习</h1>
          <p className="text-slate-500 mt-1">用真实业务场景练会外贸英语</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>加载中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => selectCourse(course)}
                className="group text-left bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${course.cover_color}, ${course.cover_color}dd)` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 text-white/80" />
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur text-white text-xs rounded">{course.level}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{course.total_lessons} 课时</span>
                    <span className="flex items-center gap-1 text-blue-600 font-medium">开始学习<ChevronRight className="w-3.5 h-3.5" /></span>
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
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3">
            <ArrowLeft className="w-4 h-4" />返回课程列表
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{selectedCourse.title}</h1>
          <p className="text-slate-500 mt-1">{selectedCourse.description}</p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">学习进度</span>
            <span className="text-sm text-slate-500">{completedCount} / {lessons.length} 课</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all text-left group"
              >
                <div className={classNames(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                )}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={classNames('font-medium truncate', isComplete ? 'text-slate-500' : 'text-slate-900')}>{lesson.title}</p>
                  {lesson.scenario && <p className="text-xs text-slate-400 truncate mt-0.5">{lesson.scenario}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="w-3.5 h-3.5" />{lesson.duration_minutes}分钟</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
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
        <button onClick={() => setSelectedLesson(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" />返回课程
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Clock className="w-3.5 h-3.5" />{selectedLesson.duration_minutes}分钟
            <span className="text-slate-300">·</span>
            <BookOpen className="w-3.5 h-3.5" />{selectedLesson.key_phrases?.length || 0} 个短语
            <span className="text-slate-300">·</span>
            {vocab.length} 个词汇
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3">{selectedLesson.title}</h1>
          <p className="text-slate-600 leading-relaxed">{selectedLesson.content}</p>
        </div>

        {selectedLesson.scenario && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-900">业务场景</h3>
            </div>
            <p className="text-sm text-blue-800">{selectedLesson.scenario}</p>
          </div>
        )}

        {selectedLesson.key_phrases && selectedLesson.key_phrases.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">关键短语</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedLesson.key_phrases.map((phrase, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        )}

        {vocab.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">核心词汇</h3>
            <div className="space-y-3">
              {vocab.map((v, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2
                      className="w-4 h-4 text-blue-500 cursor-pointer hover:text-blue-700"
                      onClick={() => {
                        if ('speechSynthesis' in window) {
                          const u = new SpeechSynthesisUtterance(v.term);
                          u.lang = 'en-US';
                          window.speechSynthesis.speak(u);
                        }
                      }}
                    />
                    <span className="font-semibold text-slate-900">{v.term}</span>
                  </div>
                  <p className="text-sm text-slate-600 ml-6">{v.meaning}</p>
                  <p className="text-sm text-slate-500 italic ml-6 mt-1">例：{v.example}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => markComplete(selectedLesson)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
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
