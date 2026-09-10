"""服务器只读核对本次验收订单，并重启既有 backend 后验证仍可查询。"""
import json, os, pathlib, subprocess, time, urllib.request

backup=pathlib.Path('/home/ubuntu/backups/elm-20260908')
processes=json.loads((backup/'pm2-before.json').read_text())
config=next(p for p in processes if p['name']=='elm-backend')['pm2_env']
env={**os.environ,'MYSQL_PWD':config['DB_PASSWORD']}
sql="SELECT order_id,status,total FROM orders WHERE order_id IN ('o1094','o1097') ORDER BY order_id; SELECT store_id,status FROM stores WHERE store_id='m1088';"
def query():
    result=subprocess.run(['mysql','-h',config['DB_HOST'],'-u',config['DB_USER'],'--batch','--skip-column-names',config['DB_NAME'],'-e',sql],env=env,check=True,capture_output=True,text=True)
    return result.stdout.strip().splitlines()
before=query()
subprocess.run(['pm2','restart','elm-backend'],check=True,stdout=subprocess.DEVNULL)
for _ in range(60):
    try:
        with urllib.request.urlopen('http://127.0.0.1:4000/api/v1/stores',timeout=2) as response:
            assert json.load(response)['code']==0
        break
    except Exception: time.sleep(.5)
else: raise RuntimeError('Backend not healthy after restart')
after=query()
assert before==after and any('o1094\tCOMPLETED\t60.00'==x for x in after) and any('o1097\tCOMPLETED\t31.00'==x for x in after)
result={'before':before,'after':after,'restartPersistencePassed':True}
(backup/'persistence-summary.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
