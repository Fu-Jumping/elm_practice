import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContent}>
        <div className={styles.settingsListContaine}>
          <div className={styles.buttonListItemProfil}>
            <div className={styles.container2}>
              <img
                src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-xd8n11n.svg"
                className={styles.container}
              />
              <p className={styles.text}>个人资料</p>
            </div>
            <img
              src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-gqotzb8.svg"
              className={styles.container3}
            />
          </div>
          <div className={styles.buttonListItemNotifi}>
            <div className={styles.container5}>
              <img
                src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-md1di1g.svg"
                className={styles.container4}
              />
              <p className={styles.text}>通知设置</p>
            </div>
            <img
              src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-gqotzb8.svg"
              className={styles.container3}
            />
          </div>
          <div className={styles.buttonListItemPrivac}>
            <div className={styles.container7}>
              <img
                src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-bsic6w5.svg"
                className={styles.container6}
              />
              <p className={styles.text}>隐私设置</p>
            </div>
            <img
              src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-gqotzb8.svg"
              className={styles.container3}
            />
          </div>
          <div className={styles.buttonListItemAbout}>
            <div className={styles.container9}>
              <img
                src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-y0vcrt9.svg"
                className={styles.container8}
              />
              <p className={styles.text}>关于饿了么</p>
            </div>
            <div className={styles.container10}>
              <p className={styles.text2}>v11.0.4</p>
              <img
                src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-gqotzb8.svg"
                className={styles.container3}
              />
            </div>
          </div>
        </div>
        <div className={styles.logoutButtonButton}>
          <img src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-fyhoe3b.svg" className={styles.container11} />
          <p className={styles.text3}>退出登录</p>
        </div>
      </div>
      <div className={styles.headerCustomTopAppBa}>
        <div className={styles.buttonGoBack}>
          <img src="../../../shared-assets/用户端/10-个人中心/07-系统设置/mppd81l8-x63qoa5.svg" className={styles.container} />
        </div>
        <p className={styles.text4}>系统设置</p>
      </div>
    </div>
  );
}

export default Component;
