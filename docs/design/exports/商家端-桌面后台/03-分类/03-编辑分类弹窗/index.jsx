import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.mainContentArea}>
        <div className={styles.headerTopNavBar}>
          <p className={styles.text}>校园外卖商家后台</p>
          <div className={styles.container2}>
            <div className={styles.background}>
              <p className={styles.text2}>营业中</p>
            </div>
            <p className={styles.text3}>账号名</p>
            <div className={styles.button}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-qre5xgj.svg"
                className={styles.container}
              />
            </div>
          </div>
        </div>
        <div className={styles.pageCanvas}>
          <div className={styles.backgroundBorder}>
            <div className={styles.dummyContentForBackg}>
              <p className={styles.text}>分类管理</p>
              <div className={styles.button2}>
                <p className={styles.text4}>添加分类</p>
              </div>
            </div>
            <div className={styles.table}>
              <div className={styles.row}>
                <div className={styles.cell}>
                  <p className={styles.text5}>分类名称</p>
                </div>
                <div className={styles.cell2}>
                  <p className={styles.text5}>排序</p>
                </div>
                <div className={styles.cell3}>
                  <p className={styles.text5}>操作</p>
                </div>
              </div>
              <div className={styles.body}>
                <div className={styles.row2}>
                  <div className={styles.data}>
                    <p className={styles.text6}>热销爆款</p>
                  </div>
                  <div className={styles.data2}>
                    <p className={styles.text7}>1</p>
                  </div>
                  <div className={styles.data3}>
                    <p className={styles.text8}>编辑</p>
                    <p className={styles.text9}>删除</p>
                  </div>
                </div>
                <div className={styles.row3}>
                  <div className={styles.data}>
                    <p className={styles.text6}>主食套餐</p>
                  </div>
                  <div className={styles.data2}>
                    <p className={styles.text7}>2</p>
                  </div>
                  <div className={styles.data3}>
                    <p className={styles.text8}>编辑</p>
                    <p className={styles.text9}>删除</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.asideSideNavBar}>
        <div className={styles.container3}>
          <img
            src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o7a-syxq2dr.png"
            className={styles.merchantLogo}
          />
          <div className={styles.paragraph}>
            <p className={styles.text10}>
              校园外卖商家后
              <br />台
            </p>
            <p className={styles.text11}>店铺管理端</p>
          </div>
        </div>
        <div className={styles.nav}>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-bxqoh69.svg"
              className={styles.container4}
            />
            <p className={styles.text3}>订单</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-1soy8sk.svg"
              className={styles.container4}
            />
            <p className={styles.text3}>商品</p>
          </div>
          <div className={styles.link2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-d1vrtpu.svg"
              className={styles.container5}
            />
            <p className={styles.text12}>分类</p>
          </div>
          <div className={styles.link}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-7fvl07p.svg"
              className={styles.container4}
            />
            <p className={styles.text3}>店铺设置</p>
          </div>
        </div>
        <div className={styles.container7}>
          <div className={styles.horizontalBorder}>
            <div className={styles.link3}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-rykgytu.svg"
                className={styles.container}
              />
              <p className={styles.text11}>概览 (二期)</p>
            </div>
            <div className={styles.link4}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-zsayl18.svg"
                className={styles.container6}
              />
              <p className={styles.text11}>消息 (二期)</p>
            </div>
            <div className={styles.link3}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-c8buq3q.svg"
                className={styles.container}
              />
              <p className={styles.text11}>统计 (二期)</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <p className={styles.text}>编辑分类</p>
            <div className={styles.button3}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/03-编辑分类弹窗/mtib2o77-nadxfdi.svg"
                className={styles.container8}
              />
            </div>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.field1CategoryName}>
              <div className={styles.label}>
                <p className={styles.text6}>分类名称</p>
                <p className={styles.text9}>*</p>
              </div>
              <div className={styles.container9}>
                <p className={styles.text13}>热销爆款</p>
              </div>
              <p className={styles.text14}>分类名称已存在</p>
            </div>
            <div className={styles.field2SortOrder}>
              <p className={styles.text15}>排序</p>
              <div className={styles.container10}>
                <p className={styles.a1}>1</p>
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <div className={styles.button4}>
              <p className={styles.text16}>取 消</p>
            </div>
            <div className={styles.button5}>
              <p className={styles.text4}>确 定</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
