import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function Guide() {
  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
          <h1 className="text-glow-cyan" style={{ marginBottom: 'var(--space-md)' }}>
            How to Play
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
            Everything you need to host an epic game night
          </p>
        </div>

        {/* Quick Start */}
        <Section title="Quick Start" icon="🚀">
          <ol style={{ paddingLeft: 'var(--space-xl)', lineHeight: '2' }}>
            <li><strong>Create a Deck</strong> — Go to Setup and add your categories & clues</li>
            <li><strong>Start a Game</strong> — Click "Start Game" to create a room</li>
            <li><strong>Share the Code</strong> — Players join with the room code</li>
            <li><strong>Everyone Ready</strong> — All players toggle ready</li>
            <li><strong>Play!</strong> — Host starts the game, select clues, buzz in, answer</li>
          </ol>
        </Section>

        {/* Game Flow */}
        <Section title="Game Flow" icon="🎮">
          <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
            <FlowStep number={1} title="Select a Clue">
              The current player picks a category and point value from the board.
            </FlowStep>
            <FlowStep number={2} title="Read the Clue">
              The clue appears on everyone's screen. A short delay prevents early buzzing.
            </FlowStep>
            <FlowStep number={3} title="Buzz In">
              Players race to buzz in first. The server decides who wins (no cheating!).
            </FlowStep>
            <FlowStep number={4} title="Answer">
              The buzz winner has limited time to answer. Host judges or auto-check validates.
            </FlowStep>
            <FlowStep number={5} title="Score">
              Correct = gain points. Wrong = lose points (and others can steal with rebound).
            </FlowStep>
          </div>
        </Section>

        {/* Special Question Types */}
        <Section title="Special Question Types" icon="✨">
          <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
            Not all questions have to be simple text! Here's how to set up special question types:
          </p>

          {/* Audio Questions */}
          <SpecialType
            emoji="🎵"
            title="Audio Questions"
            color="var(--neon-purple)"
            description="Perfect for 'Name That Tune', game soundtracks, or movie quotes"
          >
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Label>How to set up:</Label>
              <CodeBlock>
                Clue: "🎵 AUDIO: Host plays clip — Name this game's soundtrack"
                {'\n'}Answer: "Halo Theme"
              </CodeBlock>
              <Label style={{ marginTop: 'var(--space-md)' }}>How to play:</Label>
              <ul style={{ paddingLeft: 'var(--space-xl)', color: 'var(--text-secondary)' }}>
                <li>Have audio ready on your phone/laptop (YouTube, Spotify, etc.)</li>
                <li>When the clue appears, play the audio clip</li>
                <li>Players buzz in when they know the answer</li>
              </ul>
            </div>
          </SpecialType>

          {/* Video Questions */}
          <SpecialType
            emoji="🎬"
            title="Video Questions"
            color="var(--neon-orange)"
            description="Great for movie scenes, game trailers, or meme references"
          >
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Label>How to set up:</Label>
              <CodeBlock>
                Clue: "🎬 VIDEO: Host plays clip — What game is this from?"
                {'\n'}Answer: "Dark Souls"
              </CodeBlock>
              <Label style={{ marginTop: 'var(--space-md)' }}>How to play:</Label>
              <ul style={{ paddingLeft: 'var(--space-xl)', color: 'var(--text-secondary)' }}>
                <li>Queue up video clips on a separate screen or device</li>
                <li>Play the clip when the question is selected</li>
                <li>Pause at key moments if needed for dramatic effect</li>
              </ul>
            </div>
          </SpecialType>

          {/* Drawing Questions */}
          <SpecialType
            emoji="🖍️"
            title="Drawing Challenges"
            color="var(--neon-magenta)"
            description="Skribbl-style chaos — one person draws, team guesses"
          >
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Label>How to set up:</Label>
              <CodeBlock>
                Clue: "🖍️ DRAW CHALLENGE: Host gives drawer 3 options"
                {'\n'}Answer: "(Host's secret options: Pikachu, Master Chief, Creeper)"
              </CodeBlock>
              <Label style={{ marginTop: 'var(--space-md)' }}>How to play:</Label>
              <ol style={{ paddingLeft: 'var(--space-xl)', color: 'var(--text-secondary)' }}>
                <li>Choose one player to be the drawer</li>
                <li>Host secretly shows drawer 3 options (on phone or whisper)</li>
                <li>Drawer picks one and draws on whiteboard</li>
                <li><strong>No talking, no letters, no numbers!</strong></li>
                <li>Team scores if they guess correctly</li>
              </ol>
            </div>
          </SpecialType>

          {/* Image Questions */}
          <SpecialType
            emoji="🖼️"
            title="Image Questions"
            color="var(--neon-lime)"
            description="Show a screenshot, map, or cropped image to identify"
          >
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Label>How to set up:</Label>
              <CodeBlock>
                Clue: "🖼️ IMAGE: Host shows image — Name this CS:GO map"
                {'\n'}Answer: "Dust 2"
              </CodeBlock>
              <Label style={{ marginTop: 'var(--space-md)' }}>How to play:</Label>
              <ul style={{ paddingLeft: 'var(--space-xl)', color: 'var(--text-secondary)' }}>
                <li>Prepare images in a folder or slideshow</li>
                <li>Display on a shared screen when the clue is picked</li>
                <li>Pro tip: Crop or blur images for harder questions</li>
              </ul>
            </div>
          </SpecialType>
        </Section>

        {/* Multiple Answers */}
        <Section title="Multiple Correct Answers" icon="✅">
          <p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
            Players might say the same thing differently. Add all variations!
          </p>
          <CodeBlock>
            Acceptable Answers:{'\n'}
            • World of Warcraft{'\n'}
            • WoW{'\n'}
            • Warcraft
          </CodeBlock>
          <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Auto-check mode ignores capitalization and extra spaces automatically.
          </p>
        </Section>

        {/* Host Tips */}
        <Section title="Host Tips" icon="🎤">
          <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            <Tip emoji="📱">
              <strong>Keep devices ready</strong> — Phone for audio, laptop for videos, whiteboard for drawing
            </Tip>
            <Tip emoji="📝">
              <strong>Prepare a cheat sheet</strong> — List your draw options and audio cues separately
            </Tip>
            <Tip emoji="⚖️">
              <strong>Use host-judged mode</strong> — For casual games, manual judging prevents arguments
            </Tip>
            <Tip emoji="🔄">
              <strong>Enable rebounds</strong> — When someone gets it wrong, others can steal!
            </Tip>
            <Tip emoji="🍺">
              <strong>Adjust timing</strong> — Increase answer time as the drinks flow
            </Tip>
          </div>
        </Section>

        {/* JSON Format */}
        <Section title="JSON Deck Format" icon="📄">
          <p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
            Export your decks as JSON to share or back up. Use "Quick Start from JSON" on the home page to import!
          </p>
          <CodeBlock>{`{
  "title": "Guys Night Trivia",
  "setup": {
    "title": "Guys Night Trivia",
    "players": [
      { "id": "p1", "name": "Team Alpha" },
      { "id": "p2", "name": "Team Beta" }
    ],
    "rounds": [
      {
        "id": "round-1",
        "name": "Jeopardy Round",
        "categories": [
          {
            "id": "cat1",
            "name": "Video Games",
            "clues": [
              {
                "id": "c1",
                "value": 200,
                "clueText": "This plumber has a brother named Luigi",
                "acceptableAnswers": ["Mario", "Super Mario"]
              },
              {
                "id": "c2",
                "value": 400,
                "clueText": "🎵 AUDIO: Host plays clip",
                "acceptableAnswers": ["Halo Theme", "Halo"]
              },
              {
                "id": "c3",
                "value": 600,
                "clueText": "🖍️ DRAW: Host gives drawer 3 options",
                "acceptableAnswers": ["Pikachu", "Master Chief", "Creeper"]
              }
            ]
          }
        ]
      }
    ],
    "rules": {
      "buzzOpenDelayMs": 500,
      "answerTimeSeconds": 30,
      "reboundEnabled": true,
      "validationMode": "host-judged"
    }
  }
}`}</CodeBlock>
          <div style={{ marginTop: 'var(--space-lg)', display: 'grid', gap: 'var(--space-md)' }}>
            <Tip emoji="💡">
              <strong>Values</strong> — Each category has 5 clues with values: 200, 400, 600, 800, 1000
            </Tip>
            <Tip emoji="📋">
              <strong>Answers</strong> — Add multiple acceptable answers as an array for flexibility
            </Tip>
            <Tip emoji="⚙️">
              <strong>Validation</strong> — Use "auto-check" for exact matching or "host-judged" for manual control
            </Tip>
          </div>
        </Section>

        {/* Daily Double & Final */}
        <Section title="Special Rounds" icon="⭐">
          <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
            <div className="card">
              <h4 style={{ color: 'var(--neon-gold)', marginBottom: 'var(--space-sm)' }}>
                Daily Double
              </h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Mark clues as Daily Double in setup. Only the selecting player can answer,
                and they wager points before seeing the clue. High risk, high reward!
              </p>
            </div>
            <div className="card">
              <h4 style={{ color: 'var(--neon-gold)', marginBottom: 'var(--space-sm)' }}>
                Final Jeopardy
              </h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                The ultimate showdown! Everyone sees the category, makes a secret wager,
                then answers privately. Reveal answers one by one for maximum drama.
              </p>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <motion.div
          style={{ textAlign: 'center', marginTop: 'var(--space-3xl)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/setup" className="btn btn-primary btn-lg">
            Create Your Game
          </Link>
          <p style={{ marginTop: 'var(--space-lg)', color: 'var(--text-muted)' }}>
            Ready to host? Let's build your board!
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Helper Components
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.section
      style={{ marginBottom: 'var(--space-3xl)' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <h2 style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)'
      }}>
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {children}
    </motion.section>
  );
}

function FlowStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: '1.25rem',
        color: 'var(--bg-deep)',
        flexShrink: 0
      }}>
        {number}
      </div>
      <div>
        <h4 style={{ marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>{title}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{children}</p>
      </div>
    </div>
  );
}

function SpecialType({
  emoji,
  title,
  color,
  description,
  children
}: {
  emoji: string;
  title: string;
  color: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 'var(--space-lg)',
        borderLeft: `4px solid ${color}`
      }}
    >
      <h3 style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        color: color,
        marginBottom: 'var(--space-sm)'
      }}>
        <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>{description}</p>
      {children}
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: '0.85rem',
      fontWeight: 600,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 'var(--space-sm)',
      ...style
    }}>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{
      background: 'var(--bg-elevated)',
      padding: 'var(--space-md)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.9rem',
      color: 'var(--neon-lime)',
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      margin: 0
    }}>
      {children}
    </pre>
  );
}

function Tip({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-md)',
      padding: 'var(--space-md)',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      alignItems: 'flex-start'
    }}>
      <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{children}</p>
    </div>
  );
}

export default Guide;
