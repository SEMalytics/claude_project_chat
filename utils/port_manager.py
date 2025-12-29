"""
Port management utilities for handling server restarts.

Checks if a port is in use and provides functionality to kill processes
using that port with user confirmation.
"""

import socket
import subprocess
import sys
from typing import Optional, Tuple


def is_port_in_use(host: str, port: int) -> bool:
    """
    Check if a port is already in use.
    
    Args:
        host: Host address (e.g., '127.0.0.1')
        port: Port number
        
    Returns:
        True if port is in use, False otherwise
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
            return False
        except OSError:
            return True


def get_processes_using_port(port: int) -> list[Tuple[int, str]]:
    """
    Get all process IDs and commands using a specific port.
    
    Args:
        port: Port number to check
        
    Returns:
        List of (pid, command) tuples
    """
    processes = []
    try:
        # Use lsof to find all processes using the port
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0 and result.stdout.strip():
            pids = [int(p) for p in result.stdout.strip().split('\n') if p]
            
            for pid in pids:
                # Get process command
                try:
                    cmd_result = subprocess.run(
                        ['ps', '-p', str(pid), '-o', 'command='],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    command = cmd_result.stdout.strip() if cmd_result.returncode == 0 else "Unknown"
                    processes.append((pid, command))
                except Exception:
                    processes.append((pid, "Unknown"))
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, ValueError):
        pass
    
    return processes


def kill_processes(pids: list[int]) -> Tuple[list[int], list[int]]:
    """
    Kill multiple processes by PID.
    
    Args:
        pids: List of process IDs to kill
        
    Returns:
        Tuple of (successful_pids, failed_pids)
    """
    successful = []
    failed = []
    
    for pid in pids:
        try:
            subprocess.run(['kill', '-9', str(pid)], check=True, timeout=5)
            successful.append(pid)
        except (subprocess.SubprocessError, subprocess.TimeoutExpired):
            failed.append(pid)
    
    return successful, failed


def prompt_user_restart(host: str, port: int) -> bool:
    """
    Prompt user to restart server if port is in use.
    
    Args:
        host: Host address
        port: Port number
        
    Returns:
        True if user wants to restart, False otherwise
    """
    processes = get_processes_using_port(port)
    
    print(f"\n{'='*60}")
    print(f"⚠️  Port {port} is already in use!")
    print(f"{'='*60}")
    
    if processes:
        print(f"\nProcess(es) using port {port}:")
        for pid, command in processes:
            print(f"  PID {pid}: {command}")
            
        # Validate these are Python/app.py processes
        python_processes = [(pid, cmd) for pid, cmd in processes 
                           if 'python' in cmd.lower() and 'app.py' in cmd]
        
        if not python_processes:
            print(f"\n⚠️  Warning: No Python app.py processes found.")
            print(f"  The port may be used by a different application.")
    else:
        print(f"\nUnable to identify the process using port {port}")
    
    print(f"\nOptions:")
    print(f"  1. Kill the existing process(es) and restart the server")
    print(f"  2. Exit (you can manually stop the process or use a different port)")
    
    while True:
        try:
            choice = input(f"\nEnter your choice (1 or 2): ").strip()
            
            if choice == '1':
                if processes:
                    pids = [pid for pid, _ in processes]
                    print(f"\nAttempting to kill {len(pids)} process(es)...")
                    successful, failed = kill_processes(pids)
                    
                    if successful:
                        for pid in successful:
                            print(f"✓ Successfully killed process {pid}")
                    if failed:
                        for pid in failed:
                            print(f"✗ Failed to kill process {pid}")
                        print(f"  You may need to run with sudo or kill manually:")
                        print(f"  sudo kill -9 {' '.join(str(p) for p in failed)}")
                        return False
                    
                    print(f"\nPlease re-run the server to start fresh.")
                    sys.exit(0)
                else:
                    print("\n✗ Cannot kill process - unable to identify PID")
                    print(f"  Try manually: lsof -ti :{port} | xargs kill -9")
                    return False
            elif choice == '2':
                print("\nExiting. To use a different port, set PORT in your .env file.")
                return False
            else:
                print("Invalid choice. Please enter 1 or 2.")
        except (KeyboardInterrupt, EOFError):
            print("\n\nExiting...")
            return False


def check_and_handle_port(host: str, port: int) -> bool:
    """
    Check if port is in use and handle restart if needed.
    
    Args:
        host: Host address
        port: Port number
        
    Returns:
        True if port is available (or was freed), False if should exit
    """
    if is_port_in_use(host, port):
        return prompt_user_restart(host, port)
    return True
