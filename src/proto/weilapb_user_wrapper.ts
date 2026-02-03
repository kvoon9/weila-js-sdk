import {WLBuildMsgRet, WLChangeUserInfoData} from "./weilapb_wrapper_data";
import {WL} from "./weilapb";
import {BuildWeilaMsg} from "./weilapb_wrapper";

class WeilaPbUserWrapper {
    public static buildGetUserInfoReq(key: string): WLBuildMsgRet {
        const userMessage = new WL.User.UserMessage();
        userMessage.reqGetUserInfo = new WL.User.ReqGetUserInfo();
        userMessage.reqGetUserInfo.key = key;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_USER, WL.User.UserCommandId.USER_COMMAND_GET_USERINFO,
            WL.Service.CommandType.COMMAND_REQUEST, userMessage);
    }

    public static buildChangeUserInfoReq(changeUserInfo: WLChangeUserInfoData): WLBuildMsgRet {
        const userMessage = new WL.User.UserMessage();
        userMessage.reqChangeUserInfo = new WL.User.ReqChangeUserInfo();
        userMessage.reqChangeUserInfo.avatar = changeUserInfo.avatar;
        userMessage.reqChangeUserInfo.nick = changeUserInfo.nick;
        userMessage.reqChangeUserInfo.sex = changeUserInfo.sex;
        userMessage.reqChangeUserInfo.signature = changeUserInfo.signature;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_USER, WL.User.UserCommandId.USER_COMMAND_CHANGE_USERINFO,
            WL.Service.CommandType.COMMAND_REQUEST, userMessage);
    }

    public static buildGetConfigReq(): WLBuildMsgRet {
        const userMessage = new WL.User.UserMessage();
        userMessage.reqGetConfig = new WL.User.ReqGetConfig();
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_USER, WL.User.UserCommandId.USER_COMMAND_GET_CONFIG,
            WL.Service.CommandType.COMMAND_REQUEST, userMessage);
    }

    public static buildSetConfigReq(userId: number, key: string, value: string, subUserId: number): WLBuildMsgRet {
        const userMessage = new WL.User.UserMessage();
        userMessage.reqSetConfig = new WL.User.ReqSetConfig();
        userMessage.reqSetConfig.name = key;
        userMessage.reqSetConfig.userId = userId;
        userMessage.reqSetConfig.content = value;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_USER, WL.User.UserCommandId.USER_COMMAND_SET_CONFIG,
            WL.Service.CommandType.COMMAND_REQUEST, userMessage, subUserId);
    }
}

export {WeilaPbUserWrapper}
