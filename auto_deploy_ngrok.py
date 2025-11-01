"""
🔧 C1 MECHANIC - AUTOMATIC NGROK DEPLOYMENT 🔧
Starts ngrok, gets public URL, updates frontend automatically
"""

import subprocess
import time
import requests
import json
import re

def start_ngrok_and_update_frontend():
    print("🔧 C1 MECHANIC: Starting automatic ngrok deployment...")
    print()

    # Start ngrok in background
    print("1️⃣ Starting ngrok tunnel...")
    ngrok_process = subprocess.Popen(
        ['ngrok.exe', 'http', '3001'],
        cwd=r'C:\Users\dwrek\100X_DEPLOYMENT\BACKEND\philosopher-ai',
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

    print("   Waiting for tunnel to establish...")
    time.sleep(5)

    # Get public URL from ngrok API
    print("2️⃣ Getting public URL from ngrok...")
    max_retries = 10
    public_url = None

    for i in range(max_retries):
        try:
            response = requests.get('http://localhost:4040/api/tunnels')
            data = response.json()

            if data.get('tunnels') and len(data['tunnels']) > 0:
                # Get HTTPS URL
                for tunnel in data['tunnels']:
                    if tunnel['proto'] == 'https':
                        public_url = tunnel['public_url']
                        break

                if public_url:
                    print(f"   ✅ Got public URL: {public_url}")
                    break

            print(f"   Retry {i+1}/{max_retries}...")
            time.sleep(2)

        except Exception as e:
            print(f"   Retry {i+1}/{max_retries}: {e}")
            time.sleep(2)

    if not public_url:
        print("   ❌ Could not get public URL from ngrok")
        print("   Please check the ngrok window for the Forwarding URL")
        return

    # Update frontend
    print("3️⃣ Updating frontend API_URL...")
    frontend_file = r'C:\Users\dwrek\100X_DEPLOYMENT\PLATFORM\philosopher-ai-connected.html'

    try:
        with open(frontend_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace localhost URL with ngrok URL
        updated_content = re.sub(
            r"const API_URL = ['\"]http://localhost:3001['\"];",
            f"const API_URL = '{public_url}';",
            content
        )

        with open(frontend_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        print(f"   ✅ Frontend updated with: {public_url}")

    except Exception as e:
        print(f"   ❌ Error updating frontend: {e}")

    # Save URL to file
    url_info = {
        'public_url': public_url,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'frontend_file': frontend_file
    }

    with open('ngrok_url.json', 'w') as f:
        json.dump(url_info, f, indent=2)

    print()
    print("=" * 60)
    print("✅ DEPLOYMENT COMPLETE!")
    print("=" * 60)
    print()
    print(f"🌐 Public Backend URL: {public_url}")
    print(f"🎨 Frontend: file:///C:/Users/dwrek/100X_DEPLOYMENT/PLATFORM/philosopher-ai-connected.html")
    print()
    print("⚠️  IMPORTANT: Keep the ngrok window open!")
    print("    Closing it will stop the tunnel.")
    print()
    print("💡 TIP: The free ngrok URL changes every time you restart.")
    print("    For a permanent URL, upgrade to ngrok paid plan or use Railway.")
    print()
    print("🔧 C1 MECHANIC: Your live user can now access the backend!")
    print()

if __name__ == "__main__":
    start_ngrok_and_update_frontend()
