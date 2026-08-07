const payload = {
  sirStyleGuide: "Write in Vinitt's voice: a cosmetic-hair specialist with thousands of cases behind him. Cold, authoritative, direct, no hedging. Never ask questions. Do not explain choices. Never use fluffy words like 'innovative', 'revolutionary', 'game-changing'. Stick to medical authority and direct facts. Focus on world-class non-surgical hair restoration. Keep it fast-paced.",
  brandVoices: [
    {
      id: 1, 
      name: 'American Hairline (AHL)', 
      tone: 'Premium clinical positioning',
      rules: 'Must be empathetic, authoritative, and non-salesy. Do not make false medical promises. Focus on world-class non-surgical hair restoration.'
    }
  ],
  targetAudiences: [
    {
      id: "1779952574432", 
      name: "Middle Age Men (25-35)", 
      notes: "Men 25 to 35 suffering from early-stage hair loss. They feel insecure, want a natural look, are terrified of surgery, and worry about what their partners think."
    },
    {
      id: "1779952574433", 
      name: "Older Professionals (40-55)", 
      notes: "Men with advanced hair loss (Norwood 5-7) looking for a complete transformation to look 10 years younger for their career."
    }
  ],
  creatorReferences: [
    {
      id: 1, 
      name: "Alex Hormozi Style", 
      profileUrl: "https://youtube.com/alexhormozi", 
      notes: "Fast-paced, bold captions, direct authority, zero fluff. Starts with a polarizing hook."
    },
    {
      id: 2, 
      name: "Dr. Gary Linkov Style", 
      profileUrl: "https://youtube.com/drgarylinkov", 
      notes: "Calm, medical analysis, educational, trustworthy. Uses visual aids and before/after case studies."
    }
  ],
  topics: [
    {
      id: 1, 
      title: "Why Hair Transplants Fail in Your 20s (And What to Do Instead)", 
      status: "draft",
      chatHistory: [],
      suggestedAngles: [],
      sirFeedback: '',
      audioFile: null,
      scriptVersions: [],
      agentOutputs: {},
      hooks: [],
      selectedHook: null
    },
    {
      id: 2, 
      title: "The Hidden Costs of Cheap Hair Patches vs Premium Systems", 
      status: "draft",
      chatHistory: [],
      suggestedAngles: [],
      sirFeedback: '',
      audioFile: null,
      scriptVersions: [],
      agentOutputs: {},
      hooks: [],
      selectedHook: null
    },
    {
      id: 3, 
      title: "Can You Swim, Shower, and Sweat with a Hair System?", 
      status: "draft",
      chatHistory: [],
      suggestedAngles: [],
      sirFeedback: '',
      audioFile: null,
      scriptVersions: [],
      agentOutputs: {},
      hooks: [],
      selectedHook: null
    }
  ],
  hookLibrary: [
    {
      id: "1",
      type: "Verbal",
      name: "The 3-Step Snapback (Authority)",
      notes: `FORMULA: Context Lean-In → Scroll Stop Stun Gun → Contrarian Snapback.
Sentence 1 (Lean-In): Establish MOFU/BOFU topic clarity with an undeniable observation/fact. Max 5-7 words.
Sentence 2 (Stun Gun): Halt scrolling with a contrast conjunction ("Lekin", "But", "However", "Sach yeh hai ki...").
Sentence 3 (Snapback): Deliver the knockout haymaker that reverses expectation. Must land under 4 seconds total.
EXAMPLE: "Hair transplants look amazing. But 40% of men regret them within 2 years. Here's what nobody tells you."`
    },
    {
      id: "2",
      type: "Verbal",
      name: "The Confession Hook",
      notes: `Start with a vulnerable, first-person admission that creates instant trust and curiosity.
RULES: Must be spoken directly to camera. Must feel unscripted. Must hint at a bigger reveal.
Staccato delivery — max 5-7 words per sentence.
EXAMPLE: "I've done 3,000 hair replacements. And honestly? Most guys come to me after making the same stupid mistake."
EXAMPLE: "I used to sell cheap patches. ₹5,000. I stopped. Here's why."`
    },
    {
      id: "3",
      type: "Verbal",
      name: "The Myth Destroyer",
      notes: `Open by stating a widely-believed myth as fact, then immediately destroy it with insider authority.
FORMULA: State the myth (as if you believe it) → Pause → "That's completely wrong. Here's the truth."
Creates cognitive dissonance — the viewer MUST stay to resolve the conflict.
EXAMPLE: "Hair patches damage your scalp permanently. At least that's what every barber tells you. They're lying."
EXAMPLE: "Glue causes cancer. I hear this 10 times a week. Let me show you what glue actually does."`
    },
    {
      id: "4",
      type: "Verbal",
      name: "The Specific Number Hook",
      notes: `Attach a hyper-specific number or stat to a constrained outcome. Specificity beats abstraction.
RULES: Use exact numbers (not "many" or "most"). Tie to a concrete transformation or timeframe.
EXAMPLE: "₹12,000 every 45 days. That's what a cheap hair system actually costs you over 2 years."
EXAMPLE: "In exactly 90 minutes, this man went from Norwood 6 to a full head of hair. No surgery. No scars."
EXAMPLE: "4 seconds. That's how fast someone judges your hairline. Here's what they actually see."`
    },
    {
      id: "5",
      type: "Verbal",
      name: "The Unexpected Question",
      notes: `Open with a question so specific and unexpected that the viewer has never considered it before.
RULES: Never use generic questions ("Want better hair?"). The question must feel like it came from a real consultation.
EXAMPLE: "What happens when your wife touches your head… and feels the base?"
EXAMPLE: "Have you ever googled 'hair patch near me' at 2 AM? I know why you're here."
EXAMPLE: "You know what scares men more than going bald? Going bald slowly."`
    },
    {
      id: "6",
      type: "Visual",
      name: "The Reveal Swipe",
      notes: `Camera starts tight on a bald/thinning scalp (the "before" state). Subject's hand slowly swipes across the hairline, revealing the hair system underneath — a seamless, undetectable transition.
RULES: No words for the first 1.5 seconds. Let the visual do the talking. Add a subtle bass-hit SFX on the reveal moment.
The visual must be so striking that it stops the scroll even on mute (85% of reels are watched without sound).
After the reveal, THEN the verbal hook kicks in.
VARIATIONS: Mirror reveal (person turns from mirror to camera), Water test (running water through hair), Wind test (hair blowing naturally).`
    },
    {
      id: "7",
      type: "Visual",
      name: "The Before/After Split",
      notes: `Screen split vertically or horizontally — left side shows the "before" state, right side shows the "after" result.
RULES: Must be the SAME person in the SAME lighting. The transformation must be so dramatic it looks unreal.
Text overlay: 3-4 words max, high contrast ("SAME GUY. SAME DAY.").
Works best for: Norwood 5-7 transformations, first-time clients, premium vs cheap patch comparisons.
SFX: Whoosh on the split transition. No music for 2 seconds — let silence amplify the impact.`
    },
    {
      id: "8",
      type: "Action",
      name: "The Stress Test",
      notes: `Subject physically demonstrates that the hair system is undetectable by performing a "stress test" on camera.
ACTIONS: Pull test (grabbing and tugging the hair), Water splash (pouring water directly on the hairline), Wind blast (standing in front of a fan), Workout sweat (post-gym dripping sweat through the system).
RULES: Camera must be close enough to see the hairline detail. Start the action BEFORE any speaking. 
The physical proof eliminates the #1 objection ("but people will notice") without saying a word.
EXAMPLE: Person walks into a barbershop and asks the barber to find the hairline. Barber can't.`
    },
    {
      id: "9",
      type: "Action",
      name: "The Consultation Walk-In",
      notes: `Film the exact moment a new client walks through AHL's door for the first time. Capture the nervous energy.
RULES: Cinematic, documentary style. No scripted dialogue — capture the raw, authentic moment.
Camera follows the client from entrance → consultation chair → scalp examination → first look at options.
This is Netflix mini-doc style: the viewer feels like they're eavesdropping on a private, vulnerable moment.
Must include: the client's face (nervousness → curiosity → hope), the specialist's calm authority, the examination.`
    },
    {
      id: "10",
      type: "Text",
      name: "The Controversial Statement",
      notes: `Bold, full-screen text overlay that makes a deliberately provocative claim. No face, no voice — just text on a dark/premium background for 1.5 seconds.
RULES: Max 5 words. Must trigger DISAGREEMENT or SHOCK. The viewer stays to see if the video backs it up.
EXAMPLES: "HAIR TRANSPLANTS ARE A SCAM", "YOUR BARBER IS LYING", "₹5,000 PATCHES WILL RUIN YOU", "HE CRIED IN THE CHAIR".
After the text hook: cut to the speaker who immediately says "Before you argue with me, let me show you something."
Font: Bold uppercase, white on black or gold on dark. No other graphics.`
    },
    {
      id: "11",
      type: "Text",
      name: "The DM Screenshot",
      notes: `Open with a real (or recreated) DM/WhatsApp screenshot from a client or follower asking a common question.
RULES: The message must feel real — typos, informal language, emoji. Must represent a genuine pain point.
EXAMPLES: "bhai mera friend bol raha hai patch lagane se ganja ho jaata hai, sach hai kya?", "sir how much for full head? budget tight hai", "can my girlfriend tell? please be honest".
After showing the screenshot for 1.5s, cut to the specialist who says: "I get this message 50 times a day. Here's the honest answer."
This works because it validates the viewer's own unasked question.`
    },
    {
      id: "12",
      type: "Verbal",
      name: "The Identity Hook",
      notes: `Target the viewer's self-image and social identity, not the product. Make them feel seen.
FORMULA: Describe their exact situation with painful specificity → Then pivot to empowerment.
RULES: Must feel like a personal attack (in a good way). Must name a specific behavior or thought they've had.
EXAMPLE: "You've been wearing caps for 3 years. Not because you like caps. Because you're terrified someone will see your crown."
EXAMPLE: "You take photos from exactly one angle. You know which one. And you delete the rest."
EXAMPLE: "Your LinkedIn profile picture is from 2019. Before it got bad. I know."`
    }
  ],
  thumbnailStyles: [
    {
      id: 1, 
      name: 'AHL Default Thumbnail',
      rules: `THUMBNAIL RULES FOR AHL REELS:

1. VISUAL CONCEPT & FRAME SELECTION:
   - Always freeze on the moment of highest emotional tension in the video (e.g., doctor pointing at scalp, hairline being applied, client's first-time reaction).
   - Avoid static or neutral expressions. The subject must be mid-gesture, leaning in, or showing a strong emotional state.
   - Prioritize close-ups of the scalp, hairline, or before/after juxtapositions as the thumbnail frame.
   - The background must be clean, blurred, or contrast-enhancing (dark studio or white clinical backdrop).

2. EMOTION TO TRIGGER (choose one per thumbnail):
   - CURIOSITY: Show something unexpected or incomplete (e.g., hand covering half the scalp).
   - SHOCK: Pair an extreme before-state with a luxury after-result.
   - RELIEF/EMPATHY: Show the client's face post-transformation — confidence, not vanity.
   - STATUS/ASPIRATION: Premium lighting, sharp grooming, doctor's authority stance.

3. TEXT OVERLAY (mandatory):
   - Maximum 3-5 words. Bold, uppercase, high-contrast font (white on dark or yellow on dark).
   - The text must CONTRADICT or tease the spoken hook — do NOT repeat it verbatim.
   - Example formulas: "THIS CHANGED EVERYTHING", "NO ONE TELLS YOU THIS", "HE DIDN'T BELIEVE IT", "THE REAL COST".
   - No punctuation except exclamation marks for maximum punch.

4. A/B TESTING CONCEPT:
   - Concept A: Subject-forward (close-up face, emotional expression, text overlay top or bottom).
   - Concept B: Before/After split frame (left vs right, or top vs bottom), bold contrast text in middle.
   - Concept C: Text-dominant (large bold statement, minimal image, high contrast background).
   - Always specify which emotion each concept targets and why it works for MOFU/BOFU audiences.`
    }
  ],
  editingStyles: [
    {
      id: "1", 
      name: 'AHL Fast Paced Retention',
      rules: `EDITING RULES FOR AHL REELS (Fast Paced Retention Style):

1. PACING & CUT RULES:
   - Remove ALL dead air: no silent gaps, no filler words ("um", "like", "you know"), no hesitation pauses.
   - J-cuts and L-cuts only — audio transitions must always lead the visual cut by 0.2–0.5 seconds.
   - Jump cuts every 2.5–3 seconds maximum. If the speaker doesn't move or change expression, cut anyway.
   - The first cut must happen within the first 2 seconds — hook viewers before they can scroll.
   - Maintain a slightly accelerated talking pace in the edit (speed up by 5–10% if needed).

2. VISUAL GRAPHICS & ZOOMS:
   - Subtle punch-in zoom (scale from 100% → 107%) on every key word or emotional beat.
   - Kinetic typography captions: bold, high-contrast, word-by-word animated subtitles (CapCut or Premiere style).
   - Use Instagram/YouTube safe zones: keep text and faces within the center 80% of the frame (9:16).
   - B-roll inserts: cut away to scalp close-ups, product shots, or client reactions at any "show, don't tell" moment.
   - Emoji overlays or text popups are allowed for engagement triggers (e.g., 🔥 "BIGGEST MISTAKE" popup).

3. SFX & SOUND DESIGN:
   - Whoosh sounds on every hard cut or graphic transition.
   - Subtle riser/tension audio during buildup moments (the "before" state, the problem reveal).
   - Heartbeat or deep bass hit on the payoff moment (the solution reveal, the transformation).
   - Background music: Lo-fi or cinematic instrumental at -20dB (never compete with voiceover).
   - No jarring audio cuts — fade out or cross-fade all background tracks on transitions.

4. PLATFORM OPTIMIZATION (Instagram Reels / YouTube Shorts):
   - 9:16 vertical format. 1080x1920px minimum. Export at H.264, 30fps or 60fps.
   - Loop transition at the end: the last 0.5 seconds of the reel must visually or audibly hint at the beginning (encourages replays).
   - Hook frame must be front-loaded within the first 3 seconds — this is the thumbnail moment.
   - Captions must cover 100% of spoken words for silent viewing (85% of reels are watched without sound on mobile).`
    }
  ],
  videoFormats: [
    {
      id: "1",
      name: "Educational Reels",
      baseType: "reel",
      rules: "Focus heavily on teaching the audience something new. Break down complex medical/hair replacement concepts into simple, easily understandable analogies. Never sound like a textbook; sound like a trusted expert explaining it to a friend."
    },
    {
      id: "2",
      name: "Relatable Reels",
      baseType: "reel",
      rules: "Focus on the emotional, day-to-day struggles of hair loss. Speak directly to insecurities (dating, swimming, wind, social gatherings). The tone should be highly empathetic, showing the viewer 'I understand exactly what you are going through.'"
    },
    {
      id: "3",
      name: "Transformation Reels",
      baseType: "reel",
      rules: "This script is built around a massive visual before/after payoff. Build extreme tension and anticipation about how bad the situation was, and then reveal the life-changing result. The script must leave room for strong visual b-roll of the transformation."
    },
    {
      id: "4",
      name: "Hot-take Reels",
      baseType: "reel",
      rules: "Take a strong, contrarian stance against a popular belief in the hair industry (e.g. against transplants for young men, against cheap patches, against certain glues). Be unapologetic, bold, and slightly polarizing to drive comments and debate."
    },
    {
      id: "5",
      name: "Trend Reels",
      baseType: "reel",
      rules: "This script will be paired with a trending audio or meme format. Keep the dialogue ultra-short, punchy, and highly visual. Rely on text-on-screen and physical acting rather than long explanations."
    },
    {
      id: "6",
      name: "BTS Reels",
      baseType: "reel",
      rules: "Show what happens behind closed doors at the clinic. Focus on the craftsmanship of the systems, the team's dedication, or the real-time reactions of clients. The tone should be raw, unpolished, and documentary-style."
    },
    {
      id: "7",
      name: "Consultation Mini-Doc",
      baseType: "consultation",
      rules: "Do not write a monologue. Write a 7-Part Reality Interaction between Vinitt and a nervous client. Focus on genuine dialogue, uncovering the client's deep fears, and guiding them to a solution in a Netflix-documentary style format."
    }
  ],
  activeCreatorId: "1",
  activeAudienceId: "1779952574432",
  activeBrandVoiceId: "1",
  activeThumbnailStyleId: "1",
  activeEditingStyleId: "1"
};

fetch('http://localhost:3000/api/db/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => console.log("Seeding complete:", data))
  .catch(console.error);
