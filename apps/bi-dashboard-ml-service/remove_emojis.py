import os
import re

# Extended emoji map with ALL emojis found in the codebase
emoji_map = {
    '\U0001f4c2': '[LOAD]',    # folder emoji
    '\u2705': '[OK]',           # check mark
    '\u274c': '[ERROR]',        # cross mark
    '\U0001f331': '[SEED]',    # seedling
    '\U0001f4ca': '[DATA]',    # bar chart
    '\U0001f389': '[SUCCESS]', # party popper
    '\u26a0\ufe0f': '[WARN]',  # warning
    '\u26a0': '[WARN]',        # warning without variation selector
    '\u2139\ufe0f': '[INFO]',  # info
    '\u2139': '[INFO]',        # info without variation selector
    '\u23ed\ufe0f': '[SKIP]',  # next track
    '\u23ed': '[SKIP]',        # next track without variation selector
    '\U0001f4dd': '[NOTE]',    # memo
    '\U0001f3af': '[TARGET]',  # dart/target
    '\U0001f50d': '[ANALYZE]', # magnifying glass
    '\U0001f51d': '[TOP]',     # TOP arrow
}

def remove_all_emojis(text):
    """Remove ALL Unicode emojis using regex"""
    # First apply known mappings
    for emoji, replacement in emoji_map.items():
        text = text.replace(emoji, replacement)
    
    # Then remove any remaining emoji characters (U+1F000 to U+1F9FF range)
    text = re.sub(r'[\U0001F000-\U0001F9FF]+', '[EMOJI]', text)
    
    # Remove variation selectors
    text = re.sub(r'[\uFE00-\uFE0F]+', '', text)
    
    return text

for root, dirs, files in os.walk('.'):
    # Skip venv directory
    if 'venv' in root:
        continue
        
    for file in files:
        if file.endswith('.py') and file != 'remove_emojis.py':
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                modified = remove_all_emojis(content)
                
                if modified != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(modified)
                    print(f'Updated: {filepath}')
            except Exception as e:
                print(f'Error processing {filepath}: {e}')

print('Done!')
