'use client';

import { useEffect, useState } from 'react';
import { LuBookOpen, LuLoaderCircle, LuSparkles } from 'react-icons/lu';

import Button from '~components/ui/Button';
import StarRating from '~components/ui/StarRating';
import { Feedback,getFeedbackByBooking, submitFeedback } from '~services/shared/feedbackService';
import { errorHandler } from '~utils/errorHandler';
import { utterToast } from '~utils/utterToast';

import { BaseModal } from './BaseModal';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  role: 'user' | 'tutor';
  mode: 'submit' | 'view';
  language?: string;
  topic?: string;
  onSubmitSuccess?: () => void;
  studentName?: string;
}

/**
 * Premium modal for submitting tutor-to-student session feedback,
 * or viewing details of previously submitted feedback.
 */
export const FeedbackModal = ({
  isOpen,
  onClose,
  bookingId,
  role,
  mode,
  language = '',
  topic = '',
  onSubmitSuccess,
  studentName = 'Student',
}: FeedbackModalProps) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Submit form state
  const [rating, setRating] = useState(5);
  const [grammar, setGrammar] = useState(5);
  const [vocabulary, setVocabulary] = useState(5);
  const [pronunciation, setPronunciation] = useState(5);
  const [speaking, setSpeaking] = useState(5);
  const [notes, setNotes] = useState('');

  // Fetch feedback when opening
  useEffect(() => {
    if (isOpen && bookingId) {
      const fetchFeedback = async () => {
        try {
          setLoading(true);
          const response = await getFeedbackByBooking(bookingId, role);
          if (response.success && response.feedback) {
            setFeedback(response.feedback);
          } else {
            setFeedback(null);
          }
        } catch {
          setFeedback(null);
        } finally {
          setLoading(false);
        }
      };

      fetchFeedback();
    }
  }, [isOpen, bookingId, role]);

  // Reset form when modal opens in submit mode
  useEffect(() => {
    if (isOpen && mode === 'submit') {
      setRating(5);
      setGrammar(5);
      setVocabulary(5);
      setPronunciation(5);
      setSpeaking(5);
      setNotes('');
    }
  }, [isOpen, mode]);

  const handleSubmit = async () => {
    if (!notes || !notes.trim()) {
      utterToast.error('Please enter feedback notes before submitting.');
      return;
    }
    if (notes.trim().length < 5) {
      utterToast.error('Please enter a note of at least 5 characters.');
      return;
    }
    if (notes.trim().length > 500) {
      utterToast.error('Please keep your feedback under 500 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitFeedback({
        bookingId,
        rating,
        grammar,
        vocabulary,
        pronunciation,
        speaking,
        notes,
      });

      if (res.success) {
        utterToast.success('Feedback submitted successfully!');
        onSubmitSuccess?.();
        onClose();
      }
    } catch (err) {
      utterToast.error(errorHandler(err));
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { label: 'Overall Rating', desc: 'Overall session assessment', value: rating, setValue: setRating },
    { label: 'Grammar', desc: 'Sentence structure and syntax accuracy', value: grammar, setValue: setGrammar },
    { label: 'Vocabulary', desc: 'Word choices and vocabulary usage', value: vocabulary, setValue: setVocabulary },
    { label: 'Pronunciation', desc: 'Clarity, accent, and phonetics', value: pronunciation, setValue: setPronunciation },
    { label: 'Speaking', desc: 'Fluency, pacing, and conversational flow', value: speaking, setValue: setSpeaking },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={(!feedback && mode === 'submit') ? 'Submit Session Feedback' : 'Session Feedback'}
      maxWidth="lg"
      className="bg-slate-50"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-rose-500">
          <LuLoaderCircle className="animate-spin" size={40} />
          <span className="text-sm font-medium text-gray-500">Loading session report...</span>
        </div>
      ) : feedback ? (
        <div className="space-y-6">
          {/* Header info */}
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 p-4 rounded-xl border border-rose-100 flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm text-rose-500 shrink-0">
              <LuSparkles size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">
                {role === 'tutor'
                  ? `Feedback to ${studentName}`
                  : `Feedback from ${feedback.tutorName || 'Your Tutor'}`}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Language: <span className="font-semibold text-gray-700">{feedback.language}</span> • Topic: <span className="font-semibold text-gray-700">{feedback.topic}</span>
              </p>
            </div>
          </div>

          {/* Performance Cards */}
          <div className="space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Skill Breakdown</h5>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
              {[
                { label: 'Overall Rating', value: feedback.rating, color: 'bg-rose-500' },
                { label: 'Grammar', value: feedback.grammar, color: 'bg-indigo-500' },
                { label: 'Vocabulary', value: feedback.vocabulary, color: 'bg-violet-500' },
                { label: 'Pronunciation', value: feedback.pronunciation, color: 'bg-amber-500' },
                { label: 'Speaking & Fluency', value: feedback.speaking, color: 'bg-emerald-500' },
              ].map((item, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="font-bold text-gray-800">{item.value} / 5</span>
                  </div>
                  {/* Visual bar */}
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${(item.value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tutor Observations</h5>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 italic text-gray-600 leading-relaxed relative">
              <span className="absolute top-2 left-3 text-4xl text-rose-200 select-none font-serif">“</span>
              <p className="pl-4 pr-2 relative z-10 text-sm">{feedback.notes}</p>
            </div>
          </div>
        </div>
      ) : mode === 'view' ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="p-3 bg-gray-100 text-gray-400 rounded-full">
            <LuBookOpen size={28} />
          </div>
          <p className="text-sm text-gray-500 font-medium">No feedback submitted for this session yet.</p>
        </div>
      ) : (
        /* SUBMIT FEEDBACK MODE */
        <div className="space-y-6">
          {/* Header prompt */}
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 p-4 rounded-xl border border-rose-100 flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm text-rose-500 shrink-0">
              <LuSparkles size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Assess {studentName}&apos;s performance</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Language: <span className="font-semibold text-gray-700">{language}</span> • Topic: <span className="font-semibold text-gray-700">{topic}</span>
              </p>
            </div>
          </div>

          {/* Categories Selector */}
          <div className="space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rate Language Metrics</h5>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 divide-y divide-gray-50">
              {categories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-0.5 pr-2">
                    <span className="text-sm font-semibold text-gray-700">{cat.label}</span>
                    <span className="text-[11px] text-gray-400 leading-tight">{cat.desc}</span>
                  </div>
                  <div className="shrink-0">
                    <StarRating
                      rating={cat.value}
                      interactive={true}
                      onRatingChange={cat.setValue}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Notes input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Written Evaluation Notes</h5>
              <span className="text-[10px] text-gray-400 font-medium">
                {notes.trim().length} / 500 characters
              </span>
            </div>
            <textarea
              className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:border-rose-400 transition-all shadow-sm"
              rows={4}
              placeholder="Write helpful study tips, grammar corrections, or general observations for the student..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            />
            <p className="text-[10px] text-gray-400 leading-normal">
              Provide constructive, encouraging insights to guide the student&apos;s continuous learning. (min 5 chars)
            </p>
          </div>

          {/* Submit Actions */}
          <div className="pt-2">
            <Button
              variant="primary"
              text='Submit'
              className="w-full justify-center py-2.5 font-bold shadow-md shadow-rose-200"
              onClick={handleSubmit}
              disabled={submitting}
              icon={submitting ? <LuLoaderCircle className="animate-spin" /> : undefined}
            >
            </Button>
          </div>
        </div>
      )}
    </BaseModal>
  );
};
export default FeedbackModal;
