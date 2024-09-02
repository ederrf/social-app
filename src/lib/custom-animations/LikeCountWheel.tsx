import React from 'react'
import Animated, {
  Easing,
  LayoutAnimationConfig,
  withTiming,
} from 'react-native-reanimated'
import {i18n} from '@lingui/core'

import {s} from 'lib/styles'
import {formatCount} from 'view/com/util/numeric/format'
import {Text} from 'view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'

const animationConfig = {
  duration: 400,
  easing: Easing.out(Easing.cubic),
}

function EnteringUp() {
  'worklet'
  const animations = {
    opacity: withTiming(1, animationConfig),
    transform: [{translateY: withTiming(0, animationConfig)}],
  }
  const initialValues = {
    opacity: 0,
    transform: [{translateY: 18}],
  }
  return {
    animations,
    initialValues,
  }
}

function EnteringDown() {
  'worklet'
  const animations = {
    opacity: withTiming(1, animationConfig),
    transform: [{translateY: withTiming(0, animationConfig)}],
  }
  const initialValues = {
    opacity: 0,
    transform: [{translateY: -18}],
  }
  return {
    animations,
    initialValues,
  }
}

function ExitingUp() {
  'worklet'
  const animations = {
    opacity: withTiming(0, animationConfig),
    transform: [
      {
        translateY: withTiming(-18, animationConfig),
      },
    ],
  }
  const initialValues = {
    opacity: 1,
    transform: [{translateY: 0}],
  }
  return {
    animations,
    initialValues,
  }
}

function ExitingDown() {
  'worklet'
  const animations = {
    opacity: withTiming(0, animationConfig),
    transform: [{translateY: withTiming(18, animationConfig)}],
  }
  const initialValues = {
    opacity: 1,
    transform: [{translateY: 0}],
  }
  return {
    animations,
    initialValues,
  }
}

export function CountWheel({
  likeCount,
  big,
  isLiked,
}: {
  likeCount: number
  big: boolean
  isLiked: boolean
}) {
  const t = useTheme()
  const prevIsLiked = React.useRef(isLiked)
  const formattedCount = formatCount(i18n, likeCount)

  // Incrementing the key will cause the `Animated.View` to re-render, with the newly selected entering/exiting
  // animation
  // The initial entering/exiting animations will get skipped, since these will happen on screen mounts and would
  // be unnecessary
  const [key, setKey] = React.useState(0)

  React.useEffect(() => {
    if (isLiked !== prevIsLiked.current) {
      setKey(prev => prev + 1)
      prevIsLiked.current = isLiked
    }
  }, [isLiked])

  // It should always roll if between 1 and 999, or if it is a multiple of 100
  let shouldRoll = false
  if (likeCount > 0 && likeCount < 1000) {
    shouldRoll = true
  } else if (likeCount > 0 && likeCount % 100 === 0) {
    shouldRoll = true
  }

  const enteringAnimation = shouldRoll
    ? isLiked
      ? EnteringUp
      : EnteringDown
    : undefined
  const exitingAnimation = shouldRoll
    ? isLiked
      ? ExitingUp
      : ExitingDown
    : undefined

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <Animated.View
        entering={enteringAnimation}
        exiting={exitingAnimation}
        key={key}>
        <Text
          testID="likeCount"
          style={[
            [
              big ? a.text_md : {fontSize: 15},
              a.user_select_none,
              isLiked
                ? [a.font_bold, s.likeColor]
                : {color: t.palette.contrast_500},
            ],
          ]}>
          {formattedCount}
        </Text>
      </Animated.View>
    </LayoutAnimationConfig>
  )
}
