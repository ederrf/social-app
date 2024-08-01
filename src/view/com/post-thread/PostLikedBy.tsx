import React, {useCallback, useMemo, useState} from 'react'
import {AppBskyFeedGetLikes as GetLikes} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {useLikedByQuery} from '#/state/queries/post-liked-by'
import {useResolveUriQuery} from '#/state/queries/resolve-uri'
import {useInitialNumToRender} from 'lib/hooks/useInitialNumToRender'
import {
  ListFooter,
  ListHeaderDesktop,
  ListMaybePlaceholder,
} from '#/components/Lists'
import {ProfileCardWithFollowBtn} from '../profile/ProfileCard'
import {ErrorMessage} from '../util/error/ErrorMessage'
import {List} from '../util/List'
import {CenteredView} from '../util/Views'

function renderItem({item}: {item: GetLikes.Like}) {
  return <ProfileCardWithFollowBtn key={item.actor.did} profile={item.actor} />
}

function keyExtractor(item: GetLikes.Like) {
  return item.actor.did
}

export function PostLikedBy({uri}: {uri: string}) {
  const {_} = useLingui()
  const initialNumToRender = useInitialNumToRender()

  const [isPTRing, setIsPTRing] = useState(false)

  const {
    data: resolvedUri,
    error: resolveError,
    isLoading: isLoadingUri,
  } = useResolveUriQuery(uri)
  const {
    data,
    isLoading: isLoadingLikes,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useLikedByQuery(resolvedUri?.uri)

  const isError = Boolean(resolveError || error)

  const likes = useMemo(() => {
    if (data?.pages) {
      return data.pages.flatMap(page => page.likes)
    }
    return []
  }, [data])

  const onRefresh = useCallback(async () => {
    setIsPTRing(true)
    try {
      await refetch()
    } catch (err) {
      logger.error('Failed to refresh likes', {message: err})
    }
    setIsPTRing(false)
  }, [refetch, setIsPTRing])

  const onEndReached = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage || isError) return
    try {
      await fetchNextPage()
    } catch (err) {
      logger.error('Failed to load more likes', {message: err})
    }
  }, [isFetchingNextPage, hasNextPage, isError, fetchNextPage])

  if (likes.length < 1) {
    return (
      <ListMaybePlaceholder
        isLoading={isLoadingUri || isLoadingLikes}
        isError={isError}
      />
    )
  }

  if (resolveError || isError) {
    return (
      <CenteredView>
        <ErrorMessage
          message={cleanError(resolveError || error)}
          onPressTryAgain={onRefresh}
        />
      </CenteredView>
    )
  }

  return (
    <List
      data={likes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      refreshing={isPTRing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={4}
      ListHeaderComponent={<ListHeaderDesktop title={_(msg`Likes`)} />}
      ListFooterComponent={
        <ListFooter
          isFetchingNextPage={isFetchingNextPage}
          error={cleanError(error)}
          onRetry={fetchNextPage}
        />
      }
      // @ts-ignore our .web version only -prf
      desktopFixedHeight
      initialNumToRender={initialNumToRender}
      windowSize={11}
    />
  )
}
