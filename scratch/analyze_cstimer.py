import json
import os

filepath = "/mnt/c/Users/Brian Murray/iCloudDrive/workspace/cubr-web/src/data/cstimer_20260419_095023.txt"

with open(filepath, 'r') as f:
    data = json.load(f)

session1 = data.get('session1', [])
print(f"Total solves in session1: {len(session1)}")

# Check last 100 solves
bad_solves = []
for i in range(len(session1)-100, len(session1)):
    s = session1[i]
    if len(s) > 3 and (s[3] == 0 or s[3] == "" or s[3] is None):
        bad_solves.append(i)

print(f"Bad solves in last 100: {len(bad_solves)}")
if bad_solves:
    print(f"Sample: {session1[bad_solves[0]]}")
