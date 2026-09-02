import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mockBackgroundForCon}>
        <div className={styles.asideSideNavMock}>
          <div className={styles.container}>
            <p className={styles.text}>
              校园外卖商家后
              <br />台
            </p>
            <p className={styles.text2}>店铺管理端</p>
          </div>
          <div className={styles.nav}>
            <div className={styles.container3}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/06-删除分类确认-不可恢复/mtib2vfg-s7j2zoc.svg"
                className={styles.container2}
              />
              <p className={styles.text3}>订单</p>
            </div>
            <div className={styles.container3}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/06-删除分类确认-不可恢复/mtib2vfg-2h1vzso.svg"
                className={styles.container2}
              />
              <p className={styles.text3}>商品</p>
            </div>
            <div className={styles.backgroundVerticalBo}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/06-删除分类确认-不可恢复/mtib2vfg-wiky3h5.svg"
                className={styles.container4}
              />
              <p className={styles.text4}>分类</p>
            </div>
          </div>
        </div>
        <div className={styles.mainContentAreaMock}>
          <div className={styles.table}>
            <div className={styles.headerRow}>
              <p className={styles.text5}>分类名称</p>
              <p className={styles.text5}>商品数量</p>
              <p className={styles.text6}>操作</p>
            </div>
            <div className={styles.bodyRow}>
              <p className={styles.text7}>小食</p>
              <p className={styles.text7}>0</p>
              <p className={styles.text8}>删除</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.overlayDialog}>
        <div className={styles.dialogContainer}>
          <div className={styles.headerContentArea}>
            <img src="../../../shared-assets/商家端-桌面后台/03-分类/06-删除分类确认-不可恢复/mtib2vfg-19k5zb7.svg" className={styles.margin} />
            <div className={styles.container5}>
              <p className={styles.text9}>删除分类</p>
              <p className={styles.text10}>
                确认删除分类「小食」吗？删除后不可恢复。
              </p>
            </div>
          </div>
          <div className={styles.footerActions}>
            <div className={styles.button}>
              <p className={styles.text11}>取 消</p>
            </div>
            <div className={styles.button2}>
              <p className={styles.text12}>确 认删除</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
