"""
Playwright test for single-station mode with separate viewer and master URLs.
Tests the flow:
1. Create a game in single-station mode
2. Verify navigation to /master-local/:code (host controls)
3. Open /game-local/:code (viewer) in separate tab
4. Verify both views render correctly
"""

from playwright.sync_api import sync_playwright
import time

def test_single_station_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Create host context and viewer context
        host_context = browser.new_context()
        viewer_context = browser.new_context()

        host_page = host_context.new_page()

        print("1. Navigating to Setup page...")
        host_page.goto('http://localhost:5173/setup')
        host_page.wait_for_load_state('networkidle')

        # Take screenshot
        host_page.screenshot(path='C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/01_setup.png')
        print("   Screenshot saved: 01_setup.png")

        print("2. Filling in game title...")
        # Fill in game title
        title_input = host_page.locator('input[placeholder*="Movie Night"]')
        title_input.fill('Test Single Station Game')

        # Click Continue
        host_page.locator('button:has-text("Continue")').click()
        host_page.wait_for_timeout(500)

        print("3. Adding players...")
        # Add players (step 2)
        player_input = host_page.locator('input[placeholder*="player name"]')
        player_input.fill('Player 1')
        host_page.locator('button:has-text("Add")').first.click()
        host_page.wait_for_timeout(300)

        player_input.fill('Player 2')
        host_page.locator('button:has-text("Add")').first.click()
        host_page.wait_for_timeout(300)

        # Continue to categories
        host_page.locator('button:has-text("Continue")').click()
        host_page.wait_for_timeout(500)

        print("4. Adding a category...")
        # Add a category
        host_page.locator('text=Add Category').click()
        host_page.wait_for_timeout(300)

        # Fill category name
        category_input = host_page.locator('input[placeholder*="Category name"]').first
        category_input.fill('Test Category')

        # Fill first clue
        clue_inputs = host_page.locator('input[placeholder*="Enter clue"]')
        if clue_inputs.count() > 0:
            clue_inputs.first.fill('What is the capital of France?')

        # Fill answer
        answer_inputs = host_page.locator('input[placeholder*="Acceptable answers"]')
        if answer_inputs.count() > 0:
            answer_inputs.first.fill('Paris')

        host_page.screenshot(path='C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/02_categories.png')
        print("   Screenshot saved: 02_categories.png")

        # Continue to rules
        host_page.locator('button:has-text("Continue")').click()
        host_page.wait_for_timeout(500)

        print("5. Enabling Single Station Mode...")
        # Enable Single Station Mode
        # Find the Single Station Mode toggle and click Yes
        single_station_section = host_page.locator('text=Single Station Mode').first
        yes_button = host_page.locator('button:has-text("Yes")').nth(2)  # Third Yes button is for single station
        yes_button.click()
        host_page.wait_for_timeout(500)

        host_page.screenshot(path='C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/03_rules_single_station.png')
        print("   Screenshot saved: 03_rules_single_station.png")

        # Continue to manage
        host_page.locator('button:has-text("Continue")').click()
        host_page.wait_for_timeout(500)

        print("6. Starting the game...")
        # Start game
        host_page.locator('button:has-text("Start Game")').click()

        # Wait for navigation
        host_page.wait_for_timeout(2000)
        host_page.wait_for_load_state('networkidle')

        # Get current URL
        current_url = host_page.url
        print(f"   Current URL: {current_url}")

        host_page.screenshot(path='C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/04_master_local.png')
        print("   Screenshot saved: 04_master_local.png")

        # Verify we're on master-local
        if '/master-local/' in current_url:
            print("   SUCCESS: Navigated to /master-local/")

            # Extract room code
            room_code = current_url.split('/master-local/')[1].split('?')[0]
            print(f"   Room code: {room_code}")

            # Check for viewer URL display
            viewer_url_element = host_page.locator('code').first
            if viewer_url_element.count() > 0:
                viewer_url_text = viewer_url_element.text_content()
                print(f"   Viewer URL displayed: {viewer_url_text}")

            print("7. Opening viewer in separate browser context...")
            # Open viewer page
            viewer_page = viewer_context.new_page()
            viewer_page.goto(f'http://localhost:5173/game-local/{room_code}')
            viewer_page.wait_for_load_state('networkidle')
            viewer_page.wait_for_timeout(1000)

            viewer_page.screenshot(path='C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/05_viewer.png')
            print("   Screenshot saved: 05_viewer.png")

            # Check viewer page content
            viewer_content = viewer_page.content()
            if 'Scoreboard' in viewer_content:
                print("   SUCCESS: Viewer page shows scoreboard")

            # Test interaction: Select a clue from master
            print("8. Testing clue selection from master...")
            clue_buttons = host_page.locator('[class*="clueCell"]')
            if clue_buttons.count() > 0:
                clue_buttons.first.click()
                host_page.wait_for_timeout(1000)

                host_page.screenshot(path='C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/06_clue_selected_master.png')
                print("   Screenshot saved: 06_clue_selected_master.png")

                # Check viewer receives the update
                viewer_page.wait_for_timeout(1000)
                viewer_page.screenshot(path='C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/07_clue_selected_viewer.png')
                print("   Screenshot saved: 07_clue_selected_viewer.png")

            viewer_page.close()
        else:
            print(f"   FAIL: Expected /master-local/ but got {current_url}")

        print("\nTest completed!")
        print("Screenshots saved to: C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots/")

        host_page.close()
        host_context.close()
        viewer_context.close()
        browser.close()

if __name__ == '__main__':
    import os
    os.makedirs('C:/Users/gotno/Documents/Projects/partyJeoparty/test_screenshots', exist_ok=True)
    test_single_station_mode()
