import os
import sys
import webbrowser
import socket
import threading
import uvicorn
import time

def find_free_port():
    """Finds a free port on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def open_browser(url):
    """Opens the browser after a short delay."""
    time.sleep(2)  # Give the server a moment to start
    webbrowser.open(url)

if __name__ == "__main__":
    # Add backend to path so we can import app
    backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    sys.path.append(backend_path)

    from api import app

    port = 8000
    # Check if port 8000 is available, otherwise find a free one
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
        except socket.error:
            port = find_free_port()

    url = f"http://127.0.0.1:{port}"
    print(f"Starting Cadence at {url}...")

    # Start browser in a separate thread
    threading.Thread(target=open_browser, args=(url,), daemon=True).start()

    # Run the FastAPI server
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
