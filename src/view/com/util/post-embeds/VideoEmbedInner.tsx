import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import {VideoPlayer, VideoView} from 'expo-video'

import {android, atoms as a} from '#/alf'
import {Text} from '#/components/Typography'
import {useVideoPlayer} from './VideoPlayerContext'

export function VideoEmbedInner({}: {
  source: string
  active: boolean
  setActive: () => void
  onScreen: boolean
}) {
  const player = useVideoPlayer()
  const ref = useRef<VideoView>(null)

  const enterFullscreen = useCallback(() => {
    if (ref.current) {
      ref.current.enterFullscreen()
    }
  }, [])

  return (
    <View style={[a.flex_1, a.relative]} collapsable={false}>
      <VideoView
        ref={ref}
        player={player}
        style={a.flex_1}
        nativeControls={true}
      />
      <VideoControls player={player} enterFullscreen={enterFullscreen} />
    </View>
  )
}

function VideoControls({
  player,
  enterFullscreen,
}: {
  player: VideoPlayer
  enterFullscreen: () => void
}) {
  const [duration, setDuration] = useState(() => Math.floor(player.duration))
  const [currentTime, setCurrentTime] = useState(() =>
    Math.floor(player.currentTime),
  )

  const timeRemaining = duration - currentTime
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = String(timeRemaining % 60).padStart(2, '0')

  useEffect(() => {
    const interval = setInterval(() => {
      // duration gets reset to 0 on loop
      if (player.duration) setDuration(Math.floor(player.duration))
      setCurrentTime(Math.floor(player.currentTime))
      // how often should we update the time?
      // 1000 gets out of sync with the video time
    }, 250)

    return () => {
      clearInterval(interval)
    }
  }, [player])

  if (isNaN(timeRemaining)) {
    return null
  }

  return (
    <View style={[a.absolute, a.inset_0]}>
      <View style={styles.timeContainer} pointerEvents="none">
        <Text style={[styles.timeElapsed, android({lineHeight: 1.25})]}>
          {minutes}:{seconds}
        </Text>
      </View>
      <Pressable
        onPress={enterFullscreen}
        style={a.flex_1}
        accessibilityLabel="Video"
        accessibilityHint="Tap to enter full screen"
        accessibilityRole="button"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  timeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    left: 5,
    bottom: 5,
  },
  timeElapsed: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
})
