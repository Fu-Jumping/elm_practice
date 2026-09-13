"""真实接口验收：合成账号/临时店铺，保留订单证据，结束后关闭测试店。"""
import urllib.request, urllib.error, http.cookiejar, json, time, pathlib
# 2026-09-13：演示入口端口 4001 → 4100（见 deploy/nginx.conf 注释）
base='http://82.157.137.114:4100'
jar=http.cookiejar.CookieJar(); client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
results=[]
def call(role, method, path, body=None, expected=200):
    url=base+('/user/api/v1' if role=='u' else '/api/v1')+path
    request=urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), method=method,headers={'Content-Type':'application/json','Origin':base})
    try:
        response=client.open(request,timeout=15); status=response.status; payload=json.load(response)
    except urllib.error.HTTPError as error: status=error.code; payload=json.load(error)
    ok=status==expected
    results.append({'method':method,'path':path,'expected':expected,'actual':status,'pass':ok})
    assert ok, (method,path,expected,status,payload)
    return payload.get('data')

stamp=str(int(time.time()))[-7:]; account='1398'+stamp
shop='audit-'+stamp
business_assertions_passed=False
test_store_closed=False
try:
    call('u','GET','/orders',expected=401)
    call('m','POST','/merchant/auth/login',{'account':'merchant-a','password':'wrong','role':'merchant'},401)
    user=call('u','POST','/users',{'account':account,'password':'Audit1234','nickname':'工程验收-'+stamp})
    call('u','POST','/auth/login',{'account':account,'password':'Audit1234','role':'user'})
    call('m','POST','/merchants',{'account':shop,'password':'Audit1234','storeName':'工程验收临时店-'+stamp,'contactPhone':account})
    merchant=call('m','POST','/merchant/auth/login',{'account':shop,'password':'Audit1234','role':'merchant'})
    assert merchant['store']['status']=='CLOSED'
    sid=merchant['storeId']
    assert call('u','GET','/me')['account']==account, '双端会话互相覆盖'
    assert call('m','GET','/merchant/me')['account']==shop
    call('u','GET','/merchant/store',expected=403)
    call('m','GET','/me',expected=403)
    call('m','PATCH','/merchant/store',{'name':'工程验收临时店-'+stamp,'startPrice':20,'deliveryFee':3})
    call('m','PATCH','/merchant/store/status',{'status':'PAUSED'},400)
    call('m','PATCH','/merchant/store/status',{'status':'OPEN'})
    assert any(s['storeId']==sid for s in call('u','GET','/stores'))
    c=call('m','POST','/merchant/categories',{'name':'验收分类','sortOrder':7})
    assert c['sortOrder']==7
    call('m','POST','/merchant/categories',{'name':'验收分类','sortOrder':8},409)
    p=call('m','POST','/merchant/products',{'name':'验收套餐','categoryId':c['categoryId'],'price':29,'stock':3,'onSale':True})
    pid=p['productId']
    call('m','DELETE','/merchant/categories/'+c['categoryId'],expected=409)
    call('m','DELETE','/merchant/products/'+pid,expected=409)
    call('m','PATCH','/merchant/products/'+pid,{'price':-1},400)
    a=call('u','POST','/me/addresses',{'contactName':'验收同学','contactPhone':account,'contactSex':'男','region':'天津大学北洋园校区','detail':'演示测试地址','isDefault':True})
    for q in (1,1): call('u','POST','/cart/items',{'storeId':sid,'productId':pid,'quantity':q})
    cart=call('u','GET','/cart?storeId='+sid); assert len(cart)==1 and cart[0]['quantity']==2
    call('u','PATCH','/cart/items/'+cart[0]['cartLineId'],{'quantity':0},400)
    call('u','PATCH','/cart/items/'+cart[0]['cartLineId'],{'quantity':99},409)
    body={'storeId':sid,'addressId':a['addressId'],'expectedTotal':999,'idempotencyKey':'audit-'+stamp,'remark':'工程验收合成订单'}
    order=call('u','POST','/orders',body); oid=order['orderId']
    assert float(order['total'])==60 and order['status']=='PENDING_PAYMENT'
    assert call('u','POST','/orders',body)['orderId']==oid
    assert call('u','GET','/cart?storeId='+sid)==[]
    assert call('m','GET','/merchant/products/'+pid)['stock']==1
    call('m','GET','/merchant/orders/'+oid,expected=404)
    assert call('u','POST','/orders/'+oid+'/payment',{'success':False})['status']=='PENDING_PAYMENT'
    assert call('u','POST','/orders/'+oid+'/payment',{'success':True})['status']=='PROCESSING'
    assert call('u','POST','/orders/'+oid+'/payment',{'success':True})['status']=='PROCESSING'
    assert call('m','GET','/merchant/orders/'+oid)['orderId']==oid
    call('m','PATCH','/merchant/orders/'+oid+'/status',{'status':'COMPLETED'},409)
    for state in ('PENDING','PENDING','COOKING','DELIVERING','COMPLETED'):
        assert call('m','PATCH','/merchant/orders/'+oid+'/status',{'status':state})['status']==state
    assert call('u','GET','/orders/'+oid)['status']=='COMPLETED'
    call('m','PATCH','/merchant/products/'+pid+'/availability',{'onSale':False})
    assert call('m','GET','/merchant/products/'+pid)['stock']==1
    call('m','DELETE','/merchant/products/'+pid)
    assert call('u','GET','/orders/'+oid)['items'][0]['name']=='验收套餐'
    call('m','DELETE','/merchant/categories/'+c['categoryId'])
    call('m','GET','/merchant/orders/o1001',expected=404)
    call('u','GET','/orders/o1001',expected=404)
    business_assertions_passed=True
    print(json.dumps({'pass':len(results),'orderId':oid,'storeId':sid,'userId':user['userId'],'cookiePaths':[c.path for c in jar]},ensure_ascii=False))
finally:
    try:
        if 'sid' in globals():
            closed=call('m','PATCH','/merchant/store/status',{'status':'CLOSED'})
            test_store_closed=closed['status']=='CLOSED'
            assert test_store_closed
    finally:
        output=pathlib.Path(__file__).parent/'smoke-result.json'
        output.write_text(json.dumps({'checks':results,'passed':sum(x['pass'] for x in results),'total':len(results),'businessAssertionsPassed':business_assertions_passed,'completed':business_assertions_passed and test_store_closed and all(x['pass'] for x in results),'orderId':globals().get('oid'),'storeId':globals().get('sid'),'userId':globals().get('user',{}).get('userId'),'testStoreClosed':test_store_closed},ensure_ascii=False,indent=2),encoding='utf-8')
