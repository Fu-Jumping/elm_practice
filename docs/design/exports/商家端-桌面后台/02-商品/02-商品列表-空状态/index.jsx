import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentArea}>
        <p className={styles.text}>商品管理</p>
        <div className={styles.emptyStateContainer}>
          <div className={styles.illustrationPlacehol2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0d-ryezstn.png"
              className={styles.illustrationPlacehol}
            />
          </div>
          <p className={styles.text2}>暂无商品</p>
          <div className={styles.button}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-s4ohyvt.svg" className={styles.container} />
            <p className={styles.text3}>新增商品</p>
          </div>
        </div>
      </div>
      <div className={styles.container5}>
        <div className={styles.container2}>
          <div className={styles.background} />
          <p className={styles.text4}>营业中</p>
        </div>
        <div className={styles.container4}>
          <p className={styles.text5}>账号名</p>
          <div className={styles.button2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-cqa5yrr.svg"
              className={styles.container3}
            />
          </div>
        </div>
      </div>
      <div className={styles.sideNavBar}>
        <div className={styles.header}>
          <div className={styles.margin}>
            <div className={styles.backgroundBorder}>
              <img
                src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0d-8m5iqxh.png"
                className={styles.merchantLogo}
              />
            </div>
          </div>
          <p className={styles.text6}>校园外卖商家后台</p>
          <p className={styles.text7}>店铺管理端</p>
        </div>
        <div className={styles.mainNav}>
          <div className={styles.link}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-hlogdnq.svg" className={styles.margin2} />
            <p className={styles.text8}>订单</p>
          </div>
          <div className={styles.linkMargin}>
            <div className={styles.link2}>
              <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-6smk5in.svg" className={styles.margin2} />
              <p className={styles.text9}>商品</p>
            </div>
          </div>
          <div className={styles.link3}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-5abwxi3.svg" className={styles.margin3} />
            <p className={styles.text8}>分类</p>
          </div>
          <div className={styles.link4}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-16pszs1.svg" className={styles.margin2} />
            <p className={styles.text8}>店铺设置</p>
          </div>
        </div>
        <div className={styles.footerNav}>
          <div className={styles.link5}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-gufd4uw.svg" className={styles.margin4} />
            <p className={styles.text10}>概览 (二期)</p>
          </div>
          <div className={styles.link6}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-o165sz5.svg" className={styles.margin5} />
            <p className={styles.text10}>消息 (二期)</p>
          </div>
          <div className={styles.link5}>
            <img src="../../../shared-assets/商家端-桌面后台/02-商品/02-商品列表-空状态/mtib2a0b-qmzabip.svg" className={styles.margin4} />
            <p className={styles.text10}>统计 (二期)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
