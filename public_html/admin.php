<?php
require __DIR__.'/server/auth.php';
$user=requireUser(true);
require __DIR__.'/server/approval-email.php';
if($_SERVER['REQUEST_METHOD']==='POST'){
    requirePost();
    if(($_POST['action']??'')==='retry-mail'){
        throttle('retry-mail');
        $pending=$db->query("SELECT account_id FROM approval_mail WHERE state='pending' OR (state='sending' AND attempted<".(time()-300).") LIMIT 10")->fetchAll();
        foreach($pending as $mail)sendApprovalEmail((int)$mail['account_id']);
    }
    header('Location: admin.php');exit;
}
$accounts=$db->query('SELECT id,employee,name,status,admin,created FROM accounts ORDER BY admin DESC,created DESC')->fetchAll();
$unsent=(int)$db->query("SELECT COUNT(*) FROM approval_mail m JOIN accounts a ON a.id=m.account_id WHERE a.status='pending' AND m.state IN ('pending','sending')")->fetchColumn();
$statusLabel=['approved'=>'Approved','pending'=>'Pending','rejected'=>'Rejected','disabled'=>'Disabled'];
?><!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>User management | GatiVidyut</title><link rel="stylesheet" href="login.css?v=<?=filemtime(__DIR__.'/login.css')?>"><body><main class="admin-page"><a href="index.php">← Website</a><h1>User management</h1><p>Verify each employee ID against your official records before approving. Approval grants website access; admin role grants access to this page.</p>
<p>New registration requests go to <?=esc(APPROVAL_EMAIL)?>. Email submission does not confirm inbox delivery.</p>
<?php if($unsent): ?><p role="status"><?=$unsent?> approval emails awaiting submission. Accounts remain pending.</p><form method="post"><input type="hidden" name="csrf" value="<?=esc(csrf())?>"><input type="hidden" name="action" value="retry-mail"><button class="primary">Retry pending emails</button></form><?php endif ?>
<table class="admin-table"><thead><tr><th>Name</th><th>Employee ID</th><th>Role</th><th>Access</th><th>Registered</th><th></th></tr></thead><tbody>
<?php foreach($accounts as $account): ?><tr<?=(int)$account['id']===(int)$user['id']?' class="is-you"':''?>><td><?=esc($account['name'])?><?=(int)$account['id']===(int)$user['id']?' <small>(you)</small>':''?></td><td><code><?=esc($account['employee'])?></code></td><td><span class="role-badge <?=$account['admin']?'admin':'employee'?>"><?=$account['admin']?'Admin':'Employee'?></span></td><td><span class="status-badge <?=esc($account['status'])?>"><?=esc($statusLabel[$account['status']]??$account['status'])?></span></td><td><?=esc($account['created'])?></td><td><a class="admin-edit-link" href="admin-edit.php?id=<?=(int)$account['id']?>">Edit ↗</a></td></tr><?php endforeach ?>
<?php if(!$accounts): ?><tr><td colspan="6">No accounts yet.</td></tr><?php endif ?>
</tbody></table>
</main></body></html>
