App({
  globalData: {
    // ============================================================
    // 订阅消息模板ID（后台推送用）
    // 上架前到微信公众平台 → 功能 → 订阅消息 申请模板，把模板ID填到这里
    // 例如："xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    // 未填写时，前台到目标仍会自动弹窗提醒，只是无法后台推送。
    // ============================================================
    SUBSCRIBE_TEMPLATE_ID: '',

    // 云开发环境ID（如需云函数后台推送时填写，并在下方解除注释）
    CLOUD_ENV: ''
  },

  onLaunch() {
    // 如需云开发后台推送，先在小程序后台开通「云开发」，
    // 然后取消下面注释并填写环境ID：
    // if (wx.cloud) {
    //   wx.cloud.init({ env: this.globalData.CLOUD_ENV || undefined, traceUser: true });
    // }
  }
});
