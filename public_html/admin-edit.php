<?php
require __DIR__.'/server/auth.php';
$user=requireUser(true);
$id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT)?:filter_input(INPUT_POST,'id',FILTER_VALIDATE_INT);
if(!$id){http_response_code(404);exit('Account not found.');}
$s=$db->prepare('SELECT id,employee,name,status,admin FROM accounts WHERE id=?');$s->execute([$id]);
$account=$s->fetch();
if(!$account){http_response_code(404);exit('Account not found.');}
$isSelf=(int)$account['id']===(int)$user['id'];
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    requirePost();
    $status=$_POST['status']??'';$admin=isset($_POST['admin'])?1:0;
    if(!in_array($status,['approved','pending','rejected','disabled'],true))$error='Choose a valid access status.';
    elseif($isSelf && ($admin===0 || $status!=='approved'))$error='You cannot remove your own admin role or access.';
    elseif((int)$account['admin']===1 && $admin===0){
        $remainingAdmins=(int)$db->query('SELECT COUNT(*) FROM accounts WHERE admin=1')->fetchColumn();
        if($remainingAdmins<=1)$error='At least one admin account must remain. Promote another account first.';
    }
    if(!$error){
        $db->prepare('UPDATE accounts SET status=?,admin=? WHERE id=?')->execute([$status,$admin,$account['id']]);
        header('Location: admin.php');exit;
    }
    $account['status']=$status;$account['admin']=$admin;
}
?><!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Edit account | GatiVidyut</title><link rel="stylesheet" href="login.css?v=<?=filemtime(__DIR__.'/login.css')?>"><body><main class="admin-page"><a href="admin.php">← User management</a><h1>Edit account</h1>
<section class="access-card" style="max-width:520px">
<p><strong><?=esc($account['name'])?></strong><br>Employee ID: <code><?=esc($account['employee'])?></code></p>
<?php if($isSelf): ?><p class="setup-note">This is your own account. Your admin role and access cannot be changed from here.</p><?php else: ?>
<?php if($error): ?><p role="alert" class="admin-error"><?=esc($error)?></p><?php endif ?>
<form method="post">
<input type="hidden" name="csrf" value="<?=esc(csrf())?>">
<input type="hidden" name="id" value="<?=(int)$account['id']?>">
<label>Access status<select name="status">
<?php foreach(['pending'=>'Pending','approved'=>'Approved','rejected'=>'Rejected','disabled'=>'Disabled'] as $value=>$label): ?><option value="<?=$value?>"<?=$account['status']===$value?' selected':''?>><?=$label?></option><?php endforeach ?>
</select></label>
<label><input type="checkbox" name="admin" value="1" <?=$account['admin']?'checked':''?>> Admin role — can approve accounts and manage users</label>
<button class="primary">Save changes</button>
</form>
<?php endif ?>
</section>
</main></body></html>
