<?php
require __DIR__.'/server/auth.php';
if((int)$db->query('SELECT COUNT(*) FROM accounts WHERE admin=1')->fetchColumn()){http_response_code(404);exit('Setup is closed.');}
$keyFile=$private.'/setup-key.txt';
if(!is_file($keyFile)){ $handle=fopen($keyFile,'x');if($handle){fwrite($handle,bin2hex(random_bytes(32)));fclose($handle);chmod($keyFile,0600);} }
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    requirePost();throttle('setup');
    if(!hash_equals(trim(file_get_contents($keyFile)),trim((string)($_POST['setupKey']??''))))$error='Setup key is incorrect.';
    else try{
        [$employee,$password]=credentials();$name=trim((string)($_POST['fullName']??''));
        if(!$name || strlen($name)>120)throw new InvalidArgumentException('Enter your name.');
        $db->exec('BEGIN IMMEDIATE');
        if((int)$db->query('SELECT COUNT(*) FROM accounts WHERE admin=1')->fetchColumn())throw new RuntimeException('Setup already completed');
        $s=$db->prepare("INSERT INTO accounts(employee,name,hash,status,admin) VALUES (?,?,?,'approved',1) ON CONFLICT(employee) DO UPDATE SET name=excluded.name,hash=excluded.hash,status='approved',admin=1");$s->execute([$employee,$name,password_hash($password,PASSWORD_DEFAULT)]);
        $db->exec('COMMIT');unlink($keyFile);header('Location: login.html');exit;
    }catch(InvalidArgumentException $e){$error=$e->getMessage();}
}
?><!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administrator setup</title><link rel="stylesheet" href="login.css?v=<?=filemtime(__DIR__.'/login.css')?>"><body><main class="access-card" style="max-width:550px;margin:40px auto"><h1>Create administrator</h1><p>In Hostinger File Manager, open gatividyut-private/setup-key.txt one level above public_html. Copy its key here. This setup closes after your administrator account is created.</p><p role="alert"><?=esc($error)?></p><form method="post"><input type="hidden" name="csrf" value="<?=esc(csrf())?>"><label>Setup key<input name="setupKey" type="password" required autocomplete="off"></label><label>Your full name<input name="fullName" required maxlength="120" autocomplete="name"></label><label>Your employee ID<input name="employeeId" required maxlength="64" autocomplete="username"></label><label>Create password (12–72 bytes)<input name="password" type="password" required minlength="12" maxlength="72" autocomplete="new-password"></label><button class="primary">Create administrator</button></form></main></body></html>
