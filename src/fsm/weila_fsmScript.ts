import {assign, createMachine, send} from 'xstate';
import { WL_LoginParam } from 'main/weila_internal_data'
import {WLPlayerType} from "audio/weila_audio_data";

const loginProcedureFsm = {
    "loginProcedure": {
        "entry": (context, event) => {
            console.log('onLoginProcedure', event)},
        "initial": "connecting",
        "on": {
            "FSM_NET_DISCONNECT_IND_EVT": {
                "actions": (_, event) => {
                    console.log(event.type)
                },
                "internal": true
            },

            "FSM_LOGIN_PROCEDURE_SUCC_EVT": {
                "target": "dataInit"
            },

            "FSM_LOGIN_PROCEDURE_FAIL_EVT": {
                "actions": (_, event) => {
                    console.log('Login procedure fail..........................', event.type)
                },
                "target": "loginTry"
            }
        },

        "states": {
            "connecting": {
                "entry": "connectServer",
                "description": "一旦进入此状态，首先执行连接网络",
                "after": {
                    "10000": {
                        "actions": [
                            send('FSM_LOGIN_PROCEDURE_FAIL_EVT'),
                            (_, event) => {
                                console.log('FSM_LOGIN_PROCEDURE_FAIL_EVT..........................', event.type)
                            }]
                    }
                },
                "on": {
                    "FSM_NET_CONNECTED_IND_EVT": {
                        "actions": (_, event) => {
                            console.log('connecting', event.type)
                        },
                        "target": "logining",
                        "internal": true
                    },
                    "FSM_NET_CONNECTING_IND_EVT": {
                        "actions": ["onConnecting", (_, event) => {
                            console.log(event.type)
                        }],
                        "internal": true
                    },
                    "FSM_NET_EXCEPTION_IND_EVT": {
                        "actions": send('FSM_LOGIN_PROCEDURE_FAIL_EVT'),
                    },
                    "FSM_NET_DISCONNECT_IND_EVT": {
                        "actions": send('FSM_LOGIN_PROCEDURE_FAIL_EVT'),
                    }
                }
            },
            "logining": {
                "entry": [(_, event) => {
                    console.log('logining..............', event.type)
                }, send('FSM_SYSTEM_WATCH_TIMEOUT_EVT')],
                "on": {
                    "FSM_SYSTEM_WATCH_TIMEOUT_EVT": {
                        "actions": [
                            "onSysTimeChecking",
                        ],
                        "internal": true
                    },
                },
                "invoke": {
                    "src": "loginServer",
                    "id": "login_server",
                    "onDone": [
                        {
                            "actions": "onLoginServerSucc",
                        }
                    ],
                    "onError": [
                        {
                            "actions": "onLoginServerFail",
                        }
                    ]
                },
                "description": "调用登录接口开始登录\n"
            },
        }
    }
};

