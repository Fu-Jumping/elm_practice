import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.container5}>
      <div className={styles.card1ProductList}>
        <div className={styles.margin}>
          <div className={styles.background}>
            <img src="../../../shared-assets/商家端-桌面后台/90-组件与状态/02-空状态组件聚合/mtib25at-xbpf2lz.svg" className={styles.container} />
          </div>
        </div>
        <p className={styles.text}>暂无商品</p>
        <div className={styles.button}>
          <p className={styles.text2}>新增商品</p>
        </div>
      </div>
      <div className={styles.card2CategoryManagem}>
        <div className={styles.margin2}>
          <div className={styles.background2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/90-组件与状态/02-空状态组件聚合/mtib25at-qdjn16x.svg"
              className={styles.container2}
            />
          </div>
        </div>
        <p className={styles.text}>暂无分类</p>
        <div className={styles.button}>
          <p className={styles.text2}>新增分类</p>
        </div>
      </div>
      <div className={styles.card3OrderManagement}>
        <div className={styles.margin3}>
          <div className={styles.background3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/90-组件与状态/02-空状态组件聚合/mtib25at-ebris0y.svg"
              className={styles.container3}
            />
          </div>
        </div>
        <p className={styles.text3}>暂无待接单订单</p>
        <div className={styles.button2}>
          <img src="../../../shared-assets/商家端-桌面后台/90-组件与状态/02-空状态组件聚合/mtib25at-0pcc47r.svg" className={styles.container4} />
          <p className={styles.text2}>刷新</p>
        </div>
      </div>
    </div>
  );
}

export default Component;
