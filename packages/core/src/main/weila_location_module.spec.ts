import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLLocationModule from 'main/weila_location_module'
import { WeilaPbLocationWrapper } from 'proto/weilapb_location_wrapper'

function makeLocationModule() {
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

  const locationModule = new WLLocationModule(coreInterface)
  expect(locationModule).toBeInstanceOf(WLLocationModule)

  const handler = handlers.get(WL.Service.ServiceID.SERVICE_LOCATION)

  if (!handler) throw new Error('location module did not register its handler')

  return { rspPbMsg, handler }
}

function buildResponse(
  commandId: WL.Location.LocationCommandId,
  locationMessage?: WL.Location.LocationMessage,
  resultCode = 0,
) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_LOCATION,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode,
    }),
    locationMessage,
  })
}

describe('WLLocationModule response routing', () => {
  it('routes GET_LOCATION responses so getLocation() can resolve', () => {
    const { rspPbMsg, handler } = makeLocationModule()

    const rspGetLocation = new WL.Location.RspGetLocation()

    const message = buildResponse(
      WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION,
      new WL.Location.LocationMessage({ rspGetLocation }),
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledTimes(1)
    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, rspGetLocation)
  })

  it('forwards a null payload when the locationMessage container is absent', () => {
    const { rspPbMsg, handler } = makeLocationModule()

    handler(buildResponse(WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, null)
  })

  it('leaves unrouted commands silent instead of acking with a wrong payload', () => {
    const { rspPbMsg, handler } = makeLocationModule()

    // No case routes LOCATION_COMMAND_REPORT_LOCATION today. A missing case
    // must stay silent (the caller times out) rather than resolve with a
    // wrong payload. This is exactly the failure mode that hid the broken
    // token refresh.
    handler(buildResponse(WL.Location.LocationCommandId.LOCATION_COMMAND_REPORT_LOCATION))

    expect(rspPbMsg).not.toHaveBeenCalled()
  })

  /** Every location builder and the command it emits, so the routing guard below covers them all. */
  const LOCATION_BUILDER_COMMANDS = {
    buildReportLocationReq: WL.Location.LocationCommandId.LOCATION_COMMAND_REPORT_LOCATION,
    buildGetLocationReq: WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION,
    buildLocationControlReq: WL.Location.LocationCommandId.LOCATION_COMMAND_LOCATION_CONTROL,
  } satisfies Record<string, WL.Location.LocationCommandId>

  /** Built but nothing awaits their response yet; wiring one up is a conscious act. */
  const NOT_AWAITED = new Set<number>([
    WL.Location.LocationCommandId.LOCATION_COMMAND_REPORT_LOCATION,
    WL.Location.LocationCommandId.LOCATION_COMMAND_LOCATION_CONTROL,
  ])

  it('covers every builder the location wrapper exposes', () => {
    expect(Object.keys(LOCATION_BUILDER_COMMANDS).toSorted()).toEqual(
      Object.keys(WeilaPbLocationWrapper).toSorted(),
    )
  })

  it('routes every awaited location command and only those', () => {
    const { rspPbMsg, handler } = makeLocationModule()

    for (const commandId of Object.values(LOCATION_BUILDER_COMMANDS)) {
      handler(buildResponse(commandId))

      if (NOT_AWAITED.has(commandId)) {
        expect(
          rspPbMsg,
          `${WL.Location.LocationCommandId[commandId]} should stay unrouted`,
        ).not.toHaveBeenCalled()
      } else {
        expect(
          rspPbMsg,
          `${WL.Location.LocationCommandId[commandId]} must route`,
        ).toHaveBeenCalledTimes(1)
      }

      rspPbMsg.mockClear()
    }
  })
})
