<?php
// Server-only configuration. Never take mail headers or links from form input.
const APPROVAL_EMAIL = 'srdeegjat@gmail.com';
const APPROVAL_URL = 'https://gatividyutjatdiv.co.in/admin.php';
const APPROVAL_FROM = 'noreply@gatividyutjatdiv.co.in';
$db->exec("CREATE TABLE IF NOT EXISTS approval_mail (account_id INTEGER PRIMARY KEY, state TEXT NOT NULL DEFAULT 'pending', attempted INTEGER NOT NULL DEFAULT 0)");
function sendApprovalEmail(int $id): void {
    global $db;
    // Atomically claim one attempt; concurrent requests must not duplicate mail.
    $claim=$db->prepare("UPDATE approval_mail SET state='sending',attempted=? WHERE account_id=? AND (state='pending' OR (state='sending' AND attempted<?))");
    $claim->execute([time(),$id,time()-300]);if(!$claim->rowCount())return;
    $query=$db->prepare("SELECT name,employee FROM accounts WHERE id=? AND status='pending'");$query->execute([$id]);$account=$query->fetch();
    if(!$account){$db->prepare("UPDATE approval_mail SET state='cancelled' WHERE account_id=?")->execute([$id]);return;}
    $body="A new GatiVidyut employee registration requires your approval.\n\nName: ".$account['name']."\nEmployee ID: ".$account['employee']."\n\nSign in with your administrator account to review:\n".APPROVAL_URL."\n\nVerify this employee against official records before approving. The account remains blocked until approved. Opening this link does not approve the account.\n\nGatiVidyut - Jammu Division";
    $accepted=false;
    try {
        if(function_exists('mail'))$accepted=mail(APPROVAL_EMAIL,'GatiVidyut: new employee registration awaiting approval',$body,['From'=>APPROVAL_FROM,'MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8']);
    } catch(Throwable $error){error_log('Approval email submission failed');}
    // Accepted means handed to the mail system, not confirmed inbox delivery.
    $db->prepare('UPDATE approval_mail SET state=? WHERE account_id=?')->execute([$accepted?'submitted':'pending',$id]);
}
