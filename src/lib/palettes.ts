import type { PaletteOptions } from '@mui/material';

interface PaletteDefinition {
  label: string;
  palette: PaletteOptions;
}

// Drawn from https://www.figma.com/resource-library/color-combinations/,
// prepared with the Palette Forge gist linked in issue #6.
export const PALETTES: Record<string, PaletteDefinition> = {
  'stormy-morning': {
    label: 'Stormy Morning',
    palette: {
      primary: { main: '#6A89A7' },
      secondary: { main: '#6A6AA7' },
      info: { main: '#6AA7A7' },
      error: { main: '#A76A6A' },
      warning: { main: '#A7A76A' },
      success: { main: '#6AA76A' },
    },
  },
  'mossy-hollow': {
    label: 'Mossy Hollow',
    palette: {
      primary: { main: '#636B2F' },
      secondary: { main: '#6B552F' },
      info: { main: '#456B2F' },
      error: { main: '#6B2F2F' },
      warning: { main: '#6B6B2F' },
      success: { main: '#2F6B2F' },
    },
  },
  'blue-eclipse': {
    label: 'Blue Eclipse',
    palette: {
      primary: { main: '#272757' },
      secondary: { main: '#3F2757' },
      info: { main: '#273F57' },
      error: { main: '#572727' },
      warning: { main: '#575727' },
      success: { main: '#275727' },
    },
  },
  'lush-forest': {
    label: 'Lush Forest',
    palette: {
      primary: { main: '#2E6F40' },
      secondary: { main: '#3D6F2E' },
      info: { main: '#2E6F61' },
      error: { main: '#6F2E2E' },
      warning: { main: '#6F6F2E' },
      success: { main: '#2E6F2E' },
    },
  },
  'chili-spice': {
    label: 'Chili Spice',
    palette: {
      primary: { main: '#9B1313' },
      secondary: { main: '#9B5713' },
      info: { main: '#9B1357' },
      error: { main: '#9B1313' },
      warning: { main: '#9B9B13' },
      success: { main: '#139B13' },
    },
  },
  'golden-taupe': {
    label: 'Golden Taupe',
    palette: {
      primary: { main: '#D4A437' },
      secondary: { main: '#D45637' },
      info: { main: '#B5D437' },
      error: { main: '#D43737' },
      warning: { main: '#D4D437' },
      success: { main: '#37D437' },
    },
  },
  'burnt-sienna': {
    label: 'Burnt Sienna',
    palette: {
      primary: { main: '#E35336' },
      secondary: { main: '#E3A936' },
      info: { main: '#E33670' },
      error: { main: '#E33636' },
      warning: { main: '#E3E336' },
      success: { main: '#36E336' },
    },
  },
  'desert-dusk': {
    label: 'Desert Dusk',
    palette: {
      primary: { main: '#A2574F' },
      secondary: { main: '#A2804F' },
      info: { main: '#A24F70' },
      error: { main: '#A24F4F' },
      warning: { main: '#A2A24F' },
      success: { main: '#4FA24F' },
    },
  },
};

export const PALETTE_OPTIONS: { key: string; label: string }[] = Object.entries(PALETTES).map(
  ([key, { label }]) => ({ key, label }),
);
