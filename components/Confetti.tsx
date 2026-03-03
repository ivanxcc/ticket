import React, { useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#5B8DEF',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

interface PieceConfig {
  id: number;
  startX: number;
  driftX: number;
  launchHeight: number;
  delay: number;
  color: string;
  size: number;
  isCircle: boolean;
  rotation: number;
}

function ConfettiPiece({ startX, driftX, launchHeight, delay, color, size, isCircle, rotation }: PieceConfig) {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withSequence(
        withTiming(-launchHeight, { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(SCREEN_HEIGHT + 100, { duration: 1800, easing: Easing.in(Easing.quad) }),
      ),
    );
    x.value = withDelay(delay, withTiming(driftX, { duration: 2500, easing: Easing.out(Easing.sin) }));
    opacity.value = withDelay(delay + 1800, withTiming(0, { duration: 700 }));
    rotate.value = withDelay(delay, withTiming(rotation, { duration: 2500 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          bottom: 0,
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: isCircle ? size / 2 : 2,
        },
        style,
      ]}
    />
  );
}

interface ConfettiProps {
  onFinish?: () => void;
}

export function Confetti({ onFinish }: ConfettiProps) {
  const pieces = useMemo<PieceConfig[]>(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        startX: Math.random() * SCREEN_WIDTH,
        driftX: (Math.random() - 0.5) * 300,
        launchHeight: Math.random() * 300 + 300,
        delay: Math.random() * 400,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 6 + 6,
        isCircle: Math.random() > 0.5,
        rotation: (Math.random() - 0.5) * 720,
      })),
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => onFinish?.(), 3200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </>
  );
}
