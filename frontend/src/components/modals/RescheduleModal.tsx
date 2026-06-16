'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuCalendar, LuLoaderCircle, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { BaseModal } from './BaseModal';
import Button from '~components/ui/Button';
import { getTutorSessions } from '~services/user/tutorService';
import { getSessions } from '~services/tutor/sessionService';
import { rescheduleBooking } from '~services/shared/bookingService';
import { Booking } from '~services/shared/bookingService';
import { Session as ApiSession } from '~types/tutor';
import { errorHandler } from '~utils/errorHandler';
import { utterToast } from '~utils/utterToast';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  role: 'user' | 'tutor';
  tutorId: string;
  onSuccess?: () => void;
}

export const RescheduleModal = ({
  isOpen,
  onClose,
  booking,
  role,
  tutorId,
  onSuccess,
}: RescheduleModalProps) => {
  const getInitialDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ApiSession | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAvailableSlots = useCallback(async () => {
    if (!tutorId || !selectedDate) return;
    try {
      setLoading(true);
      const res = role === 'tutor'
        ? await getSessions(selectedDate)
        : await getTutorSessions(tutorId, selectedDate);
      // Only keep available sessions (exclude booked, or current session, matching language and topic, and starting in at least 1 hour)
      const oneHourFromNow = new Date().getTime() + 60 * 60 * 1000;
      const available = (res.sessions || []).filter(
        (s: ApiSession) =>
          s.status === 'Available' &&
          s.id !== booking?.sessionId &&
          new Date(s.scheduledAt).getTime() >= oneHourFromNow &&
          booking &&
          s.language.toLowerCase() === booking.language.toLowerCase() &&
          s.topic.toLowerCase() === booking.topic.toLowerCase()
      );
      setSessions(available);
    } catch (err) {
      utterToast.error(errorHandler(err));
    } finally {
      setLoading(false);
    }
  }, [role, tutorId, selectedDate, booking?.sessionId, booking?.language, booking?.topic]);

  useEffect(() => {
    if (isOpen && tutorId) {
      fetchAvailableSlots();
      setSelectedSession(null);
    }
  }, [isOpen, selectedDate, tutorId, fetchAvailableSlots]);

  const navigateDate = (direction: 'next' | 'prev') => {
    const curr = new Date(selectedDate);
    if (direction === 'next') {
      curr.setDate(curr.getDate() + 1);
    } else {
      curr.setDate(curr.getDate() - 1);
    }
    const nextDateStr = curr.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    if (nextDateStr < todayStr) return; // Cannot navigate to past dates
    setSelectedDate(nextDateStr);
  };

  const handleReschedule = async () => {
    if (!booking || !selectedSession) return;
    try {
      setSubmitting(true);
      await rescheduleBooking(booking.id, selectedSession.id, role);
      utterToast.success('Session rescheduled successfully!');
      onSuccess?.();
      onClose();
    } catch (err) {
      utterToast.error(errorHandler(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getPriceDiffLabel = () => {
    if (!booking || !selectedSession) return null;
    const diff = selectedSession.price - booking.price;
    if (diff > 0) {
      return (
        <p className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 p-3 rounded-lg">
          ⚠️ Rescheduling to this slot will charge an additional <span className="font-bold">₹{diff}</span> from your wallet.
        </p>
      );
    } else if (diff < 0) {
      return (
        <p className="text-xs font-semibold text-green-600 bg-green-50 border border-green-100 p-3 rounded-lg">
          ℹ️ Rescheduling to this slot is cheaper. <span className="font-bold">₹{Math.abs(diff)}</span> will be refunded back to your wallet.
        </p>
      );
    } else {
      return null;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Reschedule Session" maxWidth="md">
      <div className="space-y-6">
        {/* Date Selector Navigation */}
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-200">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
            disabled={selectedDate <= new Date().toISOString().split('T')[0]}
          >
            <LuChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <LuCalendar size={18} className="text-rose-400" />
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
          >
            <LuChevronRight size={20} />
          </button>
        </div>

        {/* Available Slots List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Available Slots</h4>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-rose-500">
              <LuLoaderCircle className="animate-spin" size={32} />
              <span className="text-xs text-gray-400">Fetching available sessions...</span>
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-1 no-scrollbar">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                    selectedSession?.id === session.id
                      ? 'border-rose-500 bg-rose-50/50'
                      : 'border-gray-100 hover:border-rose-200 hover:bg-rose-50/10'
                  }`}
                >
                  <p className="font-bold text-gray-800 text-sm">{formatTime(session.scheduledAt)}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-xs text-gray-500">No available sessions for this date.</p>
            </div>
          )}
        </div>

        {/* Dynamic price difference warning */}
        {selectedSession && getPriceDiffLabel()}

        {/* Submit Actions */}
        <div className="pt-2">
          <Button
            variant="primary"
            text='Reschedule'
            className="w-full justify-center py-2.5 font-bold shadow-md shadow-rose-200"
            onClick={handleReschedule}
            disabled={!selectedSession || submitting}
            icon={submitting ? <LuLoaderCircle className="animate-spin" /> : undefined}
          />
        </div>
      </div>
    </BaseModal>
  );
};

export default RescheduleModal;
