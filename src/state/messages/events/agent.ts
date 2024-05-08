import {BskyAgent, ChatBskyConvoGetLog} from '@atproto-labs/api'
import EventEmitter from 'eventemitter3'
import {nanoid} from 'nanoid/non-secure'

import {logger} from '#/logger'
import {
  MessagesEventBusDispatch,
  MessagesEventBusDispatchEvent,
  MessagesEventBusError,
  MessagesEventBusErrorCode,
  MessagesEventBusParams,
  MessagesEventBusState,
  MessagesEventBusStatus,
} from '#/state/messages/events/types'

const LOGGER_CONTEXT = 'MessagesEventBus'

const DEFAULT_POLL_INTERVAL = 60e3

export class MessagesEventBus {
  private id: string

  private agent: BskyAgent
  private __tempFromUserDid: string
  private emitter = new EventEmitter<{
    events: [ChatBskyConvoGetLog.OutputSchema['logs']]
    connect: undefined
    error: [MessagesEventBusError] | undefined
  }>()

  private status: MessagesEventBusStatus = MessagesEventBusStatus.Uninitialized
  private error: MessagesEventBusError | undefined
  private latestRev: string | undefined = undefined
  private pollInterval = DEFAULT_POLL_INTERVAL
  private requestedPollIntervals: Map<string, number> = new Map()

  snapshot: MessagesEventBusState | undefined

  constructor(params: MessagesEventBusParams) {
    this.id = nanoid(3)
    this.agent = params.agent
    this.__tempFromUserDid = params.__tempFromUserDid

    this.subscribe = this.subscribe.bind(this)
    this.getSnapshot = this.getSnapshot.bind(this)
    this.init = this.init.bind(this)
    this.suspend = this.suspend.bind(this)
    this.resume = this.resume.bind(this)
    this.requestPollInterval = this.requestPollInterval.bind(this)
    this.trail = this.trail.bind(this)
    this.trailConvo = this.trailConvo.bind(this)
    this.onConnect = this.onConnect.bind(this)
    this.onError = this.onError.bind(this)
  }

  private commit() {
    this.snapshot = undefined
    this.subscribers.forEach(subscriber => subscriber())
  }

  private subscribers: (() => void)[] = []

