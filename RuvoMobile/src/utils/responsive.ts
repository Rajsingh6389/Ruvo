import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const getWindowDimensions = () => Dimensions.get('window');

/**
 * Scale horizontal width dimensions relative to a 375px design baseline.
 */
export const sw = (size: number): number => {
  const { width } = getWindowDimensions();
  return Math.round((width / BASE_WIDTH) * size);
};

/**
 * Scale vertical height dimensions relative to an 812px design baseline.
 */
export const sh = (size: number): number => {
  const { height } = getWindowDimensions();
  return Math.round((height / BASE_HEIGHT) * size);
};

/**
 * Scale font sizes with a moderate scaling factor (50% blend)
 * to ensure text stays crisp and proportional on both small & large screens.
 */
export const sf = (size: number): number => {
  const { width } = getWindowDimensions();
  const scale = width / BASE_WIDTH;
  const newSize = size + (scale - 1) * size * 0.45;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Get width percentage of screen.
 */
export const wp = (percentage: number): number => {
  const { width } = getWindowDimensions();
  return Math.round((percentage * width) / 100);
};

/**
 * Get height percentage of screen.
 */
export const hp = (percentage: number): number => {
  const { height } = getWindowDimensions();
  return Math.round((percentage * height) / 100);
};

export default {
  sw,
  sh,
  sf,
  wp,
  hp,
};
