#!/usr/bin/env python3
"""
Generate extension icons in different sizes
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
except ImportError:
    print("PIL (Pillow) not installed. Installing...")
    import subprocess
    subprocess.check_call(['pip3', 'install', 'pillow'])
    from PIL import Image, ImageDraw, ImageFont
    import os

def create_icon(size):
    """Create an icon of the specified size"""
    # Create image with blue gradient background
    img = Image.new('RGB', (size, size), color='#1976d2')
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle background
    draw.rectangle([0, 0, size, size], fill='#1976d2')

    # Draw "M" for Markdown
    try:
        # Try to use a system font
        font_size = int(size * 0.5)
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            except:
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Draw white "M"
    text = "M"
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]

    draw.text((x, y), text, fill='white', font=font)

    # Draw down arrow at bottom right (simplified)
    arrow_size = size // 4
    arrow_x = int(size * 0.75)
    arrow_y = int(size * 0.75)

    # Simple arrow using lines
    draw.line([(arrow_x, arrow_y - arrow_size//3), (arrow_x, arrow_y + arrow_size//4)],
              fill='white', width=max(1, size//32))
    draw.line([(arrow_x, arrow_y + arrow_size//4), (arrow_x - arrow_size//4, arrow_y)],
              fill='white', width=max(1, size//32))
    draw.line([(arrow_x, arrow_y + arrow_size//4), (arrow_x + arrow_size//4, arrow_y)],
              fill='white', width=max(1, size//32))

    return img

def main():
    """Generate icons in all required sizes"""
    sizes = [16, 48, 128]

    script_dir = os.path.dirname(os.path.abspath(__file__))

    for size in sizes:
        print(f"Generating {size}x{size} icon...")
        img = create_icon(size)
        filename = os.path.join(script_dir, f'icon{size}.png')
        img.save(filename, 'PNG')
        print(f"Saved: {filename}")

    print("\nAll icons generated successfully!")

if __name__ == '__main__':
    main()
