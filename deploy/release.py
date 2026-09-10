"""在服务器 ubuntu 用户运行；凭据从已备份 PM2 配置读取，不写入发布包。"""
import json, pathlib, subprocess, os, time, urllib.request, shutil

BASE = pathlib.Path('/home/ubuntu/releases/elm-20260908-508889e')
BACKUP = pathlib.Path('/home/ubuntu/backups/elm-20260908')
WWW = pathlib.Path('/srv/elm-releases/20260908-508889e')
def run(*args): subprocess.run(args, check=True)
old = json.loads((BACKUP/'pm2-before.json').read_text())
backend = next(p for p in old if p['name']=='elm-backend')['pm2_env']
env = {k:backend[k] for k in ('DB_HOST','DB_USER','DB_PASSWORD','DB_NAME')}
config = {'apps':[{'name':'elm-backend', 'script':'/usr/bin/java', 'interpreter':'none', 'cwd':str(BASE/'backend'), 'args':['-jar','target/elm-practice-backend-0.1.0-SNAPSHOT.jar','--server.port=4000','--server.address=127.0.0.1'], 'env':env}]}
private = BACKUP/'new-backend.json'
private.write_text(json.dumps(config)); private.chmod(0o600)
run('sudo','mkdir','-p',str(WWW))
run('sudo','cp','-a',str(BASE/'www')+'/.',str(WWW))
run('sudo','chmod','-R','a+rX',str(WWW))
run('sudo','ln','-sfn',str(WWW.parent/WWW.name),'/srv/elm-current')
# nginx 的根路径包含 www，symlink 对应发布根。
conf=(BASE/'deploy/nginx.conf').read_text().replace('/srv/elm-current/www/','/srv/elm-current/')
temp=BASE/'nginx-elm.conf'; temp.write_text(conf)
run('sudo','cp',str(temp),'/etc/nginx/conf.d/elm-release.conf')
try:
    run('sudo','nginx','-t')
    run('pm2','delete','elm-backend')
    run('pm2','start',str(private))
    healthy=False
    for _ in range(60):
        try:
            with urllib.request.urlopen('http://127.0.0.1:4000/api/v1/stores',timeout=2) as response:
                data=json.load(response)
            if data.get('code')==0: healthy=True; break
        except Exception: time.sleep(.5)
    if not healthy: raise RuntimeError('New backend health check failed')
    existing = json.loads(subprocess.check_output(['pm2', 'jlist'], text=True))
    retired = [p['name'] for p in existing if p['name'] in ('elm-merchant', 'elm-h5')]
    if retired: run('pm2', 'stop', *retired, '--watch')
    run('sudo','systemctl','reload','nginx')
    for url in ('http://127.0.0.1:4001/','http://127.0.0.1:4001/user/','http://127.0.0.1:4001/user/api/v1/stores'):
        last_error=None
        for _ in range(30):
            try:
                with urllib.request.urlopen(url,timeout=5) as response:
                    assert response.status==200, url
                last_error=None
                break
            except Exception as error: last_error=error; time.sleep(.5)
        if last_error: raise last_error
    run('pm2','save')
    print('RELEASE_OK 508889ee2c0b09431d93fa40482fe47a9200b0b0 + audited workspace fixes')
except Exception:
    subprocess.run(['sudo','rm','-f','/etc/nginx/conf.d/elm-release.conf'])
    subprocess.run(['sudo','systemctl','reload','nginx'])
    subprocess.run(['pm2','delete','elm-backend'])
    restore={'apps':[{'name':'elm-backend','script':backend['pm_exec_path'],'interpreter':'none','cwd':backend['pm_cwd'],'args':backend['args'],'env':{**env,'SERVER_PORT':'4000'}}]}
    fallback=BACKUP/'restore-backend.json'; fallback.write_text(json.dumps(restore)); fallback.chmod(0o600)
    subprocess.run(['pm2','start',str(fallback)])
    subprocess.run(['pm2','start',str(BACKUP/'restore-frontends.json')])
    raise
