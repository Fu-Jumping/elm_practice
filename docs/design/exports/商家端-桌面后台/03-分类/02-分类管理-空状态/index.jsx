import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContent}>
        <div className={styles.emptyStateContainer}>
          <div className={styles.container}>
            <img src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-184n5fq.svg" className={styles.sVg} />
          </div>
          <p className={styles.text}>暂无分类</p>
          <div className={styles.container2}>
            <p className={styles.text2}>
              您还没有创建任何商品分类。创建分类可以帮助顾客更快速地找到他们想
              <br />
              要的商品。
            </p>
          </div>
          <div className={styles.button}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-8a14ydm.svg"
              className={styles.container3}
            />
            <p className={styles.text3}>新增分类</p>
          </div>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <p className={styles.text4}>校园外卖商家后台</p>
        <div className={styles.container6}>
          <div className={styles.container4}>
            <div className={styles.background} />
            <p className={styles.text5}>营业中</p>
          </div>
          <div className={styles.verticalDivider} />
          <p className={styles.text5}>账号名</p>
          <div className={styles.button2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-s9vod5m.svg"
              className={styles.container5}
            />
          </div>
        </div>
      </div>
      <div className={styles.asideSideNavBar}>
        <div className={styles.container7}>
          <p className={styles.text6}>
            校园外卖商家后
            <br />台
          </p>
          <p className={styles.text7}>店铺管理端</p>
        </div>
        <div className={styles.nav}>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-7f4yhb2.svg"
              className={styles.container8}
            />
            <p className={styles.text8}>订单</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-kid0hf4.svg"
              className={styles.container8}
            />
            <p className={styles.text8}>商品</p>
          </div>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-qs3zoxb.svg"
              className={styles.container9}
            />
            <p className={styles.text9}>分类</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-s8uf76k.svg"
              className={styles.container8}
            />
            <p className={styles.text8}>店铺设置</p>
          </div>
        </div>
        <div className={styles.horizontalBorder}>
          <div className={styles.link3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-bbx3gum.svg"
              className={styles.container10}
            />
            <p className={styles.text10}>概览 (二期)</p>
          </div>
          <div className={styles.link4}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-dnabpve.svg"
              className={styles.container11}
            />
            <p className={styles.text10}>消息 (二期)</p>
          </div>
          <div className={styles.link3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/02-分类管理-空状态/mtib27tj-x18osl2.svg"
              className={styles.container10}
            />
            <p className={styles.text10}>统计 (二期)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
