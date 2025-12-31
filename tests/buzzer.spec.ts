import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

test.describe('Buzzer Flow', () => {
  let hostContext: BrowserContext;
  let playerContext: BrowserContext;
  let hostPage: Page;
  let playerPage: Page;
  let gmPage: Page;
  let roomCode: string;

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext();
    playerContext = await browser.newContext();
  });

  test.afterAll(async () => {
    await hostContext?.close();
    await playerContext?.close();
  });

  test('complete buzzer flow', async () => {
    test.setTimeout(60000); // 60 second timeout
    hostPage = await hostContext.newPage();
    playerPage = await playerContext.newPage();

    hostPage.on('console', msg => console.log('HOST:', msg.text()));
    playerPage.on('console', msg => console.log('PLAYER:', msg.text()));

    // Handle alerts
    hostPage.on('dialog', dialog => {
      console.log('HOST DIALOG:', dialog.message());
      dialog.accept();
    });

    // Step 1: Host imports game via JSON
    console.log('Step 1: Host navigating to setup...');
    await hostPage.goto('/setup');
    await hostPage.waitForLoadState('networkidle');
    await hostPage.screenshot({ path: 'tests/screenshots/01-setup-initial.png' });

    // Go to Manage tab to import JSON
    console.log('Step 2: Importing test game...');
    await hostPage.locator('button:has-text("Manage")').click();
    await hostPage.waitForTimeout(500);
    await hostPage.screenshot({ path: 'tests/screenshots/02-manage-tab.png' });

    const fileInput = hostPage.locator('input[type="file"][accept=".json"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'test-game.json'));
    await hostPage.waitForTimeout(1000);
    await hostPage.screenshot({ path: 'tests/screenshots/03-after-import.png' });

    // Step 3: Start game (creates room)
    console.log('Step 3: Starting game...');
    await hostPage.screenshot({ path: 'tests/screenshots/04-before-start.png' });
    const startGameBtn = hostPage.locator('button:has-text("Start Game")');
    await startGameBtn.click();
    await hostPage.waitForURL(/\/room\//, { timeout: 10000 });
    roomCode = hostPage.url().split('/room/')[1];
    console.log('Room code:', roomCode);
    await hostPage.screenshot({ path: 'tests/screenshots/03-lobby-host.png' });

    // Step 4: Player joins
    console.log('Step 4: Player joining...');
    await playerPage.goto(`/room/${roomCode}`);
    await playerPage.waitForLoadState('networkidle');
    await playerPage.screenshot({ path: 'tests/screenshots/04-lobby-player.png' });

    const nameInput = playerPage.locator('input[placeholder*="name" i]');
    await nameInput.fill('Phone Player');
    await playerPage.locator('button:has-text("Join")').click();
    await playerPage.waitForTimeout(1000);
    await playerPage.screenshot({ path: 'tests/screenshots/05-player-joined.png' });

    // Player clicks ready
    const readyBtn = playerPage.locator('button:has-text("Ready")');
    if (await readyBtn.isVisible()) {
      await readyBtn.click();
      await playerPage.waitForTimeout(500);
    }

    // Host also joins as a second player (need 2 players to start)
    console.log('Step 5: Host joining as second player...');
    await hostPage.reload();
    await hostPage.waitForTimeout(500);

    const hostNameInput = hostPage.locator('input[placeholder*="name" i]');
    if (await hostNameInput.isVisible()) {
      await hostNameInput.fill('Host Player');
      await hostPage.locator('button:has-text("Join")').click();
      await hostPage.waitForTimeout(500);

      // Host clicks ready
      const hostReadyBtn = hostPage.locator('button:has-text("Ready")');
      if (await hostReadyBtn.isVisible()) {
        await hostReadyBtn.click();
        await hostPage.waitForTimeout(500);
      }
    }
    await hostPage.screenshot({ path: 'tests/screenshots/06-lobby-before-start.png' });

    // Step 6: Host starts game
    console.log('Step 6: Host starting game...');
    const startBtn = hostPage.locator('button:has-text("Start Game")');
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await startBtn.click();
    await hostPage.waitForURL(/\/game\//, { timeout: 10000 });
    console.log('Game started');
    await hostPage.screenshot({ path: 'tests/screenshots/07-game-host.png' });

    // Player redirected to game
    await playerPage.waitForURL(/\/game\//, { timeout: 10000 });
    await playerPage.screenshot({ path: 'tests/screenshots/08-game-player.png' });

    // Step 6: Open GM screen
    console.log('Step 6: Opening GM screen...');
    gmPage = await hostContext.newPage();
    gmPage.on('console', msg => console.log('GM:', msg.text()));
    await gmPage.goto(`/master/${roomCode}`);
    await gmPage.waitForLoadState('networkidle');
    await gmPage.screenshot({ path: 'tests/screenshots/09-gm-screen.png' });

    // Step 7: GM clicks a clue
    console.log('Step 7: GM selecting clue...');
    // The GM board has clue cells - find one with a value
    const clueBtn = gmPage.locator('button').filter({ hasText: /^\$?100$/ }).first();
    await clueBtn.click();
    await gmPage.waitForTimeout(500);
    await gmPage.screenshot({ path: 'tests/screenshots/10-gm-clue-selected.png' });

    // Step 8: Check player sees clue modal
    console.log('Step 8: Checking player for clue modal...');
    await playerPage.waitForTimeout(500);
    await playerPage.screenshot({ path: 'tests/screenshots/11-player-clue-modal.png' });

    // Wait for buzz to be enabled (500ms delay from server)
    console.log('Step 9: Waiting for buzzer...');
    await playerPage.waitForTimeout(1500);
    await playerPage.screenshot({ path: 'tests/screenshots/12-player-waiting-buzz.png' });

    // Check for BUZZ button
    const buzzBtn = playerPage.locator('button:has-text("BUZZ")');
    const isBuzzVisible = await buzzBtn.isVisible();
    console.log('BUZZ button visible:', isBuzzVisible);

    // Get page content for debugging
    const pageContent = await playerPage.content();
    console.log('Has canBuzz in page?', pageContent.includes('canBuzz'));

    if (!isBuzzVisible) {
      // Debug: Check what's in the modal
      const modal = playerPage.locator('[class*="overlay"]');
      const modalVisible = await modal.isVisible();
      console.log('Modal visible:', modalVisible);

      // Check clue text
      const clueText = playerPage.locator('[class*="clueText"]');
      const clueTextVisible = await clueText.isVisible();
      console.log('Clue text visible:', clueTextVisible);
    }

    await expect(buzzBtn).toBeVisible({ timeout: 5000 });
    console.log('SUCCESS: Buzzer visible!');

    // Step 10: Player buzzes
    console.log('Step 10: Player buzzing...');
    await buzzBtn.click();
    await playerPage.waitForTimeout(500);
    await playerPage.screenshot({ path: 'tests/screenshots/13-player-buzzed.png' });

    const buzzedIn = playerPage.locator('text=BUZZED IN');
    await expect(buzzedIn).toBeVisible({ timeout: 5000 });
    console.log('SUCCESS: Buzz registered!');
  });
});
