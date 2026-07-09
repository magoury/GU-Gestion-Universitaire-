---
name: Arbor Tech Design System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bacac5'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#859490'
  outline-variant: '#3c4a46'
  surface-tint: '#3cddc7'
  primary: '#57f1db'
  on-primary: '#003731'
  primary-container: '#2dd4bf'
  on-primary-container: '#00574d'
  inverse-primary: '#006b5f'
  secondary: '#9ad1cb'
  on-secondary: '#003734'
  secondary-container: '#144f4b'
  on-secondary-container: '#89bfba'
  tertiary: '#a8e7cd'
  on-tertiary: '#003829'
  tertiary-container: '#8ccbb2'
  on-tertiary-container: '#155743'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#62fae3'
  primary-fixed-dim: '#3cddc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#b5ede7'
  secondary-fixed-dim: '#9ad1cb'
  on-secondary-fixed: '#00201e'
  on-secondary-fixed-variant: '#144f4b'
  tertiary-fixed: '#b0f0d6'
  tertiary-fixed-dim: '#95d3ba'
  on-tertiary-fixed: '#002117'
  on-tertiary-fixed-variant: '#0b513d'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-xl:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 80px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 20px
  section-gap: 120px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
This design system bridges the gap between organic vitality and academic precision. It is built for a "nature-tech" aesthetic, targeting higher education institutions that value sustainability, growth, and forward-thinking technology. 

The visual style is characterized by a **dark, immersive atmosphere** combined with **glassmorphism** and **high-contrast typography**. It evokes a sense of calm authority and deep intellectual focus. The "nature" element is integrated through high-resolution organic textures and deep forest tones, while the "tech" is represented by razor-sharp layouts, translucent overlays, and precise data visualization.

## Colors
The palette is rooted in a deep, atmospheric dark mode. 
- **Primary:** An emerald-tinted teal used for actionable items and growth-focused accents.
- **Secondary & Tertiary:** Deep forest greens used for background gradients, overlays, and subtle branding.
- **Neutral:** A dark slate used for the foundation of the interface, providing a more sophisticated base than pure black.
- **Surface Accents:** Use 10-20% opacity white overlays to create glassmorphic surfaces over nature imagery.

## Typography
Typography is high-contrast and authoritative. 
- **Headlines:** Set in Hanken Grotesk with tight letter spacing for a modern, architectural feel. Use pure white against dark backgrounds for maximum impact.
- **Body:** Inter provides a neutral, highly legible experience for long-form data and SaaS interfaces.
- **Labels:** Geist is utilized for technical labels and monospaced data points to reinforce the "tech" side of the aesthetic.
- **Stylistic Note:** Occasionally use "masking" effects on display typography, allowing nature textures to peek through the letterforms.

## Layout & Spacing
The layout philosophy employs a **split-screen or layered model**. Hero sections should feature a high-impact split between a blurred/frosted left panel for text and a vivid, sharp nature image on the right.

- **Grid:** A 12-column fluid grid for the main dashboard content, transitioning to a more editorial, single-column focus for marketing sections.
- **Layering:** Elements should frequently overlap imagery with large margins to create a sense of depth and breathable space.
- **Density:** High density for data-rich SaaS views, but very low density (generous whitespace) for informational landing pages.

## Elevation & Depth
Depth is created through transparency and blur rather than traditional shadows.
- **Backdrop Blur:** Use a 16px to 32px blur on surface containers to create a "glass" effect over the background imagery.
- **Tonal Tiers:** Level 1 surfaces are the base background. Level 2 surfaces use a subtle 5% white overlay. Level 3 (modals/popovers) use a 10% white overlay with a thin 1px white border at 15% opacity.
- **Shadows:** Only use extremely soft, large-radius ambient shadows (color: #000, 30% opacity, 40px blur) to lift active cards or modals.

## Shapes
Shapes are generally **soft but structured**. 
- Use the **Soft (0.25rem)** setting for most UI controls (inputs, buttons) to maintain a professional, sharp tech feel.
- Imagery and large containers may use larger radii (0.75rem) to mimic the organic curves found in nature.
- Geometric accents (diamonds or thin lines) should be used sparingly to act as "tech" markers in an otherwise organic environment.

## Components
- **Buttons:** Primary buttons use the teal primary color with white text. Secondary buttons are ghost-style with a thin white border and backdrop blur.
- **Input Fields:** Semi-transparent dark backgrounds with a 1px white border (10% opacity). On focus, the border brightens to the primary teal.
- **Cards:** Glassmorphic containers with no fill color—only a backdrop blur and a very subtle inner glow (white stroke, 5% opacity).
- **Chips/Badges:** Use the secondary forest green as a background with primary teal text for a monochromatic "nature" look.
- **Navigation:** A minimalist top bar with high-contrast white links. Use a vertical "progress indicator" or "scroller" on the right side of the screen using diamond shapes as seen in the reference.
- **Imagery:** Use high-resolution macros of moss, leaves, or forest canopies. Apply a slight dark vignette to ensure text remains legible.