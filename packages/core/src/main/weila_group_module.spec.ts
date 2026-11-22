import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLGroupModule from 'main/weila_group_module'
import { WeilaPBGroupWrapper } from 'proto/weilapb_group_wrapper'

function makeGroupModule() {
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

  const groupModule = new WLGroupModule(coreInterface)
  expect(groupModule).toBeInstanceOf(WLGroupModule)

  const handler = handlers.get(WL.Service.ServiceID.SERVICE_GROUP)

  if (!handler) throw new Error('group module did not register its handler')

  return { rspPbMsg, handler }
}

function buildResponse(
  commandId: WL.Group.GroupCommandId,
  groupMessage?: WL.Group.GroupMessage,
  resultCode = 0,
) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_GROUP,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode,
    }),
    groupMessage,
  })
}

describe('WLGroupModule response routing', () => {
  it('routes GROUP_JOIN responses so joinGroup() can resolve', () => {
    const { rspPbMsg, handler } = makeGroupModule()

    // joinGroup() has always awaited this response; the old switch had no
    // case for it, so every join died on the watchdog timeout instead.
    const rspGroupJoin = new WL.Group.RspGroupJoin()

    const message = buildResponse(
      WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_JOIN,
      new WL.Group.GroupMessage({ rspGroupJoin }),
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledTimes(1)
    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, rspGroupJoin)
  })

  it('forwards a null payload when the groupMessage container is absent', () => {
    const { rspPbMsg, handler } = makeGroupModule()

    handler(buildResponse(WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPINFO))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, null)
  })

  it('resolves delete-style commands with true instead of a payload', () => {
    const { rspPbMsg, handler } = makeGroupModule()

    handler(buildResponse(WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, true)
  })

  it('leaves unrouted commands silent instead of acking with a wrong payload', () => {
    const { rspPbMsg, handler } = makeGroupModule()

    // No case routes GROUP_COMMAND_GET_BLACKLIST today. A missing case must
    // stay silent (the caller times out) rather than resolve with a wrong
    // payload. This is exactly the failure mode that hid the broken join.
    handler(buildResponse(WL.Group.GroupCommandId.GROUP_COMMAND_GET_BLACKLIST))

    expect(rspPbMsg).not.toHaveBeenCalled()
  })

  /** Every group builder and the command it emits, so the routing guard below covers them all. */
  const GROUP_BUILDER_COMMANDS = {
    buildGetGroupVersionReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPVERSION,
    buildGetGroupAttributeReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPATTRIBUTE,
    buildCreateGroupReq: WL.Group.GroupCommandId.GROUP_COMMAND_CREATE_GROUP,
    buildChangeGroupAttributeReq: WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE,
    buildGetGroupInfoReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPINFO,
    buildGetGroupOnlineMemberReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_ONLINE_MEMBER,
    buildChangeGroupMemberInfoReq: WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_MEMBERINFO,
    buildGetGroupMemberInfoReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_USERINFO,
    buildDelGroupMemebrReq: WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER,
    buildDelGroupReq: WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP,
    buildGetGroupInvitationReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_INVITEINFO,
    buildGroupInviteReq: WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_INVITE,
    buildGroupAnswerInviteReq: WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_INVITE,
    buildGroupGetJoinInfoReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_JOININFO,
    buildGroupJoinReq: WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_JOIN,
    buildGroupAnswerJoinReq: WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_JOIN,
    buildGroupBroadcastReq: WL.Group.GroupCommandId.GROUP_COMMAND_BROADCAST,
    buildGroupGetBlacklistReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_BLACKLIST,
    buildGroupChangeBlacklistReq: WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_BLACKLIST,
    buildGetGroupMemberChangeLogReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_CHANGE_LOG,
    buildGetGroupNoticeReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_NOTICE,
    buildAddGroupNoticeReq: WL.Group.GroupCommandId.GROUP_COMMAND_ADD_NOTICE,
    buildChangeGroupNoticeReq: WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_NOTICE,
    buildDeleteGroupNoticeReq: WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_NOTICE,
    buildGetGroupDetailReq: WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPDETAIL,
    buildGetSubDeviceGroupAttributes: WL.Group.GroupCommandId.GROUP_COMMAND_GET_SUB_GROUPATTRIBUTE,
    buildAddSubMemberReq: WL.Group.GroupCommandId.GROUP_COMMAND_ADD_SUB_MEMBER,
  } satisfies Record<string, WL.Group.GroupCommandId>

  /** Built but nothing awaits their response yet; wiring one up is a conscious act. */
  const NOT_AWAITED = new Set<number>([
    WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_MEMBERINFO,
    WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_INVITEINFO,
    WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_JOININFO,
    WL.Group.GroupCommandId.GROUP_COMMAND_GET_BLACKLIST,
    WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_BLACKLIST,
    WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_CHANGE_LOG,
    WL.Group.GroupCommandId.GROUP_COMMAND_GET_NOTICE,
    WL.Group.GroupCommandId.GROUP_COMMAND_ADD_NOTICE,
    WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_NOTICE,
    WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_NOTICE,
    WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPDETAIL,
  ])

  it('covers every builder the group wrapper exposes', () => {
    expect(Object.keys(GROUP_BUILDER_COMMANDS).toSorted()).toEqual(
      Object.keys(WeilaPBGroupWrapper).toSorted(),
    )
  })

  it('routes every awaited group command and only those', () => {
    const { rspPbMsg, handler } = makeGroupModule()

    for (const commandId of Object.values(GROUP_BUILDER_COMMANDS)) {
      handler(buildResponse(commandId))

      if (NOT_AWAITED.has(commandId)) {
        expect(
          rspPbMsg,
          `${WL.Group.GroupCommandId[commandId]} should stay unrouted`,
        ).not.toHaveBeenCalled()
      } else {
        expect(rspPbMsg, `${WL.Group.GroupCommandId[commandId]} must route`).toHaveBeenCalledTimes(
          1,
        )
      }

      rspPbMsg.mockClear()
    }
  })
})
