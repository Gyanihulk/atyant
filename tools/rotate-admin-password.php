<?php
declare(strict_types=1);
// Run locally only: php tools/rotate-admin-password.php EMPLOYEE_ID
// Regenerates the password for one existing admin account in gatividyut-private/accounts.sqlite.

$employee = strtoupper(trim((string)($argv[1] ?? '')));
if ($employee === '') {
    fwrite(STDERR, "Usage: php tools/rotate-admin-password.php EMPLOYEE_ID\n");
    exit(1);
}

$private = dirname(__DIR__).'/gatividyut-private';
$db = new PDO('sqlite:'.$private.'/accounts.sqlite', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$check = $db->prepare('SELECT id,admin FROM accounts WHERE employee=?');
$check->execute([$employee]);
$account = $check->fetch(PDO::FETCH_ASSOC);
if (!$account) {
    fwrite(STDERR, "No account found for employee ID $employee\n");
    exit(1);
}

$password = rtrim(strtr(base64_encode(random_bytes(12)), '+/', '-_'), '=');
$db->prepare('UPDATE accounts SET hash=? WHERE id=?')->execute([password_hash($password, PASSWORD_DEFAULT), $account['id']]);

echo "New password for $employee: $password\n";
echo "Save it now — it will not be shown again. Re-upload accounts.sqlite to the server to apply it.\n";
