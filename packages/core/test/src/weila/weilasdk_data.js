(function webpackUniversalModuleDefinition(root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof exports === 'object') exports['weilasdk'] = factory();
  else root['weilasdk'] = factory();
})(this, () => {
  return /******/ (() => {
    // webpackBootstrap
    /******/ 'use strict';
    /******/ var __webpack_modules__ = {
      /***/ './database/weila_db_data.ts':
        /*!***********************************!*\
  !*** ./database/weila_db_data.ts ***!
  \***********************************/
        /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
          __webpack_require__.r(__webpack_exports__);
          /* harmony export */ __webpack_require__.d(__webpack_exports__, {
            /* harmony export */ WL_IDbFriendStatus: () => /* binding */ WL_IDbFriendStatus,
            /* harmony export */ WL_IDbGroupAuthType: () => /* binding */ WL_IDbGroupAuthType,
            /* harmony export */ WL_IDbGroupPublicType: () => /* binding */ WL_IDbGroupPublicType,
            /* harmony export */ WL_IDbGroupType: () => /* binding */ WL_IDbGroupType,
            /* harmony export */ WL_IDbMemberStatus: () => /* binding */ WL_IDbMemberStatus,
            /* harmony export */ WL_IDbMemberType: () => /* binding */ WL_IDbMemberType,
            /* harmony export */ WL_IDbMsgDataStatus: () => /* binding */ WL_IDbMsgDataStatus,
            /* harmony export */ WL_IDbMsgDataType: () => /* binding */ WL_IDbMsgDataType,
            /* harmony export */ WL_IDbNotificationType: () => /* binding */ WL_IDbNotificationType,
            /* harmony export */ WL_IDbSessionStatus: () => /* binding */ WL_IDbSessionStatus,
            /* harmony export */ WL_IDbSessionType: () => /* binding */ WL_IDbSessionType,
            /* harmony export */ WL_IDbSettingID: () => /* binding */ WL_IDbSettingID,
            /* harmony export */
          });
          // 存入数据库的设置项
          var WL_IDbSettingID;
          (function (WL_IDbSettingID) {
            WL_IDbSettingID[(WL_IDbSettingID['SETTING_LOGIN_TOKEN'] = 0)] = 'SETTING_LOGIN_TOKEN';
            WL_IDbSettingID[(WL_IDbSettingID['SETTING_SESSION_LATEST_UPDATE'] = 1)] =
              'SETTING_SESSION_LATEST_UPDATE';
            WL_IDbSettingID[(WL_IDbSettingID['SETTING_FRIEND_LATEST_UPDATE'] = 2)] =
              'SETTING_FRIEND_LATEST_UPDATE';
            WL_IDbSettingID[(WL_IDbSettingID['SETTING_GROUP_LATEST_UPDATE'] = 3)] =
              'SETTING_GROUP_LATEST_UPDATE'; // 群组最后一次更新时间
          })(WL_IDbSettingID || (WL_IDbSettingID = {}));
          // 会话相关，后续所有的好友，群都需要创建一个deactivate的会话。
          var WL_IDbSessionStatus;
          (function (WL_IDbSessionStatus) {
            WL_IDbSessionStatus[(WL_IDbSessionStatus['SESSION_ACTIVATE'] = 0)] = 'SESSION_ACTIVATE';
            WL_IDbSessionStatus[(WL_IDbSessionStatus['SESSION_DEACTIVATE'] = 1)] =
              'SESSION_DEACTIVATE';
            WL_IDbSessionStatus[(WL_IDbSessionStatus['SESSION_INVALID'] = 2)] = 'SESSION_INVALID';
          })(WL_IDbSessionStatus || (WL_IDbSessionStatus = {}));
          var WL_IDbSessionType;
          (function (WL_IDbSessionType) {
            // 个人会话
            WL_IDbSessionType[(WL_IDbSessionType['SESSION_INDIVIDUAL_TYPE'] = 1)] =
              'SESSION_INDIVIDUAL_TYPE';
            // 群会话
            WL_IDbSessionType[(WL_IDbSessionType['SESSION_GROUP_TYPE'] = 2)] = 'SESSION_GROUP_TYPE';
            // 服务号
            WL_IDbSessionType[(WL_IDbSessionType['SESSION_SERVICE_TYPE'] = 3)] =
              'SESSION_SERVICE_TYPE';
          })(WL_IDbSessionType || (WL_IDbSessionType = {}));
          // 群信息
          var WL_IDbGroupType;
          (function (WL_IDbGroupType) {
            WL_IDbGroupType[(WL_IDbGroupType['GROUP_NORMAL'] = 1)] = 'GROUP_NORMAL';
            WL_IDbGroupType[(WL_IDbGroupType['GROUP_TEMP'] = 2)] = 'GROUP_TEMP';
            WL_IDbGroupType[(WL_IDbGroupType['GROUP_COMPANY_NORMAL'] = 33)] =
              'GROUP_COMPANY_NORMAL';
            WL_IDbGroupType[(WL_IDbGroupType['GROUP_COMPANY_DEPT'] = 34)] = 'GROUP_COMPANY_DEPT';
          })(WL_IDbGroupType || (WL_IDbGroupType = {}));
          var WL_IDbGroupPublicType;
          (function (WL_IDbGroupPublicType) {
            WL_IDbGroupPublicType[(WL_IDbGroupPublicType['GROUP_PUBLIC_CLOSE'] = 1)] =
              'GROUP_PUBLIC_CLOSE';
            WL_IDbGroupPublicType[(WL_IDbGroupPublicType['GROUP_PUBLIC_OPEN'] = 2)] =
              'GROUP_PUBLIC_OPEN';
          })(WL_IDbGroupPublicType || (WL_IDbGroupPublicType = {}));
          var WL_IDbGroupAuthType;
          (function (WL_IDbGroupAuthType) {
            WL_IDbGroupAuthType[(WL_IDbGroupAuthType['GROUP_AUTH_NONE'] = 1)] = 'GROUP_AUTH_NONE';
            WL_IDbGroupAuthType[(WL_IDbGroupAuthType['GROUP_AUTH_CONFIRM'] = 2)] =
              'GROUP_AUTH_CONFIRM';
            WL_IDbGroupAuthType[(WL_IDbGroupAuthType['GROUP_AUTH_CONFIRM_OR_PASSWORD'] = 3)] =
              'GROUP_AUTH_CONFIRM_OR_PASSWORD';
            WL_IDbGroupAuthType[(WL_IDbGroupAuthType['GROUP_AUTH_CONFIRM_AND_PASSWORD'] = 4)] =
              'GROUP_AUTH_CONFIRM_AND_PASSWORD';
          })(WL_IDbGroupAuthType || (WL_IDbGroupAuthType = {}));
          var WL_IDbMemberType;
          (function (WL_IDbMemberType) {
            WL_IDbMemberType[(WL_IDbMemberType['NORMAL_MEMBER_TYPE'] = 1)] = 'NORMAL_MEMBER_TYPE';
            WL_IDbMemberType[(WL_IDbMemberType['ADMIN_MEMBER_TYPE'] = 2)] = 'ADMIN_MEMBER_TYPE';
          })(WL_IDbMemberType || (WL_IDbMemberType = {}));
          var WL_IDbMemberStatus;
          (function (WL_IDbMemberStatus) {
            WL_IDbMemberStatus[(WL_IDbMemberStatus['MEMBER_NORMAL_STATUS'] = 0)] =
              'MEMBER_NORMAL_STATUS';
            WL_IDbMemberStatus[(WL_IDbMemberStatus['MEMBER_QUIT_STATUS'] = 1)] =
              'MEMBER_QUIT_STATUS';
          })(WL_IDbMemberStatus || (WL_IDbMemberStatus = {}));
          // 好友信息
          var WL_IDbFriendStatus;
          (function (WL_IDbFriendStatus) {
            WL_IDbFriendStatus[(WL_IDbFriendStatus['FRIEND_NORMAL_STATUS'] = 0)] =
              'FRIEND_NORMAL_STATUS';
            WL_IDbFriendStatus[(WL_IDbFriendStatus['FRIEND_DELETED_STATUS'] = 1)] =
              'FRIEND_DELETED_STATUS';
          })(WL_IDbFriendStatus || (WL_IDbFriendStatus = {}));
          // 会话消息
          var WL_IDbMsgDataType;
          (function (WL_IDbMsgDataType) {
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_TEXT_TYPE'] = 0)] =
              'WL_DB_MSG_DATA_TEXT_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_AUDIO_TYPE'] = 1)] =
              'WL_DB_MSG_DATA_AUDIO_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_IMAGE_TYPE'] = 2)] =
              'WL_DB_MSG_DATA_IMAGE_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_VIDEO_TYPE'] = 3)] =
              'WL_DB_MSG_DATA_VIDEO_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_FILE_TYPE'] = 4)] =
              'WL_DB_MSG_DATA_FILE_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_LOCATION_TYPE'] = 5)] =
              'WL_DB_MSG_DATA_LOCATION_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_COMMAND_TYPE'] = 6)] =
              'WL_DB_MSG_DATA_COMMAND_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_PTT_TYPE'] = 7)] =
              'WL_DB_MSG_DATA_PTT_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_SERVICE_TYPE'] = 8)] =
              'WL_DB_MSG_DATA_SERVICE_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_SWITCH_TYPE'] = 9)] =
              'WL_DB_MSG_DATA_SWITCH_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_WITHDRAW_TYPE'] = 10)] =
              'WL_DB_MSG_DATA_WITHDRAW_TYPE';
            WL_IDbMsgDataType[(WL_IDbMsgDataType['WL_DB_MSG_DATA_UNKNOWN_TYPE'] = 11)] =
              'WL_DB_MSG_DATA_UNKNOWN_TYPE';
          })(WL_IDbMsgDataType || (WL_IDbMsgDataType = {}));
          var WL_IDbMsgDataStatus;
          (function (WL_IDbMsgDataStatus) {
            WL_IDbMsgDataStatus[(WL_IDbMsgDataStatus['WL_DB_MSG_DATA_STATUS_NEW'] = 0)] =
              'WL_DB_MSG_DATA_STATUS_NEW';
            WL_IDbMsgDataStatus[(WL_IDbMsgDataStatus['WL_DB_MSG_DATA_STATUS_SENT'] = 1)] =
              'WL_DB_MSG_DATA_STATUS_SENT';
            WL_IDbMsgDataStatus[(WL_IDbMsgDataStatus['WL_DB_MSG_DATA_STATUS_UNSENT'] = 2)] =
              'WL_DB_MSG_DATA_STATUS_UNSENT';
            WL_IDbMsgDataStatus[(WL_IDbMsgDataStatus['WL_DB_MSG_DATA_STATUS_READ'] = 3)] =
              'WL_DB_MSG_DATA_STATUS_READ';
            WL_IDbMsgDataStatus[(WL_IDbMsgDataStatus['WL_DB_MSG_DATA_STATUS_ERR'] = 4)] =
              'WL_DB_MSG_DATA_STATUS_ERR';
          })(WL_IDbMsgDataStatus || (WL_IDbMsgDataStatus = {}));
          // 通知相关的信息
          var WL_IDbNotificationType;
          (function (WL_IDbNotificationType) {
            WL_IDbNotificationType[(WL_IDbNotificationType['FRIEND_INVITE_NOTIFICATION'] = 0)] =
              'FRIEND_INVITE_NOTIFICATION';
            WL_IDbNotificationType[(WL_IDbNotificationType['FRIEND_ANSWER_NOTIFICATION'] = 1)] =
              'FRIEND_ANSWER_NOTIFICATION';
            WL_IDbNotificationType[(WL_IDbNotificationType['GROUP_INVITE_NOTIFICATION'] = 2)] =
              'GROUP_INVITE_NOTIFICATION';
            WL_IDbNotificationType[(WL_IDbNotificationType['GROUP_JOIN_NOTIFICATION'] = 3)] =
              'GROUP_JOIN_NOTIFICATION';
            WL_IDbNotificationType[
              (WL_IDbNotificationType['GROUP_ANSWER_INVITE_NOTIFICATION'] = 4)
            ] = 'GROUP_ANSWER_INVITE_NOTIFICATION';
            WL_IDbNotificationType[(WL_IDbNotificationType['GROUP_ANSWER_JOIN_NOTIFICATION'] = 5)] =
              'GROUP_ANSWER_JOIN_NOTIFICATION';
          })(WL_IDbNotificationType || (WL_IDbNotificationType = {}));

          /***/
        },

      /***/ './main/weila_external_data.ts':
        /*!*************************************!*\
  !*** ./main/weila_external_data.ts ***!
  \*************************************/
        /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
          __webpack_require__.r(__webpack_exports__);
          /* harmony export */ __webpack_require__.d(__webpack_exports__, {
            /* harmony export */ WL_DataPrepareState: () => /* binding */ WL_DataPrepareState,
            /* harmony export */ WL_ExtEventID: () => /* binding */ WL_ExtEventID,
            /* harmony export */ WL_PttAudioPlayState: () => /* binding */ WL_PttAudioPlayState,
            /* harmony export */ WL_PttRecordState: () => /* binding */ WL_PttRecordState,
            /* harmony export */
          });
          var WL_DataPrepareState;
          (function (WL_DataPrepareState) {
            WL_DataPrepareState[(WL_DataPrepareState['START_PREPARING'] = 0)] = 'START_PREPARING';
            WL_DataPrepareState[(WL_DataPrepareState['PREPARE_SUCC_END'] = 1)] = 'PREPARE_SUCC_END';
            WL_DataPrepareState[(WL_DataPrepareState['PREPARE_FAIL_END'] = 2)] = 'PREPARE_FAIL_END';
          })(WL_DataPrepareState || (WL_DataPrepareState = {}));
          var WL_PttAudioPlayState;
          (function (WL_PttAudioPlayState) {
            WL_PttAudioPlayState[(WL_PttAudioPlayState['PTT_AUDIO_PLAYING_START'] = 0)] =
              'PTT_AUDIO_PLAYING_START';
            WL_PttAudioPlayState[(WL_PttAudioPlayState['PTT_AUDIO_PLAYING'] = 1)] =
              'PTT_AUDIO_PLAYING';
            WL_PttAudioPlayState[(WL_PttAudioPlayState['PTT_AUDIO_PLAYING_END'] = 2)] =
              'PTT_AUDIO_PLAYING_END';
          })(WL_PttAudioPlayState || (WL_PttAudioPlayState = {}));
          var WL_PttRecordState;
          (function (WL_PttRecordState) {
            WL_PttRecordState[(WL_PttRecordState['PTT_AUDIO_RECORDING_START'] = 0)] =
              'PTT_AUDIO_RECORDING_START';
            WL_PttRecordState[(WL_PttRecordState['PTT_AUDIO_RECORDING'] = 1)] =
              'PTT_AUDIO_RECORDING';
            WL_PttRecordState[(WL_PttRecordState['PTT_AUDIO_RECORDING_END'] = 2)] =
              'PTT_AUDIO_RECORDING_END';
          })(WL_PttRecordState || (WL_PttRecordState = {}));
          var WL_ExtEventID;
          (function (WL_ExtEventID) {
            // 告知客户端，登陆后用户的数据的准备状态，data数据为 WL_DataPrepareState 类型
            WL_ExtEventID[(WL_ExtEventID['WL_EXT_DATA_PREPARE_IND'] = 0)] =
              'WL_EXT_DATA_PREPARE_IND';
            // 告知客户端，系统遇到不可恢复异常，data数据为异常原因
            WL_ExtEventID[(WL_ExtEventID['WL_EXT_SYSTEM_EXCEPTION_IND'] = 1)] =
              'WL_EXT_SYSTEM_EXCEPTION_IND';
            // 告知客户端，播放语音的通知，数据类型为WL_PttPlayInfo
            WL_ExtEventID[(WL_ExtEventID['WL_EXT_PTT_PLAY_IND'] = 2)] = 'WL_EXT_PTT_PLAY_IND';
            // 告知客户段，对讲录音的通知, 数据为WL_PttRecordInd
            WL_ExtEventID[(WL_ExtEventID['WL_EXT_PTT_RECORD_IND'] = 3)] = 'WL_EXT_PTT_RECORD_IND';
            // 告知客户端，PTT语音发送结果通知，数据为WL_PttMsgSendInd
            WL_ExtEventID[(WL_ExtEventID['WL_EXT_PTT_MSG_SEND_IND'] = 4)] =
              'WL_EXT_PTT_MSG_SEND_IND';
            // 告知客户端，有新消息到来, 数据是WL_IDbMsgData
            WL_ExtEventID[(WL_ExtEventID['WL_EXT_NEW_MSG_RECV_IND'] = 5)] =
              'WL_EXT_NEW_MSG_RECV_IND';
            // 告知客户端，新会话自动创建, 数据是WL_IDbSession
            WL_ExtEventID[(WL_ExtEventID['WL_EXT_NEW_SESSION_OPEN_IND'] = 6)] =
              'WL_EXT_NEW_SESSION_OPEN_IND';
          })(WL_ExtEventID || (WL_ExtEventID = {}));

          /***/
        },

      /******/
    };
    /************************************************************************/
    /******/ // The module cache
    /******/ var __webpack_module_cache__ = {};
    /******/
    /******/ // The require function
    /******/ function __webpack_require__(moduleId) {
      /******/ // Check if module is in cache
      /******/ var cachedModule = __webpack_module_cache__[moduleId];
      /******/ if (cachedModule !== undefined) {
        /******/ return cachedModule.exports;
        /******/
      }
      /******/ // Create a new module (and put it into the cache)
      /******/ var module = (__webpack_module_cache__[moduleId] = {
        /******/ // no module.id needed
        /******/ // no module.loaded needed
        /******/ exports: {},
        /******/
      });
      /******/
      /******/ // Execute the module function
      /******/ __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
      /******/
      /******/ // Return the exports of the module
      /******/ return module.exports;
      /******/
    }
    /******/
    /************************************************************************/
    /******/ /* webpack/runtime/define property getters */
    /******/ (() => {
      /******/ // define getter functions for harmony exports
      /******/ __webpack_require__.d = (exports, definition) => {
        /******/ for (var key in definition) {
          /******/ if (
            __webpack_require__.o(definition, key) &&
            !__webpack_require__.o(exports, key)
          ) {
            /******/ Object.defineProperty(exports, key, {
              enumerable: true,
              get: definition[key],
            });
            /******/
          }
          /******/
        }
        /******/
      };
      /******/
    })();
    /******/
    /******/ /* webpack/runtime/hasOwnProperty shorthand */
    /******/ (() => {
      /******/ __webpack_require__.o = (obj, prop) =>
        Object.prototype.hasOwnProperty.call(obj, prop);
      /******/
    })();
    /******/
    /******/ /* webpack/runtime/make namespace object */
    /******/ (() => {
      /******/ // define __esModule on exports
      /******/ __webpack_require__.r = (exports) => {
        /******/ if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
          /******/ Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
          /******/
        }
        /******/ Object.defineProperty(exports, '__esModule', { value: true });
        /******/
      };
      /******/
    })();
    /******/
    /************************************************************************/
    var __webpack_exports__ = {};
    // This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
    (() => {
      /*!**************************!*\
  !*** ./weilasdk_data.ts ***!
  \**************************/
      __webpack_require__.r(__webpack_exports__);
      /* harmony export */ __webpack_require__.d(__webpack_exports__, {
        /* harmony export */ WL_DataPrepareState: () =>
          /* reexport safe */ _main_weila_external_data__WEBPACK_IMPORTED_MODULE_1__.WL_DataPrepareState,
        /* harmony export */ WL_ExtEventID: () =>
          /* reexport safe */ _main_weila_external_data__WEBPACK_IMPORTED_MODULE_1__.WL_ExtEventID,
        /* harmony export */ WL_IDbFriendStatus: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbFriendStatus,
        /* harmony export */ WL_IDbGroupAuthType: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbGroupAuthType,
        /* harmony export */ WL_IDbGroupPublicType: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbGroupPublicType,
        /* harmony export */ WL_IDbGroupType: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbGroupType,
        /* harmony export */ WL_IDbMemberStatus: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbMemberStatus,
        /* harmony export */ WL_IDbMemberType: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbMemberType,
        /* harmony export */ WL_IDbMsgDataStatus: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbMsgDataStatus,
        /* harmony export */ WL_IDbMsgDataType: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbMsgDataType,
        /* harmony export */ WL_IDbNotificationType: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbNotificationType,
        /* harmony export */ WL_IDbSessionStatus: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbSessionStatus,
        /* harmony export */ WL_IDbSessionType: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbSessionType,
        /* harmony export */ WL_IDbSettingID: () =>
          /* reexport safe */ _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__.WL_IDbSettingID,
        /* harmony export */ WL_PttAudioPlayState: () =>
          /* reexport safe */ _main_weila_external_data__WEBPACK_IMPORTED_MODULE_1__.WL_PttAudioPlayState,
        /* harmony export */ WL_PttRecordState: () =>
          /* reexport safe */ _main_weila_external_data__WEBPACK_IMPORTED_MODULE_1__.WL_PttRecordState,
        /* harmony export */
      });
      /* harmony import */ var _database_weila_db_data__WEBPACK_IMPORTED_MODULE_0__ =
        __webpack_require__(/*! ./database/weila_db_data */ './database/weila_db_data.ts');
      /* harmony import */ var _main_weila_external_data__WEBPACK_IMPORTED_MODULE_1__ =
        __webpack_require__(/*! ./main/weila_external_data */ './main/weila_external_data.ts');
    })();

    /******/ return __webpack_exports__;
    /******/
  })();
});
//# sourceMappingURL=weilasdk_data.js.map
