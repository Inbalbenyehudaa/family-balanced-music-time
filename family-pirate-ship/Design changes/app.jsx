/* global React, ReactDOM */
// app.jsx — main App orchestrator with state machine + Tweaks panel

const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "fairThreshold": 0.6,
  "harborThreshold": 0.75,
  "audio": true,
  "fog": true,
  "demoFastClock": true
}/*EDITMODE-END*/;

const DEFAULT_PIRATES = [
  { kind: 'kid', role: 'הקפטן הקטן', name: 'קפטן ילד', color: 'var(--flag-kid)' },
  { kind: 'mom', role: 'אמא', name: 'אמא', color: 'var(--flag-mom)' },
  { kind: 'dad', role: 'אבא', name: 'אבא', color: 'var(--flag-dad)' },
];
// Convert CSS vars to hex (used in art components that need raw color)
function realColor(c) {
  if (typeof c === 'string' && c.startsWith('var(')) {
    const m = { 'var(--flag-kid)': '#E63946', 'var(--flag-mom)': '#2A9D8F', 'var(--flag-dad)': '#7B4B94' };
    return m[c] || c;
  }
  return c;
}

function App() {
  const t = useTweaks(TWEAK_DEFAULTS);
  // Screen state machine
  const [screen, setScreen] = useState('home'); // welcome|names|crew|home|rollcall|drive|spyglass|reveal|map|island|gate|settings
  const [previousScreen, setPreviousScreen] = useState('home');
  const [showRollCall, setShowRollCall] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Persistent crew with hex colors
  const [pirates, setPirates] = useState(DEFAULT_PIRATES.map(p => ({ ...p, color: realColor(p.color) })));
  // Drive state
  const [active, setActive] = useState([true, true, true]);
  const [minutes, setMinutes] = useState([0, 0, 0]);  // total seconds, displayed as relative
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [drives, setDrives] = useState([]);
  const [unlockedIslandIds, setUnlockedIslandIds] = useState([]);
  const [latestUnlock, setLatestUnlock] = useState(null);
  const [latestFind, setLatestFind] = useState(null);
  const [activeIsland, setActiveIsland] = useState(null);
  const [driveStartTime, setDriveStartTime] = useState(0);

  // Tick clock during drive
  useEffect(() => {
    if (screen !== 'drive' && screen !== 'spyglass') return;
    const id = setInterval(() => {
      setMinutes(prev => {
        const next = [...prev];
        const speed = t.demoFastClock ? 4 : 1; // sec per tick
        if (active[currentIdx]) next[currentIdx] += speed;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen, currentIdx, active, t.demoFastClock]);

  const elapsed = minutes.reduce((a, b) => a + b, 0);

  const startNewVoyage = () => {
    setMinutes([0, 0, 0]);
    setCurrentIdx(-1);
    setShowRollCall(true);
  };

  const handleSetSail = (newActive) => {
    setActive(newActive);
    setCurrentIdx(-1);
    setShowRollCall(false);
    setDriveStartTime(Date.now());
    setScreen('drive');
  };

  const handleEndVoyage = () => {
    setShowEndConfirm(true);
  };
  const confirmEndVoyage = () => {
    setShowEndConfirm(false);
    // Compute tier and pick reward
    const tier = computeTier(minutes, active, t.fairThreshold, t.harborThreshold);
    let unlock = null, find = null;
    if (tier === 'fair') {
      const locked = window.ISLANDS.filter(i => !unlockedIslandIds.includes(i.id));
      unlock = locked[Math.floor(Math.random() * locked.length)] || null;
      if (unlock) setUnlockedIslandIds([...unlockedIslandIds, unlock.id]);
    } else if (tier === 'coastal') {
      find = window.COASTAL_FINDS[Math.floor(Math.random() * window.COASTAL_FINDS.length)];
    }
    setLatestUnlock(unlock);
    setLatestFind(find);
    const totalMin = Math.max(1, Math.round(elapsed / 60));
    const dt = new Date().toLocaleDateString('he-IL');
    setDrives([...drives, {
      date: dt, totalMin,
      perPirate: minutes.slice(),
      tier,
      islandId: unlock?.id, coastalFindId: find?.id,
    }]);
    setScreen('reveal');
  };

  const goToSettings = () => { setPreviousScreen(screen); setScreen('gate'); };

  return (
    <>
      <div className="app-shell">
        <div dir="rtl" lang="he" style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Persistent screen */}
          {screen === 'welcome' && <ScreenWelcome onNext={() => setScreen('names')}/>}
          {screen === 'names' && (
            <ScreenNames pirates={pirates} setPirates={setPirates}
              onNext={() => setScreen('crew')}
              onSkip={() => setScreen('crew')}/>
          )}
          {screen === 'crew' && <ScreenCrewReady pirates={pirates} onNext={() => setScreen('home')}/>}
          {screen === 'home' && (
            <ScreenHome pirates={pirates} islandsCount={unlockedIslandIds.length}
              onNewVoyage={startNewVoyage}
              onMap={() => setScreen('map')}
              onSettings={goToSettings}/>
          )}
          {screen === 'drive' && (
            <ScreenDrive pirates={pirates} active={active} currentIdx={currentIdx} setCurrentIdx={setCurrentIdx}
              elapsed={elapsed}
              onSpyglass={() => setScreen('spyglass')}
              onEndVoyage={handleEndVoyage}/>
          )}
          {screen === 'spyglass' && (
            <ScreenSpyglass pirates={pirates} active={active} minutes={minutes}
              onClose={() => setScreen('drive')}/>
          )}
          {screen === 'reveal' && (
            <ScreenReveal pirates={pirates} active={active} minutes={minutes}
              unlockIsland={latestUnlock} coastalFind={latestFind}
              onDone={() => setScreen('home')}/>
          )}
          {screen === 'map' && (
            <ScreenMap unlockedIds={unlockedIslandIds} drives={drives}
              onBack={() => setScreen('home')}
              onIslandTap={(isl) => setActiveIsland(isl)}/>
          )}
          {screen === 'gate' && (
            <ScreenMathGate
              onPass={() => setScreen('settings')}
              onCancel={() => setScreen(previousScreen)}/>
          )}
          {screen === 'settings' && (
            <ScreenSettings
              onBack={() => setScreen('home')}
              settings={{ ...t, pirates }}
              setSettings={(s) => {
                if (s.pirates) setPirates(s.pirates);
                t.set({
                  fairThreshold: s.fairThreshold,
                  harborThreshold: s.harborThreshold,
                  audio: s.audio,
                  fog: s.fog,
                });
              }}
              drives={drives}
              onReset={() => { setDrives([]); setUnlockedIslandIds([]); }}
              />
          )}

          {/* Roll Call modal */}
          {showRollCall && (
            <ScreenRollCall pirates={pirates}
              onCancel={() => setShowRollCall(false)}
              onSetSail={handleSetSail}/>
          )}
          {/* End-voyage confirm */}
          {showEndConfirm && (
            <ConfirmEnd onYes={confirmEndVoyage} onNo={() => setShowEndConfirm(false)}/>
          )}
          {/* Island detail */}
          {activeIsland && (
            <ScreenIslandDetail island={activeIsland} onClose={() => setActiveIsland(null)}/>
          )}
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Navigation">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {['welcome','names','crew','home','drive','spyglass','reveal','map','gate','settings'].map(s => (
              <button key={s} onClick={() => {
                if (s === 'drive') {
                  setMinutes([180, 90, 60]);  // demo data
                  setActive([true, true, true]);
                  setCurrentIdx(0);
                }
                if (s === 'spyglass') {
                  setMinutes([180, 90, 60]); setActive([true,true,true]);
                }
                if (s === 'reveal') {
                  // demo unlock
                  setMinutes([240, 220, 180]);
                  setActive([true,true,true]);
                  setLatestUnlock(window.ISLANDS[0]);
                  setLatestFind(null);
                }
                setScreen(s);
              }} style={{
                padding: '6px 8px', fontSize: 11, borderRadius: 8,
                background: screen === s ? '#E5B23A' : '#FBF1DC',
                color: '#2A2620', border: '1.5px solid #5D3F2A',
                fontFamily: 'sans-serif', cursor: 'pointer', fontWeight: 600,
              }}>{s}</button>
            ))}
          </div>
        </TweakSection>

        <TweakSection title="Drive simulation">
          <TweakToggle label="Demo fast clock (4s/sec)" value={t.demoFastClock}
            onChange={(v) => t.set('demoFastClock', v)}/>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={() => { setMinutes([m=>m]); setMinutes([180, 60, 30]); }}
              style={tweakBtn}>Lopsided</button>
            <button onClick={() => { setMinutes([120, 110, 100]); }}
              style={tweakBtn}>Balanced</button>
            <button onClick={() => { setMinutes([300, 80, 80]); }}
              style={tweakBtn}>Harbor</button>
          </div>
        </TweakSection>

        <TweakSection title="Tier thresholds">
          <TweakSlider label="Fair-Winds threshold (≤)" value={t.fairThreshold}
            min={0.5} max={0.7} step={0.01}
            onChange={(v) => t.set('fairThreshold', v)}/>
          <TweakSlider label="Harbor threshold (>)" value={t.harborThreshold}
            min={0.7} max={0.9} step={0.01}
            onChange={(v) => t.set('harborThreshold', v)}/>
        </TweakSection>

        <TweakSection title="Reveal preview">
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => {
              setMinutes([200, 180, 160]); setActive([true,true,true]);
              const locked = window.ISLANDS.filter(i => !unlockedIslandIds.includes(i.id));
              setLatestUnlock(locked[0] || window.ISLANDS[0]);
              setLatestFind(null);
              setScreen('reveal');
            }} style={tweakBtn}>Fair Winds</button>
            <button onClick={() => {
              setMinutes([200, 80, 80]); setActive([true,true,true]);
              setLatestUnlock(null); setLatestFind(window.COASTAL_FINDS[0]);
              setScreen('reveal');
            }} style={tweakBtn}>Coastal</button>
            <button onClick={() => {
              setMinutes([300, 60, 40]); setActive([true,true,true]);
              setLatestUnlock(null); setLatestFind(null);
              setScreen('reveal');
            }} style={tweakBtn}>Harbor</button>
          </div>
        </TweakSection>

        <TweakSection title="Map">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={tweakBtn} onClick={() => {
              setUnlockedIslandIds(window.ISLANDS.slice(0, 6).map(i => i.id));
            }}>Unlock 6 islands</button>
            <button style={tweakBtn} onClick={() => {
              setUnlockedIslandIds(window.ISLANDS.map(i => i.id));
            }}>Unlock all</button>
            <button style={tweakBtn} onClick={() => setUnlockedIslandIds([])}>
              Lock all
            </button>
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

const tweakBtn = {
  flex: 1, padding: '6px 8px', fontSize: 12, borderRadius: 8,
  background: '#F0D49B', color: '#2A2620', border: '1.5px solid #5D3F2A',
  fontFamily: 'sans-serif', cursor: 'pointer', fontWeight: 600,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
