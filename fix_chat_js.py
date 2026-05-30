#!/usr/bin/env python3
# Fix the stripThought function in chat.js
# The problem: regex literals contain unescaped / in  and </thought>

import sys

filepath = r'D:\Project\cyber-girlfriend\src\chat.js'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the stripThought function
in_strip_think = False
fixed_lines = []

for i, line in enumerate(lines):
    # Check if this is line 218-223 (0-indexed: 217-222)
    # Based on the file content:
    # Line 218 (0-indexed 217): .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    # Line 219 (0-indexed 218): .replace(/<thought>[\s\S]*?/gi, '')  <- BROKEN
    # Line 220 (0-indexed 219): .replace(/^[\s\S]*?/i, '')           <- BROKEN
    
    if i == 218:  # 0-indexed, corresponds to line 219 in cat -n
        # Fix: /<thought>[\s\S]*?</thought>/gi -> /<thought>[\s\S]*?<\/thought>/gi
        old = ".replace(/<thought>[\\s\\S]*?</thought>/gi, '')"
        new = ".replace(/<thought>[\\s\\S]*?<\\/thought>/gi, '')"
        if old in line:
            line = line.replace(old, new)
            print(f"Fixed line {i+1}")
        else:
            print(f"WARNING: Could not find expected pattern on line {i+1}")
            print(f"  Line content: {line.rstrip()}")
    
    elif i == 219:  # 0-indexed, corresponds to line 220 in cat -n
        # Fix: /^[\s\S]*?/i -> /^[\s\S]*?<\/think>/i
        old = ".replace(/^[\\s\\S]*?/i, '')"
        new = ".replace(/^[\\s\\S]*?<\\/think>/i, '')"
        if old in line:
            line = line.replace(old, new)
            print(f"Fixed line {i+1}")
        else:
            print(f"WARNING: Could not find expected pattern on line {i+1}")
            print(f"  Line content: {line.rstrip()}")

fixed_lines.append(line)

# Wait, I used `lines` not `fixed_lines`. Let me redo this properly.
