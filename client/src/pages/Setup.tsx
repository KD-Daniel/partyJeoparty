import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, Button, Input, Card, PlayerCard } from '../components';
import type { Player, Category, Clue, GameRules } from '../types/game';
import { api, type DeckListItem } from '../services/api';
import styles from './Setup.module.css';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default clue values
const DEFAULT_VALUES = [200, 400, 600, 800, 1000];

export function Setup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'info' | 'players' | 'categories' | 'rules' | 'manage'>('info');
  const [gameTitle, setGameTitle] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<GameRules>({
    buzzOpenDelayMs: 500,
    answerTimeSeconds: 10,
    reboundEnabled: true,
    validationMode: 'auto-check',
  });

  // Deck management state
  const [savedDecks, setSavedDecks] = useState<DeckListItem[]>([]);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [showDeckLibrary, setShowDeckLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(false);

  // Load quickstart deck from localStorage if present
  useEffect(() => {
    if (searchParams.get('quickstart') === 'true') {
      const storedDeck = localStorage.getItem('quickStartDeck');
      if (storedDeck) {
        try {
          const json = JSON.parse(storedDeck);
          setGameTitle(json.setup.title);
          setPlayers(json.setup.players.map((p: any) => ({
            ...p,
            score: 0,
            isConnected: false,
          })));
          setCategories(json.setup.rounds[0]?.categories.map((cat: any) => ({
            ...cat,
            clues: cat.clues.map((clue: any) => ({ ...clue, isUsed: false })),
          })) || []);
          setRules(json.setup.rules);
          // Clear localStorage after loading
          localStorage.removeItem('quickStartDeck');
          // Go directly to manage step
          setStep('manage');
        } catch (error) {
          console.error('Failed to load quickstart deck:', error);
        }
      }
    }
  }, [searchParams]);

  const addPlayer = () => {
    if (newPlayerName.trim() && players.length < 8) {
      setPlayers([
        ...players,
        {
          id: generateId(),
          name: newPlayerName.trim(),
          score: 0,
          isConnected: true,
        },
      ]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const addCategory = () => {
    if (categories.length < 6) {
      const clues: Clue[] = DEFAULT_VALUES.map((value) => ({
        id: generateId(),
        value,
        clueText: '',
        acceptableAnswers: [],
        isUsed: false,
      }));

      setCategories([
        ...categories,
        {
          id: generateId(),
          name: '',
          clues,
        },
      ]);
    }
  };

  const updateCategory = (id: string, name: string) => {
    setCategories(
      categories.map((c) => (c.id === id ? { ...c, name } : c))
    );
  };

  const updateClue = (categoryId: string, clueId: string, updates: Partial<Clue>) => {
    setCategories(
      categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              clues: c.clues.map((clue) =>
                clue.id === clueId ? { ...clue, ...updates } : clue
              ),
            }
          : c
      )
    );
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
  };

  // Load decks from server
  useEffect(() => {
    const loadDecks = async () => {
      try {
        setLoadingDecks(true);
        const decks = await api.getDecks();
        setSavedDecks(decks);
      } catch (error) {
        console.error('Failed to load decks:', error);
      } finally {
        setLoadingDecks(false);
      }
    };
    loadDecks();
  }, []);

  // Save current deck
  const handleSaveDeck = async () => {
    try {
      setIsSaving(true);
      const deckData = {
        title: gameTitle,
        setup: {
          title: gameTitle,
          players: players.map(p => ({ id: p.id, name: p.name, team: p.team })),
          rounds: [{
            id: 'round-1',
            name: 'Jeopardy Round',
            categories: categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              clues: cat.clues.map(clue => ({
                id: clue.id,
                value: clue.value,
                clueText: clue.clueText,
                acceptableAnswers: clue.acceptableAnswers,
              })),
            })),
          }],
          rules,
        },
      };

      if (currentDeckId) {
        await api.updateDeck(currentDeckId, deckData);
      } else {
        const savedDeck = await api.createDeck(deckData);
        setCurrentDeckId(savedDeck.id);
      }

      // Refresh deck list
      const decks = await api.getDecks();
      setSavedDecks(decks);
      alert('Deck saved successfully!');
    } catch (error) {
      console.error('Failed to save deck:', error);
      alert('Failed to save deck. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a deck
  const handleLoadDeck = async (deckId: string) => {
    try {
      const deck = await api.getDeck(deckId);
      setGameTitle(deck.setup.title);
      setPlayers(deck.setup.players.map((p: any) => ({
        ...p,
        score: 0,
        isConnected: false,
      })));
      setCategories(deck.setup.rounds[0]?.categories.map((cat: any) => ({
        ...cat,
        clues: cat.clues.map((clue: any) => ({ ...clue, isUsed: false })),
      })) || []);
      setRules(deck.setup.rules);
      setCurrentDeckId(deckId);
      setShowDeckLibrary(false);
      alert('Deck loaded successfully!');
    } catch (error) {
      console.error('Failed to load deck:', error);
      alert('Failed to load deck. Please try again.');
    }
  };

  // Duplicate a deck
  const handleDuplicateDeck = async (deckId: string) => {
    try {
      const originalDeck = savedDecks.find(d => d.id === deckId);
      const newTitle = prompt('Enter a name for the duplicated deck:', `${originalDeck?.title} (Copy)`);
      if (!newTitle) return;

      await api.duplicateDeck(deckId, newTitle);
      const decks = await api.getDecks();
      setSavedDecks(decks);
      alert('Deck duplicated successfully!');
    } catch (error) {
      console.error('Failed to duplicate deck:', error);
      alert('Failed to duplicate deck. Please try again.');
    }
  };

  // Delete a deck
  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      await api.deleteDeck(deckId);
      const decks = await api.getDecks();
      setSavedDecks(decks);
      if (currentDeckId === deckId) {
        setCurrentDeckId(null);
      }
      alert('Deck deleted successfully!');
    } catch (error) {
      console.error('Failed to delete deck:', error);
      alert('Failed to delete deck. Please try again.');
    }
  };

  // Export deck as JSON
  const handleExportDeck = () => {
    const deckData = {
      title: gameTitle,
      setup: {
        title: gameTitle,
        players: players.map(p => ({ id: p.id, name: p.name, team: p.team })),
        rounds: [{
          id: 'round-1',
          name: 'Jeopardy Round',
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            clues: cat.clues.map(clue => ({
              id: clue.id,
              value: clue.value,
              clueText: clue.clueText,
              acceptableAnswers: clue.acceptableAnswers,
            })),
          })),
        }],
        rules,
      },
    };

    const dataStr = JSON.stringify(deckData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${gameTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import deck from JSON
  const handleImportDeck = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.setup || !json.title) {
          throw new Error('Invalid deck format');
        }

        setGameTitle(json.setup.title);
        setPlayers(json.setup.players.map((p: any) => ({
          ...p,
          score: 0,
          isConnected: false,
        })));
        setCategories(json.setup.rounds[0]?.categories.map((cat: any) => ({
          ...cat,
          clues: cat.clues.map((clue: any) => ({ ...clue, isUsed: false })),
        })) || []);
        setRules(json.setup.rules);
        setCurrentDeckId(null);
        alert('Deck imported successfully!');
      } catch (error) {
        console.error('Failed to import deck:', error);
        alert('Failed to import deck. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleStartGame = async () => {
    try {
      // Build the game setup
      const gameSetup = {
        title: gameTitle,
        players: players.map(p => ({ id: p.id, name: p.name, team: p.team })),
        rounds: [{
          id: 'round-1',
          name: 'Jeopardy Round',
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            clues: cat.clues.map(clue => ({
              id: clue.id,
              value: clue.value,
              clueText: clue.clueText,
              acceptableAnswers: clue.acceptableAnswers,
            })),
          })),
        }],
        rules,
      };

      // Generate a unique host ID and save it for the lobby
      const hostId = 'host-' + generateId();
      sessionStorage.setItem('hostId', hostId);

      // Create room with embedded setup (no database required)
      const room = await api.createRoom({
        setup: gameSetup,
        hostId,
      });

      navigate(`/room/${room.roomCode}`);
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  const steps = [
    { id: 'info', label: 'Game Info', number: 1 },
    { id: 'players', label: 'Players', number: 2 },
    { id: 'categories', label: 'Categories', number: 3 },
    { id: 'rules', label: 'Rules', number: 4 },
    { id: 'manage', label: 'Manage', number: 5 },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size="sm" animate={false} />
        <Button variant="ghost" onClick={() => navigate('/')}>
          Cancel
        </Button>
      </header>

      <div className={styles.container}>
        {/* Progress Steps */}
        <div className={styles.steps}>
          {steps.map((s, i) => (
            <button
              key={s.id}
              className={`${styles.step} ${step === s.id ? styles.active : ''} ${steps.findIndex((x) => x.id === step) > i ? styles.completed : ''}`}
              onClick={() => setStep(s.id as typeof step)}
            >
              <span className={styles.stepNumber}>{s.number}</span>
              <span className={styles.stepLabel}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 'info' && (
            <motion.div
              key="info"
              className={styles.stepContent}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className={styles.stepTitle}>Game Information</h2>
              <p className={styles.stepDesc}>Give your game a memorable title</p>

              <Card variant="elevated" padding="lg">
                <Input
                  label="Game Title"
                  placeholder="e.g., Movie Night Trivia, Science Showdown..."
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                />
              </Card>

              <div className={styles.stepActions}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setStep('players')}
                  disabled={!gameTitle.trim()}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'players' && (
            <motion.div
              key="players"
              className={styles.stepContent}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className={styles.stepTitle}>Add Players</h2>
              <p className={styles.stepDesc}>Add 2-8 players or teams to compete</p>

              <Card variant="elevated" padding="lg">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addPlayer();
                  }}
                  className={styles.addForm}
                >
                  <Input
                    placeholder="Enter player name..."
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                  <Button variant="secondary" type="submit" disabled={players.length >= 8}>
                    Add
                  </Button>
                </form>

                <div className={styles.playerList}>
                  <AnimatePresence>
                    {players.map((player) => (
                      <PlayerCard
                        key={player.id}
                        name={player.name}
                        showScore={false}
                        onRemove={() => removePlayer(player.id)}
                      />
                    ))}
                  </AnimatePresence>

                  {players.length === 0 && (
                    <p className={styles.emptyState}>No players added yet</p>
                  )}
                </div>
              </Card>

              <div className={styles.stepActions}>
                <Button variant="ghost" onClick={() => setStep('info')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setStep('categories')}
                  disabled={players.length < 2}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'categories' && (
            <motion.div
              key="categories"
              className={styles.stepContent}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className={styles.stepTitle}>Create Categories</h2>
              <p className={styles.stepDesc}>Add up to 6 categories with 5 clues each</p>

              <div className={styles.categoriesGrid}>
                {categories.map((category) => (
                  <Card key={category.id} variant="bordered" padding="md" className={styles.categoryCard}>
                    <div className={styles.categoryHeader}>
                      <Input
                        placeholder="Category name..."
                        value={category.name}
                        onChange={(e) => updateCategory(category.id, e.target.value)}
                      />
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeCategory(category.id)}
                      >
                        &times;
                      </button>
                    </div>

                    <div className={styles.cluesList}>
                      {category.clues.map((clue) => (
                        <div key={clue.id} className={styles.clueItem}>
                          <span className={styles.clueValue}>${clue.value}</span>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <Input
                              placeholder="Enter clue..."
                              value={clue.clueText}
                              onChange={(e) =>
                                updateClue(category.id, clue.id, { clueText: e.target.value })
                              }
                            />
                            <Input
                              placeholder="Acceptable answers (comma-separated)..."
                              value={clue.acceptableAnswers.join(', ')}
                              onChange={(e) =>
                                updateClue(category.id, clue.id, {
                                  acceptableAnswers: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                                })
                              }
                              style={{ fontSize: '0.875rem' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}

                {categories.length < 6 && (
                  <button className={styles.addCategoryBtn} onClick={addCategory}>
                    <span className={styles.addIcon}>+</span>
                    <span>Add Category</span>
                  </button>
                )}
              </div>

              <div className={styles.stepActions}>
                <Button variant="ghost" onClick={() => setStep('players')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setStep('rules')}
                  disabled={categories.length === 0}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'rules' && (
            <motion.div
              key="rules"
              className={styles.stepContent}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className={styles.stepTitle}>Game Rules</h2>
              <p className={styles.stepDesc}>Configure how your game will be played</p>

              <Card variant="elevated" padding="lg">
                <div className={styles.rulesGrid}>
                  <div className={styles.ruleItem}>
                    <label className={styles.ruleLabel}>Answer Time (seconds)</label>
                    <Input
                      type="number"
                      value={rules.answerTimeSeconds}
                      onChange={(e) =>
                        setRules({ ...rules, answerTimeSeconds: parseInt(e.target.value) || 30 })
                      }
                      min={10}
                      max={120}
                    />
                  </div>

                  <div className={styles.ruleItem}>
                    <label className={styles.ruleLabel}>Buzz Delay (ms)</label>
                    <Input
                      type="number"
                      value={rules.buzzOpenDelayMs}
                      onChange={(e) =>
                        setRules({ ...rules, buzzOpenDelayMs: parseInt(e.target.value) || 500 })
                      }
                      min={0}
                      max={3000}
                    />
                  </div>

                  <div className={styles.ruleItem}>
                    <label className={styles.ruleLabel}>Allow Rebounds</label>
                    <div className={styles.toggle}>
                      <button
                        className={`${styles.toggleBtn} ${rules.reboundEnabled ? styles.active : ''}`}
                        onClick={() => setRules({ ...rules, reboundEnabled: true })}
                      >
                        Yes
                      </button>
                      <button
                        className={`${styles.toggleBtn} ${!rules.reboundEnabled ? styles.active : ''}`}
                        onClick={() => setRules({ ...rules, reboundEnabled: false })}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div className={styles.ruleItem}>
                    <label className={styles.ruleLabel}>Answer Validation</label>
                    <div className={styles.toggle}>
                      <button
                        className={`${styles.toggleBtn} ${rules.validationMode === 'host-judged' ? styles.active : ''}`}
                        onClick={() => setRules({ ...rules, validationMode: 'host-judged' })}
                      >
                        Host Judged
                      </button>
                      <button
                        className={`${styles.toggleBtn} ${rules.validationMode === 'auto-check' ? styles.active : ''}`}
                        onClick={() => setRules({ ...rules, validationMode: 'auto-check' })}
                      >
                        Auto Check
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              <div className={styles.stepActions}>
                <Button variant="ghost" onClick={() => setStep('categories')}>
                  Back
                </Button>
                <Button variant="primary" size="lg" onClick={() => setStep('manage')}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'manage' && (
            <motion.div
              key="manage"
              className={styles.stepContent}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className={styles.stepTitle}>Deck Management</h2>
              <p className={styles.stepDesc}>Save your deck or load an existing one</p>

              <Card variant="elevated" padding="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Save/Update Deck */}
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--neon-cyan)' }}>Save Deck</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="secondary"
                        onClick={handleSaveDeck}
                        disabled={isSaving || !gameTitle.trim()}
                      >
                        {isSaving ? 'Saving...' : (currentDeckId ? 'Update Deck' : 'Save New Deck')}
                      </Button>
                      {currentDeckId && (
                        <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          Currently editing: {gameTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Export/Import */}
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--neon-cyan)' }}>Export/Import</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="secondary"
                        onClick={handleExportDeck}
                        disabled={!gameTitle.trim()}
                      >
                        Export as JSON
                      </Button>
                      <label style={{ position: 'relative', display: 'inline-block' }}>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportDeck}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            background: 'rgba(0, 255, 255, 0.1)',
                            border: '1px solid var(--neon-cyan)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--neon-cyan)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                          }}
                        >
                          Import JSON
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Deck Library */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ color: 'var(--neon-cyan)' }}>Saved Decks</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeckLibrary(!showDeckLibrary)}
                      >
                        {showDeckLibrary ? 'Hide' : 'Show'} ({savedDecks.length})
                      </Button>
                    </div>

                    {showDeckLibrary && (
                      <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.5rem'
                      }}>
                        {loadingDecks ? (
                          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading decks...</p>
                        ) : savedDecks.length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No saved decks yet</p>
                        ) : (
                          savedDecks.map(deck => (
                            <div
                              key={deck.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                gap: '0.5rem'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{deck.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Updated: {new Date(deck.updated_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLoadDeck(deck.id)}
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateDeck(deck.id)}
                                >
                                  Duplicate
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDeck(deck.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <div className={styles.stepActions}>
                <Button variant="ghost" onClick={() => setStep('rules')}>
                  Back
                </Button>
                <Button variant="gold" size="lg" onClick={handleStartGame}>
                  Start Game
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
