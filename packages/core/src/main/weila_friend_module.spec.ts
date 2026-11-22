import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLFriendModule from 'main/weila_friend_module'
import { WeilaPbFriendWrapper } from 'proto/weilapb_friend_wrapper'

function makeFriendModule() {
  const rspPbMsg = vi.fn()
  const handlers = new Map<number, WL_PbMsgHandler>()

  const coreInterface: WL_CoreInterface = {
    sendExtEvent: vi.fn(),
    sendPbMsg: vi.fn(),
    rspPbMsg,
    registerPbMsgHandler: (serviceId: number, handler: WL_PbMsgHandler) => {
      handlers.set(serviceId, handler)
    },
    executeCoreFunc: vi.fn(),
    getLoginUserInfo: vi.fn(),
  }

  const friendModule = new WLFriendModule(coreInterface)
  expect(friendModule).toBeInstanceOf(WLFriendModule)

  const handler = handlers.get(WL.Service.ServiceID.SERVICE_FRIEND)

  if (!handler) throw new Error('friend module did not register its handler')

  return { rspPbMsg, handler }
}

function buildResponse(
  commandId: WL.Friend.FriendCommandId,
  friendMessage?: WL.Friend.FriendMessage,
  resultCode = 0,
) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_FRIEND,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode,
    }),
    friendMessage,
  })
}

describe('WLFriendModule response routing', () => {
  it('routes GET_FRIENDINFO responses so initFriends() can resolve', () => {
    const { rspPbMsg, handler } = makeFriendModule()

    const rspGetFriendInfo = new WL.Friend.RspGetFriendInfo()

    const message = buildResponse(
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
      new WL.Friend.FriendMessage({ rspGetFriendInfo }),
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledTimes(1)
    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, rspGetFriendInfo)
  })

  it('forwards a null payload when the friendMessage container is absent', () => {
    const { rspPbMsg, handler } = makeFriendModule()

    handler(buildResponse(WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_ONLINE_FRIEND))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, null)
  })

  it('resolves answer and delete commands with true instead of a payload', () => {
    const { rspPbMsg, handler } = makeFriendModule()

    handler(buildResponse(WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, true)
  })

  it('leaves unrouted commands silent instead of acking with a wrong payload', () => {
    const { rspPbMsg, handler } = makeFriendModule()

    // No case routes FRIEND_COMMAND_GET_BLACKLIST today. A missing case must
    // stay silent (the caller times out) rather than resolve with a wrong
    // payload. This is exactly the failure mode that hid the broken token
    // refresh.
    handler(buildResponse(WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_BLACKLIST))

    expect(rspPbMsg).not.toHaveBeenCalled()
  })

  /** Every friend builder and the command it emits, so the routing guard below covers them all. */
  const FRIEND_BUILDER_COMMANDS = {
    buildGetFriendInfoReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
    buildGetFriendUserInfoReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_USERINFO,
    buildGetFriendInvitationInfoReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_INVITEINFO,
    buildFriendInviteReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE,
    buildAnswerFriendInviteReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE,
    buildDeleteFriendReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND,
    buildChangeFriendInfoReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_FRIENDINFO,
    buildGetFriendBlacklistReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_BLACKLIST,
    buildChangeFriendBlacklistReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_BLACKLIST,
    buildGetOnlineFriendsReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_ONLINE_FRIEND,
    buildGetSubFriendInfoReq: WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
  } satisfies Record<string, WL.Friend.FriendCommandId>

  /** Built but nothing awaits their response yet; wiring one up is a conscious act. */
  const NOT_AWAITED = new Set<number>([
    WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_INVITEINFO,
    WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_FRIENDINFO,
    WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_BLACKLIST,
    WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_BLACKLIST,
  ])

  it('covers every builder the friend wrapper exposes', () => {
    expect(Object.keys(FRIEND_BUILDER_COMMANDS).toSorted()).toEqual(
      Object.keys(WeilaPbFriendWrapper).toSorted(),
    )
  })

  it('routes every awaited friend command and only those', () => {
    const { rspPbMsg, handler } = makeFriendModule()

    for (const commandId of Object.values(FRIEND_BUILDER_COMMANDS)) {
      handler(buildResponse(commandId))

      if (NOT_AWAITED.has(commandId)) {
        expect(
          rspPbMsg,
          `${WL.Friend.FriendCommandId[commandId]} should stay unrouted`,
        ).not.toHaveBeenCalled()
      } else {
        expect(
          rspPbMsg,
          `${WL.Friend.FriendCommandId[commandId]} must route`,
        ).toHaveBeenCalledTimes(1)
      }

      rspPbMsg.mockClear()
    }
  })
})