const mainFsm = createMachine({
    "id": "main",
    "initial": "uninit",
    "context": {
        "loginParam": null as WL_LoginParam|null,
        "core": null
    },
    "states": {
        "uninit": {
            "description": "此时系统未初始化，一些资源没有加载，例如wasm等。\n",
            "on": {
                "FSM_LOAD_RESOURCE_EVT": {
                    "description": "此事件由init调用触发，传入promise作为事件的数据，后续成功与否可以通过此通知调用者\n",
                    "target": "loadingResource"
                }
            }
        },
        "loadingResource": {
            "invoke": {
                "src": "loadResource",
                "id": "loading_resource",
                "onError": [
                    {
                        "actions": "onResourceLoadFail",
                        "description": "加载数据失败，此时需要",
                        "target": "exception"
                    }
                ],
                "onDone": [
                    {
                        "actions": "onLoadingResource",
                        "description": "数据加载成功，跳转到Inited状态。",
                        "target": "inited"
                    }
                ]
            },
            "description": "这是加载资源的状态，加载wasm等资源。只有加载成功，后续才可以继续，否则失败后跳到异常状态"
        },
        "exception": {
            "entry": "onException",
            "type": "final",
            "description": "异常状态，此时最好发出异常提示\n"
        },
        "inited": {
            "description": "初始化完成状态。此时应该清空发送消息队列和等待队列\n",
            "entry": "onCoreInited",
            "on": {
                "FSM_LOGIN_SERVER_EVT": {
                    "target": "loginProcedure",
                    "actions": assign({
                        loginParam: (context: any, event: any) => event.data
                    })
                }
            }
        },
        ...loginProcedureFsm,
        "dataInit": {
            "entry": ["onDataInit", send('FSM_SYSTEM_WATCH_TIMEOUT_EVT')],
            "invoke": {
                "src": "prepareData",
                "id": "prepare_data",
                "onDone": {
                    "actions": "onDataInited",
                    "target": "ready"
                },
                "onError": {
                    "actions": "onDataPrepareFail",
                    "target": "exception"
                }
            },
            "on": {
                "FSM_SYSTEM_WATCH_TIMEOUT_EVT": {
                    "actions": [
                        "onSysTimeChecking",
                    ],
                    "internal": true
                },
                "FSM_NET_DISCONNECT_IND_EVT": {
                    "target": "loginProcedure"
                }
            }
        },
        "loginTry": {
            "description": "登录尝试状态，会自动启动每2秒重新返回登录流程。如果尝试次数超了或失败因为特殊原因，则不应该尝试了\n",
            "entry": "onLoginTryEntry",
            "on": {
                "FSM_LOGIN_PROCEDURE_FAIL_EVT": {
                    "actions": "onLoginRetryFail",
                    "target": "inited"
                }
            },
            "after": {
                "2000": [
                    {
                        "cond": "canRetry",
                        "target": "loginProcedure"
                    },
                    {
                        "actions": "onLoginRetryFail",
                        "target": "inited"
                    }
                ]
            }
        },
        "ready": {
            "entry": [
                "onReadyEntry",
                send("FSM_SYSTEM_WATCH_TIMEOUT_EVT")
            ],
            "exit": "onReadyExit",
            "description": "准备状态，此时可以做很多事情。\n每隔1秒，检查一下等待消息列表是否超时。",
            "on": {
                "FSM_SYSTEM_WATCH_TIMEOUT_EVT": {
                    "actions": [
                        "onSysTimeChecking",
                    ],
                    "internal": true
                },

                "FSM_LOGOUT_EVT": {
                    "target": "logoutProcedure"
                },

                "FSM_NET_DISCONNECT_IND_EVT": {
                    "actions": "onDisconnectInReadyState",
                    "target": "loginProcedure"
                }
            }
        },
        "logoutProcedure": {
            "invoke": {
                "src": "logout",
                "onDone": [
                    {
                        "target": "inited"
                    }
                ],
                "onError": [
                    {
                        "target": "inited"
                    }
                ]
            }
        }
    }
});

