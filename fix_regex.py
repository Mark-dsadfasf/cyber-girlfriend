#!/usr/bin/env python3
"""修复 chat.js 中 stripThought 函数的正则表达式"""

filepath = r'D:\Project\cyber-girlfriend\src\chat.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"文件长度: {len(content)} 字符")

# 查找 stripThought 函数的位置
func_start = content.find('stripThought(text)')
print(f"stripThought 函数位置: {func_start}")

if func_start == -1:
    print("ERROR: 找不到 stripThought 函数!")
    sys.exit(1)

# 显示函数内容（用于调试）
func_end = content.find('\n  }', func_start) + 4
func_content = content[func_start:func_end]
print(f"\n函数内容:\n{func_content}\n")

# 修复 1: /<thought>[\s\S]*?</thought>/gi -> /<thought>[\s\S]*?<\/thought>/gi
# 注意：在正则字面量中，</thought> 的 / 必须转义为 \/
old1 = '/<thought>[\\s\\S]*?</thought>/gi'
new1 = '/<thought>[\\s\\S]*?<\\/thought>/gi'

if old1 in content:
    content = content.replace(old1, new1, 1)
    print(f"✓ 修复 1 成功: {old1} -> {new1}")
else:
    print(f"✗ 修复 1 未找到匹配: {old1}")
    # 尝试查找近似内容
    import re
    match = re.search(r'/<thought>\[\s\\S\]\*?\[.*?\]/gi', content)
    if match:
        print(f"  找到近似内容: {match.group()}")

# 修复 2: /^[\s\S]*?/think>/i -> /^[\s\S]*?<\/think>/i
old2 = '/^[\\s\\S]\*?/i'
new2 = '/^[\\s\\S]\*?<\\/think>/i'

# 更精确的搜索
import re
pattern2 = r'/\^\[\\s\\S\]\*?\/\w+/'
match2 = re.search(pattern2, content)
if match2:
    old2_found = match2.group()
    print(f"找到待修复内容: {old2_found}")
    # 构造修复后的字符串
    new2_fixed = old2_found.replace('', '<\\think>').replace('/i', '<\\/think>/i')
    content = content.replace(old2_found, new2_fixed, 1)
    print(f"✓ 修复 2 成功")
else:
    print(f"✗ 修复 2 未找到匹配")

# 写回文件
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✓ 文件已修复并保存: {filepath}")

# 验证修复结果
with open(filepath, 'r', encoding='utf-8') as f:
    verified = f.read()
    func_start_v = verified.find('stripThought(text)')
    func_end_v = verified.find('\n  }', func_start_v) + 4
    print(f"\n验证修复后的函数:\n{verified[func_start_v:func_end_v]}")
