'use strict';

const OpenAI = require('openai');
const config = require('./config');
const logger = require('./logger');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.OPENROUTER_API_KEY,
});

/**
 * AGENTS_CONFIG: The 12 specialized agents defining the end-to-end Content Factory workflow.
 * Mirrors Director Vinitt's (Sir's) architecture: each agent has a single responsibility
 * and a clear handoff to the next one.
 */
const AGENTS_CONFIG = [
  {
    id: 1,
    key: 'research',
    name: '1. Research Agent',
    icon: '🔬',
    mission: 'Discover high-value content opportunities.',
    responsibilities: [
      'Competitor research', 'Audience pain points', 'Frequently asked questions',
      'Industry trends', 'Instagram/YouTube/Reddit/Quora research', 'Comment analysis',
      'Scientific research (where applicable)', 'Consumer psychology', 'Market gaps'
    ],
    outputLabel: 'List of validated content opportunities',
    prompt: `You are the Research Agent for American Hairline (AHL), India's premier non-surgical hair replacement clinic.
Your mission is to discover high-value content opportunities by analyzing competitor gaps, audience pain points (social stigma, fear of surgery, glue maintenance, cost, natural look), FAQs, and comment psychology.
Analyze the topic/brief provided and output 5-8 validated, data-backed content opportunities and consumer psychology insights that set the stage for high-retention short-form video production.`
  },
  {
    id: 2,
    key: 'angle_generator',
    name: '2. Content Angle Generator Agent',
    icon: '🧭',
    mission: 'Generate unique angles from a single topic.',
    responsibilities: [
      'Create 50–100 content angles from one topic across formats:',
      'Myths, Mistakes, Comparisons, Reactions, Consultations, Celebrity examples, Case studies, Experiments, POVs, Storytelling, FAQs, Objections, Cost breakdowns, Emotional stories, Beginner mistakes, Behind the scenes, Before vs After, Day-in-the-life, Do\'s & Don\'ts'
    ],
    outputLabel: 'Database of fresh content angles',
    prompt: `You are the Content Angle Generator Agent for American Hairline (AHL).
Your mission is to generate unique, high-performing content angles from a single topic across Sir's 19 core formats: Myths, Mistakes, Comparisons, Reactions, Consultations, Celebrity examples, Case studies, Experiments, POVs, Storytelling, FAQs, Objections, Cost breakdowns, Emotional stories, Beginner mistakes, Behind the scenes, Before vs After, Day-in-the-life, Do's & Don'ts.
Given the topic and research insights, output exactly 5 to 10 distinct, ultra-hooking content angles across these formats with brief descriptions.`
  },
  {
    id: 3,
    key: 'strategist',
    name: '3. Content Strategist Agent',
    icon: '🎯',
    mission: 'Decide what content should be produced.',
    responsibilities: [
      'Prioritize content ideas', 'Select the highest-impact angle',
      'Define the target audience', 'Define the objective: Views, Shares, Saves, Leads, Brand Awareness',
      'Build the weekly content calendar', 'Decide the content format'
    ],
    outputLabel: 'Content brief',
    prompt: `You are the Content Strategist Agent for American Hairline (AHL).
Your mission is to decide what content should be produced. Prioritize the generated angles and select the single highest-impact angle.
Output a formal, structured Content Brief including:
1. Selected High-Impact Angle & Format
2. Exact Target Audience (demographic, psychology, MOFU/BOFU stage)
3. Primary Strategic Objective (Views / Shares / Saves / Leads / Brand Awareness)
4. Key Takeaway & Core Value Proposition for the Viewer`
  },
  {
    id: 4,
    key: 'hook_specialist',
    name: '4. Hook Specialist Agent',
    icon: '🪝',
    mission: 'Maximize scroll-stopping power.',
    responsibilities: [
      'Generate multiple hooks', 'Pattern interrupts', 'Curiosity gaps',
      'Opening visuals', 'First three-second optimization', 'Thumbnail opening frame suggestions'
    ],
    outputLabel: '20–50 hook options (curated sets of scroll-stopping hooks)',
    prompt: `You are the Hook Specialist Agent for American Hairline (AHL).
Your mission is to maximize scroll-stopping power in the first 3 seconds.
Apply Sir's viral hook formulas:
1. The 3-Step Snapback Formula (Context Lean-In → Scroll Stop Stun Gun → Contrarian Snapback).
2. The Dopamine Ladder (Never use single-trigger hooks. Layer multiple psychological triggers rapidly in the first 5 seconds: Curiosity + Status + Transformation).
3. Specificity Beats Abstraction (Attach a concrete outcome to a constrained input, e.g., "seamless hairline in exactly 2 hours" instead of "fix your hair fast").
4. Staccato Delivery (Keep opening sentences punchy, max 5-7 words).
Output exactly 6 distinct, scroll-stopping hook options with visual setup instructions and opening frame thumbnail suggestions.`
  },
  {
    id: 5,
    key: 'script_writer',
    name: '5. Script Writer Agent',
    icon: '📝',
    mission: 'Write high-retention scripts.',
    responsibilities: [
      'Reel scripts', 'Storytelling', 'Strong CTA', 'Retention loops',
      'Conversational language', 'Multiple script versions'
    ],
    outputLabel: 'Final shooting script',
    prompt: `You are the Script Writer Agent for American Hairline (AHL).
Your mission is to write high-retention scripts that keep viewers hooked from 0:00 to the CTA.
Enforce the 4-Part "1M+ View" Script Structure:
1. The Hook (Sec 0-3): Stops the scroll.
2. The Build (Sec 3-20): Creates curiosity. Eliminate dead moments where retention drops. Every second must create momentum toward the payoff.
3. The Payoff (Sec 21-30): Satisfies curiosity and answers the hook. Must be highly satisfying.
4. The CTA (Last 2s): Match the CTA exactly to the reel's energy (Comment, DM, Save).
Incorporate storytelling, open loops, and conversational Hinglish/English tone. Output a complete, production-ready shooting script with timestamps and audio/visual cues.`
  },
  {
    id: 6,
    key: 'creative_director',
    name: '6. Creative Director Agent',
    icon: '🎬',
    mission: 'Plan visual execution.',
    responsibilities: [
      'Shot list', 'Camera angles', 'B-roll ideas', 'Props', 'Lighting suggestions',
      'Expressions', 'Transitions', 'On-screen text', 'Music suggestions', 'Visual storytelling'
    ],
    outputLabel: 'Complete shooting plan',
    prompt: `You are the Creative Director Agent for American Hairline (AHL).
Your mission is to plan the complete visual execution of the script for Director Vinitt and the shooting team.
Output a structured Shooting Plan detailing:
1. Shot List & Camera Angles (close-ups, over-the-shoulder, mirror shots)
2. B-Roll & Props (matching patches, scalp examination, heartbeat/nervous reactions)
3. Lighting & Director Notes (expressions, awkward pauses, natural laughter)
4. On-screen Text (subtitles, hook overlays) & Audio/Music Mood cues`
  },
  {
    id: 7,
    key: 'thumbnail_strategist',
    name: '7. Thumbnail Strategist Agent',
    icon: '🖼️',
    mission: 'Maximize click-through rate (CTR).',
    responsibilities: [
      'Thumbnail psychology', 'Thumbnail concept', 'Thumbnail copy',
      'Emotion to trigger', 'Best frame selection', 'A/B testing concepts', 'CTR optimization'
    ],
    outputLabel: '3–5 thumbnail concepts',
    prompt: `You are the Thumbnail Strategist Agent for American Hairline (AHL).
Your mission is to maximize Click-Through Rate (CTR) and scroll-stopping visual appeal on Instagram Reels/YouTube Shorts.
Output 3 distinct, high-CTR Thumbnail Concepts detailing:
1. Visual Concept & Frame Selection (what exact moment from the video is frozen)
2. Emotion to Trigger (curiosity, shock, relief, empathy)
3. Big Bold Text Overlay (3-4 words max, contrasting with the spoken hook)
4. A/B Testing rationale`
  },
  {
    id: 8,
    key: 'thumbnail_designer',
    name: '8. Thumbnail Designer Agent',
    icon: '🎨',
    mission: 'Create the final thumbnail specifications.',
    responsibilities: [
      'Execute the approved concept', 'Typography', 'Layout', 'Cut-outs',
      'Background cleanup', 'Color correction', 'Branding consistency', 'Export-ready files'
    ],
    outputLabel: 'Final thumbnail design brief & visual layout specs',
    prompt: `You are the Thumbnail Designer Agent for American Hairline (AHL).
Your mission is to create the exact design execution brief and layout specs for the final thumbnail based on the strategist's concept.
Output a technical design specification including:
1. Typography & Layout (font style, weight, placement, contrast)
2. Cut-outs & Background Cleanup instructions (subject isolation, blur, lighting enhancement)
3. Color Palette & Branding Consistency (AHL gold/dark premium aesthetic)
4. Ready-to-use AI Image Generator Prompt to visualize the thumbnail mockup.`
  },
  {
    id: 9,
    key: 'video_editor',
    name: '9. Video Editor Agent',
    icon: '✂️',
    mission: 'Maximize viewer retention.',
    responsibilities: [
      'Edit pacing', 'Remove dead moments', 'Graphics', 'Captions',
      'Sound effects', 'Zooms', 'Motion graphics', 'Retention improvements', 'Platform-specific optimization'
    ],
    outputLabel: 'Final editing execution guide & timeline blueprint',
    prompt: `You are the Video Editor Agent for American Hairline (AHL).
Your mission is to maximize viewer retention through flawless editing execution.
Output a detailed Timeline & Retention Blueprint for the editing team:
1. Pacing & Cut Rules (remove all dead air, J-cuts and L-cuts, jump cuts every 2.5-3 seconds)
2. Visual Graphics & Zooms (subtle punch-ins on key words, kinetic typography for captions)
3. SFX & Sound Design (subtle whooshes, risers, heartbeat audio during reveals)
4. Platform Optimization (9:16 vertical safe zones, loop transition at the end)`
  },
  {
    id: 10,
    key: 'brand_consistency',
    name: '10. Brand Consistency Agent',
    icon: '🛡️',
    mission: 'Ensure every reel strengthens the brand.',
    responsibilities: [
      'Brand voice', 'Messaging consistency', 'Premium positioning', 'Educational tone',
      'Claims verification', 'CTA consistency', 'Brand guideline compliance'
    ],
    outputLabel: 'Brand approval checklist & compliance report',
    prompt: `You are the Brand Consistency Agent for American Hairline (AHL).
Your mission is to ensure every piece of content strengthens AHL's reputation as a world-class, premium non-surgical hair restoration brand.
Review the script, visuals, and tone to generate a Brand Compliance Report:
1. Premium Positioning & Tone Check (is it empathetic, authoritative, and non-salesy?)
2. Claims Verification (are medical/hair replacement facts accurate without false promises?)
3. CTA & Messaging Alignment (does it drive high-quality leads or genuine awareness?)
4. Final Brand Score (1-10) with any mandatory phrasing corrections.`
  },
  {
    id: 11,
    key: 'quality_control',
    name: '11. Quality Control Agent',
    icon: '✅',
    mission: 'Critique every reel before publishing.',
    responsibilities: [
      'Review the hook', 'Review the script', 'Review the visuals', 'Review the thumbnail',
      'Review the edit', 'Identify weak sections', 'Identify drop-off risks', 'Improve clarity',
      'Check factual accuracy', 'Score overall quality'
    ],
    outputLabel: 'Final review with improvements and publish recommendation',
    prompt: `You are the Quality Control (QC) Agent for American Hairline (AHL).
Your mission is to conduct a ruthless 10/10 critique of the entire production package before publishing.
Review Hook, Script, Visuals, Thumbnail, and Edit against Sir's standards.
Output a comprehensive Quality Audit:
1. Drop-off Risk Analysis (where will impatient viewers scroll, and how to fix it?)
2. Clarity & Impact Evaluation
3. Section-by-Section Grades (Hook, Body, Visuals, Edit, CTA)
4. Final Quality Score (1-10) and Official Recommendation: [APPROVED FOR PUBLISHING] or [REVISION REQUIRED with specific action items].`
  },
  {
    id: 12,
    key: 'analytics',
    name: '12. Analytics Agent',
    icon: '📊',
    mission: 'Continuously improve content performance.',
    responsibilities: [
      'Analyze views', 'Hook retention', 'Average watch time', 'Shares', 'Saves',
      'Comments', 'Leads generated', 'CTR', 'Identify winning patterns', 'Recommend future improvements'
    ],
    outputLabel: 'Performance report and actionable recommendations',
    prompt: `You are the Analytics Agent for American Hairline (AHL).
Your mission is to continuously improve content performance by turning post-publication data into winning patterns for future scripts.
Simulate or evaluate expected/actual metrics (Hook retention %, 3-second drop-off, Avg Watch Time, Share-to-View ratio, Lead conversion rate).
Output an Actionable Analytics & Growth Report identifying winning patterns and providing 3 concrete rules to feed back into the Research and Angle Generator agents for next week's content.`
  }
];

