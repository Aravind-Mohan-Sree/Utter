'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import { useSelector } from 'react-redux';

import SessionList, { Session } from '~components/blocks/SessionList';
import AbstractShapesBackground from '~components/ui/AbstractShapesBackground';
import Button from '~components/ui/Button';
import Loader from '~components/ui/Loader';
import { getAccountDetails } from '~services/shared/managementService';
import {
  cancelSession,
  createSession,
  getSessions,
} from '~services/tutor/sessionService';
import { RootState } from '~store/rootReducer';
import { errorHandler } from '~utils/errorHandler';
import { utterAlert } from '~utils/utterAlert';
import { utterToast } from '~utils/utterToast';

const SESSION_TOPICS = [
  'Conversation Practice',
  'Grammar Focus',
  'Vocabulary Building',
  'Pronunciation',
  'Reading Comprehension',
  'Writing Skills',
];

interface CreateSessionRequest {
  date: string;
  time: string;
  language: string;
  topic: string;
  price: number;
  scheduledAt?: string;
}

interface SessionApiResponse {
  id: string;
  scheduledAt: string;
  language: string;
  topic: string;
  status: string;
  price?: number;
}

export default function CreateSessionsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pageLoading, setPageLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const fetchVersionRef = useRef(0);
  const lastFetchedDateRef = useRef<string | null>(null);

  const [startFromDate, setStartFromDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [sessionCount, setSessionCount] = useState<number | ''>('');
  const [knownLanguages, setKnownLanguages] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [repeatUntilDate, setRepeatUntilDate] = useState('');
  const [leaveDateInput, setLeaveDateInput] = useState('');
  const [leaveDates, setLeaveDates] = useState<string[]>([]);
  const [preferredInterval, setPreferredInterval] = useState<number>(15);

  const [existingSessionsMap, setExistingSessionsMap] = useState<
    Record<string, Session[]>
  >({});

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeWithAmPm = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const getMinAllowedDate = useCallback(() => {
    const now = new Date();
    const currentHours = now.getHours();
    const endOfDay = 17;

    const baseDate = new Date(now);
    if (currentHours >= endOfDay) {
      baseDate.setDate(baseDate.getDate() + 1);
    }

    if (baseDate.getDay() === 0) {
      baseDate.setDate(baseDate.getDate() + 1);
    }

    return formatLocalDate(baseDate);
  }, []);

  const addNonSundays = useCallback(
    (startDateStr: string, daysToAdd: number) => {
      const date = new Date(startDateStr + 'T00:00:00');
      let added = 0;
      while (added < daysToAdd) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0) {
          added++;
        }
      }
      return formatLocalDate(date);
    },
    [],
  );

  const minAllowedDateStr = useMemo(
    () => getMinAllowedDate(),
    [getMinAllowedDate],
  );

  const maxAllowedFutureDate = useMemo(() => {
    if (!minAllowedDateStr) return '';
    return addNonSundays(minAllowedDateStr, 6);
  }, [minAllowedDateStr, addNonSundays]);

  const maxRepeatDateStr = useMemo(() => {
    if (!startFromDate) return '';
    const calculatedMax = addNonSundays(startFromDate, 6);

    return calculatedMax > maxAllowedFutureDate
      ? maxAllowedFutureDate
      : calculatedMax;
  }, [startFromDate, maxAllowedFutureDate, addNonSundays]);

  useEffect(() => {
    if (!startFromDate) setStartFromDate(minAllowedDateStr);
    if (!repeatUntilDate) setRepeatUntilDate(minAllowedDateStr);
    if (!selectedDate) setSelectedDate(minAllowedDateStr);
  }, [minAllowedDateStr, repeatUntilDate, selectedDate, startFromDate]);

  useEffect(() => {
    if (user?.email) {
      setPageLoading(true);
      getAccountDetails('tutor', user.email)
        .then((res) => {
          if (res.tutor && res.tutor.knownLanguages) {
            setKnownLanguages(res.tutor.knownLanguages);
          }
        })
        .catch((err) => {
          utterToast.error(errorHandler(err));
        })
        .finally(() => setPageLoading(false));
    }
  }, [user]);

  const fetchSessions = useCallback(
    async (date: string, showLoader = false) => {
      if (!date) return;
      const currentVersion = ++fetchVersionRef.current;
      if (showLoader) setPageLoading(true);
      try {
        const res = await getSessions(date);
        if (currentVersion !== fetchVersionRef.current) return;
        const data = (res.sessions || []) as SessionApiResponse[];
        const mappedSessions: Session[] = data.map((s) => {
          const d = new Date(s.scheduledAt);
          return {
            id: s.id,
            time: d.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
            language: s.language,
            topic: s.topic,
            booked: s.status === 'Booked',
            date: d.toISOString().split('T')[0],
            status: s.status,
            scheduledAt: s.scheduledAt,
            price: s.price || 300,
          };
        });
        mappedSessions.sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        );
        setSessions(mappedSessions);
        setExistingSessionsMap((prev) => ({
          ...prev,
          [date]: mappedSessions,
        }));
        return mappedSessions;
      } catch (error) {
        console.error(error);
        setSessions([]);
        return [];
      } finally {
        setPageLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedDate && selectedDate !== lastFetchedDateRef.current) {
      lastFetchedDateRef.current = selectedDate;
      if (existingSessionsMap[selectedDate]) {
        setSessions(existingSessionsMap[selectedDate]);
      }
      fetchSessions(selectedDate, true);
    }
  }, [selectedDate, fetchSessions, existingSessionsMap]);

  const isSunday = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDay() === 0;
  };

  const handleStartFromDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const date = e.target.value;
    if (isSunday(date)) {
      utterToast.error('Sundays are not allowed. Please select another date.');
      return;
    }
    if (date > maxAllowedFutureDate) {
      utterToast.error('You can only create sessions up to 7 days in advance.');
      return;
    }

    setStartFromDate(date);
    setRepeatUntilDate(date);
  };

  const handleRepeatUntilDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const date = e.target.value;
    if (isSunday(date)) {
      utterToast.error('Sundays are not allowed.');
      return;
    }
    if (maxRepeatDateStr && date > maxRepeatDateStr) {
      utterToast.error(
        'You can only repeat for up to 7 days from the start date.',
      );
      return;
    }
    setRepeatUntilDate(date);
  };

  const maxSessions = useMemo(() => {
    if (!startTime) return 7;
    const [hours, minutes] = startTime.split(':').map(Number);
    const startTimeMinutes = hours * 60 + minutes;
    const latestStartTime = 17 * 60;
    const sessionDuration = 60;

    const max = Math.floor(
      1 + (latestStartTime - startTimeMinutes) / (sessionDuration + preferredInterval),
    );
    return Math.min(Math.max(max, 1), 7);
  }, [startTime, preferredInterval]);

  useEffect(() => {
    if (sessionCount !== '' && sessionCount > maxSessions) {
      setSessionCount(maxSessions);
      if (languages.length > maxSessions) {
        setLanguages((prev) => prev.slice(0, maxSessions));
      }
      if (topics.length > maxSessions) {
        setTopics((prev) => prev.slice(0, maxSessions));
      }
    }
  }, [maxSessions, sessionCount, languages.length, topics.length]);

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (!time) return;

    const [hours, minutes] = time.split(':').map(Number);
    const selectedTime = hours * 60 + minutes;
    const minTime = 9 * 60;
    const maxTime = 17 * 60;

    if (selectedTime < minTime || selectedTime > maxTime) {
      utterToast.error('Please select a time between 9 AM and 5 PM.');
      return;
    }
    setStartTime(time);
  };

  const handleSessionCountChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value ? Number(e.target.value) : '';
    setSessionCount(val);

    if (val !== '' && languages.length > val) {
      setLanguages((prev) => prev.slice(0, val));
    }
    if (val !== '' && topics.length > val) {
      setTopics((prev) => prev.slice(0, val));
    }
  };

  const toggleSelection = (
    item: string,
    currentList: string[],
    setter: (val: string[]) => void,
    type: 'language' | 'topic',
  ) => {
    if (!sessionCount) {
      utterToast.error('Please select session count first.');
      return;
    }

    if (currentList.length >= Number(sessionCount)) {
      utterToast.error(
        `You have already selected ${sessionCount} ${type}(s). Please remove one before selecting another.`,
      );
      return;
    }
    setter([...currentList, item]);
  };

  const removeSelection = (
    index: number,
    currentList: string[],
    setter: (val: string[]) => void,
  ) => {
    const newList = [...currentList];
    newList.splice(index, 1);
    setter(newList);
  };

  const addLeaveDate = () => {
    if (!leaveDateInput) {
      utterToast.error('Please select a date');
      return;
    }
    if (startFromDate && repeatUntilDate) {
      if (leaveDateInput < startFromDate || leaveDateInput > repeatUntilDate) {
        utterToast.error('Leave date must be within range');
        return;
      }
    }
    if (leaveDates.includes(leaveDateInput)) {
      utterToast.error('Date already marked as leave');
      return;
    }
    setLeaveDates((prev) => [...prev, leaveDateInput].sort());
    setLeaveDateInput('');
  };

  const removeLeaveDate = (dateToRemove: string) => {
    setLeaveDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  const handleCancelSession = (id: string) => {
    return utterAlert({
      title: 'Cancel Session',
      text: 'Are you sure you want to cancel this session?',
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Keep',
      showCancel: true,
      onConfirm: async () => {
        try {
          setIsActionLoading(true);
          setCancellingId(id);
          await cancelSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));

          const sessionToCancel = sessions.find((s) => s.id === id);
          if (sessionToCancel) {
            setExistingSessionsMap((prev) => ({
              ...prev,
              [sessionToCancel.date]: (prev[sessionToCancel.date] || []).filter(
                (s) => s.id !== id,
              ),
            }));
          }

          utterToast.success('Session cancelled');
        } catch (error) {
          utterToast.error(errorHandler(error));
          await fetchSessions(selectedDate, true);
        } finally {
          setIsActionLoading(false);
          setCancellingId(null);
        }
      },
    });
  };

  const getMinutesFromTime = (timeStr: string) => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 0;

    const [, h, m] = match;
    let [, , , ampm] = match;
    let hours = parseInt(h);
    const minutes = parseInt(m);

    if (ampm) {
      ampm = ampm.toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    return hours * 60 + minutes;
  };

  const generateSessions = async () => {
    if (isActionLoading) return;
    if (!startTime || !sessionCount || !startFromDate || !repeatUntilDate) {
      utterToast.error('Please fill all fields correctly.');
      return;
    }
    if (isSunday(startFromDate)) {
      utterToast.error('Start date cannot be a Sunday.');
      return;
    }
    if (languages.length !== sessionCount) {
      utterToast.error(`Please select ${sessionCount} language(s) in order.`);
      return;
    }
    if (topics.length !== sessionCount) {
      utterToast.error(`Please select ${sessionCount} topic(s) in order.`);
      return;
    }

    const datesToCheck: string[] = [];
    const iterDate = new Date(startFromDate + 'T00:00:00');
    const endDateObj = new Date(repeatUntilDate + 'T00:00:00');
    iterDate.setHours(0, 0, 0, 0);
    endDateObj.setHours(0, 0, 0, 0);

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 7);
    const limitDateStr = formatLocalDate(limitDate);

    while (iterDate <= endDateObj) {
      if (iterDate.getDay() !== 0) {
        const dStr = formatLocalDate(iterDate);
        if (dStr <= limitDateStr) {
          datesToCheck.push(dStr);
        }
      }
      iterDate.setDate(iterDate.getDate() + 1);
    }

    if (datesToCheck.length === 0) {
      utterToast.info(
        'No valid dates in range (Check 7-day limit or Sundays).',
      );
      return;
    }

    const now = new Date();
    const todayStr = formatLocalDate(now);
    if (datesToCheck.includes(todayStr)) {
      const minStart = now.getHours() * 60 + now.getMinutes() + 60;
      const [startH, startM] = startTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      if (startMin < minStart) {
        const minHour = Math.floor(minStart / 60);
        const minMin = minStart % 60;
        const minTimeStr = `${String(minHour).padStart(2, '0')}:${String(minMin).padStart(2, '0')}`;
        const minTimeAmPm = formatTimeWithAmPm(minTimeStr);
        utterToast.error(
          `For today's sessions, the Starting Time of First Session must be at least 1 hour from now (after ${minTimeAmPm}).`,
        );
        return;
      }
    }

    try {
      const fetchResults = await Promise.all(
        datesToCheck.map((d) => getSessions(d)),
      );
      const freshSessionsMap: Record<string, Session[]> = {
        ...existingSessionsMap,
      };

      fetchResults.forEach((res, idx) => {
        const dateKey = datesToCheck[idx];
        const data = (res.sessions || []) as SessionApiResponse[];
        const mapped = data.map((s) => ({
          id: s.id,
          time: new Date(s.scheduledAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          language: s.language,
          topic: s.topic,
          booked: s.status === 'Booked',
          date: new Date(s.scheduledAt).toISOString().split('T')[0],
          status: s.status,
          scheduledAt: s.scheduledAt,
          price: s.price || 300,
        }));
        freshSessionsMap[dateKey] = mapped;
      });

      setExistingSessionsMap(freshSessionsMap);

      const [startH, startM] = startTime.split(':').map(Number);
      const startMin = startH * 60 + startM;

      const spacing = 60 + preferredInterval;

      const newSessionsRequests: CreateSessionRequest[] = [];
      let totalSkipped = 0;

      for (const dateStr of datesToCheck) {
        if (leaveDates.includes(dateStr)) continue;

        const daySessions = (freshSessionsMap[dateStr] || [])
          .filter((s) => s.status !== 'Cancelled')
          .map((s) => ({
            start: getMinutesFromTime(s.time),
            end: getMinutesFromTime(s.time) + 60,
          }))
          .sort((a, b) => a.start - b.start);

        let sessionsCreatedForThisDay = 0;
        for (let i = 0; i < Number(sessionCount); i++) {
          const targetStart = startMin + i * spacing;
          const targetEnd = targetStart + 60;

          const latestEndLimit = 18 * 60;

          if (targetEnd > latestEndLimit) {
            continue;
          }

          if (dateStr === todayStr) {
            const minStart = now.getHours() * 60 + now.getMinutes() + 60;
            if (targetStart < minStart) {
              continue;
            }
          }

          const conflict = daySessions.find(
            (s) =>
              Math.max(targetStart, s.start) < Math.min(targetEnd, s.end) ||
              (targetStart < s.end + 15 && targetStart >= s.start) ||
              (targetEnd > s.start - 15 && targetEnd <= s.end),
          );

          if (conflict) {
            continue;
          }

          const sessH = Math.floor(targetStart / 60);
          const sessM = targetStart % 60;
          const timeStr = `${String(sessH).padStart(2, '0')}:${String(sessM).padStart(2, '0')}`;
          const d = new Date(`${dateStr}T${timeStr}:00`);

          newSessionsRequests.push({
            date: dateStr,
            time: timeStr,
            language: languages[i],
            topic: topics[i],
            price: 300,
            scheduledAt: d.toISOString(),
          });

          daySessions.push({ start: targetStart, end: targetEnd });
          daySessions.sort((a, b) => a.start - b.start);
          sessionsCreatedForThisDay++;
        }

        if (sessionsCreatedForThisDay < Number(sessionCount)) {
          totalSkipped += Number(sessionCount) - sessionsCreatedForThisDay;
        }
      }

      if (newSessionsRequests.length === 0) {
        utterToast.info('No available slots found in the selected range.');
        return;
      }

      if (totalSkipped > 0) {
        utterAlert({
          title: 'Partial Generation',
          text: `Could only fit ${newSessionsRequests.length} sessions. ${totalSkipped} sessions were skipped due to lack of available time slots or conflicts on certain days. Create anyway?`,
          icon: 'warning',
          showCancel: true,
          onConfirm: async () => {
            await finalizeCreation(newSessionsRequests);
          },
        });
      } else {
        await finalizeCreation(newSessionsRequests);
      }
    } catch (err) {
      utterToast.error(errorHandler(err));
    }
  };

  const finalizeCreation = async (requests: CreateSessionRequest[]) => {
    try {
      setIsActionLoading(true);
      const responses = await Promise.all(
        requests.map((req) => createSession(req)),
      );
      utterToast.success(`${requests.length} sessions created!`);

      const newSessions: Session[] = requests.map((req, idx) => {
        const tempId =
          responses[idx]?.session?.id || `new-${Date.now()}-${idx}`;
        const d = new Date(`${req.date}T${req.time}:00`);
        return {
          id: tempId,
          time: formatTimeWithAmPm(req.time),
          language: req.language,
          topic: req.topic,
          booked: false,
          date: req.date,
          status: 'Available',
          scheduledAt: d.toISOString(),
          price: req.price,
        };
      });

      setExistingSessionsMap((prev) => {
        const next = { ...prev };
        newSessions.forEach((sess) => {
          if (!next[sess.date]) next[sess.date] = [];
          next[sess.date] = [...next[sess.date], sess].sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() -
              new Date(b.scheduledAt).getTime(),
          );
        });
        return next;
      });

      if (requests.some((r) => r.date === selectedDate)) {
        await fetchSessions(selectedDate);
      } else {
        setSelectedDate(startFromDate);
      }
    } catch (error) {
      utterToast.error(errorHandler(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => s.date === selectedDate);
  }, [sessions, selectedDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50 relative overflow-hidden">
      {pageLoading && <Loader />}
      <AbstractShapesBackground />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 lg:py-12 !pt-32">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Sessions
          </h1>
          <p className="text-gray-600 text-lg">
            Set rules to create multiple sessions automatically
          </p>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-3xl shadow-xl p-6 lg:p-10 border border-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Start From
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-white text-gray-900 cursor-pointer"
                  min={minAllowedDateStr}
                  max={maxAllowedFutureDate}
                  value={startFromDate}
                  onChange={handleStartFromDateChange}
                  onClick={(e) => e.currentTarget.showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                />
                <p className="text-xs text-gray-500 mt-1 italic">
                  Sessions will start from this date (Sundays excluded)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Starting Time of First Session
              </label>
              <div className="relative">
                <input
                  type="time"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-white text-gray-900 cursor-pointer"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onClick={(e) => e.currentTarget.showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                />
                <p className="text-xs text-gray-500 mt-1 italic">
                  Sessions can only be scheduled between 9 AM and 5 PM
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Number of Sessions Per Day
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-white text-gray-900 appearance-none cursor-pointer"
                value={sessionCount}
                onChange={handleSessionCountChange}
              >
                <option value="">Select count</option>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <option key={num} value={num} disabled={num > maxSessions}>
                    {num}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1 italic">
                Maximum 7 sessions allowed per day
              </p>
            </div>

            <div className="space-y-2 relative">
              <label className="block text-sm font-semibold text-gray-700">
                Interval Between Sessions
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-white text-gray-900 appearance-none cursor-pointer"
                value={preferredInterval}
                onChange={(e) => setPreferredInterval(Number(e.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
              </select>
              <p className="text-xs text-gray-500 mt-1 italic">
                Choose preferred gap between scheduled sessions
              </p>
            </div>

            <div className="col-span-full space-y-3 pt-4 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-700">
                Languages to Teach
              </label>
              <div className="flex flex-wrap gap-3">
                {knownLanguages.map((lang) => (
                  <Button
                    key={lang}
                    text={lang}
                    variant="outline"
                    onClick={() =>
                      toggleSelection(lang, languages, setLanguages, 'language')
                    }
                    className="!bg-rose-50 !text-rose-400 hover:border-rose-400"
                  />
                ))}
              </div>

              {languages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 rounded-xl">
                  {languages.map((lang, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-indigo-100 rounded-full text-sm text-indigo-600 shadow-sm animate-fadeIn"
                    >
                      {idx + 1}. {lang}
                      <button
                        onClick={() =>
                          removeSelection(idx, languages, setLanguages)
                        }
                        className="hover:text-indigo-800"
                      >
                        <LuX size={14} className="cursor-pointer" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 italic">
                Select languages in order up to session count
              </p>
            </div>

            <div className="col-span-full space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Session Topics
              </label>
              <div className="flex flex-wrap gap-3">
                {SESSION_TOPICS.map((topic) => (
                  <Button
                    key={topic}
                    text={topic}
                    variant="outline"
                    onClick={() =>
                      toggleSelection(topic, topics, setTopics, 'topic')
                    }
                    className="!bg-rose-50 !text-rose-400 hover:border-rose-400"
                  />
                ))}
              </div>

              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 rounded-xl">
                  {topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-indigo-100 rounded-full text-sm text-indigo-600 shadow-sm animate-fadeIn"
                    >
                      {idx + 1}. {topic}
                      <button
                        onClick={() => removeSelection(idx, topics, setTopics)}
                        className="hover:text-indigo-800"
                      >
                        <LuX size={14} className="cursor-pointer" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 italic">
                Select topics in order up to session count
              </p>
            </div>

            <div className="space-y-2 md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700">
                Repeat Until
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-white text-gray-900 cursor-pointer"
                  min={startFromDate || minAllowedDateStr}
                  max={maxAllowedFutureDate}
                  value={repeatUntilDate}
                  onChange={handleRepeatUntilDateChange}
                  onClick={(e) => e.currentTarget.showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                />
                <p className="text-xs text-gray-500 mt-1 italic">
                  Max 7 days from start date
                </p>
              </div>
            </div>

            <div className="md:col-span-1 lg:col-span-3 space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Leave Management
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-white text-gray-900 cursor-pointer"
                    min={startFromDate}
                    max={repeatUntilDate}
                    value={leaveDateInput}
                    onChange={(e) => setLeaveDateInput(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker()}
                    onKeyDown={(e) => e.preventDefault()}
                  />
                </div>
                <Button
                  text="Add Leave"
                  onClick={addLeaveDate}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                />
              </div>

              {leaveDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {leaveDates.map((date) => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600"
                    >
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                      <button
                        onClick={() => removeLeaveDate(date)}
                        className="hover:text-red-800"
                      >
                        <LuX size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1 italic">
                Sessions will not be created on selected leave dates
              </p>
            </div>

            <div className="md:col-span-1 lg:col-span-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Session Duration
              </p>
              <p className="text-xl font-bold text-gray-900">
                60 minutes (Fixed)
              </p>
            </div>
            <div className="md:col-span-1 lg:col-span-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Earning Per Session
              </p>
              <p className="text-xl font-bold text-gray-900">₹300</p>
              <p className="text-xs text-green-600 font-medium mt-1">
                Amount will be credited to wallet on successful completion of a
                session
              </p>
            </div>

            <div className="col-span-full pt-4">
              <Button
                text="Create"
                fullWidth
                size={3}
                onClick={generateSessions}
                isLoading={isActionLoading}
                className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg shadow-rose-200"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 w-full">
          <SessionList
            sessions={filteredSessions}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            userType="tutor"
            loading={pageLoading || isActionLoading}
            cancellingId={cancellingId}
            onAction={handleCancelSession}
            minDate={minAllowedDateStr}
            maxDate={maxAllowedFutureDate}
            showStatus={true}
            showPrice={false}
          />
        </div>
      </main>
    </div>
  );
}
