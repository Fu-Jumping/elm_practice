import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame2}>
      <div className={styles.mainContentCanvas}>
        <div className={styles.pageHeader}>
          <p className={styles.text}>商品编辑</p>
          <p className={styles.text2}>编辑商品的基础信息与售卖状态</p>
        </div>
        <div className={styles.formCard}>
          <div className={styles.formFormLayoutCssGri}>
            <div className={styles.autoWrapper}>
              <div className={styles.frame}>
                <p className={styles.text3}>*</p>
                <p className={styles.text4}>商品名称</p>
              </div>
              <div className={styles.container2}>
                <div className={styles.container}>
                  <p className={styles.text5}>请输入商品名称</p>
                </div>
                <p className={styles.text6}>请输入商品名称</p>
              </div>
            </div>
            <div className={styles.autoWrapper2}>
              <p className={styles.text7}>所属分类</p>
              <div className={styles.container3}>
                <div className={styles.imageClip}>
                  <img
                    src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-gpu8p0a.svg"
                    className={styles.image}
                  />
                  <p className={styles.text8}>热销爆款</p>
                </div>
              </div>
            </div>
            <div className={styles.autoWrapper3}>
              <p className={styles.text7}>商品说明</p>
              <div className={styles.container5}>
                <div className={styles.container4}>
                  <p className={styles.text9}>经典香辣口味，搭配生菜与沙拉酱</p>
                </div>
              </div>
            </div>
            <div className={styles.autoWrapper4}>
              <p className={styles.text7}>价格（元）</p>
              <div className={styles.container7}>
                <div className={styles.container6}>
                  <p className={styles.a1350}>13.50</p>
                </div>
                <p className={styles.text10}>≥ 0，精确到分</p>
              </div>
            </div>
            <div className={styles.autoWrapper5}>
              <p className={styles.text7}>库存</p>
              <div className={styles.container10}>
                <div className={styles.container9}>
                  <img
                    src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-d1q5p34.svg"
                    className={styles.container8}
                  />
                </div>
                <p className={styles.text10}>非负整数；库存为 0 时顾客端显示售罄</p>
              </div>
            </div>
            <div className={styles.autoWrapper6}>
              <p className={styles.text11}>上架状态</p>
              <div className={styles.container11}>
                <div className={styles.background}>
                  <div className={styles.backgroundBorder} />
                </div>
                <p className={styles.text12}>关闭后顾客不可见该商品</p>
              </div>
            </div>
          </div>
          <div className={styles.cardFooterActions}>
            <div className={styles.button}>
              <p className={styles.text4}>取 消</p>
            </div>
            <div className={styles.button2}>
              <p className={styles.text13}>保 存</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <div className={styles.breadcrumbs}>
          <p className={styles.text14}>商品列表</p>
          <img src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-lu2xnzt.svg" className={styles.container12} />
          <p className={styles.text4}>商品编辑</p>
        </div>
        <div className={styles.trailingActions}>
          <div className={styles.container13}>
            <div className={styles.background2} />
            <p className={styles.text15}>营业中</p>
          </div>
          <div className={styles.margin}>
            <div className={styles.verticalDivider} />
          </div>
          <p className={styles.text4}>账号名</p>
          <div className={styles.button3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-n6s84gw.svg"
              className={styles.container14}
            />
          </div>
        </div>
      </div>
      <div className={styles.sideNavBar}>
        <div className={styles.brand}>
          <div className={styles.background3}>
            <p className={styles.text16}>ML</p>
          </div>
          <div className={styles.container15}>
            <p className={styles.text17}>
              校园外卖商家
              <br />
              后台
            </p>
            <p className={styles.text10}>店铺管理端</p>
          </div>
        </div>
        <div className={styles.listMainNavigation}>
          <div className={styles.itemLink}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-0r8265w.svg"
              className={styles.container16}
            />
            <p className={styles.text14}>订单</p>
          </div>
          <div className={styles.itemActiveLink}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-om1a962.svg"
              className={styles.container16}
            />
            <p className={styles.text18}>商品</p>
          </div>
          <div className={styles.itemLink2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-ao3k5p3.svg"
              className={styles.container17}
            />
            <p className={styles.text14}>分类</p>
          </div>
          <div className={styles.itemLink}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-bj7wx9r.svg"
              className={styles.container16}
            />
            <p className={styles.text14}>店铺设置</p>
          </div>
        </div>
        <div className={styles.list}>
          <div className={styles.itemLink3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-fpmmzpw.svg"
              className={styles.container18}
            />
            <p className={styles.text19}>概览 (二期)</p>
          </div>
          <div className={styles.itemLink4}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-m12zecl.svg"
              className={styles.container19}
            />
            <p className={styles.text19}>消息 (二期)</p>
          </div>
          <div className={styles.itemLink3}>
            <img
              src="../../../shared-assets/商家端-桌面后台/02-商品/05-商品编辑/mtib1oqb-sakx99j.svg"
              className={styles.container18}
            />
            <p className={styles.text19}>统计 (二期)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