/**
 * Runs a single agent by key.
 */
async function runAgent({ agentKey, topic, inputData = '', sirStyleGuide = '', targetAudience = '', brandVoice = null, thumbnailStyle = null, editingStyle = null }) {
  const agent = AGENTS_CONFIG.find(a => a.key === agentKey);
  if (!agent) throw new Error(`Unknown agent key: ${agentKey}`);

  const t0 = Date.now();
  let userContent = `TOPIC: "${topic}"\n\n`;
  if (brandVoice) {
    userContent += `BRAND IDENTITY & RULES:\nName: ${brandVoice.name}\nTone: ${brandVoice.tone}\nRules: ${brandVoice.rules}\n\n`;
  }
  if (targetAudience) userContent += `TARGET AUDIENCE:\n${targetAudience}\n\n`;
  if (sirStyleGuide) userContent += `SIR'S LEARNED STYLE GUIDE (apply these preferences strictly):\n${sirStyleGuide}\n\n`;
  
  if (thumbnailStyle && (agentKey === 'thumbnail_strategist' || agentKey === 'thumbnail_designer')) {
    userContent += `THUMBNAIL STYLE RULES (Strictly enforce these for this video):\nName: ${thumbnailStyle.name}\nRules:\n${thumbnailStyle.rules}\n\n`;
  }
  if (editingStyle && agentKey === 'video_editor') {
    userContent += `VIDEO EDITING STYLE RULES (Strictly enforce these for this video):\nName: ${editingStyle.name}\nRules:\n${editingStyle.rules}\n\n`;
  }

  if (inputData) userContent += `HANDOFF CONTEXT FROM PREVIOUS AGENT / CURRENT WORK:\n"""\n${inputData}\n"""\n\n`;
  userContent += `Execute your exact mission and responsibilities. Provide a clear, professional, structured report.`;

  // Dynamically replace hardcoded AHL with brandVoice name if provided
  let agentPrompt = agent.prompt;
  if (brandVoice) {
    agentPrompt = agentPrompt.replace(/American Hairline \(AHL\)/g, brandVoice.name);
    agentPrompt = agentPrompt.replace(/AHL/g, brandVoice.name);
  }

  const resp = await openai.chat.completions.create({
    model: config.INTENT_MODEL,
    max_tokens: 2500,
    temperature: 0.7,
    messages: [
      { role: 'system', content: agentPrompt },
      { role: 'user', content: userContent }
    ],
  });

  const output = resp.choices[0]?.message?.content?.trim() || 'No output generated.';
  logger.info({ agent: agentKey, ms: Date.now() - t0 }, `Agent [${agent.name}] finished`);
  return { agentId: agent.id, agentKey: agent.key, agentName: agent.name, output };
}

