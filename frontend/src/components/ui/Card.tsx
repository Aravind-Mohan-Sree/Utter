'use client';

import { useId } from 'react';
import { FaVideo } from 'react-icons/fa';
import { FiCheckCircle, FiSlash } from 'react-icons/fi';
import { HiArrowRight } from 'react-icons/hi';
import { RiVerifiedBadgeFill } from 'react-icons/ri';
import { TbBrandBooking } from 'react-icons/tb';

import Avatar from '~components/ui/Avatar';
import Button from '~components/ui/Button';
import { DateAndTime } from '~components/ui/DateAndTime';

import { LanguageTags } from './card-components/LanguageTags';
import { ReportSection } from './card-components/ReportSection';
import { StatusBadge } from './card-components/StatusBadge';
import { UserInfo } from './card-components/UserInfo';

const formatDuration = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return '0h 0m 0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
};

export type CardType = 'user' | 'tutor' | 'report' | 'session';

interface BaseCardProps {
  id: string;
  avatarId?: string;
  type: CardType;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

interface UserCardProps extends BaseCardProps {
  type: 'user';
  name: string;
  email: string;
  joinedAt: string | Date;
  status: 'Active' | 'Blocked';
  knownLanguages: string[];
  isOnline?: boolean;
  onToggleStatus?: (id: string) => void;
  hideStatus?: boolean;
  hideOnlineStatus?: boolean;
}

export interface TutorCardProps extends BaseCardProps {
  type: 'tutor';
  name: string;
  email: string;
  joinedAt: string | Date;
  knownLanguages: string[];
  yearsOfExperience: string;
  isVerified: boolean;
  rejectionReason: string | null;
  isLoading: boolean;
  status: 'Active' | 'Blocked' | 'Available' | 'Booked' | 'Completed' | 'Cancelled' | 'Incomplete' | 'confirmed';
  onViewDetails?: (id: string) => void;
  onBook?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  customActions?: React.ReactNode;
  hideStatus?: boolean;
  viewDetailsIcon?: React.ReactNode;
  dateLabel?: string;
  showTime?: boolean;
  onCancel?: (id: string) => void;
  onJoin?: (id: string) => void;
  avatarRole?: 'user' | 'tutor' | 'admin';
  price?: number;
  paymentProvider?: string;
  activeSeconds?: number;
  averageRating?: number;
  duration?: number;
  rescheduleCount?: number;
}

interface ReportCardProps extends BaseCardProps {
  type: 'report';
  status: 'Pending' | 'Resolved' | 'Rejected';
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  reported: {
    id: string;
    name: string;
    email: string;
  };
  dateTime?: string;
  abuseType?: string;
  channel?: 'chat' | 'video';
  onViewDetails?: (id: string) => void;
}

export interface SessionCardProps extends BaseCardProps {
  type: 'session';
  title: string;
  subtitle: string;
  date: string | Date;
  time: string;
  language: string;
  status?: 'Available' | 'Booked';
  onCancel?: (id: string) => void;
  onBook?: (id: string) => void;
  price?: number;
  hideStatus?: boolean;
  hidePrice?: boolean;
  isLoading?: boolean;
  duration?: number;
}

type CardProps = UserCardProps | TutorCardProps | ReportCardProps | SessionCardProps;

export const Card = (props: CardProps) => {
  if (props.type === 'report') {
    return <ReportCard {...props} />;
  }

  if (props.type === 'tutor') {
    return <TutorCard {...props} />;
  }

  if (props.type === 'session') {
    return <SessionCard {...props} />;
  }

  return <UserCard {...props} />;
};

// User card component
const UserCard = ({
  id,
  avatarId,
  name,
  email,
  joinedAt,
  status,
  knownLanguages,
  isOnline,
  onToggleStatus,
  hideStatus,
  hideOnlineStatus,
  className,
  onClick,
}: UserCardProps) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-rose-200' : ''} ${className || ''}`}
    onClick={onClick}
  >
    <div className="mb-4">
      <div className="flex gap-3 min-w-0 items-start justify-between">
        <div className="flex gap-3 min-w-0 flex-1">
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Avatar user={{ id: avatarId || id, name, role: 'user' }} size="md" editable={false} interactive={true} />
            {!hideOnlineStatus && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${isOnline ? 'bg-green-500' : 'bg-rose-500'
                }`}>
              </div>
            )}
          </div>
          <UserInfo name={name} email={email} />
        </div>
        {!hideStatus && <StatusBadge status={status} />}
      </div>
    </div>

    {knownLanguages && knownLanguages.length > 0 && (
      <LanguageTags
        knownLanguages={knownLanguages}
        variant="default"
        className="mb-4"
      />
    )}
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
      <DateAndTime date={joinedAt} label="Joined" />

      {onToggleStatus && (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            icon={
              status === 'Active' ? (
                <FiSlash size={22} />
              ) : (
                <FiCheckCircle size={22} />
              )
            }
            className={`text-gray-400! h-fit rounded-lg p-0.5! transition-colors duration-200! ${status === 'Active'
              ? 'text-gray-400 hover:text-red-500! hover:bg-red-50'
              : 'text-gray-400 hover:text-green-500! hover:bg-green-50'
              }`}
            onClick={onToggleStatus}
            args={[id]}
          />
        </div>
      )}
    </div>
  </div>
);

const PreciseStar = ({ fillPercentage }: { fillPercentage: number }) => {
  const gradientId = useId();
  const hasFill = fillPercentage > 0;
  return (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke={hasFill ? '#f59e0b' : '#d1d5db'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id={gradientId}>
          <stop offset={`${fillPercentage}%`} stopColor="#f59e0b" />
          <stop offset={`${fillPercentage}%`} stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={hasFill ? `url(#${gradientId})` : 'none'}
      />
    </svg>
  );
};

const getFillPercentage = (starIndex: number, rating: number) => {
  if (rating >= starIndex) return 100;
  if (rating <= starIndex - 1) return 0;
  return (rating - (starIndex - 1)) * 100;
};

// Tutor card component
const TutorCard = ({
  id,
  avatarId,
  name,
  email,
  joinedAt,
  knownLanguages,
  yearsOfExperience,
  isVerified,
  rejectionReason,
  isLoading,
  status,
  onViewDetails,
  onBook,
  onToggleStatus,
  onJoin,
  customActions,
  hideStatus,
  viewDetailsIcon,
  dateLabel,
  showTime,
  onCancel,
  className,
  disabled,
  onClick,
  avatarRole = 'tutor',
  price,
  paymentProvider,
  activeSeconds,
  averageRating,
  duration,
  rescheduleCount
}: TutorCardProps) => {
  let displayPrice = price ?? 0;
  let displayRefund = 0;
  let isRefunded = false;

  if (price !== undefined) {
    if (avatarRole === 'user') {
      if (status === 'Cancelled') {
        displayPrice = 0;
      } else if (status === 'Incomplete') {
        const activeMinutes = (activeSeconds || 0) / 60;
        if (activeMinutes < 15) {
          displayPrice = 0;
        } else if (activeMinutes <= 30) {
          displayPrice = price / 2;
        } else {
          displayPrice = price;
        }
      }
    } else {
      if (status === 'Cancelled') {
        displayRefund = price;
        isRefunded = true;
      } else if (status === 'Incomplete') {
        isRefunded = true;
        const activeMinutes = (activeSeconds || 0) / 60;
        if (activeMinutes < 15) {
          displayRefund = price;
        } else if (activeMinutes <= 30) {
          displayRefund = price / 2;
        } else {
          displayRefund = 0;
        }
      }
    }
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all relative group ${disabled ? 'opacity-60 grayscale-[0.2] pointer-events-none' : ''} ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
    >
      {onJoin && (
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="primary"
            size={1.5} className="bg-rose-500 hover:bg-rose-600 text-white border-none shadow-lg shadow-rose-200"
            onClick={onJoin}
            args={[id]}
            icon={<FaVideo className="text-white" />}
          >
            Join Call
          </Button>
        </div>
      )}
      <div className="mb-4">
        <div className="flex gap-3 min-w-0 items-start justify-between">
          <div className="flex gap-3 min-w-0 flex-1">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Avatar user={{ id: avatarId || id, name, role: avatarRole }} size="md" interactive={true} />
            </div>
            <div className="min-w-0 flex-1">
              {['confirmed', 'Booked', 'Completed', 'Cancelled', 'Incomplete'].includes(status) && (
                <span className="text-[10px] font-bold text-rose-500 tracking-wider block mb-0.5">
                  {id && id.length === 24 ? `#SESS-${id.slice(-6).toUpperCase()}` : `#SESS-${id}`}
                </span>
              )}
              <UserInfo
                name={name}
                email={email}
                additionalInfo={yearsOfExperience}
              />
              {averageRating !== undefined && (
                <div className="flex items-center gap-0.5 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <PreciseStar
                        key={star}
                        fillPercentage={getFillPercentage(star, averageRating)}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-600 ml-1">
                    {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {!hideStatus && <StatusBadge status={status} />}
          </div>
        </div>
      </div>

      {knownLanguages && knownLanguages.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <LanguageTags
            knownLanguages={knownLanguages}
            variant="default"
          />
          {dateLabel && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
              {duration ? `${duration} mins` : '60 mins'}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
        <div className="flex flex-col gap-1">
          <DateAndTime date={joinedAt} label={dateLabel || "Joined"} showTime={showTime} />
          {price !== undefined && (
            <div className="flex items-center flex-wrap gap-2">
              {avatarRole === 'user' ? (
                <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                  {status === 'Completed' || status === 'Cancelled' || status === 'Incomplete'
                    ? `Earned ₹${displayPrice}`
                    : `Earning ₹${displayPrice}`}
                </span>
              ) : (
                <>
                  <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    Paid ₹{price} {paymentProvider ? `via ${paymentProvider}` : ''}
                  </span>
                  {isRefunded && (
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      Refunded ₹{displayRefund}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          {activeSeconds !== undefined && (status === 'Completed' || status === 'Incomplete') && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                Duration: {formatDuration(activeSeconds)}
              </span>
            </div>
          )}
          {rescheduleCount !== undefined && rescheduleCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-100">
                Rescheduled: {rescheduleCount}/3
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {(onToggleStatus || onViewDetails || onBook || onCancel || customActions) && (
            <div className="flex justify-end gap-1">
              {customActions ? (
                customActions
              ) : (
                <>
                  {onCancel && (
                    <Button
                      variant="outline"
                      icon={<FiSlash size={22} />}
                      className="h-fit rounded-lg p-0.5! transition-colors duration-200! text-gray-400 hover:text-red-500! hover:bg-red-50"
                      onClick={onCancel}
                      args={[id]}
                      disabled={disabled}
                      isLoading={isLoading}
                    />
                  )}
                  {onBook && (
                    <Button
                      variant="outline"
                      icon={<TbBrandBooking size={22} />}
                      className="h-fit rounded-lg p-0.5! transition-colors duration-200! text-rose-500! hover:bg-rose-50!"
                      onClick={onBook}
                      args={[id]}
                      disabled={disabled}
                    />
                  )}
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      icon={viewDetailsIcon || <RiVerifiedBadgeFill size={23} />}
                      isLoading={isLoading}
                      className={`h-fit rounded-lg p-0.5! transition-colors duration-200! ${rejectionReason
                        ? 'hover:bg-gray-50!'
                        : 'hover:text-amber-500! hover:bg-amber-50!'
                        } ${isVerified ? 'text-amber-500!' : 'text-gray-400!'}`}
                      onClick={onViewDetails}
                      args={[id]}
                      disabled={disabled}
                    />
                  )}
                  {onToggleStatus && (
                    <Button
                      variant="outline"
                      icon={
                        status === 'Active' ? (
                          <FiSlash size={22} />
                        ) : (
                          <FiCheckCircle size={22} />
                        )
                      }
                      className={`text-gray-400! h-fit rounded-lg p-0.5! transition-colors duration-200! ${status === 'Active'
                        ? 'text-gray-400 hover:text-red-500! hover:bg-red-50'
                        : 'text-gray-400 hover:text-green-500! hover:bg-green-50'
                        }`}
                      onClick={onToggleStatus}
                      args={[id]}
                      disabled={disabled}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Report card component
const ReportCard = ({
  id,
  status,
  reporter,
  reported,
  dateTime,
  abuseType,
  channel,
  onViewDetails,
  className,
}: ReportCardProps) => (
  <div className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all ${className || ''}`}>
    {/* Header with Channel Badge and Status */}
    <div className="flex items-center justify-between mb-4">
      {channel && (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${channel === 'chat'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-purple-100 text-purple-600'
            }`}
        >
          {channel.charAt(0).toUpperCase() + channel.slice(1)}
        </span>
      )}
      <StatusBadge status={status} variant="yellow" />
    </div>

    {/* Reporter and Reported Sections */}
    <div className="flex flex-col gap-4 mb-3">
      <ReportSection
        user={reporter}
        role="Reporter (User)"
        variant="reporter"
        className="flex-1"
      />
      <div className="h-px bg-gray-50 mx-2" />
      <ReportSection
        user={reported}
        role="Reported (Member)"
        variant="reported"
        className="flex-1"
      />
    </div>

    {/* Abuse Type Tag */}
    {abuseType && (
      <div className="mb-4">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Abuse Type</span>
        <span className="inline-flex items-center px-3 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-100">
          {abuseType}
        </span>
      </div>
    )}

    {/* Bottom Action Footer */}
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
      <DateAndTime date={dateTime!} label="Reported on" showTime={true} />

      {onViewDetails && (
        <Button
          variant="outline"
          icon={<HiArrowRight size={22} />}
          className="h-fit rounded-lg p-0.5! transition-all duration-200 text-rose-500 hover:bg-rose-50 border-rose-200/50"
          onClick={() => onViewDetails(id)}
        />
      )}
    </div>
  </div>
);

const SessionCard = ({
  id,
  title,
  subtitle,
  date,
  time,
  language,
  status = 'Available',
  onCancel,
  onBook,
  price,
  className,
  hideStatus,
  hidePrice,
  disabled,
  isLoading,
  duration
}: SessionCardProps) => (
  <div className={`bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all relative group ${disabled || isLoading ? 'opacity-60 grayscale-[0.2] pointer-events-none' : ''} ${className || ''}`}>
    <div className="flex justify-between items-start mb-2">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900 leading-none">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {price !== undefined && !hidePrice && (
          <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm font-bold">
            ₹{price}
          </div>
        )}
        {!hideStatus && status && <StatusBadge status={status} />}
      </div>
    </div>

    <div className="mb-3 flex items-center gap-2 flex-wrap">
      <LanguageTags knownLanguages={[language]} variant="default" />
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
        {duration ? `${duration} mins` : '60 mins'}
      </span>
    </div>

    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
      <DateAndTime
        date={date}
        label="Scheduled for"
        showTime={true}
        time={time}
      />

      {onCancel && (
        <Button
          variant="outline"
          icon={
            <FiSlash size={22} />
          }
          className={`text-gray-400! h-fit rounded-lg p-0.5! transition-colors duration-200! text-gray-400 hover:text-red-500! hover:bg-red-50`}
          onClick={onCancel}
          args={[id]}
          disabled={disabled}
          isLoading={isLoading}
        />
      )}
      {onBook && (
        <Button
          variant="outline"
          icon={
            <TbBrandBooking size={25} />
          }
          className={`text-rose-500! h-fit rounded-lg p-0.5! transition-colors duration-200! hover:bg-rose-50`}
          onClick={onBook}
          args={[id]}
          disabled={disabled}
          isLoading={isLoading}
        />
      )}
    </div>
  </div>
);
