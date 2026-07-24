import sqlite3
import json

conn = sqlite3.connect("lexassist.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

print("=== DATABASE TABLES ===")
for t in tables:
    rows = cur.execute(f"SELECT * FROM {t}").fetchall()
    print(f"\n--- Table: {t} ({len(rows)} rows) ---")
    for r in rows:
        print(dict(r))

conn.close()
