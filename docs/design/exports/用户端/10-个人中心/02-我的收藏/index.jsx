import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame4}>
      <div className={styles.mainContentFavorites}>
        <div className={styles.articleMerchantCard1}>
          <img src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pc0-vlf2q6p.png" className={styles.frame} />
          <div className={styles.container5}>
            <div className={styles.container2}>
              <p className={styles.text}>肯德基 (软件园店)</p>
              <div className={styles.container}>
                <p className={styles.text2}>4.8</p>
                <p className={styles.text3}>月售 8000+</p>
              </div>
            </div>
            <div className={styles.container4}>
              <div className={styles.container3}>
                <div className={styles.overlayBorder}>
                  <p className={styles.text4}>30减5</p>
                </div>
                <div className={styles.border}>
                  <p className={styles.text5}>满赠</p>
                </div>
              </div>
              <p className={styles.text3}>30分钟 | 1.2km</p>
            </div>
          </div>
        </div>
        <div className={styles.articleMerchantCard2}>
          <img src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pc0-7hhaysj.png" className={styles.frame} />
          <div className={styles.container8}>
            <div className={styles.container2}>
              <p className={styles.text}>麦当劳 (高新达广场店)</p>
              <div className={styles.container}>
                <p className={styles.text2}>4.7</p>
                <p className={styles.text3}>月售 9000+</p>
              </div>
            </div>
            <div className={styles.container7}>
              <div className={styles.container6}>
                <div className={styles.overlayBorder2}>
                  <p className={styles.text6}>新客减10</p>
                </div>
                <div className={styles.border}>
                  <p className={styles.text5}>免配送费</p>
                </div>
              </div>
              <p className={styles.text7}>25分钟 | 800m</p>
            </div>
          </div>
        </div>
        <div className={styles.articleMerchantCard3}>
          <img src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pc0-e0o56h9.png" className={styles.frame} />
          <div className={styles.container10}>
            <div className={styles.container2}>
              <p className={styles.text}>老王小店 (正宗盖浇饭)</p>
              <div className={styles.container}>
                <p className={styles.text2}>4.9</p>
                <p className={styles.text3}>月售 3000+</p>
              </div>
            </div>
            <div className={styles.container9}>
              <div className={styles.overlayBorder3}>
                <p className={styles.text4}>20减2</p>
              </div>
              <p className={styles.text3}>40分钟 | 2.5km</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.headerTopAppBar}>
        <div className={styles.frame3}>
          <div className={styles.frame2}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pby-8ys9tuv.svg"
              className={styles.container11}
            />
          </div>
        </div>
        <p className={styles.text8}>我的收藏</p>
      </div>
      <div className={styles.bottomNavBar}>
        <div className={styles.linkHomeInactive}>
          <img src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pby-019na99.svg" className={styles.margin} />
          <p className={styles.text9}>首页</p>
        </div>
        <div className={styles.linkMessagesInactive}>
          <img src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pby-9go9nri.svg" className={styles.margin2} />
          <p className={styles.text9}>消息</p>
        </div>
        <div className={styles.linkOrdersInactive}>
          <img src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pby-jt9bjnj.svg" className={styles.margin3} />
          <p className={styles.text9}>订单</p>
        </div>
        <div className={styles.linkProfileActiveFav}>
          <img src="../../../shared-assets/用户端/10-个人中心/02-我的收藏/mppd7pby-e6iwwlx.svg" className={styles.margin4} />
          <p className={styles.text6}>我的</p>
        </div>
      </div>
    </div>
  );
}

export default Component;
