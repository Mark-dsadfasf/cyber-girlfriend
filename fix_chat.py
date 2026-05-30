import re

with open('D:/Project/cyber-girlfriend/src/chat.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: line 219 - /<thought>[\s\S]*?</thought>/gi -> /<thought>[\s\S]*?<\/thought>/gi
# The  in the regex needs to be \/ (escaped)
content = content.replace('/<thought>[\\s\\S]*?</thought>/gi', '/<thought>[\\s\\S]*?<\\/thought>/gi')

# Fix 2: line 220 - /^[\s\S]*?/think>/i -> /^[\s\S]*?<\/think>/i
content = content.replace('/^/[\\s\\S]*?/i', '/^/[\\s\\S]*?<\\/think>/i')
content = content.replace('/^/[\\s\\S]*?/i', '/^/[\\s\\S]*?<\\/think>/i')

# Actually, let me be more careful. Let me just fix the regex patterns directly
# The broken patterns in the file are:
# Pattern 1: /<thought>[\s\S]*?</thought>/gi  (the / in  ends regex prematurely)
# Pattern 2: /^[\s\S]*?/i  (the  ends regex prematurely)

# Let me redo this. Read the file again and do precise replacement.
with open('D:/Project/cyber-girlfriend/src/chat.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"Line 219 (0-indexed 218): {lines[218].rstrip()}")
print(f"Line 220 (0-indexed 219): {lines[219].rstrip()}")

# Fix line 219 (0-indexed: 218)
# Broken: .replace(/<thought>[\s\S]*?/gi, '')
# Fixed: .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
old_219 = ".replace(/<thought>[\\s\\S]*?</thought>/gi, '')"
new_219 = ".replace(/<thought>[\\s\\S]*?<\\/thought>/gi, '')"
lines[218] = lines[218].replace(old_219, new_219)

# Fix line 220 (0-indexed: 219)
# Broken: .replace(/^[\s\S]*?/i, '')
# Fixed: .replace(/^[\s\S]*?<\/think>/i, '')
old_220 = ".replace(/^[\\s\\S]*?/i, '')"
new_220 = ".replace(/^[\\s\\S]*?<\\/think>/i, '')"
lines[219] = lines[219].replace(old_220, new_220)

with open('D:/Project/cyber-girlfriend/src/chat.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed!")
print(f"New line 219: {lines[218].rstrip()}")
print(f"New line 220: {lines[219].rstrip()}")
