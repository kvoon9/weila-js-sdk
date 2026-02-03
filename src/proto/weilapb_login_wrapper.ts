import {WLBuildMsgRet} from "./weilapb_wrapper_data";
import {WL} from "./weilapb";
import {BuildWeilaMsg} from "./weilapb_wrapper";
import {MD5} from "crypto-js";
import Long from "long";

class WeilaPBLoginWrapper {
    public static buildLoginAppReq(
        account: string, password: string, countryCode: string,
        appId: string, appKey: string): WLBuildMsgRet {

        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqLoginApp = new WL.Login.ReqLoginApp();
        loginMsg.reqLoginApp.account = account;
        loginMsg.reqLoginApp.password = MD5(password).toString();
        loginMsg.reqLoginApp.countryCode = countryCode;

        const signature = {} as any;
        signature.et = '' + (Math.floor(Date.now() / 1000) + 20);
        signature.app_id = appId;
        signature.sign = MD5(signature.et + appKey).toString();
        loginMsg.reqLoginApp.signature = JSON.stringify(signature);
        loginMsg.reqLoginApp.pduVersion = 4;
        loginMsg.reqLoginApp.clientType = WL.Common.ClientType.CLIENT_WINDOWS;

        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN,
            WL.Login.LoginCommandId.LOGIN_COMMAND_LOGIN_APP,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg);
    }

    public static buildLogoutReq(): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqLogout = new WL.Login.ReqLogout();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_LOGOUT,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg);
    }

    public static buildHeartbeatReq(): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqHeartbeat = new WL.Login.ReqHeartbeat();
        loginMsg.reqHeartbeat.serverTime = Long.fromNumber(Date.now(), true);
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_HEARTBEAT,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg);
    }

    public static buildBindExtensionReq(verifyCode: string): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqBindExtension = new WL.Login.ReqBindExtension();
        loginMsg.reqBindExtension.verificationCode = verifyCode;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_BIND_EXTENSION,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg);
    }

    public static buildUnbindExtensionReq(subUserId: number): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqUnbindExtension = new WL.Login.ReqUnbindExtension();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_UNBIND_EXTENSION,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg, subUserId);
    }

    public static buildGetExtensionInfoReq(subUserId: number): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqGetExtensionInfo = new WL.Login.ReqGetExtensionInfo();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONINFO,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg, subUserId);
    }

    public static buildGetExtensionListReq(): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqGetExtensionList = new WL.Login.ReqGetExtensionList();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONLIST,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg);
    }

    public static buildSetExtensionConfig(subUserId: number, configKey: string, configValue: string): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqSetExtensionConfig = new WL.Login.ReqSetExtensionConfig();
        loginMsg.reqSetExtensionConfig.name = configKey;
        loginMsg.reqSetExtensionConfig.content = configValue;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_SET_EXTENSION_CONFIG,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg, subUserId);
    }

    public static buildShutdownExtensionReq(subUserId: number): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqShutdownExtension = new WL.Login.ReqShutdownExtension();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_SHUTDOWN_EXTENSION,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg, subUserId);
    }

    public static buildLockExtensionReq(subUserId: number): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqLockExtension = new WL.Login.ReqLockExtension();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_LOCK_EXTENSION,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg, subUserId);
    }

    public static buildUnlockExtensionReq(subUserId: number): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqUnlockExtension = new WL.Login.ReqUnlockExtension();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_UNLOCK_EXTENSION,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg, subUserId);
    }

    public static buildGetTokenReq(token: string): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqToken = new WL.Login.ReqToken();
        loginMsg.reqToken.token = token;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_TOKEN,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg);
    }

    public static buildRefreshTokenReq(): WLBuildMsgRet {
        const loginMsg = new WL.Login.LoginMessage();
        loginMsg.reqRefreshAccessToken = new WL.Login.ReqRefreshAccessToken();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOGIN, WL.Login.LoginCommandId.LOGIN_COMMAND_REFRESH_ACCESS_TOKEN,
            WL.Service.CommandType.COMMAND_REQUEST, loginMsg);
    }
}

export {WeilaPBLoginWrapper}
