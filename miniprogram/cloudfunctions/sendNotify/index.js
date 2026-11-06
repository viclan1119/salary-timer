/**
 * 云函数：发送订阅消息推送
 *
 * 用途：当用户到达「今日目标」时，从服务端调用微信订阅消息接口推送提醒。
 * 说明：小程序客户端无法在后台自行发送推送，必须由服务端（云函数）调用
 *       subscribeMessage.send 完成。
 *
 * 部署步骤：
 * 1. 在微信公众平台开通「云开发」，记下环境ID，填入 app.js 的 CLOUD_ENV。
 * 2. 在开发者工具中，右键本目录（cloudfunctions/sendNotify）→「上传并部署：云端安装依赖」。
 * 3. 客户端在达到目标时调用 wx.cloud.callFunction({ name: 'sendNotify', data: {...} })。
 *
 * 注意：订阅消息是「一次性」的，用户每授权一次只能推送一条；
 *       因此每次授权后仅能推送一次，需让用户多次授权或引导再次订阅。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { templateId, page, data } = event;

  if (!templateId) {
    return { code: -1, msg: '缺少 templateId' };
  }

  try {
    const res = await cloud.openapi.subscribeMessage.send({
      touser: OPENID,
      templateId,
      page: page || 'pages/index/index',
      data: data || {}
    });
    return { code: 0, res };
  } catch (e) {
    return { code: -1, msg: e.message };
  }
};
