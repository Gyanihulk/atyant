<?php
require_once __DIR__.'/approval-email.php';
// Privileged identities are configured server-side only. Add the owner's address
// here only after the owner supplies it; employee registration cannot edit this list.
const OTP_ADMINS = ['srdeegjat@gmail.com'=>'Sr. DEE Sir','balodhiat@gmail.com'=>'Site owner'];
$db->exec('CREATE TABLE IF NOT EXISTS email_otp (email TEXT PRIMARY KEY, challenge TEXT NOT NULL, hash TEXT NOT NULL, expires INTEGER NOT NULL, sent_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, delivered INTEGER NOT NULL DEFAULT 0)');
throttle($action);
if($action==='otp-send'){
    $email=strtolower(trim((string)($_POST['email']??'')));
    if(!filter_var($email,FILTER_VALIDATE_EMAIL))reply(['error'=>'Enter a valid email address.'],422);
    $message='If this is an authorised address, an OTP has been sent. It expires in 5 minutes. Check your inbox and spam folder.';
    if(!isset(OTP_ADMINS[$email])){unset($_SESSION['otp']);reply(['message'=>$message]);}
    $now=time();$challenge=bin2hex(random_bytes(32));$code=(string)random_int(1000,9999);
    $db->exec('BEGIN IMMEDIATE');
    $q=$db->prepare('SELECT sent_at FROM email_otp WHERE email=?');$q->execute([$email]);$last=$q->fetchColumn();
    if($last!==false && $now-(int)$last<60){$db->exec('ROLLBACK');reply(['error'=>'Please wait 60 seconds before requesting another OTP.'],429);}
    $q=$db->prepare('INSERT INTO email_otp(email,challenge,hash,expires,sent_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET challenge=excluded.challenge,hash=excluded.hash,expires=excluded.expires,sent_at=excluded.sent_at,attempts=0,delivered=0');
    $q->execute([$email,$challenge,password_hash($code,PASSWORD_DEFAULT),$now+300,$now]);$db->exec('COMMIT');
    unset($_SESSION['otp']);$sent=false;
    try{if(function_exists('mail'))$sent=mail($email,'GatiVidyut sign-in OTP',"Your GatiVidyut sign-in code is: ".$code."\r\n\r\nExpires in 5 minutes. Do not share this code. If you did not request it, ignore this email.",['From'=>APPROVAL_FROM,'MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8']);}
    catch(Throwable $e){error_log('Email OTP submission failed');}
    if(!$sent){$db->prepare('DELETE FROM email_otp WHERE email=? AND challenge=?')->execute([$email,$challenge]);reply(['error'=>'Could not send OTP. Please contact the administrator to check email delivery.'],503);}
    $db->prepare('UPDATE email_otp SET delivered=1 WHERE email=? AND challenge=?')->execute([$email,$challenge]);
    $_SESSION['otp']=['email'=>$email,'challenge'=>$challenge];reply(['message'=>$message]);
}
if($action==='otp-verify'){
    $code=(string)($_POST['code']??'');$pending=$_SESSION['otp']??[];
    if(!preg_match('/^[0-9]{4}$/',$code))reply(['error'=>'Enter the four-digit OTP.'],422);
    $email=$pending['email']??'';
    if(!isset(OTP_ADMINS[$email]))reply(['error'=>'Request a new OTP to continue.'],401);
    $db->exec('BEGIN IMMEDIATE');
    $q=$db->prepare('SELECT * FROM email_otp WHERE email=? AND challenge=?');$q->execute([$email,$pending['challenge']]);$record=$q->fetch();
    if(!$record || !$record['delivered'] || $record['expires']<=time() || $record['attempts']>=5){$db->exec('ROLLBACK');unset($_SESSION['otp']);reply(['error'=>'OTP expired or unavailable. Request a new code.'],401);}
    $db->prepare('UPDATE email_otp SET attempts=attempts+1 WHERE email=?')->execute([$email]);
    if(!password_verify($code,$record['hash'])){$db->exec('COMMIT');reply(['error'=>'Incorrect OTP. After five failed attempts, request a new code.'],401);}
    // The reserved ':' ID cannot be claimed through the employee registration form.
    $employee='OTP:'.$email;
    $q=$db->prepare('SELECT id,status,admin FROM accounts WHERE employee=?');$q->execute([$employee]);$account=$q->fetch();
    if($account && ($account['status']!=='approved' || !$account['admin'])){$db->exec('ROLLBACK');reply(['error'=>'Account access is disabled.'],403);}
    if(!$account){$q=$db->prepare("INSERT INTO accounts(employee,name,hash,status,admin) VALUES (?,?,?,'approved',1)");$q->execute([$employee,OTP_ADMINS[$email],password_hash(bin2hex(random_bytes(32)),PASSWORD_DEFAULT)]);$uid=(int)$db->lastInsertId();}else{$uid=(int)$account['id'];}
    $db->prepare('DELETE FROM email_otp WHERE email=?')->execute([$email]);$db->exec('COMMIT');
    session_regenerate_id(true);$_SESSION=['uid'=>$uid,'last'=>time(),'started'=>time(),'csrf'=>bin2hex(random_bytes(32))];reply(['ok'=>true]);
}
