/**
 * Simple test app to verify React is working
 */

function App() {
  return (
    <div className="min-h-screen bg-f1-darker text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">F1 24 Telemetry Dashboard</h1>
        <p className="text-xl text-gray-400">React is working! ✅</p>
        <div className="mt-8 p-4 bg-f1-dark rounded-lg">
          <p className="text-sm">If you see this, the basic setup is correct.</p>
          <p className="text-sm mt-2">Backend status: Check console for WebSocket connection</p>
        </div>
      </div>
    </div>
  );
}

export default App;
