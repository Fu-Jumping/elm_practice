import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.headerTopAppBar}>
        <div className={styles.button}>
          <img src="../../../shared-assets/用户端/10-个人中心/06-新增收货地址/mppd7x49-amb22xe.svg" className={styles.container} />
        </div>
        <p className={styles.text}>新增收货地址</p>
      </div>
      <div className={styles.fixedActionButtonAtB}>
        <div className={styles.button2}>
          <p className={styles.text2}>保存</p>
        </div>
      </div>
      <div className={styles.mainContentCanvas}>
        <div className={styles.form}>
          <div className={styles.contactPersonRow}>
            <p className={styles.text3}>收货人</p>
            <div className={styles.container2}>
              <p className={styles.text4}>请填写收货人姓名</p>
            </div>
          </div>
          <div className={styles.container3}>
            <div className={styles.label}>
              <div className={styles.margin}>
                <div className={styles.border} />
              </div>
              <p className={styles.text5}>先生</p>
            </div>
            <div className={styles.label2}>
              <div className={styles.margin2}>
                <div className={styles.border2} />
              </div>
              <p className={styles.text5}>女士</p>
            </div>
          </div>
          <div className={styles.phoneNumberRow}>
            <p className={styles.text3}>手机号</p>
            <div className={styles.container4}>
              <div className={styles.paragraph}>
                <p className={styles.text6}>+86&nbsp;</p>
                <img src="../../../shared-assets/用户端/10-个人中心/06-新增收货地址/mppd7x49-xl9pupg.svg" className={styles.icon} />
              </div>
              <div className={styles.container2}>
                <p className={styles.text4}>请填写收货人手机号</p>
              </div>
            </div>
          </div>
          <div className={styles.areaRow}>
            <p className={styles.text3}>所在地区</p>
            <div className={styles.container6}>
              <p className={styles.text7}>小区/写字楼/学校等</p>
              <img
                src="../../../shared-assets/用户端/10-个人中心/06-新增收货地址/mppd7x49-5u4eued.svg"
                className={styles.container5}
              />
            </div>
          </div>
          <div className={styles.detailedAddressRow}>
            <p className={styles.text8}>详细地址</p>
            <p className={styles.text9}>街道门牌、楼层房间号等信息</p>
          </div>
          <div className={styles.tagSelectionRow}>
            <p className={styles.text3}>标签</p>
            <div className={styles.container7}>
              <img src="../../../shared-assets/用户端/10-个人中心/06-新增收货地址/mppd7x49-6ywjr9p.svg" className={styles.button3} />
              <div className={styles.button4}>
                <p className={styles.text5}>公司</p>
              </div>
              <div className={styles.button4}>
                <p className={styles.text5}>学校</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.setDefaultSwitch}>
          <p className={styles.text5}>设为默认地址</p>
          <div className={styles.label3}>
            <div className={styles.background} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
