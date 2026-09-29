<?php
declare(strict_types=1);
ini_set('display_errors','0');
ini_set('session.use_strict_mode','1');
session_name('gatividyut_session');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
session_start();
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
set_exception_handler(function(Throwable $error): void {
    error_log('GatiVidyut authentication: '.$error->getMessage());
    http_response_code(503); exit('Account service unavailable. Contact the site administrator.');
});
// Outside public_html: account records must never be downloadable.
$private = dirname(__DIR__,2).'/gatividyut-private';
if (!is_dir($private) && !mkdir($private,0700,true)) throw new RuntimeException('Cannot create private storage');
$db = new PDO('sqlite:'.$private.'/accounts.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('PRAGMA busy_timeout=5000');
$db->exec("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, employee TEXT UNIQUE NOT NULL, name TEXT NOT NULL, hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', admin INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
$db->exec('CREATE TABLE IF NOT EXISTS attempts (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, until_time INTEGER NOT NULL)');
function esc(string $s): string {return htmlspecialchars($s,ENT_QUOTES,'UTF-8');}
function csrf(): string {return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));}
function requirePost(): void {
    if ($_SERVER['REQUEST_METHOD']!=='POST' || !hash_equals(csrf(),(string)($_POST['csrf']??''))) {http_response_code(403);exit('Invalid request. Reload and try again.');}
}
function throttle(string $action): void {
    global $db;
    $bucket=hash('sha256',$action.'|'.($_SERVER['REMOTE_ADDR']??''));$now=time();
    $db->prepare('DELETE FROM attempts WHERE until_time < ?')->execute([$now]);
    $db->prepare('INSERT INTO attempts(bucket,count,until_time) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1')->execute([$bucket,$now+900]);
    $s=$db->prepare('SELECT count FROM attempts WHERE bucket=?');$s->execute([$bucket]);
    if((int)$s->fetchColumn()>20){http_response_code(429);exit('Too many attempts. Try again in 15 minutes.');}
}
function currentUser(): ?array {
    global $db;
    if(empty($_SESSION['uid']))return null;
    if(time()-($_SESSION['last']??0)>1800 || time()-($_SESSION['started']??0)>28800){$_SESSION=[];return null;}
    $s=$db->prepare("SELECT id,employee,name,status,admin FROM accounts WHERE id=? AND status='approved'");$s->execute([$_SESSION['uid']]);
    $user=$s->fetch();if(!$user){$_SESSION=[];return null;}$_SESSION['last']=time();return $user;
}
function requireUser(bool $admin=false): array {
    $user=currentUser();if(!$user){header('Location: login.html');exit;}
    if($admin && !$user['admin']){http_response_code(403);exit('Administrator access required.');}return $user;
}
function credentials(): array {
    $employee=strtoupper(trim((string)($_POST['employeeId']??'')));$password=(string)($_POST['password']??'');
    if(!preg_match('/^[A-Z0-9][A-Z0-9._\/-]{1,63}$/',$employee) || strlen($password)<12 || strlen($password)>72)throw new InvalidArgumentException('Use a valid employee ID and a password of 12–72 bytes.');
    return [$employee,$password];
}
