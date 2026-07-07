'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import LeaderboardModal from '~components/modals/LeaderboardModal';
import QuizHistoryModal from '~components/modals/QuizHistoryModal';
import QuizConfig from '~components/quiz/QuizConfig';
import QuizPlay from '~components/quiz/QuizPlay';
import QuizResult from '~components/quiz/QuizResult';
import QuizStatsHeader from '~components/quiz/QuizStatsHeader';
import AbstractShapesBackground from '~components/ui/AbstractShapesBackground';
import Loader from '~components/ui/Loader';
import quizService from '~services/user/quizService';
import axios from '~utils/axiosConfig';
import { utterToast } from '~utils/utterToast';

type QuizState = 'CONFIG' | 'PLAYING' | 'RESULT';

interface QuizData {
  id: string;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  totalTimeTaken?: number;
  questions?: { text: string; options: string[]; [key: string]: unknown }[]; 
}

interface UserData {
  streak?: {
    currentStreak: number;
    highestStreak: number;
    lastActive: string;
  };
  [key: string]: unknown;
}

export default function PlayQuizPage() {
  const [gameState, setGameState] = useState<QuizState>('CONFIG');
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const authUser = useSelector((state: { auth: { user: { email?: string } | null } }) => state.auth.user);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await axios.get('/user/get-account-details');
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleStartQuiz = async (language: string, difficultyStr: string, volume: number) => {
    setIsLoading(true);
    try {
      const difficulty = difficultyStr as 'Easy' | 'Medium' | 'Hard';
      const response = await quizService.generateQuiz({ language, difficulty, volume });
      setCurrentQuiz(response.data);
      setGameState('PLAYING');
    } catch (error) {
      console.error('Failed to start quiz', error);
      utterToast.error('Failed to generate quiz. Please check your Gemini API key or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = async () => {
    if (!currentQuiz) return;
    try {
      const response = await quizService.completeQuiz({ quizId: currentQuiz.id });
      setCurrentQuiz(response.data);
      setGameState('RESULT');
      fetchUserData(); 
    } catch (error) {
      console.error('Failed to complete quiz', error);
    }
  };

  const handleRestart = () => {
    setGameState('CONFIG');
    setCurrentQuiz(null);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50 overflow-hidden">
      <AbstractShapesBackground />
      {isDataLoading && <Loader />}

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Language Proficiency Quiz</h1>
          <p className="text-gray-500 mt-1">
            Test your language knowledge with interactive quizzes
          </p>
        </header>

        {currentUser && (
          <div className="mb-10 animate-in slide-in-from-top duration-700">
            <QuizStatsHeader
              currentStreak={currentUser.streak?.currentStreak || 0}
              highestStreak={currentUser.streak?.highestStreak || 0}
              lastParticipation={currentUser.streak?.lastActive || null}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
              onOpenHistory={() => setIsHistoryOpen(true)}
            />
          </div>
        )}

        <main className="min-h-[500px] flex flex-col">
          {gameState === 'CONFIG' && (
            <div className="animate-in fade-in zoom-in duration-500">
              <QuizConfig onStart={handleStartQuiz} isLoading={isLoading} />
            </div>
          )}

          {gameState === 'PLAYING' && currentQuiz && (
            <div className="animate-in slide-in-from-right duration-500">
              <QuizPlay
                quizId={currentQuiz.id}
                questions={currentQuiz.questions || []}
                onComplete={handleQuizComplete}
                onCancel={() => setGameState('CONFIG')}
              />
            </div>
          )}

          {gameState === 'RESULT' && currentQuiz && (
            <div className="animate-in slide-in-from-bottom duration-500">
              <QuizResult
                score={currentQuiz.score || 0}
                totalQuestions={currentQuiz.totalQuestions || 0}
                correctAnswers={currentQuiz.correctAnswers || 0}
                accuracy={((currentQuiz.correctAnswers || 0) / (currentQuiz.totalQuestions || 1)) * 100}
                totalTimeTaken={currentQuiz.totalTimeTaken || 0}
                onRestart={handleRestart}
              />
            </div>
          )}
        </main>

        <LeaderboardModal
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
          currentUser={currentUser || undefined}
        />
        
        <QuizHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      </div>
    </div>
  );
}
