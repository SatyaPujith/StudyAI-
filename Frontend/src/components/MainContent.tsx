import React from 'react';
import DashboardView from './DashboardView';
import StudyPlanView from './StudyPlanView';
import QuizzesView from './QuizzesView';
import StudyGroupsView from './StudyGroupsView';
import ProfileView from './ProfileView';
import SettingsView from './SettingsView';

interface MainContentProps {
  activeSection: string;
  onStartQuiz: (quizId: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({ activeSection, onStartQuiz }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'study-plan':
        return <StudyPlanView />;
      case 'quizzes':
        return <QuizzesView onStartQuiz={onStartQuiz} />;
      case 'study-groups':
        return <StudyGroupsView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onStartQuiz={onStartQuiz} />;
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl">
      {renderContent()}
    </main>
  );
};

export default MainContent;