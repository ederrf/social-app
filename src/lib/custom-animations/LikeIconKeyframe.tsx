import React from 'react'
import Animated, {
  Keyframe,
  LayoutAnimationConfig,
} from 'react-native-reanimated'

import {s} from 'lib/styles'
import {useTheme} from '#/alf'
import {
  Heart2_Filled_Stroke2_Corner0_Rounded as HeartIconFilled,
  Heart2_Stroke2_Corner0_Rounded as HeartIconOutline,
} from '#/components/icons/Heart2'

const keyframe = new Keyframe({
  0: {
    transform: [{scale: 1}],
  },
  10: {
    transform: [{scale: 0.7}],
  },
  40: {
    transform: [{scale: 1.2}],
  },
  60: {
    transform: [{scale: 1}],
  },
})

export function AnimatedLikeIcon({
  isLiked,
  big,
}: {
  isLiked: boolean
  big: boolean
}) {
  const t = useTheme()

  return (
    <LayoutAnimationConfig skipEntering>
      {isLiked ? (
        <Animated.View entering={keyframe}>
          <HeartIconFilled style={s.likeColor} width={big ? 22 : 18} />
        </Animated.View>
      ) : (
        <HeartIconOutline
          style={[{color: t.palette.contrast_500}, {pointerEvents: 'none'}]}
          width={big ? 22 : 18}
        />
      )}
    </LayoutAnimationConfig>
  )
}
