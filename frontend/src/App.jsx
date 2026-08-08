import { useState, useRef, useEffect } from 'react';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

const STATUS_LABELS = {
  idea:            { label: 'Idea',             color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  draft:           { label: 'In Progress',      color: '#818cf8', bg: 'rgba(99,102,241,0.15)'  },
  sent_to_sir:     { label: 'Waiting for Sir',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  sir_responded:   { label: "Sir's Opinion In", color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
  script_ready:    { label: 'Script Ready ✓',   color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  script_approved: { label: 'Script Approved',  color: '#34d399', bg: 'rgba(52,211,153,0.15)'  },
  hooks_ready:     { label: 'Hooks Ready 🪝',   color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  ready_to_shoot:  { label: 'Ready to Shoot 🎬',color: '#fbbf24', bg: 'rgba(251,191,36,0.15)'  },
};

const AGENTS_LIST = [
  { id: 1, key: 'research', name: '1. Research Agent', icon: '🔬', mission: 'Discover high-value content opportunities.', responsibilities: ['Competitor research', 'Audience pain points', 'Frequently asked questions', 'Industry trends', 'IG/YT/Reddit/Quora research', 'Comment analysis', 'Consumer psychology', 'Market gaps'] },
  { id: 2, key: 'angle_generator', name: '2. Content Angle Generator', icon: '🧭', mission: 'Generate unique angles from a single topic across 19 formats.', responsibilities: ['Create 50–100 content angles', 'Myths, Mistakes, Comparisons, Reactions, Consultations, Celebrity examples, Case studies, Experiments, POVs, Storytelling, FAQs, Objections, Cost breakdowns, Emotional stories, Beginner mistakes, Behind the scenes, Before vs After, Day-in-the-life, Do\'s & Don\'ts'] },
  { id: 3, key: 'strategist', name: '3. Content Strategist', icon: '🎯', mission: 'Decide what content should be produced.', responsibilities: ['Prioritize content ideas', 'Select highest-impact angle', 'Define target audience', 'Define objective: Views/Shares/Saves/Leads', 'Build content calendar', 'Decide content format'] },
  { id: 4, key: 'hook_specialist', name: '4. Hook Specialist', icon: '🪝', mission: 'Maximize scroll-stopping power.', responsibilities: ['Generate multiple hooks', 'Pattern interrupts', 'Curiosity gaps', 'Opening visuals', 'First 3-sec optimization', 'Thumbnail opening frame suggestions'] },
  { id: 5, key: 'script_writer', name: '5. Script Writer', icon: '📝', mission: 'Write high-retention scripts.', responsibilities: ['Reel scripts', 'Storytelling', 'Strong CTA', 'Retention loops', 'Conversational language', 'Multiple script versions'] },
  { id: 6, key: 'creative_director', name: '6. Creative Director', icon: '🎬', mission: 'Plan visual execution.', responsibilities: ['Shot list', 'Camera angles', 'B-roll ideas', 'Props', 'Lighting suggestions', 'Expressions', 'Transitions', 'On-screen text', 'Music suggestions', 'Visual storytelling'] },
  { id: 7, key: 'thumbnail_strategist', name: '7. Thumbnail Strategist', icon: '🖼️', mission: 'Maximize click-through rate (CTR).', responsibilities: ['Thumbnail psychology', 'Thumbnail concept', 'Thumbnail copy', 'Emotion to trigger', 'Best frame selection', 'A/B testing concepts', 'CTR optimization'] },
  { id: 8, key: 'thumbnail_designer', name: '8. Thumbnail Designer', icon: '🎨', mission: 'Create the final thumbnail specifications.', responsibilities: ['Execute approved concept', 'Typography', 'Layout', 'Cut-outs', 'Background cleanup', 'Color correction', 'Branding consistency', 'Export-ready files'] },
  { id: 9, key: 'video_editor', name: '9. Video Editor Agent', icon: '✂️', mission: 'Maximize viewer retention.', responsibilities: ['Edit pacing', 'Remove dead moments', 'Graphics', 'Captions', 'Sound effects', 'Zooms', 'Motion graphics', 'Retention improvements', 'Platform optimization'] },
  { id: 10, key: 'brand_consistency', name: '10. Brand Consistency', icon: '🛡️', mission: 'Ensure every reel strengthens the brand.', responsibilities: ['Brand voice', 'Messaging consistency', 'Premium positioning', 'Educational tone', 'Claims verification', 'CTA consistency', 'Brand guideline compliance'] },
  { id: 11, key: 'quality_control', name: '11. Quality Control (QC)', icon: '✅', mission: 'Critique every reel before publishing.', responsibilities: ['Review hook', 'Review script', 'Review visuals', 'Review thumbnail', 'Review edit', 'Identify weak sections', 'Identify drop-off risks', 'Improve clarity', 'Check factual accuracy', 'Score overall quality'] },
  { id: 12, key: 'analytics', name: '12. Analytics Agent', icon: '📊', mission: 'Continuously improve content performance.', responsibilities: ['Analyze views', 'Hook retention', 'Average watch time', 'Shares', 'Saves', 'Comments', 'Leads generated', 'CTR', 'Identify winning patterns', 'Recommend future improvements'] }
];

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

function createTopic(title, targetAudienceId = null, brandVoiceId = null) {
  return {
    id: nextId++,
    title,
    chatHistory: [], // Empty initially until angle is chosen
    suggestedAngles: [], // Populated by AI
    sirFeedback: '',
    audioFile: null,
    scriptVersions: [],
    agentOutputs: {}, // Populated by the 12 specialized agents
    status: 'draft',
    creatorId: null,
    targetAudienceId: targetAudienceId,
    brandVoiceId: brandVoiceId,
    hooks: [], // Generated hooks
    selectedHook: null, // Final approved hook
  };
}

/* ═══════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════ */
function App() {
  const [view, setView]                     = useState('board');
  const [isLoadingDB, setIsLoadingDB]       = useState(true);
  const [dbLoadSuccess, setDbLoadSuccess]   = useState(false);
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
  const [brandVoices, setBrandVoices] = useState([]);
  const [thumbnailStyles, setThumbnailStyles] = useState([]);
  const [editingStyles, setEditingStyles] = useState([]);
  const [videoFormats, setVideoFormats] = useState([]);
  
  const [activeCreatorId, setActiveCreatorId] = useState(null);
  const [activeAudienceId, setActiveAudienceId] = useState(null);
  const [activeBrandVoiceId, setActiveBrandVoiceId] = useState(null);
  const [activeThumbnailStyleId, setActiveThumbnailStyleId] = useState(null);
  const [activeEditingStyleId, setActiveEditingStyleId] = useState(null);

  // 1. Initial Load from Google Sheets DB
  useEffect(() => {
    fetch(`${API_URL}/db/load`)
      .then(res => {
        if (!res.ok) throw new Error("DB response not ok");
        return res.json();
      })
      .then(data => {
        if (data.topics) setTopics(data.topics);
        if (data.sirStyleGuide) setSirStyleGuide(data.sirStyleGuide);
        if (data.creatorReferences) setCreatorReferences(data.creatorReferences);
        if (data.targetAudiences) setTargetAudiences(data.targetAudiences);
        if (data.hookLibrary) setHookLibrary(data.hookLibrary);
        
        if (data.brandVoices && data.brandVoices.length > 0) {
          setBrandVoices(data.brandVoices);
        } else {
          // Pre-fill American Hairline if empty
          setBrandVoices([{
            id: 1, name: 'American Hairline (AHL)', tone: 'Premium clinical positioning',
            rules: 'Must be empathetic, authoritative, and non-salesy. Do not make false medical promises. Focus on world-class non-surgical hair restoration.'
          }]);
        }
        if (data.thumbnailStyles && data.thumbnailStyles.length > 0) {
          setThumbnailStyles(data.thumbnailStyles);
        } else {
          setThumbnailStyles([{
            id: 1, name: 'AHL Default Thumbnail', 
            rules: '1. Visual Concept & Frame Selection (what exact moment from the video is frozen)\n2. Emotion to Trigger (curiosity, shock, relief, empathy)\n3. Big Bold Text Overlay (3-4 words max, contrasting with the spoken hook)\n4. A/B Testing rationale'
          }]);
        }

        if (data.editingStyles && data.editingStyles.length > 0) {
          setEditingStyles(data.editingStyles);
        } else {
          setEditingStyles([{
            id: 1, name: 'AHL Fast Paced Retention', 
            rules: '1. Pacing & Cut Rules (remove all dead air, J-cuts and L-cuts, jump cuts every 2.5-3 seconds)\n2. Visual Graphics & Zooms (subtle punch-ins on key words, kinetic typography for captions)\n3. SFX & Sound Design (subtle whooshes, risers, heartbeat audio during reveals)\n4. Platform Optimization (9:16 vertical safe zones, loop transition at the end)'
          }]);
        }

        if (data.videoFormats && data.videoFormats.length > 0) {
          setVideoFormats(data.videoFormats);
        } else {
          setVideoFormats([{
            id: 1, name: 'Educational Reels', baseType: 'reel', rules: 'Focus heavily on teaching the audience something new. Break down complex medical/hair replacement concepts into simple, easily understandable analogies. Never sound like a textbook; sound like a trusted expert explaining it to a friend.'
          }]);
        }
        
        if (data.activeCreatorId !== undefined) setActiveCreatorId(data.activeCreatorId);
        if (data.activeAudienceId !== undefined) setActiveAudienceId(data.activeAudienceId);
        if (data.activeBrandVoiceId !== undefined) setActiveBrandVoiceId(data.activeBrandVoiceId || 1);
        if (data.activeThumbnailStyleId !== undefined) setActiveThumbnailStyleId(data.activeThumbnailStyleId || 1);
        if (data.activeEditingStyleId !== undefined) setActiveEditingStyleId(data.activeEditingStyleId || 1);
        
        setDbLoadSuccess(true);
      })
      .catch(e => {
        console.error("DB Load Error:", e);
        setDbError("Failed to connect to Google Sheets Database. Your data will not be saved to prevent overwriting.");
      })
      .finally(() => setIsLoadingDB(false));
  }, []);

  // 2. Sync to DB whenever core state changes
  useEffect(() => {
    if (isLoadingDB || !dbLoadSuccess) return; // Don't overwrite DB during initial load or if load failed
    const payload = {
      topics,
      sirStyleGuide,
      creatorReferences,
      targetAudiences,
      hookLibrary,
      brandVoices,
      thumbnailStyles,
      editingStyles,
      videoFormats,
      activeCreatorId: activeCreatorId || '',
      activeAudienceId: activeAudienceId || '',
      activeBrandVoiceId: activeBrandVoiceId || '',
      activeThumbnailStyleId: activeThumbnailStyleId || '',
      activeEditingStyleId: activeEditingStyleId || ''
    };
    fetch(`${API_URL}/db/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error("DB Sync Error:", e));
  }, [topics, sirStyleGuide, creatorReferences, targetAudiences, hookLibrary, brandVoices, thumbnailStyles, editingStyles, videoFormats, activeCreatorId, activeAudienceId, activeBrandVoiceId, activeThumbnailStyleId, activeEditingStyleId, isLoadingDB]);

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
    const t = createTopic(title, targetAudienceId, activeBrandVoiceId);
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
        <button className={`btn ${view === 'brands' ? '' : 'btn-secondary'}`} onClick={() => setView('brands')}>
          👑 Brand Voices {activeBrandVoiceId ? '●' : ''}
        </button>
        <button className={`btn ${view === 'thumbnails' ? '' : 'btn-secondary'}`} onClick={() => setView('thumbnails')}>
          🖼️ Thumbnail Styles {activeThumbnailStyleId ? '●' : ''}
        </button>
        <button className={`btn ${view === 'editing' ? '' : 'btn-secondary'}`} onClick={() => setView('editing')}>
          ✂️ Editing Styles {activeEditingStyleId ? '●' : ''}
        </button>
        <button className={`btn ${view === 'formats' ? '' : 'btn-secondary'}`} onClick={() => setView('formats')}>
          🎬 Video Formats
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
      {view === 'ideas' && <IdeasView ideas={ideas} isGenerating={isGeneratingIdeas} onGenerate={generateIdeas} onSelect={addTopic} customTopic={customTopic} setCustomTopic={setCustomTopic} targetAudiences={targetAudiences} brandVoices={brandVoices} setIdeas={setIdeas} />}
      {view === 'guide' && <StyleGuideView guide={sirStyleGuide} onUpdate={setSirStyleGuide} />}
      {view === 'creators' && <CreatorPlaybookView creatorReferences={creatorReferences} setCreatorReferences={setCreatorReferences} activeCreatorId={activeCreatorId} setActiveCreatorId={setActiveCreatorId} />}
      {view === 'audiences' && <TargetAudienceView targetAudiences={targetAudiences} setTargetAudiences={setTargetAudiences} activeAudienceId={activeAudienceId} setActiveAudienceId={setActiveAudienceId} />}
      {view === 'brands' && <BrandVoicesView brandVoices={brandVoices} setBrandVoices={setBrandVoices} activeBrandVoiceId={activeBrandVoiceId} setActiveBrandVoiceId={setActiveBrandVoiceId} />}
      {view === 'thumbnails' && <ThumbnailStylesView thumbnailStyles={thumbnailStyles} setThumbnailStyles={setThumbnailStyles} activeThumbnailStyleId={activeThumbnailStyleId} setActiveThumbnailStyleId={setActiveThumbnailStyleId} />}
      {view === 'editing' && <EditingStylesView editingStyles={editingStyles} setEditingStyles={setEditingStyles} activeEditingStyleId={activeEditingStyleId} setActiveEditingStyleId={setActiveEditingStyleId} />}
      {view === 'formats' && <VideoFormatsView videoFormats={videoFormats} setVideoFormats={setVideoFormats} />}
      {view === 'hooks' && <HookLibraryView hookLibrary={hookLibrary} setHookLibrary={setHookLibrary} />}
      {view === 'topic' && currentTopic && <TopicDetail topic={currentTopic} updateTopic={updateTopic} onBack={() => setView('board')} setError={setError} sirStyleGuide={sirStyleGuide} learnFromFeedback={learnFromFeedback} creatorReferences={creatorReferences} targetAudiences={targetAudiences} brandVoices={brandVoices} thumbnailStyles={thumbnailStyles} editingStyles={editingStyles} hookLibrary={hookLibrary} videoFormats={videoFormats} activeCreatorId={activeCreatorId} activeAudienceId={activeAudienceId} />}
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

      {topic.sirFeedback && typeof topic.sirFeedback === 'string' && (
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
function IdeasView({ ideas, isGenerating, onGenerate, onSelect, customTopic, setCustomTopic, targetAudiences, setIdeas }) {
  const [selectedAudienceId, setSelectedAudienceId] = useState('');
  const [isTranscribingRef, setIsTranscribingRef] = useState(false);
  const [referenceTranscript, setReferenceTranscript] = useState('');
  const [isGeneratingFromRef, setIsGeneratingFromRef] = useState(false);
  const [refError, setRefError] = useState('');

  const handleRefUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTranscribingRef(true);
    setRefError('');
    const formData = new FormData();
    formData.append('audio', file);
    try {
      const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      setReferenceTranscript(data.text || '');
    } catch (err) { setRefError('Transcription failed: ' + err.message); }
    finally { setIsTranscribingRef(false); }
  };

  const handleGenerateFromRef = async () => {
    if (!referenceTranscript.trim()) return;
    setIsGeneratingFromRef(true);
    setRefError('');
    try {
      const res = await fetch(`${API_URL}/ideas/from-video`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: referenceTranscript })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(prev => [...data.ideas, ...prev]);
        setReferenceTranscript(''); // Clear on success
      }
    } catch (err) { setRefError('Idea generation failed: ' + err.message); }
    finally { setIsGeneratingFromRef(false); }
  };

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

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button className="btn" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? <><div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating...</> : '⚡ Generate New Ideas'}
        </button>
      </div>

      <div style={{ background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.5rem', color: '#fbcfe8' }}>Extract Ideas from Reference Video</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Upload a viral reel (audio or video) to extract its structure and generate tailored ideas.</p>
        
        {refError && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>⚠️ {refError}</div>}

        {!referenceTranscript ? (
          <div>
            <label className="btn btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer' }}>
              {isTranscribingRef ? 'Transcribing...' : '📤 Upload Reference Video/Audio'}
              <input type="file" accept="audio/*,video/*" style={{ display: 'none' }} onChange={handleRefUpload} disabled={isTranscribingRef} />
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              className="input-field"
              value={referenceTranscript}
              onChange={e => setReferenceTranscript(e.target.value)}
              rows={4}
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" onClick={handleGenerateFromRef} disabled={isGeneratingFromRef}>
                {isGeneratingFromRef ? 'Analyzing & Generating...' : '✨ Generate Ideas from this Structure'}
              </button>
              <button className="btn btn-secondary" onClick={() => setReferenceTranscript('')} disabled={isGeneratingFromRef}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      
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
function TopicDetail({ topic, updateTopic, onBack, setError, sirStyleGuide, learnFromFeedback, creatorReferences, targetAudiences, brandVoices, activeCreatorId, activeAudienceId, hookLibrary, thumbnailStyles, editingStyles, videoFormats }) {
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
  const [activeAgentIndex, setActiveAgentIndex] = useState(0); // 0 to 11
  const [isRunningAgent, setIsRunningAgent]     = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [customHookText, setCustomHookText]     = useState('');
  const [hookFeedback, setHookFeedback]         = useState('');
  const chatEndRef = useRef(null);

  const runSingleAgent = async (agentKey) => {
    setIsRunningAgent(true);
    setError('');
    try {
      const audienceRef = targetAudiences.find(a => a.id === topic.targetAudienceId);
      const targetAudience = audienceRef ? audienceRef.notes : null;
      const brandRef = brandVoices.find(b => b.id === topic.brandVoiceId);
      const brandVoice = brandRef ? { name: brandRef.name, tone: brandRef.tone, rules: brandRef.rules } : null;
      const thumbRef = thumbnailStyles?.find(t => t.id === topic.thumbnailStyleId);
      const thumbnailStyle = thumbRef ? { name: thumbRef.name, rules: thumbRef.rules } : null;
      const editRef = editingStyles?.find(e => e.id === topic.editingStyleId);
      const editingStyle = editRef ? { name: editRef.name, rules: editRef.rules } : null;
      const prevAgentIdx = AGENTS_LIST.findIndex(a => a.key === agentKey) - 1;
      let prevOutput = prevAgentIdx >= 0 && topic.agentOutputs ? (topic.agentOutputs[AGENTS_LIST[prevAgentIdx].key] || '') : '';
      
      let inputDataToPass = prevOutput || topic.suggestedAngles?.join('\n') || '';
      const agentId = AGENTS_LIST.find(a => a.key === agentKey)?.id;
      
      // Post-production agents (Agent 6-12) need the full script and prior outputs, not just the single previous step
      if (agentId && agentId >= 6) {
        inputDataToPass = `[Script Writer]:\n${topic.agentOutputs?.script_writer || ''}\n\n`;
        if (agentId >= 7) inputDataToPass += `[Creative Director]:\n${topic.agentOutputs?.creative_director || ''}\n\n`;
        if (agentId >= 9) inputDataToPass += `[Thumbnail Designer]:\n${topic.agentOutputs?.thumbnail_designer || ''}\n\n`;
        if (agentId >= 10) inputDataToPass += `[Video Editor]:\n${topic.agentOutputs?.video_editor || ''}\n\n`;
        if (agentId >= 11) inputDataToPass += `[Brand Consistency]:\n${topic.agentOutputs?.brand_consistency || ''}\n\n`;
        if (agentId >= 12) inputDataToPass += `[Quality Control]:\n${topic.agentOutputs?.quality_control || ''}\n\n`;
      }

      const res = await fetch(`${API_URL}/agents/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentKey,
          topic: topic.title,
          inputData: inputDataToPass,
          sirStyleGuide,
          targetAudience,
          brandVoice,
          thumbnailStyle,
          editingStyle
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.output) {
        const currentOutputs = topic.agentOutputs || {};
        updateTopic(topic.id, {
          agentOutputs: { ...currentOutputs, [agentKey]: data.output }
        });
      }
    } catch (e) {
      setError(`Agent execution failed: ${e.message}`);
    } finally {
      setIsRunningAgent(false);
    }
  };

  const runSequentialPipeline = async (startId = 1, endId = 12) => {
    setIsRunningPipeline(true);
    setError('');
    try {
      const audienceRef = targetAudiences.find(a => a.id === topic.targetAudienceId);
      const targetAudience = audienceRef ? audienceRef.notes : null;
      const brandRef = brandVoices.find(b => b.id === topic.brandVoiceId);
      const brandVoice = brandRef ? { name: brandRef.name, tone: brandRef.tone, rules: brandRef.rules } : null;
      const thumbRef = thumbnailStyles?.find(t => t.id === topic.thumbnailStyleId);
      const thumbnailStyle = thumbRef ? { name: thumbRef.name, rules: thumbRef.rules } : null;
      const editRef = editingStyles?.find(e => e.id === topic.editingStyleId);
      const editingStyle = editRef ? { name: editRef.name, rules: editRef.rules } : null;

      const res = await fetch(`${API_URL}/agents/pipeline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.title,
          startAgentId: startId,
          endAgentId: endId,
          initialData: startId === 1 ? '' : (topic.agentOutputs[AGENTS_LIST[startId - 2]?.key] || ''),
          sirStyleGuide,
          targetAudience,
          brandVoice,
          thumbnailStyle,
          editingStyle
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.results) {
        const newOutputs = { ...(topic.agentOutputs || {}) };
        data.results.forEach(r => {
          newOutputs[r.agentKey] = r.output;
        });
        updateTopic(topic.id, { agentOutputs: newOutputs });
      }
    } catch (e) {
      setError(`Pipeline execution failed: ${e.message}`);
    } finally {
      setIsRunningPipeline(false);
    }
  };

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
  const scriptVersions = Array.isArray(topic.scriptVersions) ? topic.scriptVersions : [];
  const latestScript   = scriptVersions.at(-1)?.script || '';
  const versionCount   = scriptVersions.length;
  const displayScript  = viewingVersion !== null ? scriptVersions[viewingVersion]?.script : latestScript;
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
      const brandRef = brandVoices.find(b => b.id === topic.brandVoiceId);
      const brandVoice = brandRef ? { name: brandRef.name, tone: brandRef.tone, rules: brandRef.rules } : null;

      const videoFormatRef = videoFormats.find(f => f.id === topic.videoFormatId);
      const videoFormat = videoFormatRef ? { name: videoFormatRef.name, baseType: videoFormatRef.baseType, rules: videoFormatRef.rules } : null;

      const context = topic.chatHistory.map(m => `${m.role === 'user' ? 'WRITER' : 'AI'}: ${m.content}`).join('\n');
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.title, context, transcript: topic.sirFeedback, sirStyleGuide, creatorInspiration, targetAudience, brandVoice, videoFormat }),
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

      const brandRef = brandVoices.find(b => b.id === topic.brandVoiceId);
      const brandVoice = brandRef ? { name: brandRef.name, tone: brandRef.tone, rules: brandRef.rules } : null;

      const videoFormatRef = videoFormats.find(f => f.id === topic.videoFormatId);
      const videoFormat = videoFormatRef ? { name: videoFormatRef.name, baseType: videoFormatRef.baseType, rules: videoFormatRef.rules } : null;

      const res = await fetch(`${API_URL}/revise`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentScript, sirFeedback: revisionFeedback, previousRevisions, sirStyleGuide, creatorInspiration, targetAudience, brandVoice, videoFormat }),
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

  const generateHooks = async (customFeedback = '') => {
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/hooks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: latestScript, hookLibrary, feedback: typeof customFeedback === 'string' ? customFeedback : hookFeedback }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.hooks) {
        updateTopic(topic.id, {
          hooks: data.hooks,
          status: 'hooks_ready',
        });
        setHookFeedback('');
        setDetailTab('hooks');
      }
    } catch (e) { setError('Hook generation failed: ' + e.message); }
    finally { setIsGenerating(false); }
  };

  const generateConsultationHooks = async (customFeedback = '') => {
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/consultation-hooks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: latestScript, topic: topic.title, feedback: typeof customFeedback === 'string' ? customFeedback : hookFeedback }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      if (data.hooks) {
        updateTopic(topic.id, {
          hooks: data.hooks,
          status: 'hooks_ready',
        });
        setHookFeedback('');
        setDetailTab('hooks');
      }
    } catch (e) { setError('Consultation hook generation failed: ' + e.message); }
    finally { setIsGenerating(false); }
  };

  const s = STATUS_LABELS[topic.status] || STATUS_LABELS['idea'];

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

  const formatSelector = (
    <div style={{ marginBottom: '1rem', background: 'rgba(139,92,246,0.08)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#ddd6fe', fontWeight: 600 }}>
        🎬 Video Script & Hook Mode
      </label>
      <select className="input-field" style={{ padding: '0.5rem', borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(0,0,0,0.4)', color: '#fff' }} value={topic.videoFormatId || ''} onChange={e => updateTopic(topic.id, { videoFormatId: e.target.value })}>
        <option value="" disabled>Select Format...</option>
        {videoFormats.map(f => (
          <option key={f.id} value={f.id}>{f.baseType === 'consultation' ? '🎥' : '✨'} {f.name}</option>
        ))}
      </select>
    </div>
  );

  const brandSelector = (
    <div style={{ marginBottom: '1rem', background: 'rgba(251,191,36,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#fde68a' }}>
        👑 Brand Voice
      </label>
      <select className="input-field" style={{ padding: '0.5rem' }} value={topic.brandVoiceId || ''} onChange={e => updateTopic(topic.id, { brandVoiceId: e.target.value ? parseInt(e.target.value) : null })}>
        <option value="">Default Backend Settings</option>
        {brandVoices?.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );

  const thumbnailSelector = (
    <div style={{ marginBottom: '1rem', background: 'rgba(236,72,153,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(236,72,153,0.3)' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#fbcfe8' }}>
        🖼️ Thumbnail Style
      </label>
      <select className="input-field" style={{ padding: '0.5rem' }} value={topic.thumbnailStyleId || ''} onChange={e => updateTopic(topic.id, { thumbnailStyleId: e.target.value ? parseInt(e.target.value) : null })}>
        <option value="">Default Backend Settings</option>
        {thumbnailStyles?.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );

  const editingSelector = (
    <div style={{ marginBottom: '1rem', background: 'rgba(14,165,233,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(14,165,233,0.3)' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#bae6fd' }}>
        ✂️ Editing Style
      </label>
      <select className="input-field" style={{ padding: '0.5rem' }} value={topic.editingStyleId || ''} onChange={e => updateTopic(topic.id, { editingStyleId: e.target.value ? parseInt(e.target.value) : null })}>
        <option value="">Default Backend Settings</option>
        {editingStyles?.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
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
          { key: 'chat',        label: '💬 1. Discuss & Angle' },
          { key: 'sirs_opinion',label: "🎙️ 2. Sir's Opinion" },
          { key: 'script',      label: `📝 3. Script${versionCount > 0 ? ` (v${versionCount})` : ''}` },
          { key: 'hooks',       label: '🪝 4. Hooks' },
          { key: 'thumbnail',   label: '🖼️ 5. Thumbnail & Title' },
          { key: 'production',  label: '🎬 6. Shot List & Edit' },
          { key: 'qc_audit',    label: '🛡️ 7. QC & Brand Score' },
          { key: 'analytics',   label: '📊 8. Analytics' },
          { key: 'agents',      label: '🤖 12-Agent Inspector' },
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
            value={topic.sirFeedback || ''}
            onChange={e => updateTopic(topic.id, { sirFeedback: e.target.value, status: (e.target.value || '').trim() ? 'sir_responded' : topic.status })}
            placeholder="Paste Sir's text reply, or upload the audio above to auto-transcribe…" />
          <div style={{ marginTop: '1.5rem' }}>
            {formatSelector}
            {brandSelector}
            {thumbnailSelector}
            {editingSelector}
            {targetAudiences.length > 0 && audienceSelector}
            <button className="btn" onClick={generateScript} disabled={isGenerating || !(topic.sirFeedback || '').trim()}>
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
                  <div style={{ textAlign: 'left', maxWidth: '340px', margin: '0 auto 1rem auto' }}>
                    {audienceSelector}
                    {brandSelector}
                    {thumbnailSelector}
                    {editingSelector}
                    {formatSelector}
                  </div>
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
                    <>
                      <button className="btn" style={{ background: '#10b981', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                        onClick={generateHooks} disabled={isGenerating}>
                        {isGenerating ? 'Generating Hooks...' : '✨ Reel Hooks'}
                      </button>
                      <button className="btn" style={{ background: '#8b5cf6', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                        onClick={generateConsultationHooks} disabled={isGenerating}>
                        {isGenerating ? 'Generating Docu-Hooks...' : '🎥 Consultation Hooks'}
                      </button>
                    </>
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

                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(16,185,129,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          🖼️ Step 5: Automated Thumbnail & Production Handoff (Agents 6–12)
                        </h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#a7f3d0' }}>
                          Hands off your approved script & hook to Thumbnail Designer, Creative Director, Video Editor & QC Audit.
                        </p>
                      </div>
                      <button className="btn" style={{ background: 'linear-gradient(135deg, #8b5cf6, #10b981)', border: 'none', padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
                        onClick={() => { setDetailTab('thumbnail'); runSequentialPipeline(6, 12); }}>
                        ⚡ Approve Hook & Go to Thumbnail / Production Pack →
                      </button>
                    </div>
                  </div>
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
                  <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
                    {/* Option A: Suggestion / Feedback for AI */}
                    <div style={{ background: 'rgba(139,92,246,0.1)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#ddd6fe', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                        <span>🔄 Give Sir's Suggestion / Feedback to AI</span>
                      </h4>
                      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#a5b4fc' }}>
                        Didn't like these hooks? Tell AI what to change (e.g. "Make it punchier, mention glue, ask a question").
                      </p>
                      <textarea className="form-control" rows="2" placeholder="Sir's suggestion for new hooks..."
                        value={hookFeedback} onChange={e => setHookFeedback(e.target.value)}
                        style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }} />
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => generateHooks()} disabled={isGenerating}>
                          {isGenerating ? 'Regenerating...' : '✨ Revise Reel Hooks'}
                        </button>
                        <button className="btn btn-secondary" style={{ flex: 1, borderColor: '#8b5cf6', color: '#ddd6fe', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => generateConsultationHooks()} disabled={isGenerating}>
                          {isGenerating ? 'Regenerating Docu-Hooks...' : '🎥 Revise Docu-Hooks'}
                        </button>
                      </div>
                    </div>

                    {/* Option B: Type Your Own Custom Hook */}
                    <div style={{ background: 'rgba(16,185,129,0.08)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                        <span>✍️ Type Your Own Custom Hook (Manual Override)</span>
                      </h4>
                      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#6ee7b7' }}>
                        Have an exact wording in mind? Type your custom hook below to bypass AI and lock it in directly.
                      </p>
                      <textarea className="form-control" rows="2" placeholder="Type your custom hook words here..."
                        value={customHookText} onChange={e => setCustomHookText(e.target.value)}
                        style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }} />
                      <button className="btn" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '0.85rem', padding: '0.5rem' }}
                        disabled={!customHookText.trim()}
                        onClick={() => {
                          updateTopic(topic.id, { selectedHook: `[Custom Hook] ${customHookText.trim()}`, status: 'hooks_ready' });
                          setCustomHookText('');
                        }}>
                        ✓ Save & Approve My Custom Hook →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── 5. THUMBNAIL & TITLE TAB (AGENTS 7 & 8) ── */}
      {detailTab === 'thumbnail' && (
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                🖼️ Step 5: CTR Thumbnail & Title Studio (Agents 7 & 8)
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#a5b4fc' }}>
                Agent 7 formulates the psychological click-through concept; Agent 8 generates the visual Midjourney/DALL-E prompt.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" disabled={isRunningAgent}
                onClick={() => { runSingleAgent('thumbnail_strategist'); runSingleAgent('thumbnail_designer'); }}>
                {isRunningAgent ? 'Generating...' : '✨ Generate Thumbnail & Title Specs'}
              </button>
              <button className="btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                onClick={() => setDetailTab('production')}>
                ✓ Approve Thumbnail & Go to Shot List →
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🎯 Agent 7: Thumbnail Strategist Report</span>
              </h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                {topic.agentOutputs?.thumbnail_strategist || 'Click "Generate Thumbnail Specs" to run Agent 7 on your approved script.'}
              </pre>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.3)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🎨 Agent 8: AI Visual Designer Prompt</span>
              </h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                {topic.agentOutputs?.thumbnail_designer || 'Click "Generate Thumbnail Specs" to run Agent 8 for Midjourney/DALL-E prompts.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. SHOT LIST & EDIT TAB (AGENTS 6 & 9) ── */}
      {detailTab === 'production' && (
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                🎬 Step 6: Production Blueprint & Video Editing Rules (Agents 6 & 9)
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#a5b4fc' }}>
                Agent 6 builds the Director's Shot List & lighting notes; Agent 9 sets jump-cut pacing, zooms, and caption styles.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" disabled={isRunningAgent}
                onClick={() => { runSingleAgent('creative_director'); runSingleAgent('video_editor'); }}>
                {isRunningAgent ? 'Generating...' : '✨ Generate Shot List & Edit Guide'}
              </button>
              <button className="btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                onClick={() => setDetailTab('qc_audit')}>
                ✓ Approve Shot List & Go to QC Audit →
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(244,114,182,0.3)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#fbcfe8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📷 Agent 6: Creative Director Shot List</span>
              </h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                {topic.agentOutputs?.creative_director || 'Click "Generate Shot List" to run Agent 6 for B-roll and lighting cues.'}
              </pre>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.3)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#bfdbfe', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>✂️ Agent 9: Video Editor Timeline Rules</span>
              </h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                {topic.agentOutputs?.video_editor || 'Click "Generate Shot List" to run Agent 9 for zoom frequency and captions.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. QC & BRAND SCORE TAB (AGENTS 10 & 11) ── */}
      {detailTab === 'qc_audit' && (
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                🛡️ Step 7: Brand Compliance & 10/10 Quality Control Audit (Agents 10 & 11)
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#a5b4fc' }}>
                Agent 10 audits medical claims & brand voice; Agent 11 scores retention probability and flags drop-off risks.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" disabled={isRunningAgent}
                onClick={() => { runSingleAgent('brand_consistency'); runSingleAgent('quality_control'); }}>
                {isRunningAgent ? 'Auditing...' : '✨ Run Final QC & Brand Audit'}
              </button>
              <button className="btn" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                onClick={() => { updateTopic(topic.id, { status: 'ready_to_shoot' }); setDetailTab('analytics'); }}>
                🏆 Mark Reel as 100% Production Ready! →
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#fde68a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🛡️ Agent 10: Brand Consistency Compliance</span>
              </h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                {topic.agentOutputs?.brand_consistency || 'Click "Run Final QC" to check brand voice and clinical positioning.'}
              </pre>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>✅ Agent 11: 10/10 Quality Score & Drop-off Check</span>
              </h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                {topic.agentOutputs?.quality_control || 'Click "Run Final QC" to score retention probability out of 10.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. ANALYTICS PREDICTOR TAB (AGENT 12) ── */}
      {detailTab === 'analytics' && (
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                📊 Step 8: Performance Predictor & Growth Strategy (Agent 12)
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#a5b4fc' }}>
                Agent 12 analyzes your final production pack to predict views, engagement hooks, and next-topic spinoffs.
              </p>
            </div>
            <button className="btn btn-secondary" disabled={isRunningAgent}
              onClick={() => runSingleAgent('analytics')}>
              {isRunningAgent ? 'Analyzing...' : '✨ Run Performance Predictor'}
            </button>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#ddd6fe' }}>📈 Agent 12: Growth & Viral Loop Predictions</h4>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0, maxHeight: '450px', overflowY: 'auto' }}>
              {topic.agentOutputs?.analytics || 'Click "Run Performance Predictor" to forecast reach and audience comments.'}
            </pre>
          </div>
        </div>
      )}

      {/* ── 12-AGENT STUDIO TAB ── */}
      {detailTab === 'agents' && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                ⚡ End-to-End Short-Form Content System (12 Specialized Agents)
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#ddd6fe', fontSize: '0.85rem' }}>
                Each agent has a single responsibility and feeds its output directly to the next agent in the chain.
              </p>
            </div>
            <button className="btn" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.9rem' }}
              onClick={() => runSequentialPipeline(1, 6)} disabled={isRunningPipeline || isRunningAgent}>
              {isRunningPipeline ? <><div className="loader" style={{ width: 16, height: 16, borderWidth: 2 }} /> Running Automated Chain (1→6)...</> : '⚡ Run Automated Handoff Pipeline (1→6)'}
            </button>
          </div>

          {/* Horizontal Agent Chain Navigator */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)' }}>
            {AGENTS_LIST.map((ag, idx) => {
              const hasOutput = topic.agentOutputs && topic.agentOutputs[ag.key];
              const isActive = activeAgentIndex === idx;
              return (
                <button key={ag.key} onClick={() => setActiveAgentIndex(idx)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '110px', padding: '0.6rem 0.5rem',
                    background: isActive ? 'rgba(139,92,246,0.25)' : hasOutput ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? '#8b5cf6' : hasOutput ? '#22c55e' : 'var(--panel-border)'}`,
                    borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                  }}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{ag.icon}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                    {ag.name.split('. ')[1]}
                  </span>
                  {hasOutput && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: '0.7rem' }}>✅</span>}
                  <span style={{ fontSize: '0.65rem', color: '#a5b4fc', marginTop: '0.2rem' }}>Step {ag.id}</span>
                </button>
              );
            })}
          </div>

          {/* Active Agent Inspector Card */}
          {(() => {
            const ag = AGENTS_LIST[activeAgentIndex];
            const output = topic.agentOutputs ? topic.agentOutputs[ag.key] : '';
            return (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{ag.icon}</span> {ag.name}
                    </h3>
                    <p style={{ color: '#a5b4fc', margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
                      🎯 Mission: {ag.mission}
                    </p>
                  </div>
                  <button className="btn" onClick={() => runSingleAgent(ag.key)} disabled={isRunningAgent || isRunningPipeline}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                    {isRunningAgent ? <><div className="loader" style={{ width: 16, height: 16, borderWidth: 2 }} /> Running Agent...</> : `▶️ Run ${ag.name.split('. ')[1]}`}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '1.5rem' }}>
                  {/* Responsibilities list */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📋 Responsibilities
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.7 }}>
                      {ag.responsibilities.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Agent Output Box */}
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📄 Agent Report & Handoff Data</span>
                      {output && <span style={{ color: '#22c55e', textTransform: 'none' }}>✨ Ready for Handoff to Step {ag.id < 12 ? ag.id + 1 : 12}</span>}
                    </h4>
                    {output ? (
                      <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', padding: '1.25rem', maxHeight: '500px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#f8fafc' }}>
                        {output}
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--panel-border)', borderRadius: '8px', padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{ag.icon}</p>
                        <p style={{ margin: 0 }}>This agent hasn't run on this topic yet.</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#888' }}>Click the "▶️ Run" button above or start the automated pipeline chain!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
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
  const [editingId, setEditingId] = useState(null);
  const [newCreatorName, setNewCreatorName] = useState('');
  const [newCreatorNotes, setNewCreatorNotes] = useState('');

  const handleSave = () => {
    if (!newCreatorName.trim() || !newCreatorNotes.trim()) return;
    if (editingId) {
      setCreatorReferences(creatorReferences.map(c => 
        c.id === editingId ? { ...c, name: newCreatorName.trim(), styleNotes: newCreatorNotes.trim() } : c
      ));
      setEditingId(null);
    } else {
      setCreatorReferences([
        ...creatorReferences,
        { id: Date.now().toString(), name: newCreatorName.trim(), styleNotes: newCreatorNotes.trim() }
      ]);
    }
    setIsAdding(false);
    setNewCreatorName('');
    setNewCreatorNotes('');
  };

  const handleEdit = (creator) => {
    setNewCreatorName(creator.name || '');
    setNewCreatorNotes(creator.styleNotes || creator.notes || '');
    setEditingId(creator.id);
    setIsAdding(true);
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
        <button className="btn" onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}>
          {isAdding ? 'Cancel' : '+ Add Creator'}
        </button>
      </div>

      <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#a5b4fc', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Break down a creator's technique (hook structure, pacing, transitions) and save it. Turn a creator <strong>ON</strong> to automatically instruct the AI to mimic their pacing style for ALL new script generations. The AI is strictly instructed to apply these techniques ONLY if they don't break Sir's learned Style Guide or AHL brand rules.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Creator Technique' : 'Add New Creator Technique'}</h3>
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
          <button className="btn" onClick={handleSave} disabled={!newCreatorName || !newCreatorNotes || !newCreatorName.trim() || !newCreatorNotes.trim()}>
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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(creator)} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', opacity: 0.7 }}>✏️</button>
                    <button onClick={() => handleDelete(creator.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                  </div>
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
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newNotes.trim()) return;
    if (editingId) {
      setTargetAudiences(targetAudiences.map(a => 
        a.id === editingId ? { ...a, name: newName.trim(), notes: newNotes.trim() } : a
      ));
      setEditingId(null);
    } else {
      setTargetAudiences([
        ...targetAudiences,
        { id: Date.now().toString(), name: newName.trim(), notes: newNotes.trim() }
      ]);
    }
    setIsAdding(false);
    setNewName('');
    setNewNotes('');
  };

  const handleEdit = (audience) => {
    setNewName(audience.name);
    setNewNotes(audience.notes);
    setEditingId(audience.id);
    setIsAdding(true);
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
        <button className="btn" onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}>
          {isAdding ? 'Cancel' : '+ Add Audience'}
        </button>
      </div>

      <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#a5b4fc', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Create deep psychological profiles for different demographics (e.g. 'Men 20-30 worried about early recession', 'Women considering extensions'). The AI will adjust its empathy, vocabulary, and pain-points when an audience is active.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Target Audience' : 'Add New Target Audience'}</h3>
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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(audience)} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', opacity: 0.7 }}>✏️</button>
                    <button onClick={() => handleDelete(audience.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                  </div>
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
   BRAND VOICES VIEW
═══════════════════════════════════════════════ */
function BrandVoicesView({ brandVoices, setBrandVoices, activeBrandVoiceId, setActiveBrandVoiceId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newTone, setNewTone] = useState('');
  const [newRules, setNewRules] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newTone.trim() || !newRules.trim()) return;
    if (editingId) {
      setBrandVoices(brandVoices.map(b => 
        b.id === editingId ? { ...b, name: newName.trim(), tone: newTone.trim(), rules: newRules.trim() } : b
      ));
      setEditingId(null);
    } else {
      setBrandVoices([
        ...brandVoices,
        { id: Date.now().toString(), name: newName.trim(), tone: newTone.trim(), rules: newRules.trim() }
      ]);
    }
    setIsAdding(false);
    setNewName('');
    setNewTone('');
    setNewRules('');
  };

  const handleEdit = (brand) => {
    setNewName(brand.name);
    setNewTone(brand.tone);
    setNewRules(brand.rules);
    setEditingId(brand.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this brand voice?")) {
      setBrandVoices(brandVoices.filter(b => b.id !== id));
      if (activeBrandVoiceId === id) setActiveBrandVoiceId(null);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>👑 Brand Voices & Guidelines</h2>
          <p className="subtitle">White-label the system by defining exact brand positioning and rules.</p>
        </div>
        <button className="btn" onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}>
          {isAdding ? 'Cancel' : '+ Add Brand'}
        </button>
      </div>

      <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#fde68a', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Replace hardcoded "American Hairline" logic with dynamic brands. The Script Writer, Brand Consistency Agent, and QC Agent will enforce the tone and rules of the <strong>active</strong> brand for all newly created topics.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Brand Voice' : 'Add New Brand Voice'}</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Brand Name (e.g., American Hairline)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Core Tone (e.g., Premium clinical positioning)"
              value={newTone}
              onChange={e => setNewTone(e.target.value)}
              style={{ flex: 2, minWidth: '300px' }}
            />
          </div>
          <textarea
            className="input-field"
            placeholder="Strict Brand Rules. E.g. 'Must be empathetic, authoritative, and non-salesy. Do not make false medical promises...'"
            value={newRules}
            onChange={e => setNewRules(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn" onClick={handleSave} disabled={!newName.trim() || !newTone.trim() || !newRules.trim()}>
            Save Brand Voice
          </button>
        </div>
      )}

      {brandVoices.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No brand voices added yet. Click "+ Add Brand" to start building.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {brandVoices.map(brand => {
            const isActive = activeBrandVoiceId === brand.id;
            return (
              <div key={brand.id} style={{ 
                background: isActive ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', 
                border: isActive ? '1px solid #fbbf24' : '1px solid var(--panel-border)', 
                borderRadius: '10px', padding: '1.2rem',
                boxShadow: isActive ? '0 0 15px rgba(251,191,36,0.2)' : 'none',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{brand.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(brand)} style={{ background: 'none', border: 'none', color: '#fde68a', cursor: 'pointer', opacity: 0.7 }}>✏️</button>
                    <button onClick={() => handleDelete(brand.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(251,191,36,0.15)', color: '#fde68a', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.3)' }}>
                    Tone: {brand.tone}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0, marginBottom: '1rem' }}>
                  {brand.rules}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  {isActive ? (
                    <button className="btn" style={{ flex: 1, background: 'rgba(251,191,36,0.2)', border: '1px solid #fbbf24', color: '#fde68a' }} onClick={() => setActiveBrandVoiceId(null)}>
                      👑 Default Brand (Click to unset)
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveBrandVoiceId(brand.id)}>
                      Set as Default
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
  const [editingId, setEditingId] = useState(null);
  const [newType, setNewType] = useState('Visual');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newNotes.trim()) return;
    if (editingId) {
      setHookLibrary(hookLibrary.map(h => 
        h.id === editingId ? { ...h, type: newType, name: newName.trim(), notes: newNotes.trim() } : h
      ));
      setEditingId(null);
    } else {
      setHookLibrary([
        ...hookLibrary,
        { id: Date.now().toString(), type: newType, name: newName.trim(), notes: newNotes.trim() }
      ]);
    }
    setIsAdding(false);
    setNewName('');
    setNewNotes('');
  };

  const handleEdit = (hook) => {
    setNewType(hook.type);
    setNewName(hook.name);
    setNewNotes(hook.notes);
    setEditingId(hook.id);
    setIsAdding(true);
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
        <button className="btn" onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}>
          {isAdding ? 'Cancel' : '+ Add Hook Template'}
        </button>
      </div>

      <div style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#fbcfe8', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Define specific hook formulas that work for American Hairline. When a script is approved, the AI will use this library as strict inspiration to generate varied hooks for the writer to film.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Hook Template' : 'Add New Hook Template'}</h3>
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
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(hook)} style={{ background: 'none', border: 'none', color: '#fbcfe8', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Edit
                </button>
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

/* ═══════════════════════════════════════════════
   THUMBNAIL STYLES VIEW
═══════════════════════════════════════════════ */
function ThumbnailStylesView({ thumbnailStyles, setThumbnailStyles, activeThumbnailStyleId, setActiveThumbnailStyleId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newRules, setNewRules] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newRules.trim()) return;
    if (editingId) {
      setThumbnailStyles(thumbnailStyles.map(b => 
        b.id === editingId ? { ...b, name: newName.trim(), rules: newRules.trim() } : b
      ));
      setEditingId(null);
    } else {
      setThumbnailStyles([
        ...thumbnailStyles,
        { id: Date.now().toString(), name: newName.trim(), rules: newRules.trim() }
      ]);
    }
    setIsAdding(false);
    setNewName('');
    setNewRules('');
  };

  const handleEdit = (style) => {
    setNewName(style.name);
    setNewRules(style.rules);
    setEditingId(style.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this thumbnail style?")) {
      setThumbnailStyles(thumbnailStyles.filter(b => b.id !== id));
      if (activeThumbnailStyleId === id) setActiveThumbnailStyleId(null);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🖼️ Thumbnail Styles</h2>
          <p className="subtitle">Define the exact rules and psychology for the Thumbnail Strategist & Designer agents.</p>
        </div>
        <button className="btn" onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}>
          {isAdding ? 'Cancel' : '+ Add Thumbnail Style'}
        </button>
      </div>

      <div style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#fbcfe8', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Provide exact rules for visual concept, face zooming, contrast, and text overlays. The active style is strictly enforced by Agent 7 & Agent 8.
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Thumbnail Style' : 'Add New Thumbnail Style'}</h3>
          <input
            type="text"
            className="input-field"
            placeholder="Style Name (e.g., Aggressive Clickbait, Minimal Premium)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ marginBottom: '1rem' }}
          />
          <textarea
            className="input-field"
            placeholder="Thumbnail Rules. E.g. '1. Big Bold Text Overlay (3-4 words max)\n2. Emotion to Trigger (curiosity, shock)\n3. Frame selection guidelines...'"
            value={newRules}
            onChange={e => setNewRules(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn" onClick={handleSave} disabled={!newName.trim() || !newRules.trim()}>
            Save Thumbnail Style
          </button>
        </div>
      )}

      {thumbnailStyles.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No thumbnail styles added yet. Click "+ Add Thumbnail Style" to start building.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {thumbnailStyles.map(style => {
            const isActive = activeThumbnailStyleId === style.id;
            return (
              <div key={style.id} style={{ 
                background: isActive ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.04)', 
                border: isActive ? '1px solid #ec4899' : '1px solid var(--panel-border)', 
                borderRadius: '10px', padding: '1.2rem',
                boxShadow: isActive ? '0 0 15px rgba(236,72,153,0.2)' : 'none',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{style.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(style)} style={{ background: 'none', border: 'none', color: '#fbcfe8', cursor: 'pointer', opacity: 0.7 }}>✏️</button>
                    <button onClick={() => handleDelete(style.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0, marginBottom: '1rem' }}>
                  {style.rules}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  {isActive ? (
                    <button className="btn" style={{ flex: 1, background: 'rgba(236,72,153,0.2)', border: '1px solid #ec4899', color: '#fbcfe8' }} onClick={() => setActiveThumbnailStyleId(null)}>
                      🖼️ Default Style (Click to unset)
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveThumbnailStyleId(style.id)}>
                      Set as Default
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
   EDITING STYLES VIEW
═══════════════════════════════════════════════ */
function EditingStylesView({ editingStyles, setEditingStyles, activeEditingStyleId, setActiveEditingStyleId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newRules, setNewRules] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newRules.trim()) return;
    if (editingId) {
      setEditingStyles(editingStyles.map(b => 
        b.id === editingId ? { ...b, name: newName.trim(), rules: newRules.trim() } : b
      ));
      setEditingId(null);
    } else {
      setEditingStyles([
        ...editingStyles,
        { id: Date.now().toString(), name: newName.trim(), rules: newRules.trim() }
      ]);
    }
    setIsAdding(false);
    setNewName('');
    setNewRules('');
  };

  const handleEdit = (style) => {
    setNewName(style.name);
    setNewRules(style.rules);
    setEditingId(style.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this editing style?")) {
      setEditingStyles(editingStyles.filter(b => b.id !== id));
      if (activeEditingStyleId === id) setActiveEditingStyleId(null);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>✂️ Editing Styles</h2>
          <p className="subtitle">Control the pacing, cuts, and retention strategies for the Video Editor Agent.</p>
        </div>
        <button className="btn" onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}>
          {isAdding ? 'Cancel' : '+ Add Editing Style'}
        </button>
      </div>

      <div style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#bae6fd', lineHeight: 1.6 }}>
        <strong>How to use this:</strong> Define pacing, sound effects, B-roll rules, and caption styles. The active style is strictly enforced by Agent 9 (Video Editor).
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Editing Style' : 'Add New Editing Style'}</h3>
          <input
            type="text"
            className="input-field"
            placeholder="Style Name (e.g., High-Retention Short, Cinematic Doc)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ marginBottom: '1rem' }}
          />
          <textarea
            className="input-field"
            placeholder="Editing Rules. E.g. '1. Pacing & Cut Rules (remove all dead air, jump cuts every 2.5-3s)\n2. SFX (subtle whooshes)\n3. Zoom on keywords...'"
            value={newRules}
            onChange={e => setNewRules(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn" onClick={handleSave} disabled={!newName.trim() || !newRules.trim()}>
            Save Editing Style
          </button>
        </div>
      )}

      {editingStyles.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No editing styles added yet. Click "+ Add Editing Style" to start building.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {editingStyles.map(style => {
            const isActive = activeEditingStyleId === style.id;
            return (
              <div key={style.id} style={{ 
                background: isActive ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.04)', 
                border: isActive ? '1px solid #0ea5e9' : '1px solid var(--panel-border)', 
                borderRadius: '10px', padding: '1.2rem',
                boxShadow: isActive ? '0 0 15px rgba(14,165,233,0.2)' : 'none',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{style.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(style)} style={{ background: 'none', border: 'none', color: '#bae6fd', cursor: 'pointer', opacity: 0.7 }}>✏️</button>
                    <button onClick={() => handleDelete(style.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0, marginBottom: '1rem' }}>
                  {style.rules}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  {isActive ? (
                    <button className="btn" style={{ flex: 1, background: 'rgba(14,165,233,0.2)', border: '1px solid #0ea5e9', color: '#bae6fd' }} onClick={() => setActiveEditingStyleId(null)}>
                      ✂️ Default Style (Click to unset)
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveEditingStyleId(style.id)}>
                      Set as Default
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
   VIDEO FORMATS VIEW
═══════════════════════════════════════════════ */
function VideoFormatsView({ videoFormats, setVideoFormats }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newBaseType, setNewBaseType] = useState('reel');
  const [newRules, setNewRules] = useState('');

  const handleSave = () => {
    if (!newName.trim() || !newBaseType.trim() || !newRules.trim()) return;
    if (editingId) {
      setVideoFormats(videoFormats.map(f => 
        f.id === editingId ? { ...f, name: newName.trim(), baseType: newBaseType.trim(), rules: newRules.trim() } : f
      ));
      setEditingId(null);
    } else {
      setVideoFormats([
        ...videoFormats,
        { id: Date.now().toString(), name: newName.trim(), baseType: newBaseType.trim(), rules: newRules.trim() }
      ]);
    }
    setIsAdding(false);
    setNewName('');
    setNewBaseType('reel');
    setNewRules('');
  };

  const handleEdit = (format) => {
    setNewName(format.name);
    setNewBaseType(format.baseType || 'reel');
    setNewRules(format.rules);
    setEditingId(format.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this video format?")) {
      setVideoFormats(videoFormats.filter(f => f.id !== id));
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🎬 Video Formats</h2>
          <p className="subtitle">Define different types of video structures (e.g. Educational, Relatable, Trend, BTS).</p>
        </div>
        <button className="btn" onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}>
          {isAdding ? 'Cancel' : '+ Add Format'}
        </button>
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Format' : 'Add New Format'}</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Format Name (e.g., Educational Reels)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select
              className="input-field"
              value={newBaseType}
              onChange={e => setNewBaseType(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '0.5rem' }}
            >
              <option value="reel">Standard Reel (Monologue)</option>
              <option value="consultation">Consultation (Reality Interaction)</option>
            </select>
          </div>
          <textarea
            className="input-field"
            placeholder="Specific Rules for this format. E.g. 'Focus heavily on teaching...'"
            value={newRules}
            onChange={e => setNewRules(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn" onClick={handleSave} disabled={!newName.trim() || !newBaseType.trim() || !newRules.trim()}>
            Save Format
          </button>
        </div>
      )}

      {videoFormats.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No formats added yet. Click "+ Add Format" to start building.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {videoFormats.map(format => (
            <div key={format.id} style={{ 
              background: 'rgba(255,255,255,0.04)', 
              border: '1px solid var(--panel-border)', 
              borderRadius: '10px', padding: '1.2rem',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{format.baseType === 'consultation' ? '🎥' : '✨'} {format.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(format)} style={{ background: 'none', border: 'none', color: '#fde68a', cursor: 'pointer', opacity: 0.7 }}>✏️</button>
                  <button onClick={() => handleDelete(format.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}>🗑</button>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', background: 'rgba(139,92,246,0.15)', color: '#ddd6fe', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(139,92,246,0.3)' }}>
                  Base: {format.baseType === 'consultation' ? 'Consultation Docs' : 'Standard Reel'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 }}>
                {format.rules}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