const pttFsm = createMachine({
    "id": "PTTMachine",
    "initial": "idle",
    "context": {
        "pttCore": null as any,
        "singlePlayOrigin": '',
        "historyPlayOrigin": '',
        "talkOrigin": '',
    },
    "states": {
        "idle": {
            "entry": "onIdle",
            "on": {
                "FSM_PLAY_REALTIME_EVT": "realtimePlaying",
                "FSM_PLAY_HISTORY_EVT": "historyPlaying",
                "FSM_PLAY_SINGLE_EVT": "singlePlaying",
                "FSM_REQ_TALK_EVT": "startTalk"
            }
        },
        "realtimePlaying": {
            "exit": "onExitRealtime",
            "entry": "onEnterRealtime",
            "initial": "playing",
            "states": {
                "playing": {
                    "entry": "onPttPayloadPlaying",
                    "on": {
                        "FSM_PTT_OUT_OF_PAYLOAD_EVT": {
                            "target": "waitPayload",
                            "internal": true
                        },
                        "FSM_PTT_ITEM_PLAY_END_EVT": {
                            "actions": "onPlayItemFinish",
                        },
                        "FSM_PTT_CHECK_RESOURCE_EVT": "checkPttSource",
                        "FSM_FEED_PTT_PAYLOAD_EVT": {
                            "actions": "feedData",
                            "internal": true
                        },
                        "FSM_STOP_AND_PLAY_NEXT_EVT": {
                            "actions": "stopAndPlayNext",
                            "internal": true
                        }
                    },
                    "meta": {
                        "playType": WLPlayerType.WL_PTT_STREAM_PLAYER,
                    }
                },
                "checkPttSource": {
                    "invoke": {
                        "src": "checkPttPlayingList",
                        "id": "check_ptt_source",
                        "onError": {
                            "actions": send('FSM_PLAY_END_EVT'),
                            "description": "没有数据了，此时可以结束播音",
                        },
                        "onDone": {
                            "actions": send((_, event: any) => ({type: 'FSM_PLAY_NEXT_PTT_ITEM_EVT', 'data': event.data})),
                            "description": "还有数据，播放下一条",
                        }
                    },
                    "on": {
                        "FSM_PLAY_NEXT_PTT_ITEM_EVT": {
                            "actions": "onPlayNextItem",
                            "target": "playing"
                        }
                    }
                },
                "waitPayload": {
                    "entry": "onPttPayloadWaiting",
                    "on": {
                        "FSM_FEED_PTT_PAYLOAD_EVT": "playing"
                    }
                }
            },
            "on": {
                "FSM_PLAY_HISTORY_EVT": "realtimeStop",
                "FSM_PLAY_SINGLE_EVT": "realtimeStop",
                "FSM_REQ_TALK_EVT": "realtimeStop",
                "FSM_STOP_EVT": {
                  "target": "realtimeStop",
                  "actions": "onStopPttPlay"
                },
                "FSM_PLAY_END_EVT": "realtimeStop"
            }
        },
        "realtimeStop": {
            "entry": "stopPlay",
            "on": {
                "FSM_PLAY_HISTORY_EVT": "historyPlaying",
                "FSM_PLAY_SINGLE_EVT": "singlePlaying",
                "FSM_REQ_TALK_EVT": "startTalk",
                "FSM_END_BACK_TO_IDLE_EVT": "idle"
            },
            "meta": {
                "playType": WLPlayerType.WL_PTT_STREAM_PLAYER,
            }
        },
        "historyPlaying": {
            "entry": "onHistoryPlaying",
            "initial": "playing",
            "states": {
                "playing": {
                    "entry": "onPttPayloadPlaying",
                    "on": {
                        "FSM_PTT_ITEM_PLAY_END_EVT": {
                            "actions": "onPlayHistoryItemFinish",
                        },
                        "FSM_PTT_CHECK_RESOURCE_EVT": "checkPttSource",
                        "FSM_FEED_PTT_PAYLOAD_EVT": {
                            "actions": "feedData",
                            "internal": true
                        },
                        "FSM_STOP_AND_PLAY_NEXT_EVT": {
                            "actions": "stopAndPlayNext",
                            "internal": true
                        }
                    },
                    "meta": {
                        "playType": WLPlayerType.WL_PTT_HISTORY_PLAYER,
                    }
                },
                "checkPttSource": {
                    "invoke": {
                        "src": "checkHistoryList",
                        "id": "check_history_source",
                        "onError": {
                            "actions": send('FSM_PLAY_END_EVT'),
                            "description": "没有数据了，此时可以结束播音",
                        },
                        "onDone": {
                            "actions": send((_, event: any) => ({type: 'FSM_PLAY_NEXT_PTT_ITEM_EVT', 'data': event.data})),
                            "description": "还有数据，播放下一条",
                        },
                    },
                    "on": {
                        "FSM_PLAY_NEXT_PTT_ITEM_EVT": {
                            "actions": "onPlayNextItem",
                            "target": "playing"
                        }
                    }
                }
            },
            "on": {
                "FSM_PLAY_END_EVT": "historyStopping",
                "FSM_STOP_EVT": "historyStopping",
                "FSM_PLAY_SINGLE_EVT": "historyStopping",
                "FSM_REQ_TALK_EVT": "historyStopping",
            }
        },
        "historyStopping": {
            "entry": "stopPlay",
            "on": {
                "FSM_REQ_TALK_EVT": "startTalk",
                "FSM_PLAY_SINGLE_EVT": "singlePlaying",
                "FSM_END_BACK_TO_IDLE_EVT": "idle"
            },
            "meta": {
                "playType": WLPlayerType.WL_PTT_HISTORY_PLAYER,
            }
        },
        "startTalk": {
            "invoke": {
                "src": "startTalking",
                "id": "request_talk",
                "onDone": {
                    "actions": "onRequestTalkResult",
                    "target": "talking",
                },
                "onError": {
                    "actions": "onRequestTalkResult",
                    "target": "talkStop"
                }
            }
        },
        "talking": {
            "entry": "onTalking",
            "on": {
                "FSM_REL_TALK_EVT": "talkStop",
                "FSM_TALK_INTERRUPT_EVT": {
                    "actions": "onTalkInterrupt",
                    "target":"talkStop"
                }
            }
        },
        "talkStop": {
            "invoke": {
                "src": "stopTalk",
                "id": "release_talk",
                "onDone": "idle",
                "onError": "idle"
            }
        },
        "singlePlaying": {
            "entry": "onSinglePlayEntry",
            "exit": "onSinglePlayExit",
            "on": {
                "FSM_STOP_EVT": "singleStopping",
                "FSM_REQ_TALK_EVT": "singleStopping",
                "FSM_PTT_ITEM_PLAY_END_EVT": {
                    "actions": "onSinglePlayFinish"
                },
                "FSM_PLAY_END_EVT": "singleStopping",
                "FSM_PLAY_SINGLE_EVT": "singleStopping",
                "FSM_PLAY_HISTORY_EVT": "singleStopping",
                "FSM_FEED_PTT_PAYLOAD_EVT": {
                    "actions": "feedData",
                    "internal": true
                },
            }
        },
        "singleStopping": {
            "entry": "stopPlay",
            "on": {
                "FSM_PLAY_SINGLE_EVT": "singlePlaying",
                "FSM_REQ_TALK_EVT": "startTalk",
                "FSM_PLAY_HISTORY_EVT": "historyPlaying",
                "FSM_END_BACK_TO_IDLE_EVT": "idle"
            },
            "meta": {
                "playType": WLPlayerType.WL_PTT_SINGLE_PLAYER,
            }
        },
    }
});

