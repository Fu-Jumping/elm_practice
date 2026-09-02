import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.backgroundContentBlu}>
        <div className={styles.mainContentAreaMainP}>
          <div className={styles.backgroundBorder}>
            <div className={styles.container}>
              <p className={styles.text}>分类列表</p>
              <div className={styles.button}>
                <p className={styles.text2}>新增分类</p>
              </div>
            </div>
            <div className={styles.container3}>
              <div className={styles.background}>
                <p className={styles.text3}>分类名称</p>
                <p className={styles.text3}>商品数量</p>
                <p className={styles.text3}>排序</p>
                <p className={styles.text3}>操作</p>
              </div>
              <div className={styles.backgroundHorizontal}>
                <p className={styles.text4}>招牌主食</p>
                <img
                  src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-ejrzcxr.svg"
                  className={styles.container2}
                />
                <p className={styles.text4}>1</p>
                <p className={styles.text5}>删除</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.sideNavBar}>
          <div className={styles.container4}>
            <p className={styles.text6}>
              校园外卖商家后
              <br />台
            </p>
            <p className={styles.text7}>店铺管理端</p>
          </div>
          <div className={styles.container7}>
            <div className={styles.link}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-dliixbd.svg"
                className={styles.container5}
              />
              <p className={styles.text8}>订单</p>
            </div>
            <div className={styles.link}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-7m03ppy.svg"
                className={styles.container5}
              />
              <p className={styles.text8}>商品</p>
            </div>
            <div className={styles.link2}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-woc9tdg.svg"
                className={styles.container6}
              />
              <p className={styles.text9}>分类</p>
            </div>
            <div className={styles.link}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-sojmcco.svg"
                className={styles.container5}
              />
              <p className={styles.text8}>店铺设置</p>
            </div>
          </div>
          <div className={styles.horizontalBorder}>
            <div className={styles.link3}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-damz16b.svg"
                className={styles.container8}
              />
              <p className={styles.text10}>概览 (二期)</p>
            </div>
            <div className={styles.link4}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-8gkp0nb.svg"
                className={styles.container9}
              />
              <p className={styles.text10}>消息 (二期)</p>
            </div>
            <div className={styles.link3}>
              <img
                src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-tocy1tm.svg"
                className={styles.container8}
              />
              <p className={styles.text10}>统计 (二期)</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.headerTopNavBar}>
        <p className={styles.text11}>分类管理</p>
        <div className={styles.container11}>
          <div className={styles.background2}>
            <p className={styles.text12}>营业中</p>
          </div>
          <p className={styles.text8}>账号名</p>
          <div className={styles.button2}>
            <img
              src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-hzpnigt.svg"
              className={styles.container10}
            />
          </div>
        </div>
      </div>
      <div className={styles.modalOverlay}>
        <div className={styles.modalDialog}>
          <div className={styles.modalDialogShadow}>
            <div className={styles.header}>
              <p className={styles.text11}>确认删除分类</p>
              <div className={styles.button3}>
                <img
                  src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-urne1ap.svg"
                  className={styles.container8}
                />
              </div>
            </div>
            <div className={styles.body}>
              <div className={styles.margin}>
                <div className={styles.background3}>
                  <img
                    src="../../../shared-assets/商家端-桌面后台/03-分类/04-删除分类确认-商品转未分类/mtib2t35-pvvmg2c.svg"
                    className={styles.container12}
                  />
                </div>
              </div>
              <div className={styles.container13}>
                <p className={styles.text13}>
                  确定要删除该分类吗？删除后该分类下的商品
                  <br />
                  将变为“未分类”状态。
                </p>
              </div>
            </div>
            <div className={styles.footer}>
              <div className={styles.button4}>
                <p className={styles.text}>取 消</p>
              </div>
              <div className={styles.button5}>
                <p className={styles.text2}>删 除</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
