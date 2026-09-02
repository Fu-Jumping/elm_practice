import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.backgroundLayerBlurr}>
      <div className={styles.mainContentSimulated}>
        <div className={styles.container2}>
          <p className={styles.text}>分类管理</p>
          <div className={styles.button}>
            <img src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-mq0xkot.svg" className={styles.container} />
            <p className={styles.text2}>新建分类</p>
          </div>
        </div>
        <div className={styles.table}>
          <div className={styles.headerRow}>
            <p className={styles.text3}>分类名称</p>
            <p className={styles.text4}>商品数量</p>
            <p className={styles.text5}>排序</p>
            <p className={styles.text6}>操作</p>
          </div>
          <div className={styles.body}>
            <div className={styles.row}>
              <p className={styles.text7}>热销爆款</p>
              <p className={styles.text8}>6</p>
              <p className={styles.text9}>1</p>
              <div className={styles.data}>
                <p className={styles.text10}>编辑</p>
                <p className={styles.text11}>删除</p>
              </div>
            </div>
            <div className={styles.row2}>
              <p className={styles.text12}>主食套餐</p>
              <p className={styles.text13}>12</p>
              <p className={styles.text14}>2</p>
              <div className={styles.data}>
                <p className={styles.text10}>编辑</p>
                <p className={styles.text11}>删除</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <p className={styles.text}>校园外卖商家后台</p>
        <div className={styles.container5}>
          <div className={styles.overlay}>
            <p className={styles.text15}>营业中</p>
          </div>
          <div className={styles.container4}>
            <p className={styles.text16}>账号名</p>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-kes6wvr.svg"
              className={styles.container3}
            />
          </div>
        </div>
      </div>
      <div className={styles.sideNavBar}>
        <div className={styles.container7}>
          <div className={styles.background}>
            <p className={styles.text17}>M</p>
          </div>
          <div className={styles.container6}>
            <p className={styles.text18}>
              校园外卖商
              <br />
              家后台
            </p>
            <p className={styles.text19}>店铺管理端</p>
          </div>
        </div>
        <div className={styles.container10}>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-qt3x405.svg"
              className={styles.container8}
            />
            <p className={styles.text16}>订单</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-x4tw1dt.svg"
              className={styles.container8}
            />
            <p className={styles.text16}>商品</p>
          </div>
          <div className={styles.linkActive}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-5zir9qz.svg"
              className={styles.container9}
            />
            <p className={styles.text10}>分类</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-3gt09ca.svg"
              className={styles.container8}
            />
            <p className={styles.text16}>店铺设置</p>
          </div>
        </div>
        <div className={styles.horizontalBorder}>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-at2o5rg.svg"
              className={styles.container11}
            />
            <p className={styles.text20}>概览 (二期)</p>
          </div>
          <div className={styles.link3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-wnrqepu.svg"
              className={styles.container12}
            />
            <p className={styles.text20}>消息 (二期)</p>
          </div>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-ysp8360.svg"
              className={styles.container11}
            />
            <p className={styles.text20}>统计 (二期)</p>
          </div>
        </div>
      </div>
      <div className={styles.overlayDangerConfirm}>
        <div className={styles.dialogCard}>
          <div className={styles.dialogCardShadow}>
            <div className={styles.header}>
              <img src="../../../shared-assets/商家端-桌面后台/03-分类/05-删除分类确认-需先处理商品/mtib2qnn-uirzj7p.svg" className={styles.margin} />
              <p className={styles.text}>删除分类</p>
            </div>
            <div className={styles.container13}>
              <p className={styles.text21}>
                分类「热销爆款」下还有 6 个商品，删除前请先
                <br />
                处理这些商品的归属。
              </p>
            </div>
            <div className={styles.footerActions}>
              <div className={styles.cancelButton}>
                <p className={styles.text22}>取 消</p>
              </div>
              <div className={styles.confirmButtonDisable}>
                <p className={styles.text23}>确 认</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
