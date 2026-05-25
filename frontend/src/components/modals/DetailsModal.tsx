'use client';

import { useState } from 'react';
import { GrCertificate } from 'react-icons/gr';
import { HiArrowRight } from 'react-icons/hi';

import Avatar from '~components/ui/Avatar';

import { UserInfo } from '../ui/card-components';
import { BaseModal } from './BaseModal';
import { PDFPreviewModal } from './PDFPreviewModal';

export type ModalType = 'tutor' | 'report';

interface Message {
  sender: string;
  timestamp: string;
  content: string;
}

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorModalProps extends BaseModalProps {
  type: 'tutor';
  tutor: {
    id: string;
    name: string;
    email: string;
    experience: string;
    verified: boolean;
    rejectionReason: string | null;
  };
  introVideoUrl: string;
  certificateTypes: string[];
  certificates: string[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  pendingLanguages?: string[];
  pendingCertificationUrl?: string | null;
  languageVerificationStatus?: 'pending' | 'approved' | 'rejected' | null;
  onVerifyLanguages?: (id: string, action: 'approve' | 'reject') => void;
}

interface ReportModalProps extends BaseModalProps {
  type: 'report';
  report: {
    id: string;
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
    description?: string;
    messages?: Message[];
  };
  onReject?: (id: string) => void;
  onResolveAndBlock?: (id: string) => void;
}

type DetailsModalProps = TutorModalProps | ReportModalProps;

export const DetailsModal = (props: DetailsModalProps) => {
  if (props.type === 'report') {
    return <ReportModalContent {...props} />;
  }

  return <TutorModalContent {...props} />;
};

// Tutor Modal Content
const TutorModalContent = ({
  isOpen,
  onClose,
  tutor,
  introVideoUrl,
  certificateTypes,
  certificates,
  onApprove,
  onReject,
  pendingLanguages,
  pendingCertificationUrl,
  languageVerificationStatus,
  onVerifyLanguages,
}: TutorModalProps) => {
  const isLanguageVerification = languageVerificationStatus === 'pending';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={`${isLanguageVerification
          ? 'Language Verification'
          : tutor.verified
            ? 'Approved Tutor'
            : tutor.rejectionReason
              ? 'Rejected Tutor'
              : 'Tutor Verification'
          }`}
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Tutor Information */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
            <Avatar
              user={{
                id: tutor.id,
                name: tutor.name,
                role: 'tutor',
              }}
              size="md"
            />
            <UserInfo
              name={tutor.name}
              email={tutor.email}
              additionalInfo={tutor.experience}
            />
          </div>

          {/* Intro Video Section */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3">
              Intro Video
            </h5>
            {introVideoUrl && !tutor.rejectionReason ? (
              <div className="w-full bg-black rounded-lg overflow-hidden">
                <video
                  src={introVideoUrl}
                  controls
                  className="w-full h-auto"
                  controlsList="nodownload"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-400 text-sm">No video available</p>
              </div>
            )}
          </div>

          {/* Certificate Section */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3">
              {isLanguageVerification ? 'Certificates (including new)' : 'Certificates'}
            </h5>
            <div className="space-y-3">
              {/* Display existing certificates */}
              {certificates && certificates.length > 0 && !tutor.rejectionReason ? (
                certificates.map((url, index) => {
                  const type = certificateTypes[index] || 'Other';
                  return (
                    <div
                      key={url}
                      onClick={() => handlePreview(url)}
                      className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <GrCertificate className="text-gray-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {type}_certificate_{index + 1}.pdf
                        </p>
                        <p className="text-xs text-gray-500">Click to preview within app</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-400">No certificates available</p>
                </div>
              )}

              {/* Display pending certificate if in verification mode */}
              {isLanguageVerification && pendingCertificationUrl && (
                <div
                  onClick={() => handlePreview(pendingCertificationUrl)}
                  className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-rose-200">
                    <GrCertificate className="text-rose-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-rose-900">
                      New Pending Certification
                    </p>
                    <p className="text-xs text-rose-500 font-medium text-rose-400">Action required - Click to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Pending Languages Section */}
        {isLanguageVerification && pendingLanguages && (
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3">
              Requested Languages
            </h5>
            <div className="flex flex-wrap gap-2">
              {pendingLanguages.map((lang) => (
                <span
                  key={lang}
                  className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-medium"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isLanguageVerification ? (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                onVerifyLanguages?.(tutor.id, 'reject');
                onClose();
              }}
              className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors cursor-pointer"
            >
              Reject Languages
            </button>
            <button
              onClick={() => {
                onVerifyLanguages?.(tutor.id, 'approve');
                onClose();
              }}
              className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors cursor-pointer"
            >
              Approve Languages
            </button>
          </div>
        ) : (
          !tutor.verified &&
          !tutor.rejectionReason && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {onReject && (
                <button
                  onClick={() => {
                    onReject(tutor.id);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Reject
                </button>
              )}
              {onApprove && (
                <button
                  onClick={() => {
                    onApprove(tutor.id);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors cursor-pointer"
                >
                  Approve
                </button>
              )}
            </div>
          )
        )}
      </div>

    </BaseModal>

      {previewUrl && (
        <PDFPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          pdfUrl={previewUrl}
          title="Certificate Preview"
        />
      )}
    </>
  );
};

// Report Modal Content
const ReportModalContent = ({
  isOpen,
  onClose,
  report,
  onReject,
  onResolveAndBlock,
}: ReportModalProps) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Details"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Reporter and Reported Sections */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
          <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar
                user={{
                  id: report.reporter.id,
                  name: report.reporter.name,
                  role: 'user',
                }}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {report.reporter.name}{' '}
                  <span className="text-gray-500">(Reporter)</span>
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {report.reporter.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">User</p>
              </div>
            </div>
          </div>

          <HiArrowRight className="text-gray-400 shrink-0" size={24} />

          <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar
                user={{
                  id: report.reported.id,
                  name: report.reported.name,
                  role: 'tutor',
                }}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {report.reported.name}{' '}
                  <span className="text-gray-500">(Reported)</span>
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {report.reported.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">Tutor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time and Abuse Type */}
        <div className="grid grid-cols-2 gap-4">
          {report.dateTime && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Date & Time</p>
              <p className="text-sm font-semibold text-gray-900">
                {report.dateTime}
              </p>
            </div>
          )}
          {report.abuseType && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Abuse Type</p>
              <p className="text-sm font-semibold text-gray-900">
                {report.abuseType}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {report.description && (
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">
              Description:
            </h5>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                {report.description}
              </p>
            </div>
          </div>
        )}

        {/* Last 5 Messages */}
        {report.messages && report.messages.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3">
              Last 5 Messages:
            </h5>
            <div className="space-y-3">
              {report.messages.map((message, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-rose-600">
                      {message.sender}
                    </span>
                    <span className="text-xs text-gray-500">
                      {message.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{message.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {onReject && (
            <button
              onClick={() => {
                onReject(report.id);
                onClose();
              }}
              className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Reject
            </button>
          )}
          {onResolveAndBlock && (
            <button
              onClick={() => {
                onResolveAndBlock(report.id);
                onClose();
              }}
              className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Resolve & Block
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