const fsmEvents = {
    FSM_LOAD_RESOURCE_EVT: "FSM_LOAD_RESOURCE_EVT",
    FSM_LOGIN_SERVER_EVT: "FSM_LOGIN_SERVER_EVT",
    FSM_NET_DISCONNECT_IND_EVT: "FSM_NET_DISCONNECT_IND_EVT",
    FSM_NET_CONNECTED_IND_EVT: "FSM_NET_CONNECTED_IND_EVT",
    FSM_NET_CONNECTING_IND_EVT: "FSM_NET_CONNECTING_IND_EVT",
    FSM_NET_EXCEPTION_IND_EVT: "FSM_NET_EXCEPTION_IND_EVT",
    FSM_LOGIN_PROCEDURE_FAIL_EVT: "FSM_LOGIN_PROCEDURE_FAIL_EVT",
    FSM_LOGIN_PROCEDURE_SUCC_EVT: "FSM_LOGIN_PROCEDURE_SUCC_EVT",
    FSM_SYSTEM_WATCH_TIMEOUT_EVT: "FSM_SYSTEM_WATCH_TIMEOUT_EVT",
    FSM_LOGOUT_EVT: "FSM_LOGOUT_EVT",

    FSM_END_BACK_TO_IDLE_EVT: "FSM_END_BACK_TO_IDLE_EVT",
    FSM_PLAY_REALTIME_EVT: "FSM_PLAY_REALTIME_EVT",
    FSM_PLAY_HISTORY_EVT: "FSM_PLAY_HISTORY_EVT",
    FSM_PLAY_SINGLE_EVT: "FSM_PLAY_SINGLE_EVT",
    FSM_REQ_TALK_EVT: "FSM_REQ_TALK_EVT",

    FSM_FEED_PTT_PAYLOAD_EVT: "FSM_FEED_PTT_PAYLOAD_EVT",
    FSM_PTT_OUT_OF_PAYLOAD_EVT: "FSM_PTT_OUT_OF_PAYLOAD_EVT",
    FSM_PTT_ITEM_PLAY_END_EVT: "FSM_PTT_ITEM_PLAY_END_EVT",
    FSM_PTT_CHECK_RESOURCE_EVT: "FSM_PTT_CHECK_RESOURCE_EVT",
    FSM_PLAY_NEXT_PTT_ITEM_EVT: "FSM_PLAY_NEXT_PTT_ITEM_EVT",
    FSM_STOP_AND_PLAY_NEXT_EVT: "FSM_STOP_AND_PLAY_NEXT_EVT",

    FSM_PLAY_END_EVT: "FSM_PLAY_END_EVT",
    FSM_STOP_EVT: "FSM_STOP_EVT",
    FSM_REL_TALK_EVT: "FSM_REL_TALK_EVT"
}

export { mainFsm, loginProcedureFsm, pttFsm, fsmEvents }