  subscribe(subscriber: () => void) {
    if (this.subscribers.length === 0) this.init()

    this.subscribers.push(subscriber)

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber)
      if (this.subscribers.length === 0) this.suspend()
    }
  }

  getSnapshot(): MessagesEventBusState {
    if (!this.snapshot) this.snapshot = this.generateSnapshot()
    // logger.debug(`${LOGGER_CONTEXT}: snapshotted`, {}, logger.DebugContext.convo)
    return this.snapshot
  }

  private generateSnapshot(): MessagesEventBusState {
    switch (this.status) {
      case MessagesEventBusStatus.Initializing: {
        return {
          status: MessagesEventBusStatus.Initializing,
          rev: undefined,
          error: undefined,
          requestPollInterval: this.requestPollInterval,
          trail: this.trail,
          trailConvo: this.trailConvo,
          onConnect: this.onConnect,
          onError: this.onError,
        }
      }
      case MessagesEventBusStatus.Ready: {
        return {
          status: this.status,
          rev: this.latestRev!,
          error: undefined,
          requestPollInterval: this.requestPollInterval,
          trail: this.trail,
          trailConvo: this.trailConvo,
          onConnect: this.onConnect,
          onError: this.onError,
        }
      }
      case MessagesEventBusStatus.Suspended: {
        return {
          status: this.status,
          rev: this.latestRev,
          error: undefined,
          requestPollInterval: this.requestPollInterval,
          trail: this.trail,
          trailConvo: this.trailConvo,
          onConnect: this.onConnect,
          onError: this.onError,
        }
      }
      case MessagesEventBusStatus.Error: {
        return {
          status: MessagesEventBusStatus.Error,
          rev: this.latestRev,
          error: this.error || {
            code: MessagesEventBusErrorCode.Unknown,
            retry: () => {
              this.init()
            },
          },
          requestPollInterval: this.requestPollInterval,
          trail: this.trail,
          trailConvo: this.trailConvo,
          onConnect: this.onConnect,
          onError: this.onError,
        }
      }
      default: {
        return {
          status: MessagesEventBusStatus.Uninitialized,
          rev: undefined,
          error: undefined,
          requestPollInterval: this.requestPollInterval,
          trail: this.trail,
          trailConvo: this.trailConvo,
          onConnect: this.onConnect,
          onError: this.onError,
        }
      }
    }
  }

  dispatch(action: MessagesEventBusDispatch) {
    const prevStatus = this.status

    switch (this.status) {
      case MessagesEventBusStatus.Uninitialized: {
        switch (action.event) {
          case MessagesEventBusDispatchEvent.Init: {
            this.status = MessagesEventBusStatus.Initializing
            this.setup()
            break
          }
        }
        break
      }
      case MessagesEventBusStatus.Initializing: {
        switch (action.event) {
          case MessagesEventBusDispatchEvent.Ready: {
            this.status = MessagesEventBusStatus.Ready
            this.resetPoll()
            this.emitter.emit('connect')
            break
          }
          case MessagesEventBusDispatchEvent.Background: {
            this.status = MessagesEventBusStatus.Backgrounded
            this.resetPoll()
            this.emitter.emit('connect')
            break
          }
          case MessagesEventBusDispatchEvent.Suspend: {
            this.status = MessagesEventBusStatus.Suspended
            break
          }
          case MessagesEventBusDispatchEvent.Error: {
            this.status = MessagesEventBusStatus.Error
            this.error = action.payload
            this.emitter.emit('error', action.payload)
            break
          }
        }
        break
      }
      case MessagesEventBusStatus.Ready: {
        switch (action.event) {
          case MessagesEventBusDispatchEvent.Background: {
            this.status = MessagesEventBusStatus.Backgrounded
            this.resetPoll()
            break
          }
          case MessagesEventBusDispatchEvent.Suspend: {
            this.status = MessagesEventBusStatus.Suspended
            this.stopPoll()
            break
          }
          case MessagesEventBusDispatchEvent.Error: {
            this.status = MessagesEventBusStatus.Error
            this.error = action.payload
            this.stopPoll()
            this.emitter.emit('error', action.payload)
            break
          }
        }
        break
      }
      case MessagesEventBusStatus.Backgrounded: {
        switch (action.event) {
          case MessagesEventBusDispatchEvent.Resume: {
            this.status = MessagesEventBusStatus.Ready
            this.resetPoll()
            break
          }
          case MessagesEventBusDispatchEvent.Suspend: {
            this.status = MessagesEventBusStatus.Suspended
            this.stopPoll()
            break
          }
          case MessagesEventBusDispatchEvent.Error: {
            this.status = MessagesEventBusStatus.Error
            this.error = action.payload
            this.stopPoll()
            this.emitter.emit('error', action.payload)
            break
          }
        }
        break
      }
      case MessagesEventBusStatus.Suspended: {
        switch (action.event) {
          case MessagesEventBusDispatchEvent.Resume: {
            this.status = MessagesEventBusStatus.Ready
            this.resetPoll()
            break
          }
          case MessagesEventBusDispatchEvent.Background: {
            this.status = MessagesEventBusStatus.Backgrounded
            this.resetPoll()
            break
          }
          case MessagesEventBusDispatchEvent.Error: {
            this.status = MessagesEventBusStatus.Error
            this.error = action.payload
            this.stopPoll()
            this.emitter.emit('error', action.payload)
            break
          }
        }
        break
      }
      case MessagesEventBusStatus.Error: {
        switch (action.event) {
          case MessagesEventBusDispatchEvent.Resume:
          case MessagesEventBusDispatchEvent.Init: {
            this.status = MessagesEventBusStatus.Initializing
            this.error = undefined
            this.latestRev = undefined
            this.setup()
            this.emitter.emit('connect')
            break
          }
        }
        break
      }
      default:
        break
    }

    logger.debug(
      `${LOGGER_CONTEXT}: dispatch '${action.event}'`,
      {
        id: this.id,
        prev: prevStatus,
        next: this.status,
      },
      logger.DebugContext.convo,
    )

    this.commit()
  }

  private async setup() {
    logger.debug(`${LOGGER_CONTEXT}: setup`, {}, logger.DebugContext.convo)

    try {
      await this.initializeLatestRev()
      this.dispatch({event: MessagesEventBusDispatchEvent.Ready})
    } catch (e: any) {
      logger.error(e, {
        context: `${LOGGER_CONTEXT}: setup failed`,
      })

      this.dispatch({
        event: MessagesEventBusDispatchEvent.Error,
        payload: {
          exception: e,
          code: MessagesEventBusErrorCode.InitFailed,
          retry: () => {
            this.init()
          },
        },
      })
    }
  }

  init() {
    logger.debug(`${LOGGER_CONTEXT}: init`, {}, logger.DebugContext.convo)
    this.dispatch({event: MessagesEventBusDispatchEvent.Init})
  }

  background() {
    logger.debug(`${LOGGER_CONTEXT}: background`, {}, logger.DebugContext.convo)
    this.dispatch({event: MessagesEventBusDispatchEvent.Background})
  }

  suspend() {
    logger.debug(`${LOGGER_CONTEXT}: suspend`, {}, logger.DebugContext.convo)
    this.dispatch({event: MessagesEventBusDispatchEvent.Suspend})
  }

  resume() {
    logger.debug(`${LOGGER_CONTEXT}: resume`, {}, logger.DebugContext.convo)
    this.dispatch({event: MessagesEventBusDispatchEvent.Resume})
  }

  requestPollInterval(interval: number) {
    const id = nanoid()
    this.requestedPollIntervals.set(id, interval)
    this.resetPoll()
    return () => {
      this.requestedPollIntervals.delete(id)
      this.resetPoll()
    }
  }

  trail(handler: (events: ChatBskyConvoGetLog.OutputSchema['logs']) => void) {
    this.emitter.on('events', handler)
    return () => {
      this.emitter.off('events', handler)
    }
  }

  trailConvo(
    convoId: string,
    handler: (events: ChatBskyConvoGetLog.OutputSchema['logs']) => void,
  ) {
    const handle = (events: ChatBskyConvoGetLog.OutputSchema['logs']) => {
      const convoEvents = events.filter(ev => {
        if (typeof ev.convoId === 'string' && ev.convoId === convoId) {
          return ev.convoId === convoId
        }
        return false
      })

      if (convoEvents.length > 0) {
        handler(convoEvents)
      }
    }

    this.emitter.on('events', handle)
    return () => {
      this.emitter.off('events', handle)
    }
  }

  onConnect(handler: () => void) {
    this.emitter.on('connect', handler)

    if (
      this.status === MessagesEventBusStatus.Ready ||
      this.status === MessagesEventBusStatus.Backgrounded ||
      this.status === MessagesEventBusStatus.Suspended
    ) {
      handler()
    }

    return () => {
      this.emitter.off('connect', handler)
    }
  }

  onError(handler: (payload?: MessagesEventBusError) => void) {
    this.emitter.on('error', handler)

    if (this.status === MessagesEventBusStatus.Error) {
      handler(this.error)
    }

    return () => {
      this.emitter.off('error', handler)
    }
  }

  private async initializeLatestRev() {
    logger.debug(
      `${LOGGER_CONTEXT}: initialize latest rev`,
      {},
      logger.DebugContext.convo,
    )

    const response = await this.agent.api.chat.bsky.convo.listConvos(
      {
        limit: 1,
      },
      {
        headers: {
          Authorization: this.__tempFromUserDid,
        },
      },
    )

    const {convos} = response.data

    for (const convo of convos) {
      if (convo.rev > (this.latestRev = this.latestRev || convo.rev)) {
        this.latestRev = convo.rev
      }
    }
  }

  /*
   * Polling
   */

  private isPolling = false
  private pollIntervalRef: NodeJS.Timeout | undefined

  private getPollInterval() {
    switch (this.status) {
      case MessagesEventBusStatus.Ready: {
        const requested = Array.from(this.requestedPollIntervals.values())
        const lowest = Math.min(DEFAULT_POLL_INTERVAL, ...requested)
        return lowest
      }
      default:
        return DEFAULT_POLL_INTERVAL
    }
  }

  private resetPoll() {
    this.pollInterval = this.getPollInterval()
    this.stopPoll()
    this.startPoll()
  }

  private startPoll() {
    if (!this.isPolling) this.poll()

    this.pollIntervalRef = setInterval(() => {
      if (this.isPolling) return
      this.poll()
    }, this.pollInterval)
  }

  private stopPoll() {
    if (this.pollIntervalRef) clearInterval(this.pollIntervalRef)
  }

  private async poll() {
    if (this.isPolling) return

    this.isPolling = true

    logger.debug(`${LOGGER_CONTEXT}: poll`, {}, logger.DebugContext.convo)

    try {
      const response = await this.agent.api.chat.bsky.convo.getLog(
        {
          cursor: this.latestRev,
        },
        {
          headers: {
            Authorization: this.__tempFromUserDid,
          },
        },
      )

      const {logs: events} = response.data

      let needsEmit = false
      let batch: ChatBskyConvoGetLog.OutputSchema['logs'] = []

      for (const ev of events) {
        /*
         * If there's a rev, we should handle it. If there's not a rev, we don't
         * know what it is.
         */
        if (typeof ev.rev === 'string') {
          /*
           * We only care about new events
           */
          if (ev.rev > (this.latestRev = this.latestRev || ev.rev)) {
            /*
             * Update rev regardless of if it's a ev type we care about or not
             */
            this.latestRev = ev.rev
            needsEmit = true
            batch.push(ev)
          }
        }
      }

      if (needsEmit) {
        try {
          this.emitter.emit('events', batch)
        } catch (e: any) {
          logger.error(e, {
            context: `${LOGGER_CONTEXT}: process latest events`,
          })
        }
      }
    } catch (e: any) {
      logger.error(e, {context: `${LOGGER_CONTEXT}: poll events failed`})

      this.dispatch({
        event: MessagesEventBusDispatchEvent.Error,
        payload: {
          exception: e,
          code: MessagesEventBusErrorCode.PollFailed,
          retry: () => {
            this.init()
          },
        },
      })
    } finally {
      this.isPolling = false
    }
  }
}