/**
 * Runs a multi-agent sequential pipeline from startAgentId to endAgentId.
 * Each agent feeds the next one.
 */
async function runPipeline({ topic, startAgentId = 1, endAgentId = 5, initialData = '', sirStyleGuide = '', targetAudience = '', brandVoice = null, thumbnailStyle = null, editingStyle = null }) {
  const results = [];
  let currentInput = initialData;

  for (let i = startAgentId; i <= endAgentId; i++) {
    const agent = AGENTS_CONFIG.find(a => a.id === i);
    if (!agent) continue;
    logger.info(`Running Pipeline Step ${i}: ${agent.name}...`);
    const res = await runAgent({
      agentKey: agent.key,
      topic,
      inputData: currentInput,
      sirStyleGuide,
      targetAudience,
      brandVoice,
      thumbnailStyle,
      editingStyle
    });
    results.push(res);
    // Handoff to next agent
    if (i >= 5) {
      // Post-production agents need the Script and all previous context, not just the immediate previous step
      currentInput += `\n\n[Output from ${agent.name}]:\n${res.output}`;
    } else {
      // Pre-production uses strict sequential handoff
      currentInput = `[Output from ${agent.name}]:\n${res.output}`;
    }
  }

  return results;
}

module.exports = {
  AGENTS_CONFIG,
  runAgent,
  runPipeline
};
