/**
 * Main Application Component - F1 24 Telemetry Dashboard
 */
import { useState, useEffect } from 'react';
import { useTelemetry } from '@/hooks/useTelemetry';
import { TimingTower } from '@/components/TimingTower';
import { DriverPanel } from '@/components/DriverPanel';
import { TyreData } from '@/components/TyreData';
import { FuelERS } from '@/components/FuelERS';
import { TrackMap } from '@/components/TrackMap';
import { SessionInfo } from '@/components/SessionInfo';
import { DeltaDisplay } from '@/components/DeltaDisplay';
import { EventTimeline } from '@/components/EventTimeline';
import { LapHistory } from '@/components/LapHistory';
import { RaceStrategy } from '@/components/RaceStrategy';
import { RaceHistory } from '@/components/RaceHistory';
import { RaceRecap } from '@/components/RaceRecap';
import { SettingsModal } from '@/components/SettingsModal';
import { Settings, Maximize2, Minimize2, Trophy, Gauge } from 'lucide-react';

function App() {
  const { isConnected } = useTelemetry();
  const [pageScale, setPageScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'history'>('dashboard');
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [showRaceFinishedModal, setShowRaceFinishedModal] = useState(false);
  const [raceFinishedId, setRaceFinishedId] = useState<string | null>(null);

  useEffect(() => {
    const updatePageScale = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const widthScale = viewportWidth / 2560;
      const heightScale = viewportHeight / 1260;
      setPageScale(Math.min(widthScale, heightScale));
    };

    updatePageScale();
    window.addEventListener('resize', updatePageScale);
    window.visualViewport?.addEventListener('resize', updatePageScale);
    return () => {
      window.removeEventListener('resize', updatePageScale);
      window.visualViewport?.removeEventListener('resize', updatePageScale);
    };
  }, []);

  // Listen for race finished event
  useEffect(() => {
    const handleRaceFinished = (event: any) => {
      const data = event.detail;
      setRaceFinishedId(data.recap_id);
      setShowRaceFinishedModal(true);
    };

    window.addEventListener('race_finished', handleRaceFinished);

    return () => {
      window.removeEventListener('race_finished', handleRaceFinished);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleSelectRace = (raceId: string) => {
    setSelectedRaceId(raceId);
  };

  const handleCloseRecap = () => {
    setSelectedRaceId(null);
    setShowRaceFinishedModal(false);
  };

  const handleViewRaceRecap = () => {
    if (raceFinishedId) {
      setSelectedRaceId(raceFinishedId);
      setShowRaceFinishedModal(false);
    }
  };

  return (
    <div>
      <div
        className="app-shell min-h-screen bg-f1-darker text-white flex flex-col h-screen overflow-hidden"
        style={{
          zoom: pageScale,
          width: `${100 / pageScale}vw`,
          height: `${100 / pageScale}vh`,
          minHeight: `${100 / pageScale}vh`,
        }}
      >
        {/* Header */}
        <header className="bg-f1-dark border-b border-f1-gray">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                  F1 24 TELEMETRY
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-race-green animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-400">
                    {isConnected ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === 'dashboard' ? 'bg-race-red text-white' : 'text-gray-400 hover:bg-f1-gray'
                  }`}
                >
                  <Gauge className="w-4 h-4" />
                  <span className="font-semibold">Dashboard</span>
                </button>
                <button
                  onClick={() => setCurrentPage('history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === 'history' ? 'bg-race-red text-white' : 'text-gray-400 hover:bg-f1-gray'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span className="font-semibold">Race History</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-f1-gray rounded-lg transition-colors"
                  title="Toggle fullscreen"
                >
                  {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-f1-gray rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto min-h-0 flex-1 overflow-hidden px-4 py-4 max-w-[2400px]">
          {currentPage === 'dashboard' ? (
            <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,14fr)_minmax(0,28fr)_minmax(0,14fr)_minmax(0,14fr)_minmax(0,30fr)]">
              {/* Left Column - Session & Delta */}
              <div className="flex h-full min-h-0 flex-col gap-4">
                <SessionInfo />
                <DeltaDisplay />
                <EventTimeline />
              </div>

              {/* Driver Column */}
              <div className="flex h-full flex-col gap-4">
                <DriverPanel />
                <div className="grid min-h-0 flex-1 grid-cols-2 items-stretch gap-4">
                  <div className="dashboard-card-fill h-full">
                    <TyreData />
                  </div>
                  <div className="dashboard-card-fill h-full">
                    <FuelERS />
                  </div>
                </div>
              </div>

              {/* Strategy Column */}
              <div className="h-full">
                <RaceStrategy />
              </div>

              {/* Lap History Column */}
              <div className="h-full min-h-0">
                <LapHistory />
              </div>

              {/* Right Column - Timing Tower and Track Map */}
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="min-h-0 flex-1">
                  <TimingTower />
                </div>
                <div className="min-h-0 flex-none">
                  <TrackMap />
                </div>
              </div>
            </div>
          ) : (
            <RaceHistory onSelectRace={handleSelectRace} />
          )}
        </main>

        {/* Race Recap Modal */}
        {selectedRaceId && (
          <RaceRecap raceId={selectedRaceId} onClose={handleCloseRecap} />
        )}

        {/* Settings Modal */}
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {/* Race Finished Notification */}
        {showRaceFinishedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-f1-dark rounded-lg p-8 max-w-md shadow-2xl">
              <div className="text-center">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Race Finished!</h2>
                <p className="text-gray-400 mb-6">Your race recap has been saved</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRaceFinishedModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleViewRaceRecap}
                    className="flex-1 px-4 py-2 bg-race-red text-white rounded hover:bg-red-700 transition-colors"
                  >
                    View Recap
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
