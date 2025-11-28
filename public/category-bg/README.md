# Category Background Images

Place your background images for the Popular section cards in this folder.

## Required Images

Add the following images to enable backgrounds for each Popular card:

1. **game-bg.jpg** (or .png) - For the "Game" card
2. **music-bg.jpg** (or .png) - For the "Music" card  
3. **social-bg.jpg** (or .png) - For the "Social" card
4. **productivity-bg.jpg** (or .png) - For the "Productivity" card
5. **finance-bg.jpg** (or .png) - For the "Finance" card
6. **utility-bg.jpg** (or .png) - For the "Utility" card

## Image Specifications

- **Recommended size:** 400x260px or larger (aspect ratio ~1.54:1)
- **Format:** JPG or PNG
- **File naming:** Use the exact names listed above (case-sensitive)

## How It Works

- If an image exists, it will be used as the background
- If an image doesn't exist, the card will fall back to the gradient background
- The component automatically adds a dark overlay for text readability

## Example

```
public/
  category-bg/
    game-bg.jpg
    music-bg.jpg
    social-bg.jpg
    sports-bg.jpg
```

