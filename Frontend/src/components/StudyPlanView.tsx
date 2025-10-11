import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StudyPlansView from './StudyPlansView';
import CreateStudyPlanButton from './CreateStudyPlanButton';
import { BookOpen, RotateCcw, Settings, Upload } from 'lucide-react';
import dataService, { StudyPlan } from '../services/dataService';
import { toast } from 'sonner';

const StudyPlanView: React.FC = () => {
  return <StudyPlansView />;
};

export default StudyPlanView;