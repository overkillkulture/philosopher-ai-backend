"""
🔧 C1 MECHANIC - AUTONOMOUS GITHUB REPO CREATOR 🔧
Creates GitHub repository automatically using Playwright
"""

from playwright.sync_api import sync_playwright
import time
import json

def create_github_repo():
    repo_name = "philosopher-ai-backend"
    description = "Philosopher AI Backend - C3 Oracle consciousness advisor with Claude integration"

    print("🔧 C1 MECHANIC: Starting autonomous GitHub repo creation...")

    with sync_playwright() as p:
        # Launch browser in non-headless mode so Commander can see what's happening
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Navigate to GitHub new repository page
            print("📡 Navigating to GitHub...")
            page.goto("https://github.com/new")

            # Wait for page to load - if not logged in, will be redirected to login
            time.sleep(3)

            # Check if we're on login page or new repo page
            current_url = page.url

            if "login" in current_url.lower():
                print("🔐 Not logged in to GitHub. Please log in manually in the browser window...")
                print("   (Waiting 60 seconds for login...)")
                time.sleep(60)

                # Navigate to new repo page again after login
                page.goto("https://github.com/new")
                time.sleep(3)

            # Fill in repository details
            print(f"📝 Creating repository: {repo_name}")

            # Repository name
            page.fill('input[name="repository[name]"]', repo_name)
            time.sleep(1)

            # Description
            page.fill('input[name="repository[description]"]', description)
            time.sleep(1)

            # Make it private (safer for API keys in env vars)
            page.click('input[value="private"]')
            time.sleep(1)

            # Don't initialize with README (we already have one)
            # Just create the repo

            print("🚀 Submitting repository creation...")
            page.click('button[type="submit"]:has-text("Create repository")')

            # Wait for redirect to new repo page
            time.sleep(5)

            # Get the repo URL
            repo_url = page.url

            # Extract the git URLs from the page
            print(f"✅ Repository created: {repo_url}")

            # Get the git remote URL
            try:
                git_url = page.locator('input[aria-label*="Clone"]').first.input_value()
                print(f"📡 Git URL: {git_url}")

                # Save to file for next steps
                with open('github_repo_info.json', 'w') as f:
                    json.dump({
                        'repo_url': repo_url,
                        'git_url': git_url,
                        'repo_name': repo_name
                    }, f, indent=2)

                print("💾 Repository info saved to github_repo_info.json")

            except Exception as e:
                print(f"⚠️ Could not extract git URL automatically: {e}")
                print(f"   You can get it from: {repo_url}")

            # Keep browser open for a moment
            print("\n✅ SUCCESS! Repository created. Keeping browser open for 10 seconds...")
            time.sleep(10)

        except Exception as e:
            print(f"❌ Error creating repository: {e}")
            print("🔧 C1 MECHANIC NOTE: You may need to create the repo manually")
            print("   Go to: https://github.com/new")
            print(f"   Name: {repo_name}")
            print(f"   Description: {description}")
            print("   Privacy: Private")
            print("   Don't initialize with README")

            # Keep browser open so Commander can do it manually
            input("Press Enter when done creating repo manually...")

        finally:
            browser.close()

if __name__ == "__main__":
    create_github_repo()
