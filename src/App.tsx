import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Button, Modal } from 'animal-island-ui';
import AppLayout from '@/components/layout/AppLayout';
import HomePage from '@/pages/Home/HomePage';
import TasksPage from '@/pages/Tasks/TasksPage';
import FocusPage from '@/pages/Focus/FocusPage';
import ShopPage from '@/pages/Shop/ShopPage';
import ParentGate from '@/pages/Parent/ParentGate';
import CalendarPage from '@/pages/Calendar/CalendarPage';
import ResourcesPage from '@/pages/Resources/ResourcesPage';
import SkillsPage from '@/pages/Skills/SkillsPage';
import PeriodicTablePage from '@/pages/PeriodicTable/PeriodicTablePage';
import ChemistryLanguagePage from '@/pages/ChemistryLanguage/ChemistryLanguagePage';
import VideoLibraryPage from '@/pages/VideoLibrary/VideoLibraryPage';
import ChineseWritingThemesPage from '@/pages/ChineseWritingThemes/ChineseWritingThemesPage';
import RecitationPage from '@/pages/Recitation/RecitationPage';
import RecitationSettingsPage from '@/pages/Recitation/RecitationSettingsPage';
import VocabPage from '@/pages/Vocab/VocabPage';
import VocabUnitPage from '@/pages/Vocab/VocabUnitPage';
import VocabDrillPage from '@/pages/Vocab/VocabDrillPage';
import HistoryPage from '@/pages/History/HistoryPage';
import { onRankUp } from '@/hooks/useUser';
import type { Rank } from '@/services/rankService';

export default function App() {
  const [rankUp, setRankUp] = useState<{ from: Rank; to: Rank } | null>(null);

  useEffect(() => {
    onRankUp((from, to) => setRankUp({ from, to }));
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="focus/:taskId" element={<FocusPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="subjects" element={<SkillsPage />} />
          <Route path="periodic" element={<PeriodicTablePage />} />
          <Route path="chemistry-language" element={<ChemistryLanguagePage />} />
          <Route path="videos/:collection" element={<VideoLibraryPage />} />
          <Route path="chinese-writing-themes" element={<ChineseWritingThemesPage />} />
          {/* 兼容旧链接 */}
          <Route path="periodic-memo" element={<PeriodicTablePage />} />
          <Route path="periodic-full" element={<PeriodicTablePage />} />
          <Route path="recite" element={<RecitationPage />} />
          <Route path="recite-settings" element={<RecitationSettingsPage />} />
          <Route path="vocab" element={<VocabPage />} />
          <Route path="vocab/:unitId" element={<VocabUnitPage />} />
          <Route path="vocab/:unitId/drill" element={<VocabDrillPage />} />
          <Route path="parent" element={<ParentGate />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {rankUp && (
        <Modal
          open
          title="🎉 段位晋升！"
          typewriter={false}
          onClose={() => setRankUp(null)}
          footer={
            <div className="modal-footer">
              <Button type="primary" block onClick={() => setRankUp(null)}>好耶！</Button>
            </div>
          }
        >
          <div className="modal-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42 }}>{rankUp.to.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-dark)', margin: '8px 0' }}>
              {rankUp.from.label} → {rankUp.to.label}
            </div>
            <div style={{ fontSize: 16, color: 'var(--c-muted)' }}>
              你已跨越 {rankUp.to.minPoints.toLocaleString()} 积分，段位升级！
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
