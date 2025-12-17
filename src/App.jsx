import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import LogPanel from './components/LogPanel';
import PlanView from './components/PlanView';
import TableTab from './components/TableTab';
import { storage } from './utils/storage';
import { processResponse } from './utils/processor';
import { Play, Pause, Terminal } from 'lucide-react';

function App() {
  const [plans, setPlans] = useState([]);
  const [tables, setTables] = useState([]); // Discovered tables
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState('plan');
  const [logs, setLogs] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Ref for plans and isListening to be used in listener closure
  const plansRef = useRef(plans);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Load initial state
  useEffect(() => {
    async function loadState() {
      const data = await storage.get(['plans', 'isListening', 'isLogOpen']);
      if (data.plans) setPlans(data.plans);
      if (data.isListening) setIsListening(data.isListening);
      if (data.isLogOpen) setIsLogOpen(data.isLogOpen);
      fetchTables();
    }
    loadState();
  }, []);

  // Fetch tables from storage and clean up empty ones
  const fetchTables = async () => {
    const all = await storage.get(null);
    const tableKeys = Object.keys(all || {}).filter(k => k.startsWith('data_'));

    const validTables = [];
    const emptyTables = [];

    for (const key of tableKeys) {
      if (!all[key] || all[key].length === 0) {
        emptyTables.push(key);
      } else {
        validTables.push(key.replace('data_', ''));
      }
    }

    // Cleanup empty tables
    if (emptyTables.length > 0) {
      await storage.remove(emptyTables);
    }

    setTables(validTables);
  };

  // Save changes
  useEffect(() => {
    storage.set({ plans });
  }, [plans]);

  useEffect(() => {
    storage.set({ isListening });
  }, [isListening]);

  useEffect(() => {
    storage.set({ isLogOpen });
  }, [isLogOpen]);

  // Logging
  const addLog = (type, message) => {
    const newLog = {
      type,
      message,
      time: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev]);

    // Refresh tables if we saved data
    if (type === 'success' && (message.includes('Saved') || message.includes('saved') || message.includes('to table'))) {
      fetchTables();
    }
  };

  const toggleListening = () => setIsListening(prev => !prev);

  // Network Listener
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.devtools || !chrome.devtools.network) {
      // addLog('warning', 'Network listener only works in DevTools environment');
      return;
    }

    const listener = async (request) => {
      if (!isListeningRef.current) return;

      const url = request.request.url;
      const currentPlans = plansRef.current;

      for (const plan of currentPlans) {
        if (plan.type !== 'actions' && plan.urlFilter && url.includes(plan.urlFilter)) {
          addLog('info', `Captured request matching filter: ${plan.urlFilter}`);

          request.getContent(async (content, encoding) => {
            if (content) {
              const result = processResponse(content, plan);

              if (result.error) {
                addLog('error', result.error);
              } else if (result.warning) {
                addLog('warning', result.warning);
              } else {
                if (result.log) addLog('success', result.log);

                // Save rows
                if (result.rows && result.rows.length > 0) {
                  const tableKey = `data_${plan.tableName}`;
                  const stored = await storage.get(tableKey);
                  const currentData = stored[tableKey] || [];
                  const newData = [...currentData, ...result.rows];
                  await storage.set({ [tableKey]: newData });

                  addLog('success', `Saved ${result.rows.length} rows to table ${plan.tableName}`);

                  // Trigger update if viewing this table
                }
              }
            } else {
              addLog('error', `No content for ${url}`);
            }
          });
        }
      }
    };

    chrome.devtools.network.onRequestFinished.addListener(listener);

    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(listener);
    };
  }, []); // Only register once, use refs for state access

  const handleTableClear = async () => {
    await fetchTables();
    setActiveTab('plan');
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        plans={plans}
        tables={tables}
      />

      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top Header */}
        <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-medium transition-colors ${isListening
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
            >
              {isListening ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Listening</span>
                </>
              )}
            </button>
            <span className="text-sm text-slate-500">
              {isListening ? 'Capturing network requests...' : 'Idle'}
            </span>
          </div>

          <button
            onClick={() => setIsLogOpen(prev => !prev)}
            className={`p-2 rounded-md transition-colors ${isLogOpen ? 'bg-slate-700 text-blue-400' : 'hover:bg-slate-800 text-slate-400'
              }`}
            title="Toggle Logs"
          >
            <Terminal className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 overflow-auto bg-slate-950 relative transition-all duration-300 ${isLogOpen ? 'mr-80' : ''}`}>
          <div className="p-6 max-w-5xl mx-auto h-full">
            {activeTab === 'plan' && (
              <PlanView plans={plans} setPlans={setPlans} onLog={addLog} />
            )}
            {activeTab.startsWith('table-') && (
              <TableTab
                key={activeTab} // Force re-mount on tab switch
                tableName={activeTab.replace('table-', '')}
                plan={plans.find(p => p.tableName === activeTab.replace('table-', ''))}
                onUpdate={fetchTables}
                onClear={handleTableClear}
              />
            )}
          </div>
        </div>

        {/* Log Overlay/Panel */}
        <LogPanel
          isOpen={isLogOpen}
          onClose={() => setIsLogOpen(false)}
          logs={logs}
          onClear={() => setLogs([])}
        />
      </div>
    </div>
  )
}

export default App
