import { useState, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api';

const STATUS_LABELS = {
  draft:           { label: 'In Progress',      color: '#818cf8', bg: 'rgba(99,102,241,0.15)'  },
  sent_to_sir:     { label: 'Waiting for Sir',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  sir_responded:   { label: "Sir's Opinion In", color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
  script_ready:    { label: 'Script Ready ✓',   color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  script_approved: { label: 'Script Approved',  color: '#34d399', bg: 'rgba(52,211,153,0.15)'  },
  hooks_ready:     { label: 'Hooks Ready 🪝',   color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
};

function getNextId() {
  try {
    const saved = localStorage.getItem('ahl_topics');
    if (saved) {
      const topics = JSON.parse(saved);
      if (topics.length > 0) return Math.max(...topics.map(t => t.id)) + 1;
    }
  } catch {}
  return 1;
}
let nextId = getNextId();

function createTopic(title, targetAudienceId = null) {
  return {
    id: nextId++,
    title,
    chatHistory: [], // Empty initially until angle is chosen
    suggestedAngles: [], // Populated by AI
    sirFeedback: '',
    audioFile: null,
    scriptVersions: [],
    status: 'draft',
    creatorId: null,
    targetAudienceId: targetAudienceId,
    hooks: [], // Generated hooks
    selectedHook: null, // Final approved hook
  };
}

/* ═══════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════ */
export default function App() {
  const [view, setView]                     = useState('board');
  const [isLoadingDB, setIsLoadingDB]       = useState(true);
  const [dbError, setDbError]               = useState('');
  
  // State initialization (defaults)
  const [topics, setTopics]                 = useState([]);
  const [activeTopic, setActiveTopic]       = useState(null);
  const [ideas, setIdeas]                   = useState([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [customTopic, setCustomTopic]       = useState('');
  const [error, setError]                   = useState('');

  const [sirStyleGuide, setSirStyleGuide]   = useState('');
  const [learnNotification, setLearnNotification] = useState(null);

  const [creatorReferences, setCreatorReferences] = useState([]);
  const [targetAudiences, setTargetAudiences] = useState([]);
  const [hookLibrary, setHookLibrary] = useState([]);
  
  const [activeCreatorId, setActiveCreatorId] = useState(null);
  const [activeAudienceId, setActiveAudienceId] = useState(null);

  // 1. Initial Load from Google Sheets DB
  useEffect(() => {
    fetch(`${API_URL}/db/load`)
      .then(res => res.json())
      .then(data => {
        if (data.topics) setTopics(data.topics);
        if (data.sirStyleGuide) setSirStyleGuide(data.sirStyleGuide);
        if (data.creatorReferences) setCreatorReferences(data.creatorReferences);
        if (data.targetAudiences) setTargetAudiences(data.targetAudiences);
        if (data.hookLibrary) setHookLibrary(data.hookLibrary);
        if (data.activeCreatorId !== undefined) setActiveCreatorId(data.activeCreatorId);
        if (data.activeAudienceId !== undefined) setActiveAudienceId(data.activeAudienceId);
      })
      .catch(e => {
        console.error("DB Load Error:", e);
        setDbError("Failed to connect to Google Sheets Database.");
      })
      .finally(() => setIsLoadingDB(false));
  }, []);

  // 2. Sync to DB whenever core state changes
  useEffect(() => {
    if (isLoadingDB) return; // Don't overwrite DB during initial load
    const payload = {
      topics,
      sirStyleGuide,
      creatorReferences,
      targetAudiences,
      hookLibrary,
      activeCreatorId: activeCreatorId || '',
      activeAudienceId: activeAudienceId || ''
    };
    fetch(`${API_URL}/db/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error("DB Sync Error:", e));
  }, [topics, sirStyleGuide, creatorReferences, targetAudiences, hookLibrary, activeCreatorId, activeAudienceId, isLoadingDB]);

  // Called every time Sir gives feedback on anything
  const learnFromFeedback = async ({ sirFeedback, scriptBefore, topic }) => {
    if (!sirFeedback?.trim()) return;
    try {
      const res = await fetch(`${API_URL}/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStyleGuide: sirStyleGuide, sirFeedback, scriptBefore, topic }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.isNewRule && data.updatedGuide) {
        setSirStyleGuide(data.updatedGuide);
        // Show notification briefly
        setLearnNotification(data.newPoint);
        setTimeout(() => setLearnNotification(null), 5000);
      }
    } catch { /* silent — learning is background, never block the user */ }
  };

  const updateTopic = (id, patch) =>
    setTopics(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));

  const openTopic = (id) => { setActiveTopic(id); setView('topic'); };

  const addTopic = (title, targetAudienceId = null) => {
    const t = createTopic(title, targetAudienceId);
    setTopics(prev => [...prev, t]);
    setActiveTopic(t.id);
    setView('topic');
  };

  const generateIdeas = async () => {
    setIsGeneratingIdeas(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      setIdeas(Array.isArray(data.ideas) ? data.ideas : []);
    } catch (e) {
      setError('Failed to generate ideas: ' + e.message);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const currentTopic = topics.find(t => t.id === activeTopic);

  if (isLoadingDB) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="loader" style={{ width: '40px', height: '40px', marginBottom: '1rem' }} />
        <h2>Syncing with Database...</h2>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '10vh' }}>
        <h2>⚠️ {dbError}</h2>
        <p>Please check your backend logs for Google Sheets connection issues.</p>
        <button className="btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="title">Viral Script Engine</h1>
        <p className="subtitle">American Hairline · Multi-Topic Pipeline</p>
      </header>

      {/* ── Global Nav ── */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className={`btn ${view === 'board' ? '' : 'btn-secondary'}`} onClick={() => setView('board')}>
          📋 Board {topics.length > 0 && `(${topics.length})`}
        </button>
        <button className={`btn ${view === 'ideas' ? '' : 'btn-secondary'}`} onClick={() => setView('ideas')}>
          ⚡ New Ideas
        </button>
        <button className={`btn ${view === 'guide' ? '' : 'btn-secondary'}`} onClick={() => setView('guide')}
          style={{ position: 'relative' }}>
          🧠 Sir's Style Guide {sirStyleGuide ? '●' : ''}
        </button>
        <button className={`btn ${view === 'creators' ? '' : 'btn-secondary'}`} onClick={() => setView('creators')}>
          🎬 Creator Playbook {activeCreatorId ? '●' : ''}
        </button>
        <button className={`btn ${view === 'audiences' ? '' : 'btn-secondary'}`} onClick={() => setView('audiences')}>
          🎯 Target Audience {activeAudienceId ? '●' : ''}
        </button>
        <button className={`btn ${view === 'hooks' ? '' : 'btn-secondary'}`} onClick={() => setView('hooks')}>
          🪝 Hook Library
        </button>
        {currentTopic && (
          <button className={`btn ${view === 'topic' ? '' : 'btn-secondary'}`} onClick={() => setView('topic')}>
            ✏️ {currentTopic.title.slice(0, 28)}{currentTopic.title.length > 28 ? '…' : ''}
          </button>
        )}
      </div>

      {/* ── Learn Notification Toast ── */}
      {learnNotification && (
        <div style={{
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: '12px', padding: '0.9rem 1.2rem', marginBottom: '1.5rem',
          color: '#6ee7b7', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          animation: 'fadeInDown 0.4s ease-out',
        }}>
          <span style={{ fontSize: '1.2rem' }}>🧠</span>
          <div>
            <strong>Style Guide Updated!</strong><br />
            <span style={{ fontSize: '0.9rem' }}>New rule learned: {learnNotification}</span>
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: '12px', padding: '0.9rem 1.2rem', marginBottom: '1.5rem',
          color: '#fca5a5', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}

      {view === 'board' && <BoardView topics={topics} setTopics={setTopics} onOpen={openTopic} onNew={() => setView('ideas')} updateTopic={updateTopic} setError={setError} />}
      {view === 'ideas' && <IdeasView ideas={ideas} isGenerating={isGeneratingIdeas} onGenerate={generateIdeas} onSelect={addTopic} customTopic={customTopic} setCustomTopic={setCustomTopic} targetAudiences={targetAudiences} />}
      {view === 'guide' && <StyleGuideView guide={sirStyleGuide} onUpdate={setSirStyleGuide} />}
      {view === 'creators' && <CreatorPlaybookView creatorReferences={creatorReferences} setCreatorReferences={setCreatorReferences} activeCreatorId={activeCreatorId} setActiveCreatorId={setActiveCreatorId} />}
      {view === 'audiences' && <TargetAudienceView targetAudiences={targetAudiences} setTargetAudiences={setTargetAudiences} activeAudienceId={activeAudienceId} setActiveAudienceId={setActiveAudienceId} />}
      {view === 'hooks' && <HookLibraryView hookLibrary={hookLibrary} setHookLibrary={setHookLibrary} />}
      {view === 'topic' && currentTopic && <TopicDetail topic={currentTopic} updateTopic={updateTopic} onBack={() => setView('board')} setError={setError} sirStyleGuide={sirStyleGuide} learnFromFeedback={learnFromFeedback} creatorReferences={creatorReferences} targetAudiences={targetAudiences} hookLibrary={hookLibrary} activeCreatorId={activeCreatorId} activeAudienceId={activeAudienceId} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BOARD VIEW
═══════════════════════════════════════════════ */
function BoardView({ topics, setTopics, onOpen, onNew, updateTopic, setError }) {
  if (topics.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</p>
        <h2 style={{ marginBottom: '0.5rem' }}>No topics yet</h2>
        <p className="subtitle" style={{ marginBottom: '2rem' }}>Generate ideas or add a custom topic.</p>
        <button className="btn" onClick={onNew}>⚡ Generate Ideas</button>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Topic Pipeline</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => {
            if (window.confirm('Clear ALL topics and scripts? This cannot be undone.')) {
              setTopics([]);
            }
          }} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>
            🗑 Clear All
          </button>
          <button className="btn" onClick={onNew} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>+ New Topic</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.2rem' }}>
        {topics.map(topic => (
          <TopicCard key={topic.id} topic={topic} onOpen={() => onOpen(topic.id)} updateTopic={updateTopic} setError={setError} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TOPIC CARD  (board)
═══════════════════════════════════════════════ */
function TopicCard({ topic, onOpen, updateTopic, setError }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const s = STATUS_LABELS[topic.status];
  const latestScript = topic.scriptVersions.at(-1)?.script || '';
  const versionCount = topic.scriptVersions.length;

  const markSentToSir = () => {
    const discussion = topic.chatHistory.map(m => `${m.role === 'user' ? 'WRITER' : 'AI'}: ${m.content}`).join('\n\n');
    const brief = `📌 TOPIC: ${topic.title}\n\n💬 DISCUSSION:\n${discussion}\n\n---\nSir, please share your thoughts on this angle.`;
    navigator.clipboard.writeText(brief).then(() => {
      updateTopic(topic.id, { status: 'sent_to_sir' });
      alert('Brief copied! Paste it in WhatsApp for Sir.');
    });
  };

  const generateScript = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const context = topic.chatHistory.map(m => `${m.role === 'user' ? 'WRITER' : 'AI'}: ${m.content}`).join('\n');
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.title, context, transcript: topic.sirFeedback }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.script) {
        updateTopic(topic.id, {
          scriptVersions: [{ version: 1, script: data.script, feedback: topic.sirFeedback }],
          status: 'script_ready',
        });
        onOpen();
      }
    } catch (e) { setError('Script generation failed: ' + e.message); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', margin: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40`, borderRadius: '20px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 600 }}>
          {s.label}
        </span>
        <button className="btn btn-secondary" onClick={onOpen} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>Open</button>
      </div>
      <h3 style={{ fontSize: '1rem', lineHeight: 1.4, marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>{topic.title}</h3>

      {topic.sirFeedback && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#6ee7b7', lineHeight: 1.4 }}>
          🎙️ Sir: "{topic.sirFeedback.slice(0, 100)}{topic.sirFeedback.length > 100 ? '…' : ''}"
        </div>
      )}

      {latestScript && (
        <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#c4b5fd', lineHeight: 1.4 }}>
          📝 v{versionCount}: {latestScript.slice(0, 90)}…
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {topic.status === 'draft' && (
          <button className="btn" onClick={markSentToSir} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flex: 1 }}>📋 Copy & Send to Sir</button>
        )}
        {topic.status === 'sir_responded' && (
          <button className="btn" onClick={generateScript} disabled={isGenerating} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flex: 1 }}>
            {isGenerating ? 'Generating…' : '✨ Generate Script'}
          </button>
        )}
        {topic.status === 'script_ready' && (
          <>
            <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(latestScript)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flex: 1 }}>📋 Copy Script</button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>v{versionCount}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   IDEAS VIEW
═══════════════════════════════════════════════ */
function IdeasView({ ideas, isGenerating, onGenerate, onSelect, customTopic, setCustomTopic, targetAudiences }) {
  const [selectedAudienceId, setSelectedAudienceId] = useState('');

  return (
    <div className="glass-panel">
      <h2>Generate Today's Ideas</h2>
      <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Pick as many as you want — each becomes its own independent topic card.</p>

      {targetAudiences.length > 0 && (
        <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            🎯 Target Audience for these topics (Optional)
          </label>
          <select className="input-field" value={selectedAudienceId} onChange={e => setSelectedAudienceId(e.target.value)}>
            <option value="">None (General Audience)</option>
            {targetAudiences.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      <button className="btn" onClick={onGenerate} disabled={isGenerating} style={{ marginBottom: '1.5rem' }}>
        {isGenerating ? <><div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating...</> : '⚡ Generate New Ideas'}
      </button>
      
      {ideas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ideas.map((idea, idx) => (
            <div key={idx} style={{ padding: '1rem 1.2rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--panel-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
              <span style={{ lineHeight: 1.5, flex: 1 }}><span style={{ color: 'var(--text-muted)', marginRight: '0.5rem', fontWeight: 600 }}>{idx + 1}.</span>{idea}</span>
              <button className="btn" onClick={() => onSelect(idea, selectedAudienceId || null)} style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}>Add →</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '2rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem' }}>
        <p className="subtitle" style={{ marginBottom: '0.75rem' }}>Or add a custom topic:</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input type="text" className="input-field" placeholder="Type your topic here..." value={customTopic} onChange={e => setCustomTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && customTopic.trim()) { onSelect(customTopic.trim(), selectedAudienceId || null); setCustomTopic(''); } }} />
          <button className="btn" disabled={!customTopic.trim()} style={{ whiteSpace: 'nowrap' }} onClick={() => { onSelect(customTopic.trim(), selectedAudienceId || null); setCustomTopic(''); }}>Add Topic</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TOPIC DETAIL
═══════════════════════════════════════════════ */
function TopicDetail({ topic, updateTopic, onBack, setError, sirStyleGuide, learnFromFeedback, creatorReferences, targetAudiences, activeCreatorId, activeAudienceId, hookLibrary }) {
  const [chatInput, setChatInput]     = useState('');
  const [isChatting, setIsChatting]   = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevising, setIsRevising]   = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [detailTab, setDetailTab]     = useState('chat');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [isTranscribingRevision, setIsTranscribingRevision] = useState(false);
  const [viewingVersion, setViewingVersion] = useState(null); // null = latest
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [topic.chatHistory, topic.suggestedAngles]);

  // Fetch angles if this is a brand new topic
  useEffect(() => {
    if (topic.chatHistory.length === 0 && (!topic.suggestedAngles || topic.suggestedAngles.length === 0) && !isGenerating) {
      const fetchAngles = async () => {
        setIsGenerating(true);
        try {
          const audienceRef = targetAudiences.find(a => a.id === topic.targetAudienceId);
          const targetAudience = audienceRef ? audienceRef.notes : null;
          const res = await fetch(`${API_URL}/angles`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic.title, targetAudience }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.angles) updateTopic(topic.id, { suggestedAngles: data.angles });
        } catch (e) {
          setError('Failed to generate angles. Please type your own below.');
        } finally {
          setIsGenerating(false);
        }
      };
      fetchAngles();
    }
  }, [topic.chatHistory, topic.suggestedAngles, topic.id, topic.title, topic.targetAudienceId, targetAudiences, updateTopic]);

  // Derived
  const latestScript   = topic.scriptVersions.at(-1)?.script || '';
  const versionCount   = topic.scriptVersions.length;
  const displayScript  = viewingVersion !== null ? topic.scriptVersions[viewingVersion]?.script : latestScript;
  const displayVersion = viewingVersion !== null ? viewingVersion + 1 : versionCount;

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;
    const userMsg = { role: 'user', content: chatInput };
    const updatedHistory = [...topic.chatHistory, userMsg];
    updateTopic(topic.id, { chatHistory: updatedHistory });
    setChatInput('');
    setIsChatting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: updatedHistory }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      updateTopic(topic.id, { chatHistory: [...updatedHistory, { role: 'assistant', content: data.reply || 'No reply.' }] });
    } catch (e) {
      setError('Chat failed: ' + e.message);
    } finally { setIsChatting(false); }
  };

  const copyBrief = () => {
    const discussion = topic.chatHistory.map(m => `${m.role === 'user' ? 'WRITER' : 'AI'}: ${m.content}`).join('\n\n');
    const brief = `📌 TOPIC: ${topic.title}\n\n💬 DISCUSSION:\n${discussion}\n\n---\nSir, please share your thoughts on this angle.`;
    navigator.clipboard.writeText(brief).then(() => {
      updateTopic(topic.id, { status: 'sent_to_sir' });
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2500);
    });
  };

  const handleAudioUpload = async (e, isRevisionAudio = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isRevisionAudio) setIsTranscribingRevision(true); else setIsTranscribing(true);
    setError('');
    const formData = new FormData();
    formData.append('audio', file);
    try {
      const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (isRevisionAudio) {
        setRevisionFeedback(data.text || '');
      } else {
        updateTopic(topic.id, { sirFeedback: data.text || '', status: 'sir_responded' });
      }
    } catch (e) { setError('Transcription failed: ' + e.message); }
    finally {
      if (isRevisionAudio) setIsTranscribingRevision(false); else setIsTranscribing(false);
    }
  };

  const generateScript = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const creatorRef = creatorReferences.find(c => c.id === activeCreatorId);
      const creatorInspiration = creatorRef ? creatorRef.styleNotes : null;
      const audienceRef = targetAudiences.find(a => a.id === topic.targetAudienceId);
      const targetAudience = audienceRef ? audienceRef.notes : null;

      const context = topic.chatHistory.map(m => `${m.role === 'user' ? 'WRITER' : 'AI'}: ${m.content}`).join('\n');
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.title, context, transcript: topic.sirFeedback, sirStyleGuide, creatorInspiration, targetAudience }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.script) {
        updateTopic(topic.id, {
          scriptVersions: [{ version: 1, script: data.script, feedback: topic.sirFeedback }],
          status: 'script_ready',
        });
        setViewingVersion(null);
        setDetailTab('script');
      }
    } catch (e) { setError('Script generation failed: ' + e.message); }
    finally {
      setIsGenerating(false);
      // Trigger learning in background — silent, never blocks
      learnFromFeedback({ sirFeedback: topic.sirFeedback, scriptBefore: '', topic: topic.title });
    }
  };

  // ── REVISION: Sir gives feedback on a script, generate a new version ──
  const reviseScript = async () => {
    if (!revisionFeedback.trim()) return;
    setIsRevising(true);
    setError('');
    try {
      const currentScript = latestScript;
      // Pass all previous versions so the model knows the full history
      const previousRevisions = topic.scriptVersions.slice(0, -1).map(v => ({
        script: v.script,
        feedback: v.feedback,
      }));

      const creatorRef = creatorReferences.find(c => c.id === activeCreatorId);
      const creatorInspiration = creatorRef ? creatorRef.styleNotes : null;
      const audienceRef = targetAudiences.find(a => a.id === topic.targetAudienceId);
      const targetAudience = audienceRef ? audienceRef.notes : null;

      const instruction = sirStyleGuide
        ? `SIR'S STYLE GUIDE (apply these):\n${sirStyleGuide}\n\nSir's specific note on this draft:\n${revisionFeedback}`
        : revisionFeedback;

      const res = await fetch(`${API_URL}/revise`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentScript, sirFeedback: revisionFeedback, previousRevisions, sirStyleGuide, creatorInspiration, targetAudience }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.script) {
        const newVersions = [
          ...topic.scriptVersions,
          { version: topic.scriptVersions.length + 1, script: data.script, feedback: revisionFeedback },
        ];
        updateTopic(topic.id, { scriptVersions: newVersions });
        setRevisionFeedback('');
        setViewingVersion(null); // show latest
        // Learn from this revision in the background
        learnFromFeedback({ sirFeedback: revisionFeedback, scriptBefore: currentScript, topic: topic.title });
      }
    } catch (e) { setError('Revision failed: ' + e.message); }
    finally { setIsRevising(false); }
  };

  const generateHooks = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/hooks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: latestScript, hookLibrary }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.hooks) {
        updateTopic(topic.id, {
          hooks: data.hooks,
          status: 'hooks_ready',
        });
        setDetailTab('hooks');
      }
    } catch (e) { setError('Hook generation failed: ' + e.message); }
    finally { setIsGenerating(false); }
  };

  const s = STATUS_LABELS[topic.status];

  const audienceSelector = (
    <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Target Audience (Optional)
      </label>
      <select className="input-field" style={{ padding: '0.5rem' }} value={topic.targetAudienceId || ''} onChange={e => updateTopic(topic.id, { targetAudienceId: e.target.value || null })}>
        <option value="">None (General Audience)</option>
        {targetAudiences.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="glass-panel">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>← Board</button>
          <h2 style={{ fontSize: '1.2rem', lineHeight: 1.4 }}>{topic.title}</h2>
        </div>
        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40`, borderRadius: '20px', padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 600, alignSelf: 'flex-start' }}>
          {s.label}
        </span>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'chat',        label: '💬 Discuss' },
          { key: 'sirs_opinion',label: "🎙️ Sir's Opinion" },
          { key: 'script',      label: `📝 Script${versionCount > 0 ? ` (v${versionCount})` : ''}` },
          { key: 'hooks',       label: '🪝 Hooks' },
        ].map(tab => (
          <button key={tab.key} className={`btn ${detailTab !== tab.key ? 'btn-secondary' : ''}`}
            onClick={() => setDetailTab(tab.key)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {detailTab === 'chat' && (
        <>
          <div className="chat-box">
            {topic.chatHistory.length === 0 && (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <p style={{ marginBottom: '1rem', color: '#a5b4fc', fontWeight: 600 }}>✨ AI Suggested Angles for "{topic.title}"</p>
                
                {isGenerating && (!topic.suggestedAngles || topic.suggestedAngles.length === 0) ? (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <div className="loader" /> Brainstorming 5 tailored angles...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(topic.suggestedAngles || []).map((angle, idx) => (
                      <div key={idx} style={{ padding: '0.8rem 1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                        onClick={() => {
                          updateTopic(topic.id, {
                            chatHistory: [
                              { role: 'assistant', content: `Great! Topic selected:\n\n"${topic.title}"\n\nHow do you want to approach this? What angle, hook, or story are you thinking?` },
                              { role: 'user', content: `Let's use this angle:\n\n${angle}` },
                              { role: 'assistant', content: 'Excellent choice! I have noted the angle. If this looks good, copy the brief and send it to Sir for his opinion.' }
                            ]
                          });
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                          <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{angle}</span>
                          <span style={{ color: '#818cf8', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 600 }}>Use Angle →</span>
                        </div>
                      </div>
                    ))}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Or skip these and type your own custom angle below:</p>
                  </div>
                )}
              </div>
            )}
            {topic.chatHistory.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role === 'user' ? 'chat-user' : 'chat-ai'}`} style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            ))}
            {isChatting && <div className="chat-message chat-ai"><div className="loader" /></div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChat} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <input type="text" className="input-field" placeholder={topic.chatHistory.length === 0 ? "Type your own custom angle here..." : "Refine the angle, or paste Sir's text feedback..."} value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isChatting} />
            <button type="submit" className="btn" disabled={isChatting || !chatInput.trim()}>Send</button>
          </form>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={copyBrief} disabled={topic.chatHistory.length === 0}>{briefCopied ? '✓ Copied for Sir!' : '📋 Copy Brief for Sir'}</button>
            <button className="btn btn-secondary" onClick={() => setDetailTab('sirs_opinion')}>Add Sir's Opinion →</button>
          </div>
        </>
      )}

      {/* ── SIR'S OPINION TAB ── */}
      {detailTab === 'sirs_opinion' && (
        <>
          <label className="dropzone" style={{ display: 'block', cursor: 'pointer', marginBottom: '1.5rem' }}>
            <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => handleAudioUpload(e, false)} disabled={isTranscribing} />
            {isTranscribing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="loader" /><span>Transcribing with Whisper AI…</span>
              </div>
            ) : (
              <div><p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎙️</p><h3 style={{ marginBottom: '0.5rem' }}>Upload Sir's Voice Note</h3><p style={{ color: 'var(--text-muted)' }}>MP3, OGG, M4A, WAV, WEBM · Click to upload</p></div>
            )}
          </label>
          <h4 style={{ marginBottom: '0.5rem' }}>Sir's Feedback (type or paste directly):</h4>
          <textarea className="input-field" style={{ minHeight: '120px', resize: 'vertical' }}
            value={topic.sirFeedback}
            onChange={e => updateTopic(topic.id, { sirFeedback: e.target.value, status: e.target.value.trim() ? 'sir_responded' : topic.status })}
            placeholder="Paste Sir's text reply, or upload the audio above to auto-transcribe…" />
          <div style={{ marginTop: '1.5rem' }}>
            {targetAudiences.length > 0 && audienceSelector}
            <button className="btn" onClick={generateScript} disabled={isGenerating || !topic.sirFeedback.trim()}>
              {isGenerating ? <><div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating…</> : '✨ Generate Script'}
            </button>
          </div>
        </>
      )}

      {/* ── SCRIPT TAB ── */}
      {detailTab === 'script' && (
        <>
          {versionCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</p>
              <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
                {topic.sirFeedback ? "Sir's opinion is in! Generate the script." : "Add Sir's opinion first, then generate the script."}
              </p>
              {topic.sirFeedback && (
                <>
                  {targetAudiences.length > 0 && <div style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto 1rem auto' }}>{audienceSelector}</div>}
                  <button className="btn" onClick={generateScript} disabled={isGenerating}>
                    {isGenerating ? <><div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating…</> : '✨ Generate Script'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Version navigator */}
              {versionCount > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Version:</span>
                  {topic.scriptVersions.map((v, idx) => (
                    <button key={idx}
                      className={`btn ${(viewingVersion === null ? versionCount - 1 : viewingVersion) !== idx ? 'btn-secondary' : ''}`}
                      onClick={() => setViewingVersion(idx === versionCount - 1 ? null : idx)}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                      v{v.version}{idx === versionCount - 1 ? ' (latest)' : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* Script display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4>Script — Version {displayVersion}</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                    onClick={() => { navigator.clipboard.writeText(displayScript || ''); setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000); }}>
                    {scriptCopied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  {viewingVersion === null && (
                    <button className="btn" style={{ background: '#10b981', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                      onClick={generateHooks} disabled={isGenerating}>
                      {isGenerating ? 'Generating Hooks...' : '✅ Approve & Generate Hooks'}
                    </button>
                  )}
                </div>
              </div>
              <div className="script-output" style={{ marginBottom: '2rem' }}>{displayScript}</div>

              {/* ── REVISION SECTION ── always visible when script exists */}
              <div style={{
                background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '16px',
                padding: '1.5rem',
              }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#fbbf24' }}>
                  🔄 Sir's Revision Feedback
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  If Sir doesn't like this version, add his feedback here and generate a new version. You can do this as many times as needed.
                  {versionCount > 1 && <span style={{ color: '#fbbf24' }}> ({versionCount} versions so far)</span>}
                </p>

                {/* Upload audio for revision */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(245,158,11,0.4)',
                  borderRadius: '10px', padding: '0.75rem 1rem', cursor: 'pointer',
                  marginBottom: '1rem', fontSize: '0.9rem',
                }}>
                  <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => handleAudioUpload(e, true)} disabled={isTranscribingRevision} />
                  {isTranscribingRevision ? <><div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Transcribing…</> : <><span>🎙️</span> Upload Sir's voice note about this script (auto-transcribes)</>}
                </label>

                <textarea
                  className="input-field"
                  style={{ minHeight: '100px', resize: 'vertical', marginBottom: '1rem', borderColor: revisionFeedback.trim() ? 'rgba(245,158,11,0.5)' : undefined }}
                  value={revisionFeedback}
                  onChange={e => setRevisionFeedback(e.target.value)}
                  placeholder="Paste Sir's feedback about the script, or upload his audio above… e.g. 'Make the hook more aggressive, change the CTA to comment-based'"
                />

                <button className="btn" onClick={reviseScript} disabled={isRevising || !revisionFeedback.trim()}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 15px rgba(245,158,11,0.4)' }}>
                  {isRevising
                    ? <><div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating v{versionCount + 1}…</>
                    : `🔄 Generate v${versionCount + 1}`}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── HOOKS TAB ── */}
      {detailTab === 'hooks' && (
        <>
          {(!topic.hooks || topic.hooks.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🪝</p>
              <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
                Hooks haven't been generated yet. Approve a script first!
              </p>
              {versionCount > 0 && (
                <button className="btn" onClick={generateHooks} disabled={isGenerating}>
                  {isGenerating ? <><div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating…</> : '✨ Generate Hooks Now'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <p style={{ marginBottom: '1rem', color: '#f472b6', fontWeight: 600 }}>✨ AI Suggested Hooks (Powered by Hook Library)</p>
              {topic.selectedHook ? (
                <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', color: '#a7f3d0' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: '#34d399' }}>Final Approved Hook</h4>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{topic.selectedHook}</p>
                  <button className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => updateTopic(topic.id, { selectedHook: null, status: 'script_approved' })}>
                    Undo Selection
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {topic.hooks.map((hook, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: 'rgba(244,114,182,0.08)', borderRadius: '8px', border: '1px solid rgba(244,114,182,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,114,182,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,114,182,0.08)'}
                      onClick={() => updateTopic(topic.id, { selectedHook: hook, status: 'hooks_ready' })}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <span style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{hook}</span>
                        <span style={{ color: '#f472b6', fontSize: '0.85rem', whiteSpace: 'nowrap', fontWeight: 600 }}>Approve This Hook →</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button className="btn btn-secondary" onClick={generateHooks} disabled={isGenerating}>
                      {isGenerating ? 'Regenerating...' : '🔄 Generate 6 New Hooks'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STYLE GUIDE VIEW
═══════════════════════════════════════════════ */
function StyleGuideView({ guide, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(guide);

  if (!guide) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</p>
        <h2 style={{ marginBottom: '0.5rem' }}>Sir's Style Guide</h2>
        <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
          This guide is empty right now. It will automatically grow every time Sir gives feedback on a script.
          <br /><br />
          The AI analyzes each piece of feedback, checks if the insight is new, and adds it here with context.
        </p>
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '1.2rem', textAlign: 'left', maxWidth: '480px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.9rem', color: '#a5b4fc', lineHeight: 1.7 }}>
            <strong>How it works:</strong><br />
            1. Generate a script for a topic<br />
            2. Sir gives feedback (“make the hook more aggressive” etc.)<br />
            3. The AI checks: is this a NEW rule or already known?<br />
            4. If new → it's added here automatically with context<br />
            5. All future scripts are automatically written using this guide
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🧠 Sir's Style Guide</h2>
          <p className="subtitle">Auto-learned from Sir's feedback. Applied to every script automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setDraft(guide); }}>Cancel</button>
              <button className="btn" onClick={() => { onUpdate(draft); setIsEditing(false); }}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (window.confirm('Clear the entire Style Guide? Sir will have to re-teach all preferences.')) {
                  onUpdate('');
                }
              }} style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>🗑 Clear</button>
              <button className="btn btn-secondary" onClick={() => { setDraft(guide); setIsEditing(true); }}>✏️ Edit</button>
              <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(guide)}>📋 Copy</button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          className="input-field"
          style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '0.9rem', resize: 'vertical' }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--panel-border)',
          borderRadius: '12px',
          padding: '1.5rem',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.8,
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.95rem',
          minHeight: '200px',
        }}>
          {guide}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', fontSize: '0.85rem', color: '#a5b4fc' }}>
        💡 This guide updates automatically in the background whenever Sir gives feedback. You can also manually edit or add rules by clicking "Edit".
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CREATOR PLAYBOOK VIEW
═══════════════════════════════════════════════ */
function CreatorPlaybookView({ creatorReferences, setCreatorReferences, activeCreatorId, setActiveCreatorId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState('');
  const [newCreatorNotes, setNewCreatorNotes] = useState('');

  const handleSave = () => {
    if (!newCreatorName.trim() || !newCreatorNotes.trim()) return;
    setCreatorReferences([
      ...creatorReferences,
      { id: Date.now().toString(), name: newCreatorName.trim(), styleNotes: newCreatorNotes.trim() }
    ]);
    setIsAdding(false);
    setNewCreatorName('');
    setNewCreatorNotes('');
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this creator reference?")) {
      setCreatorReferences(creatorReferences.filter(c => c.id !== id));
      if (activeCreatorId === id) setActiveCreatorId(null);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🎬 Creator Playbook</h2>
          <p className="subtitle">Save techniques and pacing styles from other creators for inspiration.</p>
        </div>
        <button className="btn" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Creator'}
        </button>
      </div>

      <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#a5b4fc', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Break down a creator's technique (hook structure, pacing, transitions) and save it. Turn a creator <strong>ON</strong> to automatically instruct the AI to mimic their pacing style for ALL new script generations. The AI is strictly instructed to apply these techniques ONLY if they don't break Sir's learned Style Guide or AHL brand rules.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Creator Technique</h3>
          <input
            type="text"
            className="input-field"
            placeholder="Creator Name or Handle (e.g. Ali Abdaal)"
            value={newCreatorName}
            onChange={e => setNewCreatorName(e.target.value)}
            style={{ marginBottom: '1rem' }}
          />
          <textarea
            className="input-field"
            placeholder="Breakdown of their style. E.g. 'Hooks always start with a fast paced 2-beat sentence, followed by a 1-second pause. They use list-style structures heavily...'"
            value={newCreatorNotes}
            onChange={e => setNewCreatorNotes(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn" onClick={handleSave} disabled={!newCreatorName.trim() || !newCreatorNotes.trim()}>
            Save Creator Reference
          </button>
        </div>
      )}

      {creatorReferences.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No creator references added yet. Click "+ Add Creator" to start building the playbook.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {creatorReferences.map(creator => {
            const isActive = activeCreatorId === creator.id;
            return (
              <div key={creator.id} style={{ 
                background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)', 
                border: isActive ? '1px solid #6366f1' : '1px solid var(--panel-border)', 
                borderRadius: '10px', padding: '1.2rem',
                boxShadow: isActive ? '0 0 15px rgba(99,102,241,0.2)' : 'none',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{creator.name}</h3>
                  <button onClick={() => handleDelete(creator.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0, marginBottom: '1rem' }}>
                  {creator.styleNotes}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  {isActive ? (
                    <button className="btn" style={{ flex: 1, background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', color: '#a5b4fc' }} onClick={() => setActiveCreatorId(null)}>
                      🟢 ON (Turn Off)
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveCreatorId(creator.id)}>
                      ⚪ Turn ON
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TARGET AUDIENCE VIEW
═══════════════════════════════════════════════ */
function TargetAudienceView({ targetAudiences, setTargetAudiences, activeAudienceId, setActiveAudienceId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newNotes.trim()) return;
    setTargetAudiences([
      ...targetAudiences,
      { id: Date.now().toString(), name: newName.trim(), notes: newNotes.trim() }
    ]);
    setIsAdding(false);
    setNewName('');
    setNewNotes('');
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this target audience?")) {
      setTargetAudiences(targetAudiences.filter(a => a.id !== id));
      if (activeAudienceId === id) setActiveAudienceId(null);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🎯 Target Audience Groups</h2>
          <p className="subtitle">Define specific buyer personas to instruct the AI's tone and terminology.</p>
        </div>
        <button className="btn" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Audience'}
        </button>
      </div>

      <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#a5b4fc', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Create deep psychological profiles for different demographics (e.g. 'Men 20-30 worried about early recession', 'Women considering extensions'). The AI will adjust its empathy, vocabulary, and pain-points when an audience is active.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Target Audience</h3>
          <input
            type="text"
            className="input-field"
            placeholder="Audience Profile Name (e.g. Young professionals in tech)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ marginBottom: '1rem' }}
          />
          <textarea
            className="input-field"
            placeholder="Psychological Profile & Pain Points. E.g. 'They are highly analytical, worried about the cost and social stigma at work. They want to know the science behind the system and need logical reassurance...'"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn" onClick={handleSave} disabled={!newName.trim() || !newNotes.trim()}>
            Save Target Audience
          </button>
        </div>
      )}

      {targetAudiences.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No target audiences added yet. Click "+ Add Audience" to start building.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {targetAudiences.map(audience => {
            const isActive = activeAudienceId === audience.id;
            return (
              <div key={audience.id} style={{ 
                background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', 
                border: isActive ? '1px solid #10b981' : '1px solid var(--panel-border)', 
                borderRadius: '10px', padding: '1.2rem',
                boxShadow: isActive ? '0 0 15px rgba(16,185,129,0.2)' : 'none',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{audience.name}</h3>
                  <button onClick={() => handleDelete(audience.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0, marginBottom: '1rem' }}>
                  {audience.notes}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  {isActive ? (
                    <button className="btn" style={{ flex: 1, background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#6ee7b7' }} onClick={() => setActiveAudienceId(null)}>
                      🟢 ON (Turn Off)
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveAudienceId(audience.id)}>
                      ⚪ Turn ON
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HOOK LIBRARY VIEW
═══════════════════════════════════════════════ */
function HookLibraryView({ hookLibrary, setHookLibrary }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState('Visual');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newNotes.trim()) return;
    setHookLibrary([
      ...hookLibrary,
      { id: Date.now().toString(), type: newType, name: newName.trim(), notes: newNotes.trim() }
    ]);
    setIsAdding(false);
    setNewName('');
    setNewNotes('');
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this hook template?")) {
      setHookLibrary(hookLibrary.filter(h => h.id !== id));
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🪝 Hook Library</h2>
          <p className="subtitle">Build a knowledge base of proven visual, action, and text hooks.</p>
        </div>
        <button className="btn" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Hook Template'}
        </button>
      </div>

      <div style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#fbcfe8', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Define specific hook formulas that work for American Hairline. When a script is approved, the AI will use this library as strict inspiration to generate varied hooks for the writer to film.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Hook Template</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <select className="input-field" style={{ flex: '0 0 150px' }} value={newType} onChange={e => setNewType(e.target.value)}>
              <option value="Visual">Visual Hook</option>
              <option value="Action">Action Hook</option>
              <option value="Text">Text Hook</option>
              <option value="Verbal">Verbal Hook</option>
            </select>
            <input
              type="text"
              className="input-field"
              style={{ flex: 1 }}
              placeholder="Template Name (e.g. The Reveal Swipe)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <textarea
            className="input-field"
            placeholder="Describe the formula. E.g. 'Camera starts close on the hairline. The person's hand swipes across the forehead revealing the natural parting before speaking...'"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn" onClick={handleSave} disabled={!newName.trim() || !newNotes.trim()}>
            Save Hook Template
          </button>
        </div>
      )}

      {hookLibrary.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hook templates added yet. Click "+ Add Hook Template" to start.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {hookLibrary.map(hook => (
            <div key={hook.id} style={{ 
              background: 'rgba(255,255,255,0.04)', 
              border: '1px solid var(--panel-border)', 
              borderRadius: '10px', padding: '1.2rem',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{hook.name}</h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(244,114,182,0.15)', color: '#fbcfe8', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(244,114,182,0.3)' }}>
                  {hook.type}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1, whiteSpace: 'pre-wrap' }}>
                {hook.notes}
              </p>
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', textAlign: 'right' }}>
                <button onClick={() => handleDelete(hook.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
