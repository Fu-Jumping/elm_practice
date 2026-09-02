import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentArea}>
        <div className={styles.pageHeader}>
          <p className={styles.text}>店铺设置</p>
          <p className={styles.text2}>管理店铺基础信息与营业状态</p>
        </div>
        <div className={styles.container9}>
          <div className={styles.sectionCard1}>
            <div className={styles.heading3}>
              <p className={styles.text3}>基本资料</p>
            </div>
            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <div className={styles.label}>
                  <p className={styles.text4}>*</p>
                  <p className={styles.text5}>店铺名称</p>
                </div>
                <div className={styles.container}>
                  <p className={styles.text6}>肯德基宅急送（天津大学店）</p>
                </div>
              </div>
              <div className={styles.inputGroup2}>
                <p className={styles.text7}>联系电话</p>
                <div className={styles.container2}>
                  <p className={styles.a02260412345}>022-60412345</p>
                </div>
              </div>
              <div className={styles.inputGroup3}>
                <p className={styles.text7}>店铺说明</p>
                <div className={styles.container3}>
                  <p className={styles.text8}>主营炸鸡汉堡，校园二餐取餐</p>
                </div>
              </div>
              <div className={styles.actions}>
                <div className={styles.primaryButton}>
                  <p className={styles.text9}>保 存</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.sectionCard2}>
            <div className={styles.horizontalBorder}>
              <p className={styles.text10}>营业状态</p>
              <div className={styles.currentStatusTag}>
                <div className={styles.margin}>
                  <div className={styles.background} />
                </div>
                <p className={styles.text11}>当前营业中</p>
              </div>
            </div>
            <div className={styles.container8}>
              <div className={styles.optionA}>
                <div className={styles.container4}>
                  <div className={styles.margin2}>
                    <div className={styles.background2} />
                  </div>
                  <p className={styles.text12}>营业中&nbsp;</p>
                </div>
                <p className={styles.text13}>顾客可以浏览店铺并下单</p>
                <img
                  src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-bqlublp.svg"
                  className={styles.container5}
                />
              </div>
              <div className={styles.optionB}>
                <div className={styles.container6}>
                  <div className={styles.margin3}>
                    <div className={styles.background3} />
                  </div>
                  <p className={styles.text12}>已关店&nbsp;</p>
                </div>
                <p className={styles.text13}>店铺对顾客隐藏，不可下单</p>
              </div>
              <div className={styles.optionC}>
                <div className={styles.container7}>
                  <div className={styles.margin4}>
                    <div className={styles.background4} />
                  </div>
                  <p className={styles.text12}>临时闭店&nbsp;</p>
                </div>
                <p className={styles.text13}>店铺可见但暂停接单</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <p className={styles.text14}>店铺设置</p>
        <div className={styles.container12}>
          <div className={styles.trailingPrimaryActio}>
            <div className={styles.background} />
            <p className={styles.text15}>营业中</p>
          </div>
          <div className={styles.margin5}>
            <div className={styles.verticalDivider} />
          </div>
          <div className={styles.trailingSecondaryAct}>
            <div className={styles.margin6}>
              <div className={styles.background5}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-e9uu5an.svg"
                  className={styles.container10}
                />
              </div>
            </div>
            <p className={styles.text16}>账号名</p>
          </div>
          <div className={styles.button}>
            <img
              src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-oprszzf.svg"
              className={styles.container11}
            />
          </div>
        </div>
      </div>
      <div className={styles.sideNavBar}>
        <div className={styles.header}>
          <p className={styles.text17}>校园外卖商家后台</p>
          <p className={styles.text18}>店铺管理端</p>
        </div>
        <div className={styles.list}>
          <div className={styles.itemLink}>
            <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-se1r9vq.svg" className={styles.margin7} />
            <p className={styles.text19}>订单</p>
          </div>
          <div className={styles.itemLink}>
            <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-xa2htnw.svg" className={styles.margin7} />
            <p className={styles.text19}>商品</p>
          </div>
          <div className={styles.itemLink2}>
            <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-1h9pqc7.svg" className={styles.margin8} />
            <p className={styles.text19}>分类</p>
          </div>
          <div className={styles.itemLink3}>
            <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-lebm2m2.svg" className={styles.margin7} />
            <p className={styles.text20}>店铺设置</p>
          </div>
        </div>
        <div className={styles.list2}>
          <div className={styles.itemLink4}>
            <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-rg8g5yr.svg" className={styles.margin9} />
            <p className={styles.text21}>概览 (二期)</p>
          </div>
          <div className={styles.itemLink5}>
            <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-pdixweu.svg" className={styles.margin10} />
            <p className={styles.text21}>消息 (二期)</p>
          </div>
          <div className={styles.itemLink4}>
            <img src="../../../shared-assets/商家端-桌面后台/04-店铺设置/01-店铺设置/mtib1mo4-tp0zpku.svg" className={styles.margin9} />
            <p className={styles.text21}>统计 (二期)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
