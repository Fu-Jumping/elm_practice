import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentCanvas}>
        <div className={styles.pageHeaderToolbar}>
          <div className={styles.container}>
            <p className={styles.text}>分类管理</p>
            <p className={styles.text2}>
              分类决定顾客端商品菜单顺序，拖拽可快速调整。
            </p>
          </div>
          <div className={styles.button}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-40hv208.svg"
              className={styles.container2}
            />
            <p className={styles.text3}>新增分类</p>
          </div>
        </div>
        <div className={styles.table}>
          <div className={styles.headerRow}>
            <p className={styles.text4}>分类名称</p>
            <p className={styles.text5}>排序</p>
            <p className={styles.text6}>商品数</p>
            <p className={styles.text7}>操作</p>
          </div>
          <div className={styles.body}>
            <div className={styles.row1}>
              <div className={styles.data}>
                <p className={styles.text8}>热销爆款</p>
                <div className={styles.overlay}>
                  <p className={styles.text9}>必选</p>
                </div>
              </div>
              <p className={styles.text10}>1</p>
              <p className={styles.text11}>6</p>
              <div className={styles.data2}>
                <p className={styles.text12}>编辑</p>
                <p className={styles.text13}>删除</p>
              </div>
            </div>
            <div className={styles.row2}>
              <p className={styles.text14}>单人套餐</p>
              <p className={styles.text15}>2</p>
              <p className={styles.text16}>4</p>
              <div className={styles.data3}>
                <p className={styles.text12}>编辑</p>
                <p className={styles.text13}>删除</p>
              </div>
            </div>
            <div className={styles.row2}>
              <p className={styles.text14}>饮品</p>
              <p className={styles.text15}>3</p>
              <p className={styles.text16}>8</p>
              <div className={styles.data3}>
                <p className={styles.text12}>编辑</p>
                <p className={styles.text13}>删除</p>
              </div>
            </div>
            <div className={styles.row2}>
              <p className={styles.text14}>甜点</p>
              <p className={styles.text15}>4</p>
              <p className={styles.text16}>2</p>
              <div className={styles.data3}>
                <p className={styles.text12}>编辑</p>
                <p className={styles.text13}>删除</p>
              </div>
            </div>
            <div className={styles.row5}>
              <p className={styles.text14}>小食</p>
              <p className={styles.text17}>5</p>
              <p className={styles.text18}>5</p>
              <div className={styles.data4}>
                <p className={styles.text12}>编辑</p>
                <p className={styles.text13}>删除</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.spacerForLayout}>
        <div className={styles.container3}>
          <div className={styles.background} />
          <p className={styles.text19}>营业中</p>
        </div>
        <p className={styles.text20}>账号名</p>
        <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-ixyfwba.svg" className={styles.button2} />
      </div>
      <div className={styles.sideNavBar}>
        <div className={styles.container4}>
          <p className={styles.text21}>
            校园外卖商家后
            <br />台
          </p>
          <p className={styles.text2}>店铺管理端</p>
        </div>
        <div className={styles.list}>
          <div className={styles.itemLink}>
            <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-sfdaqix.svg" className={styles.margin} />
            <p className={styles.text22}>订单</p>
          </div>
          <div className={styles.itemLink}>
            <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-x0spm3a.svg" className={styles.margin} />
            <p className={styles.text22}>商品</p>
          </div>
          <div className={styles.itemLink2}>
            <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-8hkiuhs.svg" className={styles.margin2} />
            <p className={styles.text23}>分类</p>
          </div>
          <div className={styles.itemLink}>
            <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-bdwxbco.svg" className={styles.margin} />
            <p className={styles.text22}>店铺设置</p>
          </div>
        </div>
        <div className={styles.horizontalBorder}>
          <div className={styles.list2}>
            <div className={styles.itemLink3}>
              <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-el3j9j2.svg" className={styles.margin3} />
              <p className={styles.text24}>概览 (二期)</p>
            </div>
            <div className={styles.itemLink4}>
              <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-7yy6sgi.svg" className={styles.margin4} />
              <p className={styles.text24}>消息 (二期)</p>
            </div>
            <div className={styles.itemLink3}>
              <img src="../../../shared-assets/商家端-桌面后台/03-分类/01-分类管理/mtib1qka-ha0zrfv.svg" className={styles.margin3} />
              <p className={styles.text24}>统计 (二期)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
