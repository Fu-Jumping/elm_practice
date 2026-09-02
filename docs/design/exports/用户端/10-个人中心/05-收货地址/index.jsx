import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame2}>
      <div className={styles.headerTaskFocusedTop}>
        <div className={styles.frame}>
          <img src="../../../shared-assets/用户端/10-个人中心/05-收货地址/mppd7vj0-717xkhf.svg" className={styles.container} />
        </div>
        <p className={styles.text}>收货地址</p>
      </div>
      <div className={styles.mainContentArea}>
        <div className={styles.footerFixedBottomAct}>
          <div className={styles.button}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/05-收货地址/mppd7vj0-phm1ljf.svg"
              className={styles.container2}
            />
            <p className={styles.text2}>新增地址</p>
          </div>
        </div>
        <div className={styles.addressCardDefault}>
          <div className={styles.leftContent}>
            <div className={styles.container3}>
              <p className={styles.text3}>张同学</p>
              <p className={styles.text4}>138****8888</p>
              <div className={styles.backgroundBorder}>
                <p className={styles.text5}>默认</p>
              </div>
            </div>
            <p className={styles.text6}>天津大学软件园校区 4号楼 201室</p>
          </div>
          <div className={styles.buttonRightAction}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/05-收货地址/mppd7vj0-nt7z1we.svg"
              className={styles.container2}
            />
          </div>
        </div>
        <div className={styles.addressCardSecondary}>
          <div className={styles.leftContent2}>
            <div className={styles.container4}>
              <p className={styles.text3}>张同学</p>
              <p className={styles.text4}>138****8888</p>
            </div>
            <p className={styles.text6}>天津大学北洋园校区 诚园6斋 102室</p>
          </div>
          <div className={styles.buttonRightAction}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/05-收货地址/mppd7vj0-nt7z1we.svg"
              className={styles.container2}
            />
          </div>
        </div>
        <div className={styles.addressCardThird}>
          <div className={styles.leftContent3}>
            <div className={styles.container5}>
              <p className={styles.text3}>王小明</p>
              <p className={styles.text4}>139****1234</p>
              <div className={styles.background}>
                <p className={styles.text7}>公司</p>
              </div>
            </div>
            <p className={styles.text6}>南开区 卫津路94号 科技大厦 15层</p>
          </div>
          <div className={styles.buttonRightAction}>
            <img
              src="../../../shared-assets/用户端/10-个人中心/05-收货地址/mppd7vj0-nt7z1we.svg"
              className={styles.container2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
