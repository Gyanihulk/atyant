<?php
require __DIR__.'/server/auth.php';
header('Content-Type: application/json');
$action=$_GET['action']??'';
function reply(array $data,int $status=200): void {http_response_code($status);echo json_encode($data);exit;}
if($action==='session')reply(['csrf'=>csrf(),'user'=>currentUser()]);
requirePost();
if($action==='logout'){$_SESSION=[];session_destroy();reply(['ok'=>true]);}
if(in_array($action,['otp-send','otp-verify'],true))require __DIR__.'/server/email-otp.php';
if(!in_array($action,['login','register'],true))reply(['error'=>'Unknown action'],404);
throttle($action);
try {[$employee,$password]=credentials();}catch(InvalidArgumentException $e){reply(['error'=>$e->getMessage()],422);}
if($action==='register'){
    require __DIR__.'/server/approval-email.php';
    $name=trim((string)($_POST['fullName']??''));
    if(!$name || strlen($name)>120 || $password!==($_POST['confirmPassword']??''))reply(['error'=>'Enter your name and matching passwords.'],422);
    $db->beginTransaction();
    $s=$db->prepare('INSERT OR IGNORE INTO accounts(employee,name,hash) VALUES (?,?,?)');$s->execute([$employee,$name,password_hash($password,PASSWORD_DEFAULT)]);
    $newId=$s->rowCount() ? (int)$db->lastInsertId() : 0;
    if($newId)$db->prepare('INSERT INTO approval_mail(account_id) VALUES (?)')->execute([$newId]);
    $db->commit();
    if($newId)sendApprovalEmail($newId);
    reply(['message'=>'Registration received. Sr. DEE Sir must verify your employee ID and approve access before you can sign in. If already registered, use your existing credentials.']);
}
$s=$db->prepare('SELECT * FROM accounts WHERE employee=?');$s->execute([$employee]);$user=$s->fetch();
$valid=password_verify($password,$user['hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
if(!$user || !$valid)reply(['error'=>'Employee ID or password is incorrect.'],401);
if($user['status']!=='approved')reply(['error'=>'Your account is awaiting approval or has been disabled. Contact the administrator.'],403);
session_regenerate_id(true);$_SESSION=['uid'=>$user['id'],'last'=>time(),'started'=>time(),'csrf'=>bin2hex(random_bytes(32))];
reply(['ok'=>true]);
