#!/usr/bin/env python3
"""
get_gmail_refresh_token.py
Interactive script to obtain a Google OAuth2 refresh token using the Device Authorization Flow.
- No external libraries required.
- Outputs: refresh_token on screen and saved into gmail_oauth_creds.json
"""

import json
import sys
import time
import webbrowser
import urllib.parse
import urllib.request
from getpass import getpass

DEVICE_CODE_URL = "https://oauth2.googleapis.com/device/code"
TOKEN_URL       = "https://oauth2.googleapis.com/token"
SCOPE_DEFAULT   = "https://mail.google.com/"  # full Gmail (SMTP/IMAP/Send)

def post_form(url: str, data: dict, timeout: int = 30) -> dict:
    payload = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())

def prompt_nonempty(prompt: str, secret: bool = False) -> str:
    while True:
        val = getpass(prompt) if secret else input(prompt)
        val = val.strip()
        if val:
            return val
        print("Value is required.")

def main():
    print("\n=== Google OAuth2 (Device Flow) – Gmail Refresh Token Generator ===\n")

    # Inputs
    client_id = input("Client ID        : ").strip()
    if not client_id:
        print("Client ID is required.")
        sys.exit(1)

    # Show, but allow hidden entry if preferred
    client_secret = getpass("Client Secret    : ").strip()
    if not client_secret:
        print("Client Secret is required.")
        sys.exit(1)

    scope = input(f"Scope [{SCOPE_DEFAULT}]: ").strip() or SCOPE_DEFAULT

    # Step 1: Get device/user codes
    try:
        dc = post_form(DEVICE_CODE_URL, {
            "client_id": client_id,
            "scope": scope
        })
    except Exception as e:
        print(f"\n[ERROR] Failed to start device flow: {e}")
        print("Check Client ID and network connectivity.")
        sys.exit(1)

    verification_url = dc.get("verification_url") or dc.get("verification_uri")
    user_code        = dc["user_code"]
    device_code      = dc["device_code"]
    interval         = int(dc.get("interval", 5))
    expires_in       = int(dc.get("expires_in", 1800))  # seconds

    print("\n=== Action Required ===")
    print(f"1) Open this URL: {verification_url}")
    print(f"2) Enter this code: {user_code}\n")

    # Try to open browser
    try:
        webbrowser.open(verification_url, new=2)
    except Exception:
        pass

    input("Press ENTER after you finish authorization in the browser...")

    # Step 2: Poll for token
    print("\nAuthorizing… (polling Google)")
    start = time.time()
    while True:
        # Safety timeout
        if (time.time() - start) > (expires_in + 30):
            print("\n[ERROR] Authorization window expired. Re-run the script.")
            sys.exit(1)

        try:
            tok = post_form(TOKEN_URL, {
                "client_id": client_id,
                "client_secret": client_secret,
                "device_code": device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            }, timeout=30)
        except Exception as e:
            print(f"[WARN] Temporary token request error: {e}")
            time.sleep(interval)
            continue

        if "error" in tok:
            err = tok["error"]
            if err in ("authorization_pending", "slow_down"):
                time.sleep(interval)
                continue
            elif err == "access_denied":
                print("\n[ERROR] Access denied by user.")
                sys.exit(1)
            else:
                print(f"\n[ERROR] OAuth error: {err}")
                # Common fix when refresh token is not returned later:
                print("Tip: Revoke previous app access at https://myaccount.google.com/permissions and retry.")
                sys.exit(1)

        # Success
        access_token  = tok.get("access_token")
        refresh_token = tok.get("refresh_token")
        expires       = tok.get("expires_in")

        print("\n=== SUCCESS ===")
        print(f"Access token (expires in {expires}s)")
        print(f"Refresh token: {refresh_token if refresh_token else '<MISSING>'}")

        if not refresh_token:
            print("\n[ERROR] No refresh_token returned.")
            print("Fix: Revoke existing grant at https://myaccount.google.com/permissions and run again.")
            sys.exit(1)

        # Persist to file (plain JSON; encrypt at rest in production)
        out = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "scope": scope,
            "token_uri": TOKEN_URL,
            "created_at": int(time.time())
        }
        try:
            with open("gmail_oauth_creds.json", "w") as f:
                json.dump(out, f, indent=2)
            print('\nSaved to ./gmail_oauth_creds.json')
            print("Store securely. Do NOT commit this file.")
        except Exception as e:
            print(f"\n[WARN] Could not write gmail_oauth_creds.json: {e}")
            print("Copy the refresh_token above and store it securely yourself.")

        print("\nNext: configure your app with:")
        print("  googleClientId, googleClientSecret, googleRefreshToken")
        print("Then use XOAUTH2 over SMTP (AUTH XOAUTH2).")
        break

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAborted.")
        sys.exit(130)
