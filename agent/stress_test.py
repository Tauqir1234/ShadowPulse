import time
import os
import threading
import multiprocessing
import socket
import string
import random

print("Starting ShadowPulse Safe Stress Test")
print("This will deliberately spike CPU, Memory, Disk IO, and Network Connections.")
print("The agent should detect these as anomalies.")
print("Press Ctrl+C to stop.")

def cpu_spinner():
    while True:
        pass  # Just burn CPU

def memory_hog():
    # Allocate a lot of memory
    data = []
    while True:
        data.append(' ' * 10**6)  # 1MB chunks
        time.sleep(0.1)

def file_writer():
    while True:
        # Generate garbage file
        filename = f"test_anomaly_{random.randint(1, 100000)}.tmp"
        with open(filename, "w") as f:
            f.write("A" * 1024 * 1024)  # Write 1MB
        time.sleep(0.5)
        os.remove(filename)

def network_sockets():
    while True:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            # Connect to a random address (it will likely fail, but it's socket activity)
            s.settimeout(0.1)
            s.connect(("8.8.8.8", 80))
            s.close()
        except Exception:
            pass
        time.sleep(0.01)

if __name__ == '__main__':
    try:
        # Start a bunch of CPU bound processes
        processes = []
        for _ in range(multiprocessing.cpu_count()):
            p = multiprocessing.Process(target=cpu_spinner)
            p.start()
            processes.append(p)
            
        # Start threads for IO and Network
        threading.Thread(target=memory_hog, daemon=True).start()
        for _ in range(5):
            threading.Thread(target=file_writer, daemon=True).start()
            threading.Thread(target=network_sockets, daemon=True).start()

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping...")
        for p in processes:
            p.terminate()
